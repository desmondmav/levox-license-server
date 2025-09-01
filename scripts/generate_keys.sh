#!/bin/bash

# Generate RSA Key Pair for Levox License Server
# This script creates a private key for the server and a public key for the CLI

echo "🔑 Generating RSA Key Pair for Levox License Server..."

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is not installed. Please install OpenSSL first."
    echo "   On macOS: brew install openssl"
    echo "   On Ubuntu/Debian: sudo apt-get install openssl"
    echo "   On Windows: Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html"
    exit 1
fi

# Create keys directory if it doesn't exist
mkdir -p keys

# Generate private key (2048-bit RSA)
echo "📝 Generating private key (private_key.pem)..."
openssl genrsa -out private_key.pem 2048

if [ $? -eq 0 ]; then
    echo "✅ Private key generated successfully"
    # Set restrictive permissions on private key
    chmod 600 private_key.pem
    echo "🔒 Private key permissions set to 600 (owner read/write only)"
else
    echo "❌ Failed to generate private key"
    exit 1
fi

# Generate public key from private key
echo "📝 Generating public key (public_key.pem)..."
openssl rsa -in private_key.pem -pubout -out public_key.pem

if [ $? -eq 0 ]; then
    echo "✅ Public key generated successfully"
    chmod 644 public_key.pem
    echo "🔓 Public key permissions set to 644 (owner read/write, group/others read)"
else
    echo "❌ Failed to generate public key"
    exit 1
fi

# Display key information
echo ""
echo "📋 Key Information:"
echo "==================="
echo "Private Key: private_key.pem (keep secret!)"
echo "Public Key:  public_key.pem (safe to share)"
echo "Key Size:    2048 bits"
echo "Algorithm:  RSA"

# Security warnings
echo ""
echo "⚠️  SECURITY WARNINGS:"
echo "======================"
echo "1. NEVER commit private_key.pem to version control"
echo "2. Keep private_key.pem secure and accessible only to the server"
echo "3. The public_key.pem can be embedded in your CLI application"
echo "4. For production, consider using environment variables instead of files"

# Verify keys
echo ""
echo "🔍 Verifying generated keys..."
if openssl rsa -in private_key.pem -check -noout; then
    echo "✅ Private key is valid"
else
    echo "❌ Private key validation failed"
    exit 1
fi

if openssl rsa -pubin -in public_key.pem -text -noout > /dev/null 2>&1; then
    echo "✅ Public key is valid"
else
    echo "❌ Public key validation failed"
    exit 1
fi

echo ""
echo "🎉 RSA key pair generation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy private_key.pem to your project root"
echo "2. Copy public_key.pem to your CLI application"
echo "3. Update your .env file with PRIVATE_KEY_PATH=./private_key.pem"
echo "4. Test your setup with: npm run test"
