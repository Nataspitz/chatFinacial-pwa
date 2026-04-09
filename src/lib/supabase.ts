import { createClient } from '@supabase/supabase-js'

const embeddedSupabaseUrl = 'https://sdyzfpqmbxifznthkjhf.supabase.co'
const embeddedSupabaseAnonKey = 'sb_publishable_LM4CEmpmQ0iSdWVMtDg4Pg_vKsKNodW'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? embeddedSupabaseUrl
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const resolvedSupabaseAnonKey = supabaseAnonKey ?? embeddedSupabaseAnonKey
export const isSupabaseConfigured = Boolean(supabaseUrl && resolvedSupabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error('Supabase env vars ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.')
}

export const supabase = createClient(supabaseUrl, resolvedSupabaseAnonKey)
