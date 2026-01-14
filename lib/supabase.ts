import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export interface SupabaseValidationResult {
  isValid: boolean;
  error?: string;
  client?: SupabaseClient;
}

/**
 * Valida se as variáveis de ambiente do Supabase estão configuradas
 */
export function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  if (!SUPABASE_URL || SUPABASE_URL.trim() === '') {
    return {
      isValid: false,
      error: 'SUPABASE_URL não está configurada. Verifique as variáveis de ambiente.',
    };
  }

  if (!SUPABASE_KEY || SUPABASE_KEY.trim() === '') {
    return {
      isValid: false,
      error: 'SUPABASE_KEY não está configurada. Verifique as variáveis de ambiente.',
    };
  }

  return { isValid: true };
}

/**
 * Cria um cliente Supabase validado
 * Retorna o cliente apenas se as configurações estiverem válidas
 */
export function createSupabaseClient(): SupabaseValidationResult {
  const validation = validateSupabaseConfig();
  
  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error,
    };
  }

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_KEY);
    return {
      isValid: true,
      client,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Erro ao criar cliente Supabase: ${error.message}`,
    };
  }
}

/**
 * Verifica se o Supabase está configurado e retorna erro padronizado
 * Útil para retornar erros consistentes nos endpoints
 */
export function getSupabaseErrorResponse(): { error: string; details?: string } | null {
  const validation = validateSupabaseConfig();
  
  if (!validation.isValid) {
    return {
      error: 'Banco de dados não configurado',
      details: validation.error,
    };
  }

  return null;
}
