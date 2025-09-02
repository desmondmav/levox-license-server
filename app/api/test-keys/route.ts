import { NextRequest, NextResponse } from 'next/server';
import { signLicenseToken, verifyLicenseToken } from '@/lib/crypto';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Testing RSA keys...');
    
    // Test payload
    const testPayload = {
      lic: 'LVX',
      sub: 'test@example.com',
      jti: 'test-key-123',
      tier: 'pro',
      device_limit: 5,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    console.log('Signing test token...');
    const token = await signLicenseToken(testPayload);
    console.log('Token signed successfully, length:', token.length);

    console.log('Verifying test token...');
    const decoded = await verifyLicenseToken(token);
    console.log('Token verified successfully:', decoded.jti);

    return NextResponse.json({
      ok: true,
      message: 'RSA keys are working correctly',
      test_results: {
        token_length: token.length,
        decoded_jti: decoded.jti,
        decoded_tier: decoded.tier
      }
    });

  } catch (error: any) {
    console.error('RSA key test failed:', error);
    return NextResponse.json({
      ok: false,
      error: `RSA key test failed: ${error.message}`,
      stack: error.stack
    }, { status: 500 });
  }
}
