import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { generateRequestId, logApiRequest, logApiResponse, logDataProcessing, logError } from '../../lib/debug-logger';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    logError('/api/banks', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/banks', new Error('Supabase client error'), supabaseResult.error, requestId);
    return res.status(500).json({ 
      error: 'Erro ao configurar banco de dados',
      details: supabaseResult.error
    });
  }

  const supabase = supabaseResult.client;
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });

  try {
    logApiRequest('/api/banks', {}, requestId);
    
    // Buscar itemIds únicos do Supabase
    logDataProcessing('fetchItemIds', null, null, requestId);
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('itemId')
      .order('itemId');

    if (error) {
      // Se tabela não existe, retornar array vazio
      if (error.code === 'PGRST205') {
        const duration = Date.now() - startTime;
        logApiResponse('/api/banks', { banksCount: 0 }, requestId, duration);
        return res.status(200).json({ banks: [] });
      }
      logError('/api/banks', error, { step: 'fetchItemIds' }, requestId);
      return res.status(500).json({ 
        error: 'Erro ao buscar contas do banco de dados',
        details: error.message 
      });
    }

    // Obter itemIds únicos do Supabase
    const itemIdsArray = accounts?.map(acc => acc.itemId).filter(Boolean) || [];
    const uniqueItemIdsFromSupabase = Array.from(new Set(itemIdsArray));
    logDataProcessing('fetchItemIds', null, { itemIdsCount: uniqueItemIdsFromSupabase.length }, requestId);

    // Usar apenas itemIds do Supabase (fetchItems não existe no SDK)
    const allItemIds = uniqueItemIdsFromSupabase;

    // Buscar informações detalhadas dos items
    logDataProcessing('fetchBanksDetails', { itemIdsCount: allItemIds.length }, null, requestId);
    const banks = await Promise.all(
      allItemIds.map(async (itemId) => {
        try {
          const item = await client.fetchItem(itemId);
          const connector = await client.fetchConnector(item.connector.id);
          return {
            itemId: item.id,
            connectorId: item.connector.id,
            bankName: connector.name,
            connectorName: connector.name, // Adicionar explicitamente
            status: item.status,
            createdAt: item.createdAt,
            lastUpdatedAt: (item as any).updatedAt || item.createdAt,
          };
        } catch (err: any) {
          logError('/api/banks', err, { itemId }, requestId);
          return null;
        }
      })
    );

    // Filtrar nulls e ordenar por data de criação
    const validBanks = banks
      .filter(bank => bank !== null)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    logDataProcessing('fetchBanksDetails', { itemIdsCount: allItemIds.length }, { banksCount: validBanks.length }, requestId);
    const duration = Date.now() - startTime;
    logApiResponse('/api/banks', { banksCount: validBanks.length }, requestId, duration);
    res.status(200).json({ banks: validBanks });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/banks', error, {}, requestId);
    res.status(500).json({ 
      error: 'Erro ao buscar bancos',
      details: error.message || 'Internal server error' 
    });
  }
}
