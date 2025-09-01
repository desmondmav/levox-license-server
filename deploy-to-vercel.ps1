# Levox License Server - Vercel Deployment Helper
# This script helps prepare your project for Vercel deployment

Write-Host "Levox License Server - Vercel Deployment Helper" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script from your project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 1: Generating Production RSA Keys..." -ForegroundColor Yellow

# Generate new RSA keys for production
try {
    $nodeScript = @"
const crypto = require('crypto');
const fs = require('fs');

// Generate new RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Save keys
fs.writeFileSync('production_private_key.pem', privateKey);
fs.writeFileSync('production_public_key.pem', publicKey);

// Convert to base64 for environment variables
const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

console.log('\\n=== PRODUCTION RSA KEYS GENERATED ===');
console.log('\\nPRIVATE_KEY (base64):');
console.log(privateKeyBase64);
console.log('\\nPUBLIC_KEY (base64):');
console.log(publicKeyBase64);
console.log('\\n=== SAVE THESE FOR VERCEL ENVIRONMENT VARIABLES ===');
"@

    $nodeScript | Out-File -FilePath "temp_generate_keys.js" -Encoding UTF8
    node temp_generate_keys.js
    
    # Clean up temp file
    Remove-Item "temp_generate_keys.js"
    
    Write-Host "`nStep 2: Environment Variables for Vercel" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    Write-Host "Copy these to your Vercel environment variables:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "SUPABASE_URL=https://wzjgeulsccdgfosehxjg.supabase.co" -ForegroundColor White
    Write-Host "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6amdldWxzY2NkZ2Zvc2VoeGpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0ODU4OSwiZXhwIjoyMDcyMjI0NTg5fQ.84pXRNdRXwWcFVCi3uXJBwfmDbntIRjTfVe9zVdBLG0" -ForegroundColor White
    Write-Host "PRIVATE_KEY=[PASTE_BASE64_PRIVATE_KEY_FROM_ABOVE]" -ForegroundColor White
    Write-Host "PUBLIC_KEY=[PASTE_BASE64_PUBLIC_KEY_FROM_ABOVE]" -ForegroundColor White
    Write-Host "ADMIN_ISSUE_TOKEN=fc1c73570953fd5c0ff7b756bfc013973a11bb51d8f113ca4fa221434af1260d" -ForegroundColor White
    Write-Host "JWT_ISSUER=levox-license-server" -ForegroundColor White
    Write-Host "JWT_AUDIENCE=levox-cli" -ForegroundColor White
    Write-Host "NODE_ENV=production" -ForegroundColor White
    
    Write-Host "`nStep 3: Next Steps" -ForegroundColor Yellow
    Write-Host "================" -ForegroundColor Yellow
    Write-Host "1. Go to https://vercel.com and create a new project" -ForegroundColor Cyan
    Write-Host "2. Connect your GitHub repository" -ForegroundColor Cyan
    Write-Host "3. Add the environment variables above in Vercel dashboard" -ForegroundColor Cyan
    Write-Host "4. Deploy!" -ForegroundColor Cyan
    
    Write-Host "`nProduction keys saved as:" -ForegroundColor Green
    Write-Host "- production_private_key.pem" -ForegroundColor Cyan
    Write-Host "- production_public_key.pem" -ForegroundColor Cyan
    
    Write-Host "`nIMPORTANT: Never commit these production keys to Git!" -ForegroundColor Red
    Write-Host "Add them to .gitignore if they're not already there." -ForegroundColor Red
    
} catch {
    Write-Host "ERROR: Failed to generate keys: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
