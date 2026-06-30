import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "bubbleblaster";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Se as variaveis de ambiente nao estiverem configuradas, o app inteiro
// continua funcionando (OCR + remocao de texto), so o login e o historico
// ficam escondidos. Isso deixa o Supabase 100% opcional, como pedido.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
