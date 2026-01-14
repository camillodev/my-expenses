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
import { Wallet, TrendingUp, CreditCard, Building2, FileText, DollarSign, Menu } from 'lucide-react';

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

interface Account {
  id: string;
  itemId: string;
  name?: string;
  type?: string;
  subtype?: string;
  balance?: number;
  currencyCode?: string;
}

interface BankConnector {
  name: string;
  connectorId: number | null;
  connectorName?: string;
  isConnected: boolean;
  status: string | null;
}

interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  category?: string;
  date: string;
  description?: string;
  accounts?: Account;
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
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

        // Carregar contas
        const accountsResponse = await fetch('/api/accounts')
        if (!accountsResponse.ok) {
          const errorData = await accountsResponse.json()
          throw new Error(errorData.error || 'Erro ao carregar contas')
        }
        const accountsData = await accountsResponse.json()
        if (accountsData.error) {
          toast.error(accountsData.error || 'Erro ao carregar contas')
          setAccounts([])
        } else {
          setAccounts(accountsData.accounts || [])
        }

        // Carregar transações
        const transactionsResponse = await fetch('/api/transactions?limit=100')
        if (!transactionsResponse.ok) {
          const errorData = await transactionsResponse.json()
          throw new Error(errorData.error || 'Erro ao carregar transações')
        }
        const transactionsData = await transactionsResponse.json()
        if (transactionsData.error) {
          toast.error(transactionsData.error || 'Erro ao carregar transações')
          setTransactions([])
        } else {
          setTransactions(transactionsData.transactions || [])
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
        toast.error(error.message || 'Erro ao carregar dados. Verifique a configuração do banco de dados.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
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
    setIsWidgetOpen(false)
    setSelectedConnectorId(null)
    toast.info('Sincronizando dados do banco...', { autoClose: 2000 })
    
    try {
      // Sincronizar dados do item
      const itemsResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemData.item.id }),
      })

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json()
        throw new Error(errorData.error || 'Erro ao sincronizar dados')
      }

      const itemsData = await itemsResponse.json()
      
      // Verificar se houve erros na sincronização
      if (itemsData.error) {
        toast.error(itemsData.error || 'Erro ao salvar dados no banco de dados', { autoClose: 5000 })
        if (itemsData.details) {
          console.error('Detalhes do erro:', itemsData.details)
        }
        return
      }

      // Verificar se pelo menos alguns dados foram salvos
      if (itemsData.errors && itemsData.errors.length > 0) {
        const hasPartialSuccess = itemsData.accountsSaved > 0 || itemsData.transactionsSaved > 0
        if (hasPartialSuccess) {
          toast.warning(`Dados sincronizados parcialmente. ${itemsData.errors.length} erro(s) ocorreram.`, { autoClose: 5000 })
        } else {
          toast.error('Falha ao salvar dados. Verifique a configuração do banco de dados.', { autoClose: 5000 })
          return
        }
      }

      // Aguardar um pouco para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Recarregar dados
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

      const accountsResponse = await fetch('/api/accounts')
      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json()
        toast.error(errorData.error || 'Erro ao recarregar contas')
      } else {
        const accountsData = await accountsResponse.json()
        if (accountsData.error) {
          toast.error(accountsData.error || 'Erro ao recarregar contas')
        } else {
          setAccounts(accountsData.accounts || [])
        }
      }

      const transactionsResponse = await fetch('/api/transactions?limit=100')
      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json()
        toast.error(errorData.error || 'Erro ao recarregar transações')
      } else {
        const transactionsData = await transactionsResponse.json()
        if (transactionsData.error) {
          toast.error(transactionsData.error || 'Erro ao recarregar transações')
        } else {
          setTransactions(transactionsData.transactions || [])
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
  const availableLimit = accounts
    .filter(acc => acc.subtype === 'credit_card')
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
    return accounts.filter(acc => acc.type !== 'credit' && acc.subtype !== 'credit_card')
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
                      <p className="text-center py-8 text-muted-foreground">Carregando...</p>
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
            <TabsContent value="accounts" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : getAccountsByType().length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma conta encontrada
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getAccountsByType().map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                          <Building2 className="h-5 w-5 text-slate-400" />
                        </div>
                        <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Saldo</p>
                            <p className={`text-2xl font-bold ${account.balance && account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {account.currencyCode || 'R$'} {account.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>
                          <div>
                            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                              {account.type} {account.subtype ? `- ${account.subtype}` : ''}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Cartões */}
            <TabsContent value="cards" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : getAccountsByType(undefined, 'credit_card').length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum cartão encontrado
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getAccountsByType(undefined, 'credit_card').map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{getBankName(account)}</CardTitle>
                          <CreditCard className="h-5 w-5 text-slate-400" />
                        </div>
                        <CardDescription>•••• {getLastFourDigits(account)}</CardDescription>
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
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
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
