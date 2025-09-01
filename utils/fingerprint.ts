import crypto from 'crypto';

/**
 * Normalize device fingerprint for consistent storage and comparison
 * This ensures that device fingerprints are stored in a standardized format
 */
export const normalizeDeviceFingerprint = (fingerprint: string): string => {
  if (!fingerprint || typeof fingerprint !== 'string') {
    throw new Error('Invalid device fingerprint provided');
  }

  // Trim whitespace and convert to lowercase
  let normalized = fingerprint.trim().toLowerCase();
  
  // Remove any non-alphanumeric characters except hyphens and underscores
  normalized = normalized.replace(/[^a-z0-9\-_]/g, '');
  
  // Ensure minimum length
  if (normalized.length < 8) {
    throw new Error('Device fingerprint must be at least 8 characters long');
  }
  
  // Maximum length to prevent abuse
  if (normalized.length > 128) {
    normalized = normalized.substring(0, 128);
  }
  
  return normalized;
};

/**
 * Generate a deterministic device fingerprint from multiple identifiers
 * This can be used by the CLI to create consistent fingerprints
 */
export const generateDeviceFingerprint = (
  identifiers: Record<string, string>
): string => {
  const sortedKeys = Object.keys(identifiers).sort();
  const fingerprintData = sortedKeys
    .map(key => `${key}:${identifiers[key]}`)
    .join('|');
  
  // Create a hash of the combined identifiers
  const hash = crypto.createHash('sha256');
  hash.update(fingerprintData);
  
  return hash.digest('hex').substring(0, 32);
};

/**
 * Validate device fingerprint format
 */
export const isValidDeviceFingerprint = (fingerprint: string): boolean => {
  try {
    normalizeDeviceFingerprint(fingerprint);
    return true;
  } catch {
    return false;
  }
};

/**
 * Example usage for CLI developers:
 * 
 * const deviceId = generateDeviceFingerprint({
 *   hostname: os.hostname(),
 *   platform: os.platform(),
 *   arch: os.arch(),
 *   username: os.userInfo().username
 * });
 * 
 * // Send to server: { "device_fingerprint": deviceId }
 */
