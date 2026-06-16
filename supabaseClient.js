import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Instance klien Supabase yang siap di-import di komponen mana saja
export const supabase = createClient(supabaseUrl, supabaseAnonKey);