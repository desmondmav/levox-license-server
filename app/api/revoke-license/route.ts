import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// Types for request validation
interface RevokeLicenseRequest {
  license_key: string;
}

interface RevokeLicenseResponse {
  ok: boolean;
  error?: string;
  data?: {
    message: string;
    license_key: string;
    revoked: boolean;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<RevokeLicenseResponse>> {
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

    // Parse request body
    let body: RevokeLicenseRequest;
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

    // Check if license exists
    const supabase = createSupabaseClient();
    const { data: existingLicense, error: fetchError } = await supabase
      .from('licenses')
      .select('license_key, revoked')
      .eq('license_key', body.license_key)
      .single();

    if (fetchError || !existingLicense) {
      return NextResponse.json(
        { ok: false, error: 'License not found' },
        { status: 404 }
      );
    }

    // Check if already revoked
    if (existingLicense.revoked) {
      return NextResponse.json(
        { ok: false, error: 'License is already revoked' },
        { status: 400 }
      );
    }

    // Revoke the license
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ revoked: true })
      .eq('license_key', body.license_key);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to revoke license in database' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      ok: true,
      data: {
        message: 'License revoked successfully',
        license_key: body.license_key,
        revoked: true
      }
    });

  } catch (error) {
    console.error('Error revoking license:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
