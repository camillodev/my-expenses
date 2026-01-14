import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createClient } from '@supabase/supabase-js';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Mapeamento dos bancos solicitados (nomes podem variar no Pluggy)
// Baseado na documentação do Pluggy, estes são os nomes comuns dos connectors
const TARGET_BANKS = [
  { name: 'Nubank', searchTerms: ['nubank', 'nu', 'nu bank'] },
  { name: 'Bradesco', searchTerms: ['bradesco'] },
  { name: 'BTG Banking', searchTerms: ['btg banking', 'btg pactual banking', 'btg pactual'] },
  { name: 'BTG Investimentos', searchTerms: ['btg investimentos', 'btg pactual investimentos'] },
  { name: 'XP', searchTerms: ['xp', 'xp investimentos', 'xp inc'] },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const client = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Buscar todos os connectors disponíveis
    const connectorsResponse = await client.fetchConnectors();
    const allConnectors = connectorsResponse.results || [];

    // Buscar itemIds do Supabase (se a tabela existir)
    let itemIdsFromSupabase: string[] = [];
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('itemId');
        
        if (error) {
          // Tabela pode não existir ainda - isso é ok
          if (error.code !== 'PGRST205') {
            console.error('Error fetching accounts from Supabase:', error);
          }
        } else {
          itemIdsFromSupabase = accounts?.map(acc => acc.itemId).filter(Boolean) || [];
        }
      } catch (err) {
        // Ignorar erros de tabela não encontrada
        console.error('Error accessing Supabase:', err);
      }
    }

    const allItemIds = new Set(itemIdsFromSupabase);

    // Buscar detalhes dos items conectados
    const connectedItemsDetails = await Promise.all(
      Array.from(allItemIds).map(async (itemId) => {
        try {
          const item = await client.fetchItem(itemId);
          return {
            itemId: item.id,
            connectorId: item.connector.id,
            status: item.status,
          };
        } catch (err) {
          return null;
        }
      })
    );

    // Criar mapa de connectorId -> status
    const connectorStatusMap = new Map<number, string>();
    connectedItemsDetails
      .filter(item => item !== null)
      .forEach(item => {
        if (item) {
          connectorStatusMap.set(item.connectorId, item.status);
        }
      });

    // Filtrar e mapear os bancos solicitados
    const banksList = TARGET_BANKS.map(targetBank => {
      // Procurar connector que corresponde ao banco
      const connector = allConnectors.find(conn => {
        const connNameLower = conn.name.toLowerCase();
        return targetBank.searchTerms.some(term => 
          connNameLower.includes(term.toLowerCase())
        );
      });

      if (!connector) {
        return {
          name: targetBank.name,
          connectorId: null,
          isConnected: false,
          status: null,
        };
      }

      const isConnected = connectorStatusMap.has(connector.id);
      const status = connectorStatusMap.get(connector.id) || null;

      return {
        name: targetBank.name,
        connectorId: connector.id,
        connectorName: connector.name,
        isConnected,
        status,
      };
    });

    res.status(200).json({ banks: banksList });
  } catch (error: any) {
    console.error('Error fetching connectors:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
