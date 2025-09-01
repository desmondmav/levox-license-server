import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { signLicenseToken } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

// Types for request validation
interface IssueLicenseRequest {
  email: string;
  plan: 'pro' | 'enterprise';
  device_limit: number;
  period_days: number;
}

interface IssueLicenseResponse {
  ok: boolean;
  error?: string;
  data?: {
    token: string;
    license_key: string;
    expires_at: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<IssueLicenseResponse>> {
  try {
    // Load environment variables
    const adminToken = process.env.ADMIN_ISSUE_TOKEN;
    if (!adminToken) {
      console.error('ADMIN_ISSUE_TOKEN not configured');
      return NextResponse.json(
        { ok: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify admin token
    const providedToken = request.headers.get('X-ADMIN-TOKEN');
    if (!providedToken || providedToken !== adminToken) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - Invalid admin token' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: IssueLicenseRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.email || !body.plan || !body.device_limit || !body.period_days) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: email, plan, device_limit, period_days' },
        { status: 400 }
      );
    }

    // Validate plan
    if (!['pro', 'enterprise'].includes(body.plan)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid plan. Must be "pro" or "enterprise"' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (typeof body.device_limit !== 'number' || body.device_limit < 1) {
      return NextResponse.json(
        { ok: false, error: 'device_limit must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof body.period_days !== 'number' || body.period_days < 1) {
      return NextResponse.json(
        { ok: false, error: 'period_days must be a positive number' },
        { status: 400 }
      );
    }

    // Generate unique license key
    const licenseKey = uuidv4();
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.period_days);

    // Create JWT payload
    const payload = {
      lic: 'LVX',
      sub: body.email,
      jti: licenseKey,
      tier: body.plan,
      device_limit: body.device_limit,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    // Sign the JWT token
    const token = await signLicenseToken(payload);

    // Store in Supabase
    const supabase = createSupabaseClient();
    const { error: insertError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        jwt: token,
        email: body.email,
        plan: body.plan,
        device_limit: body.device_limit,
        expires_at: expiresAt.toISOString(),
        current_devices: [],
        revoked: false
      });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { ok: false, error: 'Failed to store license in database' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      ok: true,
      data: {
        token,
        license_key: licenseKey,
        expires_at: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error issuing license:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
