import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// JWT payload interface
export interface LicensePayload {
  lic: string;
  sub: string;
  jti: string;
  tier: string;
  device_limit: number;
  iat: number;
  exp: number;
}

// Load private key for signing
const loadPrivateKey = (): string => {
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;
  
  if (!privateKeyPath) {
    throw new Error('PRIVATE_KEY_PATH environment variable is not set');
  }

  try {
    // For local development, read from file
    if (process.env.NODE_ENV === 'development') {
      const fullPath = path.resolve(process.cwd(), privateKeyPath);
      return fs.readFileSync(fullPath, 'utf8');
    } else {
      // For production (Vercel), the key should be in environment variable
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable is not set in production');
      }
      return privateKey;
    }
  } catch (error) {
    throw new Error(`Failed to load private key: ${error}`);
  }
};

// Load public key for verification
const loadPublicKey = (): string => {
  const publicKeyPath = process.env.PUBLIC_KEY_PATH;
  
  if (!publicKeyPath) {
    throw new Error('PUBLIC_KEY_PATH environment variable is not set');
  }

  try {
    // For local development, read from file
    if (process.env.NODE_ENV === 'development') {
      const fullPath = path.resolve(process.cwd(), publicKeyPath);
      return fs.readFileSync(fullPath, 'utf8');
    } else {
      // For production (Vercel), the key should be in environment variable
      const publicKey = process.env.PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('PUBLIC_KEY environment variable is not set in production');
      }
      return publicKey;
    }
  } catch (error) {
    throw new Error(`Failed to load public key: ${error}`);
  }
};

// Sign a license token using RS256 algorithm
export const signLicenseToken = async (payload: LicensePayload): Promise<string> => {
  try {
    const privateKey = loadPrivateKey();
    
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      issuer: process.env.JWT_ISSUER || 'levox-license-server',
      audience: process.env.JWT_AUDIENCE || 'levox-cli'
    });

    return token;
  } catch (error) {
    throw new Error(`Failed to sign license token: ${error}`);
  }
};

// Verify a license token using RS256 algorithm
export const verifyLicenseToken = async (token: string): Promise<any> => {
  try {
    const publicKey = loadPublicKey();
    
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER || 'levox-license-server',
      audience: process.env.JWT_AUDIENCE || 'levox-cli'
    });

    return decoded;
  } catch (error) {
    throw new Error(`Failed to verify license token: ${error}`);
  }
};

// Decode JWT without verification (for reading header/payload)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error(`Failed to decode token: ${error}`);
  }
};
