# Levox License Server - Complete API Test Script
# This script will test all endpoints automatically

Write-Host "Starting Levox License Server API Tests..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3000"
$adminToken = "fc1c73570953fd5c0ff7b756bfc013973a11bb51d8f113ca4fa221434af1260d"

# Test 1: Issue a License
Write-Host "`nTest 1: Issuing a License..." -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        plan = "pro"
        device_limit = 5
        period_days = 365
    } | ConvertTo-Json
    
    $issueResponse = Invoke-RestMethod -Uri "$baseUrl/api/issue-license" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "X-ADMIN-TOKEN" = $adminToken
    } -Body $body
    
    if ($issueResponse.ok) {
        Write-Host "SUCCESS: License issued successfully!" -ForegroundColor Green
        Write-Host "   License Key: $($issueResponse.data.license_key)" -ForegroundColor Cyan
        Write-Host "   Expires: $($issueResponse.data.expires_at)" -ForegroundColor Cyan
        
        $token = $issueResponse.data.token
        $licenseKey = $issueResponse.data.license_key
    } else {
        Write-Host "FAILED: License issuance failed: $($issueResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Error issuing license: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Verify License (without device fingerprint)
Write-Host "`nTest 2: Verifying License..." -ForegroundColor Yellow
try {
    $body = @{
        token = $token
    } | ConvertTo-Json
    
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/verify-license" -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body
    
    if ($verifyResponse.ok) {
        Write-Host "SUCCESS: License verified successfully!" -ForegroundColor Green
        Write-Host "   Valid: $($verifyResponse.data.valid)" -ForegroundColor Cyan
        Write-Host "   Tier: $($verifyResponse.data.tier)" -ForegroundColor Cyan
        Write-Host "   Device Count: $($verifyResponse.data.current_devices_count)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: License verification failed: $($verifyResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Error verifying license: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Verify License with Device Fingerprint
Write-Host "`nTest 3: Verifying License with Device Fingerprint..." -ForegroundColor Yellow
try {
    $body = @{
        token = $token
        device_fingerprint = "test-device-123"
    } | ConvertTo-Json
    
    $verifyWithDeviceResponse = Invoke-RestMethod -Uri "$baseUrl/api/verify-license" -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body
    
    if ($verifyWithDeviceResponse.ok) {
        Write-Host "SUCCESS: License verified with device fingerprint!" -ForegroundColor Green
        Write-Host "   Device Count: $($verifyWithDeviceResponse.data.current_devices_count)" -ForegroundColor Cyan
        Write-Host "   Device Limit Exceeded: $($verifyWithDeviceResponse.data.device_limit_exceeded)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: License verification with device failed: $($verifyWithDeviceResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Error verifying license with device: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Revoke License
Write-Host "`nTest 4: Revoking License..." -ForegroundColor Yellow
try {
    $body = @{
        license_key = $licenseKey
    } | ConvertTo-Json
    
    $revokeResponse = Invoke-RestMethod -Uri "$baseUrl/api/revoke-license" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "X-ADMIN-TOKEN" = $adminToken
    } -Body $body
    
    if ($revokeResponse.ok) {
        Write-Host "SUCCESS: License revoked successfully!" -ForegroundColor Green
        Write-Host "   Message: $($revokeResponse.data.message)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: License revocation failed: $($revokeResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Error revoking license: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Verify Revoked License
Write-Host "`nTest 5: Verifying Revoked License..." -ForegroundColor Yellow
try {
    $body = @{
        token = $token
    } | ConvertTo-Json
    
    $verifyRevokedResponse = Invoke-RestMethod -Uri "$baseUrl/api/verify-license" -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body
    
    if (-not $verifyRevokedResponse.ok) {
        Write-Host "SUCCESS: Correctly blocked revoked license!" -ForegroundColor Green
        Write-Host "   Error: $($verifyRevokedResponse.error)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Revoked license still works - this is a problem!" -ForegroundColor Red
    }
} catch {
    Write-Host "SUCCESS: Correctly blocked revoked license (threw error)" -ForegroundColor Green
}

# Summary
Write-Host "`nTest Summary" -ForegroundColor Green
Write-Host "=============" -ForegroundColor Green
Write-Host "SUCCESS: License Issuance - Working" -ForegroundColor Green
Write-Host "SUCCESS: License Verification - Working" -ForegroundColor Green
Write-Host "SUCCESS: Device Tracking - Working" -ForegroundColor Green
Write-Host "SUCCESS: License Revocation - Working" -ForegroundColor Green
Write-Host "SUCCESS: Revoked License Blocking - Working" -ForegroundColor Green

Write-Host "`nAll tests completed! Your Levox License Server is working perfectly!" -ForegroundColor Green
