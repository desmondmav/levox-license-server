import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// Types for request validation
interface GetLicenseTokenRequest {
  license_key: string;
}

interface GetLicenseTokenResponse {
  ok: boolean;
  error?: string;
  data?: {
    jwt: string;
    expires_at: string;
    tier: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<GetLicenseTokenResponse>> {
  try {
    // Parse request body
    let body: GetLicenseTokenRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.license_key) {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: license_key' },
        { status: 400 }
      );
    }

    // Query Supabase for the license
    const supabase = createSupabaseClient();
    const { data: license, error: queryError } = await supabase
      .from('licenses')
      .select('jwt, expires_at, plan, revoked')
      .eq('license_key', body.license_key)
      .single();

    if (queryError || !license) {
      return NextResponse.json(
        { ok: false, error: 'License key not found' },
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
    const expiresAt = new Date(license.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'License has expired' },
        { status: 403 }
      );
    }

    // Return the JWT token
    return NextResponse.json({
      ok: true,
      data: {
        jwt: license.jwt,
        expires_at: license.expires_at,
        tier: license.plan
      }
    });

  } catch (error) {
    console.error('Error retrieving license token:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
