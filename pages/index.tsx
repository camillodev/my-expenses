import Head from 'next/head'
import { useEffect, useState } from 'react';
import type { PluggyConnect as PluggyConnectType } from 'react-pluggy-connect'
import dynamic from 'next/dynamic';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Sidebar } from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, CreditCard, Building2, FileText, DollarSign, Menu, PiggyBank, TrendingDown } from 'lucide-react';
import { useFinancialData, type Account, type Transaction } from '@/hooks/useFinancialData';

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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

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
      try {
        // Carregar lista de bancos disponíveis
        const connectorsResponse = await fetch('/api/connectors')
        if (!connectorsResponse.ok) {
          const errorData = await connectorsResponse.json()
          throw new Error(errorData.error || 'Erro ao carregar connectors')
        }
        const connectorsData = await connectorsResponse.json()
        if (connectorsData.error) {
          toast.error(connectorsData.error || 'Erro ao carregar bancos disponíveis')
          setBankConnectors([])
        } else {
          setBankConnectors(connectorsData.banks || [])
        }

        // Carregar bancos conectados (para histórico)
        const banksResponse = await fetch('/api/banks')
        if (!banksResponse.ok) {
          const errorData = await banksResponse.json()
          throw new Error(errorData.error || 'Erro ao carregar bancos')
        }
        const banksData = await banksResponse.json()
        if (banksData.error) {
          toast.error(banksData.error || 'Erro ao carregar bancos conectados')
          setBanks([])
        } else {
          setBanks(banksData.banks || [])
        }
      } catch (error: any) {
        console.error('Error loading banks data:', error)
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
      // Assumindo que o balance negativo é a fatura e precisamos calcular o limite disponível
      // Se não houver limite explícito, usamos um valor padrão ou calculamos baseado no saldo
      const balance = acc.balance || 0
      // Para cartões, o balance negativo indica fatura atual
      // Vamos assumir um limite padrão ou usar um cálculo baseado nos dados disponíveis
      return sum + Math.max(0, 10000 + balance) // Exemplo: limite de 10k - fatura
    }, 0)

  // Filtrar contas por tipo
  const getAccountsByType = (type?: string, subtype?: string) => {
    if (subtype) {
      return accounts.filter(acc => acc.subtype === subtype)
    }
    if (type) {
      return accounts.filter(acc => acc.type === type)
    }
    // Retornar contas bancárias e investimentos, excluindo cartões de crédito e empréstimos
    return accounts.filter(acc => 
      acc.subtype !== 'credit_card' && 
      acc.type !== 'credit' && 
      acc.type !== 'loan'
    )
  }

  // Obter contas de investimento
  const getInvestmentAccounts = () => {
    return accounts.filter(acc => 
      acc.type === 'investment' || 
      acc.subtype === 'investment' ||
      acc.subtype === 'brokerage' ||
      acc.subtype === 'mutual_fund'
    )
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
    // Cartão de crédito
    if (account.subtype === 'credit_card') {
      return 'Cartão de Crédito'
    }
    // Investimentos
    if (account.type === 'investment' || account.subtype === 'investment') {
      return 'Investimento'
    }
    // Conta corrente/poupança
    if (account.subtype === 'checking' || account.subtype === 'savings') {
      return 'Conta Bancária'
    }
    // Empréstimo
    if (account.type === 'loan') {
      return 'Empréstimo'
    }
    // Default: Conta Bancária
    if (account.type === 'bank' || !account.type) {
      return 'Conta Bancária'
    }
    // Fallback: usar o tipo/subtype original
    return account.subtype || account.type || 'Conta'
  }

  // Obter ícone baseado no tipo de conta
  const getAccountIcon = (account: Account) => {
    if (account.subtype === 'credit_card') {
      return CreditCard
    }
    if (account.type === 'investment' || account.subtype === 'investment') {
      return TrendingUp
    }
    if (account.type === 'loan') {
      return FileText
    }
    return Building2
  }

  // Obter cor do badge baseado no tipo
  const getAccountTypeBadgeColor = (account: Account): string => {
    if (account.subtype === 'credit_card') {
      return 'bg-purple-100 text-purple-700 border-purple-200'
    }
    if (account.type === 'investment' || account.subtype === 'investment') {
      return 'bg-blue-100 text-blue-700 border-blue-200'
    }
    if (account.type === 'loan') {
      return 'bg-red-100 text-red-700 border-red-200'
    }
    return 'bg-green-100 text-green-700 border-green-200'
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Head>
        <title>Pluggy My Expenses</title>
        <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css"></link>
      </Head>

      <Sidebar 
        onConnectBank={() => handleConnectBank()}
        onCopyCpf={copyCpf}
        isWidgetOpen={isWidgetOpen}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-screen w-64 bg-slate-900 text-slate-50 border-r border-slate-800 flex flex-col z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-slate-300" />
            <h1 className="text-xl font-semibold">Pluggy Expenses</h1>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-3 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={copyCpf}
            className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
          >
            Copiar CPF
          </Button>
          <Button
            size="lg"
            onClick={() => {
              handleConnectBank()
              setSidebarOpen(false)
            }}
            disabled={isWidgetOpen}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white"
          >
            Conectar Bancos
          </Button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 overflow-auto">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-30">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 lg:p-6 pt-16 lg:pt-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="accounts">Contas</TabsTrigger>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => {
                            const account = accounts.find(acc => acc.id === transaction.accountId)
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
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Contas */}
            <TabsContent value="accounts" className="space-y-6">
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
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (() => {
                const bankAccounts = getAccountsByType().filter(acc => 
                  getAccountTypeLabel(acc) === 'Conta Bancária'
                )
                const investmentAccounts = getInvestmentAccounts()
                const allAccounts = getAccountsByType()
                
                if (allAccounts.length === 0 && investmentAccounts.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Nenhuma conta encontrada
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <div className="space-y-6">
                    {/* Seção: Contas Bancárias */}
                    {bankAccounts.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-slate-600" />
                          <h3 className="text-lg font-semibold text-slate-900">Contas Bancárias</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {bankAccounts.map((account) => {
                            const AccountIcon = getAccountIcon(account)
                            const typeLabel = getAccountTypeLabel(account)
                            const badgeColor = getAccountTypeBadgeColor(account)
                            return (
                              <Card key={account.id}>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                                    <AccountIcon className="h-5 w-5 text-slate-400" />
                                  </div>
                                  <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
                                  <div className="mt-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badgeColor}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Saldo</p>
                                      <p className={`text-2xl font-bold ${account.balance && account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {account.currencyCode || 'R$'} {account.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Seção: Investimentos */}
                    {investmentAccounts.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-slate-900">Investimentos</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {investmentAccounts.map((account) => {
                            const AccountIcon = getAccountIcon(account)
                            const typeLabel = getAccountTypeLabel(account)
                            const badgeColor = getAccountTypeBadgeColor(account)
                            return (
                              <Card key={account.id}>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                                    <AccountIcon className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
                                  <div className="mt-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badgeColor}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Saldo</p>
                                      <p className={`text-2xl font-bold ${account.balance && account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {account.currencyCode || 'R$'} {account.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
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
                            <p className={`text-2xl font-bold ${account.balance && account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
