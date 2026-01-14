import type { NextApiRequest, NextApiResponse } from 'next';
import { PluggyClient } from 'pluggy-sdk';
import { createSupabaseClient, getSupabaseErrorResponse } from '../../lib/supabase';
import { TARGET_BANKS, matchesTargetBank } from '../../lib/banks-config';
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
    logError('/api/connectors', new Error('Supabase configuration error'), supabaseError, requestId);
    return res.status(500).json(supabaseError);
  }

  const supabaseResult = createSupabaseClient();
  if (!supabaseResult.isValid || !supabaseResult.client) {
    logError('/api/connectors', new Error('Supabase client error'), supabaseResult.error, requestId);
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
    logApiRequest('/api/connectors', {}, requestId);
    
    // Buscar todos os connectors disponíveis
    logDataProcessing('fetchConnectors', null, null, requestId);
    const connectorsResponse = await client.fetchConnectors();
    const allConnectors = connectorsResponse.results || [];
    logDataProcessing('fetchConnectors', null, { connectorsCount: allConnectors.length }, requestId);

    // Buscar itemIds do Supabase
    let itemIdsFromSupabase: string[] = [];
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('itemId');
      
      if (error) {
        // Se tabela não existe, usar array vazio
        if (error.code === 'PGRST205') {
          itemIdsFromSupabase = [];
        } else {
          console.error('Error fetching accounts from Supabase:', error);
          return res.status(500).json({ 
            error: 'Erro ao buscar contas do banco de dados',
            details: error.message 
          });
        }
      } else {
        itemIdsFromSupabase = accounts?.map(acc => acc.itemId).filter(Boolean) || [];
      }
    } catch (err: any) {
      console.error('Error accessing Supabase:', err);
      return res.status(500).json({ 
        error: 'Erro ao acessar banco de dados',
        details: err.message 
      });
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

    // Criar mapa de connectorId -> status e connectorId -> itemIds[]
    const connectorStatusMap = new Map<number, string>();
    const connectorItemIdsMap = new Map<number, string[]>();
    
    connectedItemsDetails
      .filter(item => item !== null)
      .forEach(item => {
        if (item) {
          connectorStatusMap.set(item.connectorId, item.status);
          // Adicionar itemId ao array de itemIds do connector
          const existingItemIds = connectorItemIdsMap.get(item.connectorId) || [];
          connectorItemIdsMap.set(item.connectorId, [...existingItemIds, item.itemId]);
        }
      });

    logDataProcessing('mapConnectors', { connectorsCount: allConnectors.length }, { 
      connectedConnectorsCount: connectorStatusMap.size 
    }, requestId);

    // Filtrar e mapear os bancos solicitados
    const banksList = TARGET_BANKS.map(targetBank => {
      // Procurar connector que corresponde ao banco usando função helper
      const connector = allConnectors.find(conn => 
        matchesTargetBank(conn.name, targetBank)
      );

      if (!connector) {
        return {
          name: targetBank.name,
          connectorId: null,
          connectorName: null,
          isConnected: false,
          status: null,
          itemIds: [],
        };
      }

      const isConnected = connectorStatusMap.has(connector.id);
      const status = connectorStatusMap.get(connector.id) || null;
      const itemIds = connectorItemIdsMap.get(connector.id) || [];

      return {
        name: targetBank.name,
        connectorId: connector.id,
        connectorName: connector.name,
        isConnected,
        status,
        itemIds, // NOVO: Array de itemIds conectados deste connector
      };
    });

    logDataProcessing('mapConnectors', { targetBanksCount: TARGET_BANKS.length }, { 
      banksListCount: banksList.length 
    }, requestId);
    
    const duration = Date.now() - startTime;
    logApiResponse('/api/connectors', { banksCount: banksList.length }, requestId, duration);
    res.status(200).json({ banks: banksList });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError('/api/connectors', error, {}, requestId);
    res.status(500).json({ 
      error: 'Erro ao buscar connectors',
      details: error.message || 'Internal server error' 
    });
  }
}
