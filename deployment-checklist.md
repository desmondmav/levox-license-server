# 🚀 Levox License Server Deployment Checklist

This checklist covers the complete setup and deployment process for the Levox License Server.

## 📋 Prerequisites

- [ ] Node.js 18+ installed
- [ ] Supabase account and project created
- [ ] Vercel account (for deployment)
- [ ] Git repository set up
- [ ] OpenSSL installed (for key generation)

## 🔑 Step 1: Generate RSA Keys

```bash
# Make the script executable
chmod +x scripts/generate_keys.sh

# Generate RSA key pair
./scripts/generate_keys.sh
```

**Expected Output:**
- `private_key.pem` (keep secret!)
- `public_key.pem` (safe to share)

**Security Notes:**
- ✅ `private_key.pem` should NEVER be committed to version control
- ✅ Add `private_key.pem` to `.gitignore`
- ✅ Keep `private_key.pem` secure and accessible only to the server

## 🗄️ Step 2: Set Up Supabase Database

### 2.1 Create Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create licenses table
create table licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique,
  jwt text,
  email text not null,
  plan text check (plan in ('free','pro','enterprise')) default 'pro',
  device_limit int default 3,
  current_devices text[],       -- array of device fingerprint strings
  expires_at timestamptz,
  revoked boolean default false,
  created_at timestamptz default now()
);

-- Create license_activations table
create table license_activations (
  id uuid primary key default gen_random_uuid(),
  license_key text references licenses(license_key),
  device_fingerprint text,
  activated_at timestamptz default now(),
  meta jsonb
);

-- Create indexes for performance
create index idx_licenses_license_key on licenses(license_key);
create index idx_licenses_email on licenses(email);
create index idx_licenses_revoked on licenses(revoked);
create index idx_license_activations_license_key on license_activations(license_key);
```

### 2.2 Configure Row Level Security (RLS)

```sql
-- Disable RLS for server role (service role bypasses RLS)
alter table licenses disable row level security;
alter table license_activations disable row level security;

-- Note: Service role key has admin privileges and bypasses RLS
-- This is the intended behavior for server-side operations
```

### 2.3 Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Step 3: Local Development Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Environment Configuration

1. Copy `env.example` to `.env`
2. Fill in the values:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# RSA Key Paths
PRIVATE_KEY_PATH=./private_key.pem
PUBLIC_KEY_PATH=./public_key.pem

# Admin Authentication
ADMIN_ISSUE_TOKEN=your-secure-admin-token-here

# JWT Configuration
JWT_ISSUER=levox-license-server
JWT_AUDIENCE=levox-cli

# Environment
NODE_ENV=development
```

**Generate Admin Token:**
```bash
# Generate a secure random token
openssl rand -hex 32
```

### 3.3 Test Locally

```bash
# Start development server
npm run dev

# In another terminal, run tests
npm run test
```

**Expected Test Output:**
```
🚀 Starting Levox License Server Tests
📍 Testing against: http://localhost:3000
🔐 Admin Token: ✅ Set

🔑 Testing License Issuance...
✅ License issued successfully
   License Key: [uuid]
   Expires: [date]

🔍 Testing License Verification...
✅ License verification successful
   Tier: pro
   Device Limit: 3
   Current Devices: 1
   Device Limit Exceeded: false

🚫 Testing License Revocation...
✅ License revoked successfully

🔍 Testing Revoked License Verification...
✅ Revoked license correctly rejected

📊 Test Summary
================
License Issuance: ✅ PASS
License Verification: ✅ PASS
License Revocation: ✅ PASS
Revoked License Check: ✅ PASS

🎉 All tests passed! License server is working correctly.
```

## 🚀 Step 4: Deploy to Vercel

### 4.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 4.2 Set Environment Variables

In your Vercel project dashboard, go to Settings → Environment Variables and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key-here` | Production, Preview, Development |
| `ADMIN_ISSUE_TOKEN` | `your-secure-admin-token-here` | Production, Preview, Development |
| `JWT_ISSUER` | `levox-license-server` | Production, Preview, Development |
| `JWT_AUDIENCE` | `levox-cli` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production, Preview, Development |

**For RSA Keys in Production:**
Since Vercel doesn't support file uploads, you need to:

1. **Option A: Environment Variables (Recommended)**
   - Convert your private key to a single line:
     ```bash
     cat private_key.pem | tr '\n' '\\n'
     ```
   - Set `PRIVATE_KEY` environment variable with the result
   - Set `PUBLIC_KEY` environment variable with your public key

2. **Option B: Base64 Encoding**
   - Encode keys:
     ```bash
     base64 -i private_key.pem
     base64 -i public_key.pem
     ```
   - Set `PRIVATE_KEY_B64` and `PUBLIC_KEY_B64` environment variables
   - Update `lib/crypto.ts` to decode base64

### 4.3 Deploy

1. Push your code to Git
2. Vercel will automatically deploy
3. Note your deployment URL (e.g., `https://your-project.vercel.app`)

## 🧪 Step 5: Production Testing

### 5.1 Test Production Endpoints

```bash
# Set your production URL
export PROD_URL="https://your-project.vercel.app"
export ADMIN_TOKEN="your-admin-token"

# Test license issuance
curl -H "X-ADMIN-TOKEN: $ADMIN_TOKEN" \
     -X POST "$PROD_URL/api/issue-license" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@levox.dev","plan":"pro","device_limit":3,"period_days":365}'

# Test license verification (use token from previous response)
curl -X POST "$PROD_URL/api/verify-license" \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_JWT_TOKEN_HERE","device_fingerprint":"test-device-001"}'

# Test license revocation
curl -H "X-ADMIN-TOKEN: $ADMIN_TOKEN" \
     -X POST "$PROD_URL/api/revoke-license" \
     -H "Content-Type: application/json" \
     -d '{"license_key":"YOUR_LICENSE_KEY_HERE"}'
```

### 5.2 Verify Production Behavior

- [ ] License issuance works with admin token
- [ ] License verification validates JWT signatures
- [ ] Device fingerprint tracking works
- [ ] License revocation prevents verification
- [ ] Error handling returns proper HTTP status codes

## 🔒 Step 6: Security Hardening

### 6.1 Environment Variable Security

- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` is set and secure
- [ ] ✅ `ADMIN_ISSUE_TOKEN` is a strong random string
- [ ] ✅ RSA private key is not exposed in client code
- [ ] ✅ All sensitive values are in environment variables

### 6.2 Access Control

- [ ] ✅ Admin endpoints require `X-ADMIN-TOKEN` header
- [ ] ✅ Service role key has minimal required permissions
- [ ] ✅ RLS is disabled for server operations (intended)

### 6.3 Monitoring

- [ ] Set up Vercel analytics
- [ ] Monitor API usage and errors
- [ ] Set up alerts for failed license verifications

## 📱 Step 7: CLI Integration

### 7.1 Embed Public Key

Copy `public_key.pem` to your CLI application for offline JWT verification.

### 7.2 API Endpoints

Your CLI should use these endpoints:

- **License Verification**: `https://your-project.vercel.app/api/verify-license`
- **License Issuance**: `https://your-project.vercel.app/api/issue-license` (admin only)
- **License Revocation**: `https://your-project.vercel.app/api/revoke-license` (admin only)

## ✅ Final Verification

- [ ] Local development server works
- [ ] All tests pass locally
- [ ] Production deployment successful
- [ ] Production endpoints respond correctly
- [ ] RSA key pair working (signing/verification)
- [ ] Supabase database properly configured
- [ ] Environment variables set in Vercel
- [ ] Security measures implemented

## 🆘 Troubleshooting

### Common Issues

1. **"Private key not found"**
   - Check `PRIVATE_KEY_PATH` in `.env`
   - Ensure `private_key.pem` exists in project root

2. **"Supabase connection failed"**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Check Supabase project status

3. **"JWT verification failed"**
   - Ensure public/private key pair match
   - Check key file permissions

4. **"Admin token invalid"**
   - Verify `ADMIN_ISSUE_TOKEN` in `.env`
   - Check `X-ADMIN-TOKEN` header in requests

### Support

- Check Vercel deployment logs
- Verify Supabase database logs
- Test endpoints individually with curl
- Use `npm run test` for local validation

---

**🎉 Congratulations! Your Levox License Server is now deployed and ready for production use.**
