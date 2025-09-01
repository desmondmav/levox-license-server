# 🔑 Levox License Server

A secure, production-ready license server for the Levox CLI with RS256-signed JWT tokens and Supabase backend. Deployable to Vercel with serverless functions.

## ✨ Features

- **🔐 Secure JWT Signing**: RS256 algorithm with RSA key pairs
- **🌐 Vercel Ready**: Serverless deployment with Next.js App Router
- **🗄️ Supabase Backend**: PostgreSQL database with real-time capabilities
- **📱 Device Tracking**: Monitor license activations across devices
- **🛡️ Admin Controls**: Secure admin endpoints for license management
- **🧪 Built-in Testing**: Comprehensive test suite for validation
- **📦 TypeScript**: Full type safety and modern development experience

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Levox CLI     │    │  License Server  │    │    Supabase     │
│                 │    │   (Vercel)       │    │                 │
│ • JWT Verify    │◄──►│ • Issue License  │◄──►│ • PostgreSQL    │
│ • Public Key    │    │ • Verify License │    │ • Real-time     │
│ • Offline Check │    │ • Revoke License │    │ • RLS Disabled  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account
- OpenSSL (for key generation)

### 1. Clone and Install

```bash
git clone <your-repo>
cd levox-license-server
npm install
```

### 2. Generate RSA Keys

```bash
# Make executable and run
chmod +x scripts/generate_keys.sh
./scripts/generate_keys.sh
```

This creates:
- `private_key.pem` (keep secret!)
- `public_key.pem` (safe to share)

### 3. Environment Setup

```bash
# Copy example environment
cp env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PRIVATE_KEY_PATH=./private_key.pem
PUBLIC_KEY_PATH=./public_key.pem
ADMIN_ISSUE_TOKEN=your-secure-admin-token
JWT_ISSUER=levox-license-server
JWT_AUDIENCE=levox-cli
NODE_ENV=development
```

### 4. Database Setup

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
  current_devices text[],
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

-- Create indexes
create index idx_licenses_license_key on licenses(license_key);
create index idx_licenses_email on licenses(email);
create index idx_licenses_revoked on licenses(revoked);
create index idx_license_activations_license_key on license_activations(license_key);

-- Disable RLS for server role
alter table licenses disable row level security;
alter table license_activations disable row level security;
```

### 5. Test Locally

```bash
# Start development server
npm run dev

# In another terminal, run tests
npm run test
```

## 📚 API Reference

### Authentication

Admin endpoints require the `X-ADMIN-TOKEN` header with the value from your `ADMIN_ISSUE_TOKEN` environment variable.

### POST /api/issue-license

**Admin Only** - Issue a new license

**Headers:**
```
X-ADMIN-TOKEN: your-admin-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "plan": "pro",
  "device_limit": 3,
  "period_days": 365
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "license_key": "uuid-here",
    "expires_at": "2024-12-31T23:59:59.000Z"
  }
}
```

### POST /api/verify-license

**Public** - Verify a license token

**Request Body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "device_fingerprint": "optional-device-id"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "valid": true,
    "tier": "pro",
    "expires_at": "2024-12-31T23:59:59.000Z",
    "device_limit": 3,
    "current_devices_count": 1,
    "device_limit_exceeded": false
  }
}
```

### POST /api/revoke-license

**Admin Only** - Revoke a license

**Headers:**
```
X-ADMIN-TOKEN: your-admin-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "license_key": "uuid-here"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "License revoked successfully",
    "license_key": "uuid-here",
    "revoked": true
  }
}
```

## 🧪 Testing

### Run Test Suite

```bash
npm run test
```

The test script validates:
1. ✅ License issuance with admin token
2. ✅ License verification and device tracking
3. ✅ License revocation
4. ✅ Revoked license rejection

### Manual Testing with curl

```bash
# Set variables
export BASE_URL="http://localhost:3000"
export ADMIN_TOKEN="your-admin-token"

# Issue a license
curl -H "X-ADMIN-TOKEN: $ADMIN_TOKEN" \
     -X POST "$BASE_URL/api/issue-license" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@levox.dev","plan":"pro","device_limit":3,"period_days":365}'

# Verify license (use token from previous response)
curl -X POST "$BASE_URL/api/verify-license" \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_JWT_TOKEN_HERE","device_fingerprint":"test-device-001"}'

# Revoke license (use license_key from first response)
curl -H "X-ADMIN-TOKEN: $ADMIN_TOKEN" \
     -X POST "$BASE_URL/api/revoke-license" \
     -H "Content-Type: application/json" \
     -d '{"license_key":"YOUR_LICENSE_KEY_HERE"}'
```

## 🚀 Deployment

### Vercel Deployment

1. **Create Vercel Project**
   - Import your Git repository
   - Framework: Next.js
   - Build Command: `npm run build`

2. **Set Environment Variables**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADMIN_ISSUE_TOKEN=your-secure-admin-token
   JWT_ISSUER=levox-license-server
   JWT_AUDIENCE=levox-cli
   NODE_ENV=production
   ```

3. **For RSA Keys in Production**
   Since Vercel doesn't support file uploads:
   
   **Option A: Environment Variables (Recommended)**
   ```bash
   # Convert private key to single line
   cat private_key.pem | tr '\n' '\\n'
   
   # Set in Vercel:
   PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
   PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
   ```

4. **Deploy**
   - Push to Git
   - Vercel auto-deploys
   - Note your deployment URL

### Production Testing

```bash
# Test production endpoints
export PROD_URL="https://your-project.vercel.app"
export ADMIN_TOKEN="your-admin-token"

# Test all endpoints
curl -H "X-ADMIN-TOKEN: $ADMIN_TOKEN" \
     -X POST "$PROD_URL/api/issue-license" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@levox.dev","plan":"pro","device_limit":3,"period_days":365}'
```

## 🔒 Security Features

### JWT Security
- **Algorithm**: RS256 (RSA + SHA256)
- **Key Management**: Private key server-only, public key in CLI
- **Validation**: Full signature verification on every request

### Access Control
- **Admin Endpoints**: Require `X-ADMIN-TOKEN` header
- **Service Role**: Supabase service role key for database access
- **RLS**: Disabled for server operations (intended behavior)

### Environment Security
- **Sensitive Data**: Never committed to version control
- **Key Files**: `private_key.pem` excluded from Git
- **Production**: Environment variables only

## 📱 CLI Integration

### Embed Public Key

Copy `public_key.pem` to your CLI application for offline JWT verification.

### API Endpoints

Your CLI should use these endpoints:

- **License Verification**: `https://your-project.vercel.app/api/verify-license`
- **License Issuance**: `https://your-project.vercel.app/api/issue-license` (admin only)
- **License Revocation**: `https://your-project.vercel.app/api/revoke-license` (admin only)

### Device Fingerprinting

The server accepts device fingerprints for tracking:
- Normalizes and validates input
- Tracks activations in `license_activations` table
- Updates `current_devices` array in licenses table
- Returns `device_limit_exceeded` flag for CLI warnings

## 🛠️ Development

### Project Structure

```
levox-license-server/
├── app/
│   └── api/
│       ├── issue-license/route.ts    # License issuance endpoint
│       ├── verify-license/route.ts   # License verification endpoint
│       └── revoke-license/route.ts   # License revocation endpoint
├── lib/
│   ├── supabase.ts                   # Supabase client configuration
│   └── crypto.ts                     # JWT signing/verification
├── utils/
│   └── fingerprint.ts                # Device fingerprint utilities
├── scripts/
│   ├── generate_keys.sh              # RSA key generation
│   └── test-local.js                 # Local testing suite
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── vercel.json                       # Vercel deployment config
├── env.example                       # Environment variables template
├── deployment-checklist.md           # Deployment guide
└── README.md                         # This file
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run test suite
npm run generate-keys # Generate RSA key pair
npm run lint         # Run ESLint
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access | ✅ |
| `PRIVATE_KEY_PATH` | Path to RSA private key (local dev) | ✅ |
| `PUBLIC_KEY_PATH` | Path to RSA public key (local dev) | ✅ |
| `ADMIN_ISSUE_TOKEN` | Admin authentication token | ✅ |
| `JWT_ISSUER` | JWT issuer claim | ❌ |
| `JWT_AUDIENCE` | JWT audience claim | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |

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

### Getting Help

- Check Vercel deployment logs
- Verify Supabase database logs
- Test endpoints individually with curl
- Use `npm run test` for local validation
- Review the [deployment checklist](deployment-checklist.md)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the [deployment checklist](deployment-checklist.md)
- Review the troubleshooting section above

---

**🎉 Your Levox License Server is ready to secure your CLI applications!**
