import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { verifyLicenseToken } from '@/lib/crypto';
import { normalizeDeviceFingerprint } from '@/utils/fingerprint';
import jwt from 'jsonwebtoken';

// Types for request validation
interface VerifyLicenseRequest {
  token: string;
  device_fingerprint?: string;
}

interface VerifyLicenseResponse {
  ok: boolean;
  error?: string;
  data?: {
    valid: boolean;
    tier: string;
    expires_at: string;
    device_limit: number;
    current_devices_count: number;
    device_limit_exceeded: boolean;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyLicenseResponse>> {
  try {
    // Parse request body
    let body: VerifyLicenseRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.token) {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    // Decode JWT header to get jti (license key) without verification
    let decodedHeader: any;
    try {
      decodedHeader = jwt.decode(body.token, { complete: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JWT token format' },
        { status: 400 }
      );
    }

    if (!decodedHeader?.payload?.jti) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JWT token - missing jti' },
        { status: 400 }
      );
    }

    const licenseKey = decodedHeader.payload.jti;

    // Look up license in Supabase
    const supabase = createSupabaseClient();
    const { data: license, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (fetchError || !license) {
      return NextResponse.json(
        { ok: false, error: 'License not found' },
        { status: 404 }
      );
    }

    // Check if license is revoked
    if (license.revoked) {
      return NextResponse.json(
        { ok: false, error: 'License has been revoked' },
        { status: 403 }
      );
    }

    // Check if license is expired
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'License has expired' },
        { status: 403 }
      );
    }

    // Verify JWT signature using public key
    try {
      await verifyLicenseToken(body.token);
    } catch (verifyError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid license token signature' },
        { status: 403 }
      );
    }

    // Handle device fingerprint if provided
    let currentDevicesCount = license.current_devices?.length || 0;
    let deviceLimitExceeded = false;

    if (body.device_fingerprint) {
      const normalizedFingerprint = normalizeDeviceFingerprint(body.device_fingerprint);
      
      // Check if device is already registered
      const isDeviceRegistered = license.current_devices?.includes(normalizedFingerprint);
      
      if (!isDeviceRegistered) {
        // Check if we can add this device
        if (currentDevicesCount < license.device_limit) {
          // Add device to current_devices array
          const updatedDevices = [...(license.current_devices || []), normalizedFingerprint];
          
          const { error: updateError } = await supabase
            .from('licenses')
            .update({ current_devices: updatedDevices })
            .eq('license_key', licenseKey);

          if (!updateError) {
            currentDevicesCount = updatedDevices.length;
          }
        } else {
          deviceLimitExceeded = true;
        }

        // Log activation attempt
        await supabase
          .from('license_activations')
          .insert({
            license_key: licenseKey,
            device_fingerprint: normalizedFingerprint,
            meta: {
              timestamp: new Date().toISOString(),
              success: !deviceLimitExceeded,
              device_limit_exceeded: deviceLimitExceeded
            }
          });
      }
    }

    // Return verification result
    return NextResponse.json({
      ok: true,
      data: {
        valid: true,
        tier: license.plan,
        expires_at: license.expires_at,
        device_limit: license.device_limit,
        current_devices_count: currentDevicesCount,
        device_limit_exceeded: deviceLimitExceeded
      }
    });

  } catch (error) {
    console.error('Error verifying license:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
