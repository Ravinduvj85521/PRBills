import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration
// The URL provided in the prompt is set as a fallback
const supabaseUrl = process.env.SUPABASE_URL || 'https://yuephwwcshyhpisckdgt.supabase.co';

// Fallback to the provided key if environment variables are missing
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZXBod3djc2h5aHBpc2NrZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjYzNjMsImV4cCI6MjA4NjIwMjM2M30.fE_bVarhxqjxzm_vizUwZqCKDXtMz8UuCAoLHAs1z9Y';

const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || defaultKey;

if (!supabaseKey) {
  console.warn("Supabase API Key is missing. Please set SUPABASE_ANON_KEY in your environment to connect to the database.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);