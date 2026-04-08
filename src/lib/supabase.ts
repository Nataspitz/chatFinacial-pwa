import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackAnonKey = 'missing-anon-key'

if (!isSupabaseConfigured) {
  console.error('Supabase env vars ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.')
}

export const supabase = createClient(supabaseUrl ?? fallbackUrl, supabaseAnonKey ?? fallbackAnonKey)
