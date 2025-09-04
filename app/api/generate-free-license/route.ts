import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { signLicenseToken } from '@/lib/crypto'
import { createSupabaseClient } from '@/lib/supabase'
import { emailService } from '@/lib/smtp'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()

    // Check if license already exists for this email
    const { data: existingLicense } = await supabase
      .from('licenses')
      .select('id')
      .eq('email', email)
      .eq('plan', 'enterprise') // Changed to 'enterprise'
      .single()

    if (existingLicense) {
      return NextResponse.json(
        { success: false, error: 'An enterprise license already exists for this email' }, // Updated error message
        { status: 409 }
      )
    }

    // Generate license key
    const licenseKey = uuidv4()
    
    // Calculate expiration (1 year from now)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Create JWT payload for license - Use 'enterprise' tier to offer Enterprise features
    const payload = {
      lic: 'LVX',
      sub: email,
      jti: licenseKey,
      tier: 'enterprise', // Changed to 'enterprise' to offer Enterprise features
      device_limit: 1,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    }

    // Sign the JWT token
    let token: string
    try {
      token = await signLicenseToken(payload)
    } catch (jwtError) {
      console.error('JWT signing failed:', jwtError)
      return NextResponse.json(
        { success: false, error: 'License generation failed' },
        { status: 500 }
      )
    }

    // Store license in database
    const { error: licenseError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        jwt: token,
        email: email,
        plan: 'enterprise', // Changed to 'enterprise'
        device_limit: 1,
        expires_at: expiresAt.toISOString(),
        current_devices: [],
        revoked: false
      })

    if (licenseError) {
      console.error('License storage error:', licenseError)
      return NextResponse.json(
        { success: false, error: 'Failed to store license' },
        { status: 500 }
      )
    }

    // Send license email
    try {
      await emailService.sendFreeLicenseEmail(email, licenseKey)
      console.log(`Enterprise license email sent to ${email}`) // Updated log message
    } catch (emailError) {
      console.error('Failed to send license email:', emailError)
      // Don't fail the license generation if email fails
    }

    return NextResponse.json({
      success: true,
      license_key: licenseKey,
      expires_at: expiresAt.toISOString(),
      message: 'Enterprise license generated successfully!' // Updated success message
    })

  } catch (error) {
    console.error('Free license generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
