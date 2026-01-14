import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Validar Supabase
  const supabaseError = getSupabaseErrorResponse();
  if (supabaseError) {
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
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
    // Buscar itemIds únicos do Supabase
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('itemId')
      .order('itemId');

    if (error) {
      // Se tabela não existe, retornar array vazio
      if (error.code === 'PGRST205') {
        return res.status(200).json({ banks: [] });
      }
      console.error('Error fetching accounts from Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar contas do banco de dados',
        details: error.message 
      });
    }

    // Obter itemIds únicos do Supabase
    const itemIdsArray = accounts?.map(acc => acc.itemId).filter(Boolean) || [];
    const uniqueItemIdsFromSupabase = Array.from(new Set(itemIdsArray));

    // Usar apenas itemIds do Supabase (fetchItems não existe no SDK)
    const allItemIds = uniqueItemIdsFromSupabase;

    // Buscar informações detalhadas dos items
    const banks = await Promise.all(
      allItemIds.map(async (itemId) => {
        try {
          const item = await client.fetchItem(itemId);
          const connector = await client.fetchConnector(item.connector.id);
          return {
            itemId: item.id,
            connectorId: item.connector.id,
            bankName: connector.name,
            status: item.status,
            createdAt: item.createdAt,
            lastUpdatedAt: (item as any).updatedAt || item.createdAt,
          };
        } catch (err) {
          console.error(`Error fetching item ${itemId}:`, err);
          return null;
        }
      })
    );

    // Filtrar nulls e ordenar por data de criação
    const validBanks = banks
      .filter(bank => bank !== null)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    res.status(200).json({ banks: validBanks });
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar bancos',
      details: error.message || 'Internal server error' 
    });
  }
}
