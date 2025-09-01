#!/usr/bin/env node

/**
 * Test script for Levox License Server
 * Tests the complete flow: issue → verify → revoke
 * 
 * Usage: npm run test
 * 
 * Prerequisites:
 * - Local server running (npm run dev)
 * - Environment variables set in .env
 * - RSA keys generated and placed in project root
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_ISSUE_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_ISSUE_TOKEN not set in environment');
  console.error('Please set it in your .env file or export it');
  process.exit(1);
}

// Test data
const testLicense = {
  email: 'test@levox.dev',
  plan: 'pro',
  device_limit: 3,
  period_days: 365
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testIssueLicense() {
  console.log('\n🔑 Testing License Issuance...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/issue-license`, {
      headers: { 'X-ADMIN-TOKEN': ADMIN_TOKEN },
      body: testLicense
    });

    if (response.status === 200 && response.data.ok) {
      console.log('✅ License issued successfully');
      console.log(`   License Key: ${response.data.data.license_key}`);
      console.log(`   Expires: ${response.data.data.expires_at}`);
      return response.data.data;
    } else {
      console.log('❌ License issuance failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error issuing license:', error.message);
    return null;
  }
}

async function testVerifyLicense(licenseData) {
  if (!licenseData) {
    console.log('⏭️  Skipping verification test - no license data');
    return;
  }

  console.log('\n🔍 Testing License Verification...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/verify-license`, {
      body: {
        token: licenseData.token,
        device_fingerprint: 'test-device-001'
      }
    });

    if (response.status === 200 && response.data.ok) {
      console.log('✅ License verification successful');
      console.log(`   Tier: ${response.data.data.tier}`);
      console.log(`   Device Limit: ${response.data.data.device_limit}`);
      console.log(`   Current Devices: ${response.data.data.current_devices_count}`);
      console.log(`   Device Limit Exceeded: ${response.data.data.device_limit_exceeded}`);
      return true;
    } else {
      console.log('❌ License verification failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying license:', error.message);
    return false;
  }
}

async function testRevokeLicense(licenseData) {
  if (!licenseData) {
    console.log('⏭️  Skipping revocation test - no license data');
    return;
  }

  console.log('\n🚫 Testing License Revocation...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/revoke-license`, {
      headers: { 'X-ADMIN-TOKEN': ADMIN_TOKEN },
      body: { license_key: licenseData.license_key }
    });

    if (response.status === 200 && response.data.ok) {
      console.log('✅ License revoked successfully');
      return true;
    } else {
      console.log('❌ License revocation failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error revoking license:', error.message);
    return false;
  }
}

async function testRevokedLicenseVerification(licenseData) {
  if (!licenseData) {
    console.log('⏭️  Skipping revoked verification test - no license data');
    return;
  }

  console.log('\n🔍 Testing Revoked License Verification...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/verify-license`, {
      body: { token: licenseData.token }
    });

    if (response.status === 403 && !response.data.ok) {
      console.log('✅ Revoked license correctly rejected');
      return true;
    } else {
      console.log('❌ Revoked license verification failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing revoked license:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Levox License Server Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🔐 Admin Token: ${ADMIN_TOKEN ? '✅ Set' : '❌ Missing'}`);

  // Test 1: Issue License
  const licenseData = await testIssueLicense();
  
  // Test 2: Verify License
  const verifySuccess = await testVerifyLicense(licenseData);
  
  // Test 3: Revoke License
  const revokeSuccess = await testRevokeLicense(licenseData);
  
  // Test 4: Verify Revoked License
  const revokedVerifySuccess = await testRevokedLicenseVerification(licenseData);

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`License Issuance: ${licenseData ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`License Verification: ${verifySuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`License Revocation: ${revokeSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Revoked License Check: ${revokedVerifySuccess ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = licenseData && verifySuccess && revokeSuccess && revokedVerifySuccess;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! License server is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testIssueLicense,
  testVerifyLicense,
  testRevokeLicense,
  testRevokedLicenseVerification
};
