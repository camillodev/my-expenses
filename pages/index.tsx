import Head from 'next/head'
import { useEffect, useState } from 'react';
import type { PluggyConnect as PluggyConnectType } from 'react-pluggy-connect'
import dynamic from 'next/dynamic';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, CreditCard, Building2, FileText, DollarSign, Menu, PiggyBank, TrendingDown } from 'lucide-react';
import { useFinancialData, type Account, type Transaction } from '@/hooks/useFinancialData';
import { Navbar } from '@/components/Navbar';
import { TARGET_BANKS, findTargetBank, matchesTargetBank } from '@/lib/banks-config';
import { isCreditCardSubtype, normalizeAccountSubtype } from '@/lib/pluggy-utils';
import { logDataProcessing, generateRequestId } from '@/lib/debug-logger';

const PluggyConnect = dynamic(
  () => (import('react-pluggy-connect') as any).then((mod: { PluggyConnect: any; }) => mod.PluggyConnect),
  { ssr: false }
) as typeof PluggyConnectType

interface Bank {
  itemId: string;
  connectorId: number;
  bankName: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
}

interface BankConnector {
  name: string;
  connectorId: number | null;
  connectorName?: string;
  isConnected: boolean;
  status: string | null;
  itemIds?: string[]; // Array de itemIds conectados deste connector
}

export default function Home() {
  const [connectToken, setConnectToken] = useState<string>('')
  const [itemIdToUpdate, setItemIdToUpdate] = useState<string>()
  const [startDate, setStartDate] = useState<string>()
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false)
  const [selectedConnectorId, setSelectedConnectorId] = useState<number | null>(null)
  const [categoryBalances, setCategoryBalances] = useState<{category: string, balance: number}[] | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankConnectors, setBankConnectors] = useState<BankConnector[]>([])
  const [activeTab, setActiveTab] = useState<string>('overview')

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:55',message:'State update - banks and connectors',data:{banksCount:banks.length,bankConnectorsCount:bankConnectors.length,banks:banks.map(b=>({itemId:b.itemId,bankName:b.bankName})),bankConnectors:bankConnectors.map(bc=>({name:bc.name,isConnected:bc.isConnected}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }, [banks.length, bankConnectors.length]);
  // #endregion

  // Usar o hook useFinancialData para gerenciar dados financeiros
  const {
    accounts,
    transactions,
    creditCards,
    loading,
    syncItem,
    refreshData,
  } = useFinancialData(true)
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:67',message:'Hook state update',data:{accountsCount:accounts.length,transactionsCount:transactions.length,creditCardsCount:creditCards.length,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }, [accounts.length, transactions.length, creditCards.length, loading]);
  // #endregion

  // Carregar dados de bancos e connectors (não gerenciados pelo hook)
  useEffect(() => {
    const loadBanksData = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:74',message:'loadBanksData started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        // Carregar lista de bancos disponíveis
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:77',message:'Fetching /api/connectors',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const connectorsResponse = await fetch('/api/connectors')
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:79',message:'/api/connectors response',data:{ok:connectorsResponse.ok,status:connectorsResponse.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (!connectorsResponse.ok) {
          const errorData = await connectorsResponse.json()
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:82',message:'/api/connectors error',data:{error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          throw new Error(errorData.error || 'Erro ao carregar connectors')
        }
        const connectorsData = await connectorsResponse.json()
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:86',message:'/api/connectors data received',data:{hasError:!!connectorsData.error,banksCount:connectorsData.banks?.length||0,banks:connectorsData.banks},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (connectorsData.error) {
          toast.error(connectorsData.error || 'Erro ao carregar bancos disponíveis')
          setBankConnectors([])
        } else {
          setBankConnectors(connectorsData.banks || [])
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:90',message:'setBankConnectors called',data:{count:connectorsData.banks?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }

        // Carregar bancos conectados (para histórico)
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:93',message:'Fetching /api/banks',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const banksResponse = await fetch('/api/banks')
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:95',message:'/api/banks response',data:{ok:banksResponse.ok,status:banksResponse.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!banksResponse.ok) {
          const errorData = await banksResponse.json()
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:98',message:'/api/banks error',data:{error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          throw new Error(errorData.error || 'Erro ao carregar bancos')
        }
        const banksData = await banksResponse.json()
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:101',message:'/api/banks data received',data:{hasError:!!banksData.error,banksCount:banksData.banks?.length||0,banks:banksData.banks},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (banksData.error) {
          toast.error(banksData.error || 'Erro ao carregar bancos conectados')
          setBanks([])
        } else {
          setBanks(banksData.banks || [])
          // #region agent log
          fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:105',message:'setBanks called',data:{count:banksData.banks?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      } catch (error: any) {
        console.error('Error loading banks data:', error)
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:108',message:'loadBanksData error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        toast.error(error.message || 'Erro ao carregar dados de bancos.')
      }
    }

    loadBanksData()
  }, [])

  const copyCpf = async () => {
    try {
      await navigator.clipboard.writeText('15507938709')
      toast.success('CPF copiado para área de transferência')
    } catch (error) {
      toast.error('Erro ao copiar CPF')
    }
  }

  const handleConnectBank = async (connectorId?: number | null) => {
    if (connectorId) {
      try {
        const tokenResponse = await fetch(`/api/connect-token?connectorId=${connectorId}`)
        const data = await tokenResponse.json()
        if (!tokenResponse.ok || 'error' in data) {
          throw new Error(data.error || 'Erro ao gerar token')
        }
        setConnectToken(data.accessToken)
        setSelectedConnectorId(connectorId)
        setIsWidgetOpen(true)
      } catch (error: any) {
        console.error('Error generating connect token:', error)
        toast.error(error.message || 'Erro ao iniciar conexão')
      }
    } else {
      try {
        const tokenResponse = await fetch('/api/connect-token')
        const data = await tokenResponse.json()
        if (!tokenResponse.ok || 'error' in data) {
          throw new Error(data.error || 'Erro ao gerar token')
        }
        setConnectToken(data.accessToken)
        setIsWidgetOpen(true)
      } catch (error: any) {
        console.error('Error generating connect token:', error)
        toast.error(error.message || 'Erro ao iniciar conexão')
      }
    }
  }

  const onError = (error: any) => {
    console.error('Pluggy Connect error:', error)
    setIsWidgetOpen(false)
    setConnectToken('')
    setSelectedConnectorId(null)
    toast.error('Erro ao conectar. Tente novamente.')
  }

  const onSuccess = async (itemData: { item: any; }) => {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:149',message:'onSuccess called',data:{itemId:itemData.item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setIsWidgetOpen(false)
    setSelectedConnectorId(null)
    toast.info('Sincronizando dados do banco...', { autoClose: 2000 })
    
    try {
      // Usar syncItem do hook para sincronizar
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:155',message:'Calling syncItem',data:{itemId:itemData.item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const success = await syncItem(itemData.item.id)
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:157',message:'syncItem result',data:{success},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (!success) {
        // O erro já foi tratado no hook, apenas retornar
        return
      }

      // Recarregar dados de bancos e connectors
      const connectorsResponse = await fetch('/api/connectors')
      if (!connectorsResponse.ok) {
        const errorData = await connectorsResponse.json()
        toast.error(errorData.error || 'Erro ao recarregar bancos disponíveis')
      } else {
        const connectorsData = await connectorsResponse.json()
        if (connectorsData.error) {
          toast.error(connectorsData.error || 'Erro ao recarregar bancos disponíveis')
        } else {
          setBankConnectors(connectorsData.banks || [])
        }
      }

      const banksResponse = await fetch('/api/banks')
      if (!banksResponse.ok) {
        const errorData = await banksResponse.json()
        toast.error(errorData.error || 'Erro ao recarregar bancos conectados')
      } else {
        const banksData = await banksResponse.json()
        if (banksData.error) {
          toast.error(banksData.error || 'Erro ao recarregar bancos conectados')
        } else {
          setBanks(banksData.banks || [])
        }
      }

      // Carregar relatório
      try {
        const reportResponse = await fetch('/api/report?itemId=' + itemData.item.id)
        if (!reportResponse.ok) {
          const errorData = await reportResponse.json()
          console.error('Error loading report:', errorData)
        } else {
          const reportData = await reportResponse.json()
          if (reportData.error) {
            console.error('Error in report data:', reportData.error)
          } else {
            setStartDate(reportData.startDate)
            setCategoryBalances(reportData.categoryBalances)
          }
        }
      } catch (err: any) {
        console.error('Error loading report:', err)
      }

      setItemIdToUpdate(itemData.item.id)
      toast.success('Dados sincronizados com sucesso!', { autoClose: 3000 })
    } catch (error: any) {
      console.error('Error syncing data:', error)
      const errorMessage = error.message || 'Erro ao sincronizar dados'
      
      // Mensagens específicas baseadas no tipo de erro
      if (errorMessage.includes('Banco de dados não configurado') || errorMessage.includes('SUPABASE')) {
        toast.error('Banco de dados não configurado. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_KEY.', { autoClose: 7000 })
      } else if (errorMessage.includes('salvar') || errorMessage.includes('salvo')) {
        toast.error('Erro ao salvar dados. Verifique a configuração do banco de dados.', { autoClose: 5000 })
      } else {
        toast.error(errorMessage, { autoClose: 5000 })
      }
    }
  }

  // Calcular saldo total (soma de saldos positivos)
  const totalBalance = accounts
    .filter(acc => acc.balance && acc.balance > 0 && acc.type !== 'credit')
    .reduce((sum, acc) => sum + (acc.balance || 0), 0)

  // Calcular limite disponível (limite de crédito - fatura atual)
  const availableLimit = creditCards
    .reduce((sum, acc) => {
      // Priorizar availableCredit se disponível
      if (acc.availableCredit !== undefined && acc.availableCredit !== null) {
        return sum + Math.max(0, acc.availableCredit);
      }
      // Senão, calcular do creditLimit - currentInvoice
      if (acc.creditLimit !== undefined && acc.creditLimit !== null) {
        const currentInvoice = acc.currentInvoice || Math.abs(acc.balance || 0);
        return sum + Math.max(0, acc.creditLimit - currentInvoice);
      }
      // Fallback: if no limit data, return 0 (don't guess)
      return sum;
    }, 0)

  // Filtrar contas por tipo
  const getAccountsByType = (type?: string, subtype?: string) => {
    if (subtype) {
      const normalizedSubtype = normalizeAccountSubtype(subtype);
      return accounts.filter(acc => normalizeAccountSubtype(acc.subtype) === normalizedSubtype);
    }
    if (type) {
      return accounts.filter(acc => acc.type === type);
    }
    // Retornar contas bancárias e investimentos, excluindo cartões de crédito e empréstimos
    const filtered = accounts.filter(acc => {
      const result = !isCreditCardSubtype(acc.subtype) && 
        acc.type !== 'credit' && 
        acc.type !== 'loan';
      return result;
    });
    return filtered;
  }

  // Obter contas de investimento
  const getInvestmentAccounts = () => {
    return accounts.filter(acc => {
      const normalizedSubtype = normalizeAccountSubtype(acc.subtype);
      return acc.type === 'investment' || 
             normalizedSubtype === 'investment' ||
             normalizedSubtype === 'brokerage' ||
             normalizedSubtype === 'mutual_fund';
    });
  }

  // Extrair últimos 4 dígitos
  const getLastFourDigits = (account: Account) => {
    if (account.name) {
      const match = account.name.match(/\d{4,}/)
      if (match) {
        return match[0].slice(-4)
      }
    }
    return account.id.slice(-4)
  }

  // Obter nome do banco
  const getBankName = (account: Account) => {
    const bank = banks.find(b => b.itemId === account.itemId)
    return bank?.bankName || 'Banco'
  }

  // Obter label amigável do tipo de conta
  const getAccountTypeLabel = (account: Account): string => {
    const normalizedSubtype = normalizeAccountSubtype(account.subtype);
    
    // Cartão de crédito
    if (isCreditCardSubtype(account.subtype)) {
      return 'Cartão de Crédito';
    }
    // Investimentos
    if (account.type === 'investment' || normalizedSubtype === 'investment') {
      return 'Investimento';
    }
    // Conta corrente/poupança
    if (normalizedSubtype === 'checking' || normalizedSubtype === 'savings') {
      return 'Conta Bancária';
    }
    // Empréstimo
    if (account.type === 'loan') {
      return 'Empréstimo';
    }
    // Default: Conta Bancária
    if (account.type === 'bank' || !account.type) {
      return 'Conta Bancária';
    }
    // Fallback: usar o tipo/subtype original
    return account.subtype || account.type || 'Conta';
  }

  // Obter ícone baseado no tipo de conta
  const getAccountIcon = (account: Account) => {
    if (isCreditCardSubtype(account.subtype)) {
      return CreditCard;
    }
    const normalizedSubtype = normalizeAccountSubtype(account.subtype);
    if (account.type === 'investment' || normalizedSubtype === 'investment') {
      return TrendingUp;
    }
    if (account.type === 'loan') {
      return FileText;
    }
    return Building2;
  }

  // Obter cor do badge baseado no tipo
  const getAccountTypeBadgeColor = (account: Account): string => {
    if (isCreditCardSubtype(account.subtype)) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    const normalizedSubtype = normalizeAccountSubtype(account.subtype);
    if (account.type === 'investment' || normalizedSubtype === 'investment') {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (account.type === 'loan') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    return 'bg-green-100 text-green-700 border-green-200';
  }

  // TARGET_BANKS agora vem de lib/banks-config.ts

  // Interface para dados do card de banco
  interface BankCardData {
    bankName: string
    connectorId: number | null
    isConnected: boolean
    checkingBalance: number
    creditCardBill: number
    availableLimit: number
    investmentsTotal: number
  }

  // Obter contas de um banco específico
  const getBankAccounts = (bankName: string): Account[] => {
    const requestId = generateRequestId();
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:395',message:'getBankAccounts called',data:{bankName,banksCount:banks.length,accountsCount:accounts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Encontrar banco alvo na configuração
    const targetBank = findTargetBank(bankName);
    if (!targetBank) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:400',message:'targetBank not found',data:{bankName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      logDataProcessing('getBankAccounts', { bankName }, { accountsCount: 0, reason: 'targetBank not found' }, requestId);
      return [];
    }

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:405',message:'Filtering banks',data:{targetBankName:targetBank.name,banks:banks.map(b=>({itemId:b.itemId,bankName:b.bankName}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Encontrar itemIds que correspondem ao banco usando matching robusto
    const bankItemIds = banks
      .filter(bank => {
        const matches = matchesTargetBank(bank.bankName, targetBank);
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:410',message:'Bank matching check',data:{bankName:bank.bankName,targetBankName:targetBank.name,matches},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return matches;
      })
      .map(bank => bank.itemId);

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:416',message:'Bank itemIds found',data:{bankName,itemIds:bankItemIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    logDataProcessing('getBankAccounts', { 
      bankName, 
      banksCount: banks.length,
      matchingBanksCount: bankItemIds.length 
    }, { itemIds: bankItemIds }, requestId);

    // Retornar contas que pertencem a esses itemIds
    const bankAccounts = accounts.filter(acc => bankItemIds.includes(acc.itemId));
    
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:425',message:'getBankAccounts result',data:{bankName,itemIds:bankItemIds,accountsCount:bankAccounts.length,accountItemIds:bankAccounts.map(a=>a.itemId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    logDataProcessing('getBankAccounts', { bankName, itemIds: bankItemIds }, { 
      accountsCount: bankAccounts.length 
    }, requestId);
    
    return bankAccounts;
  }

  // Calcular métricas de um banco
  const calculateBankMetrics = (bankName: string): BankCardData => {
    const requestId = generateRequestId();
    const bankAccounts = getBankAccounts(bankName);
    
    // Buscar connector que corresponde ao banco usando configuração unificada
    const targetBank = findTargetBank(bankName);
    const connector = bankConnectors.find(bc => {
      if (!targetBank) return false;
      return matchesTargetBank(bc.connectorName || bc.name || '', targetBank);
    });
    
    // Verificar se está conectado: se há banks conectados OU se há contas para este banco
    // Isso corrige o problema de isConnected sempre ser false
    const hasConnectedBanks = banks.some(bank => {
      if (!targetBank) return false;
      return matchesTargetBank(bank.bankName, targetBank);
    });
    const isConnected = hasConnectedBanks || bankAccounts.length > 0 || (connector?.isConnected ?? false);
    
    logDataProcessing('calculateBankMetrics', { bankName, bankAccountsCount: bankAccounts.length }, null, requestId);
    
    // Conta corrente: soma de saldos de contas checking ou bank (excluindo cartões)
    const checkingBalance = bankAccounts
      .filter(acc => {
        const normalizedSubtype = normalizeAccountSubtype(acc.subtype);
        return normalizedSubtype === 'checking' || 
               normalizedSubtype === 'savings' ||
               (acc.type === 'bank' && !isCreditCardSubtype(acc.subtype)) ||
               (!acc.type && !isCreditCardSubtype(acc.subtype));
      })
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Fatura do cartão: usar currentInvoice se disponível, senão Math.abs(balance)
    const creditCards = bankAccounts.filter(acc => isCreditCardSubtype(acc.subtype));
    const creditCardBill = creditCards
      .reduce((sum, acc) => {
        // Priorizar currentInvoice, senão usar balance negativo
        if (acc.currentInvoice !== undefined && acc.currentInvoice !== null) {
          return sum + acc.currentInvoice;
        }
        const balance = acc.balance || 0;
        return sum + (balance < 0 ? Math.abs(balance) : balance);
      }, 0);

    // Limite disponível: usar availableCredit real, não hardcoded
    const availableLimit = creditCards
      .reduce((sum, acc) => {
        if (acc.availableCredit !== undefined && acc.availableCredit !== null) {
          return sum + Math.max(0, acc.availableCredit);
        }
        // Fallback: calcular do creditLimit - currentInvoice se disponível
        if (acc.creditLimit !== undefined && acc.creditLimit !== null) {
          const currentInvoice = acc.currentInvoice || Math.abs(acc.balance || 0);
          return sum + Math.max(0, acc.creditLimit - currentInvoice);
        }
        // Se não houver dados, retornar 0 (não adivinhar)
        return sum;
      }, 0);

    // Investimentos totais: soma de saldos de contas de investimento
    const investmentsTotal = bankAccounts
      .filter(acc => {
        const normalizedSubtype = normalizeAccountSubtype(acc.subtype);
        return acc.type === 'investment' || 
               normalizedSubtype === 'investment' ||
               normalizedSubtype === 'brokerage' ||
               normalizedSubtype === 'mutual_fund';
      })
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const metrics = {
      bankName,
      connectorId: connector?.connectorId || null,
      isConnected,
      checkingBalance,
      creditCardBill,
      availableLimit,
      investmentsTotal,
    };

    logDataProcessing('calculateBankMetrics', { bankName }, metrics, requestId);
    return metrics;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Head>
        <title>Pluggy My Expenses</title>
        <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css"></link>
      </Head>

      <Navbar activeTab={activeTab} onTabChange={(tab) => {
        setActiveTab(tab)
        // Scroll to top when changing tabs
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }} />

      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 pt-4 lg:pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="banks">Bancos</TabsTrigger>
              <TabsTrigger value="cards">Cartões</TabsTrigger>
              <TabsTrigger value="loans">Empréstimos</TabsTrigger>
              <TabsTrigger value="bills">Boletos</TabsTrigger>
            </TabsList>

            {/* Aba Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              {/* Cards de Métricas */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soma de todos os saldos disponíveis
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Limite disponível nos cartões de crédito
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Transações */}
              <Card>
                <CardHeader>
                  <CardTitle>Transações Recentes</CardTitle>
                  <CardDescription>Últimas movimentações financeiras</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {loading ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Conta</TableHead>
                            <TableHead>CNPJ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-32" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-6 w-24 rounded-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-28" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : transactions.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Conta</TableHead>
                            <TableHead>CNPJ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => {
                            const account = accounts.find(acc => acc.id === transaction.accountId);
                            const cnpj = transaction.merchant?.cnpj;
                            return (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>{transaction.description || 'Sem descrição'}</TableCell>
                                <TableCell>
                                  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                                    {transaction.category || 'Outros'}
                                  </span>
                                </TableCell>
                                <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  <strong>
                                    {transaction.amount >= 0 ? '+' : ''}
                                    R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </TableCell>
                                <TableCell>{account?.name || 'N/A'}</TableCell>
                                <TableCell>
                                  {cnpj ? (
                                    <span className="text-xs font-mono">
                                      {cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Bancos */}
            <TabsContent value="banks" className="space-y-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Contas</h2>
                  <p className="text-sm text-muted-foreground mt-1">Visualize suas contas por banco</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyCpf}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Copiar CPF
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConnectBank()}
                    disabled={isWidgetOpen}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Conectar Bancos
                  </Button>
                </div>
              </div>
              
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32 mb-4" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {TARGET_BANKS.map((targetBank) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:743',message:'Rendering bank card',data:{targetBankName:targetBank.name,bankConnectorsCount:bankConnectors.length,banksCount:banks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                    // #endregion
                    const metrics = calculateBankMetrics(targetBank.name)
                    const connector = bankConnectors.find(bc => bc.name === targetBank.name)
                    // #region agent log
                    fetch('http://127.0.0.1:7247/ingest/1fb6138e-fba8-456c-a707-86cad2780fdd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:747',message:'Bank card metrics',data:{targetBankName:targetBank.name,metricsIsConnected:metrics.isConnected,connectorFound:!!connector},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                    // #endregion
                    
                    return (
                      <Card key={targetBank.name} className="border-2">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">{targetBank.name}</CardTitle>
                            {metrics.isConnected && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                Conectado
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {metrics.isConnected ? (
                            <>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Conta Corrente</p>
                                <p className={`text-lg font-bold ${metrics.checkingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {metrics.checkingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Fatura do Cartão</p>
                                <p className="text-lg font-bold text-red-600">
                                  R$ {metrics.creditCardBill.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Limite Disponível</p>
                                <p className="text-lg font-bold text-green-600">
                                  R$ {metrics.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Investimentos Totais</p>
                                <p className="text-lg font-bold text-blue-600">
                                  R$ {metrics.investmentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={async () => {
                                    const currentTargetBank = findTargetBank(targetBank.name);
                                    const bankItemIds = banks
                                      .filter(bank => {
                                        if (!currentTargetBank) return false;
                                        return matchesTargetBank(bank.bankName, currentTargetBank);
                                      })
                                      .map(bank => bank.itemId);
                                    
                                    if (bankItemIds.length > 0) {
                                      // Atualizar o primeiro itemId encontrado
                                      const success = await syncItem(bankItemIds[0]);
                                      if (success) {
                                        toast.success(`${targetBank.name} atualizado com sucesso!`);
                                        await refreshData();
                                      } else {
                                        toast.error(`Erro ao atualizar ${targetBank.name}`);
                                      }
                                    } else {
                                      toast.error(`Nenhum banco conectado encontrado para ${targetBank.name}`);
                                    }
                                  }}
                                  disabled={loading}
                                >
                                  {loading ? 'Atualizando...' : 'Atualizar Dados'}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="py-4">
                              <Button
                                onClick={() => handleConnectBank(metrics.connectorId || null)}
                                className="w-full"
                                size="lg"
                                disabled={isWidgetOpen}
                              >
                                Conectar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Aba Cartões */}
            <TabsContent value="cards" className="space-y-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : creditCards.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum cartão encontrado
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {creditCards.map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                          <CreditCard className="h-5 w-5 text-purple-500" />
                        </div>
                        <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
                        <div className="mt-2">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-purple-100 text-purple-700 border-purple-200">
                            Cartão de Crédito
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Fatura Atual</p>
                            <p className="text-2xl font-bold text-red-600">
                              {account.currencyCode || 'R$'} {(account.currentInvoice || Math.abs(account.balance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          {account.creditLimit !== undefined && account.creditLimit !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Limite Total</p>
                              <p className="text-sm font-semibold text-slate-600">
                                R$ {account.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                          {account.availableCredit !== undefined && account.availableCredit !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Limite Disponível</p>
                              <p className="text-sm font-semibold text-green-600">
                                R$ {account.availableCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Empréstimos */}
            <TabsContent value="loans" className="space-y-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : getAccountsByType('loan').length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum empréstimo encontrado
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getAccountsByType('loan').map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                            <p className="text-2xl font-bold text-red-600">
                              {account.currencyCode || 'R$'} {Math.abs(account.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Boletos */}
            <TabsContent value="bills" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Funcionalidade de boletos em desenvolvimento
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Widget de Conexão */}
      {isWidgetOpen && connectToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <PluggyConnect
              updateItem={itemIdToUpdate}
              connectToken={connectToken}
              includeSandbox={true}
              onClose={() => {
                setIsWidgetOpen(false)
                setConnectToken('')
                setSelectedConnectorId(null)
              }}
              onSuccess={onSuccess}
              onError={onError}
            />
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  )
}
