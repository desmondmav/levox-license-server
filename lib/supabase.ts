import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

// Create Supabase client with service role key for server-side operations
// IMPORTANT: This key has admin privileges - never expose to client-side code
export const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Database types for TypeScript
export interface License {
  id: string;
  license_key: string;
  jwt: string;
  email: string;
  plan: 'pro' | 'enterprise';
  device_limit: number;
  current_devices: string[];
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface LicenseActivation {
  id: string;
  license_key: string;
  device_fingerprint: string;
  activated_at: string;
  meta: any;
}
