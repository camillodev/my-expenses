import Head from 'next/head'
import { useEffect, useState } from 'react';
import type { PluggyConnect as PluggyConnectType } from 'react-pluggy-connect'
import dynamic from 'next/dynamic';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

export default function Home() {

  const [connectToken, setConnectToken] = useState<string>('')
  const [itemIdToUpdate, setItemIdToUpdate] = useState<string>()
  const [startDate, setStartDate] = useState<string>()
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false)
  const [categoryBalances, setCategoryBalances] = useState<{category: string, balance: number}[] | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankConnectors, setBankConnectors] = useState<BankConnector[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // Carregar lista de bancos disponíveis
        const connectorsResponse = await fetch('/api/connectors')
        const connectorsData = await connectorsResponse.json()
        setBankConnectors(connectorsData.banks || [])

        // Carregar bancos conectados (para histórico)
        const banksResponse = await fetch('/api/banks')
        const banksData = await banksResponse.json()
        setBanks(banksData.banks || [])

        // Carregar contas
        const accountsResponse = await fetch('/api/accounts')
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData.accounts || [])
      } catch (error) {
        console.error('Error loading data:', error)
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

  const handleConnectBank = async () => {
    try {
      const tokenResponse = await fetch('/api/connect-token')
      const { accessToken } = await tokenResponse.json()
      setConnectToken(accessToken)
      setIsWidgetOpen(true)
    } catch (error) {
      console.error('Error generating connect token:', error)
      toast.error('Erro ao iniciar conexão')
    }
  }

  const onError = (error: any) => {
    console.error('Pluggy Connect error:', error)
    setIsWidgetOpen(false)
    setConnectToken('')
    toast.error('Erro ao conectar. Tente novamente.')
  }

  const onSuccess = async (itemData: { item: any; }) => {
    setIsWidgetOpen(false)
    setConnectToken('')
    toast.info('Sincronizando dados do banco...', { autoClose: 2000 })
    
    try {
      // Sincronizar dados do item recém-conectado
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemData.item.id }),
      })

      // Aguardar um pouco para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Recarregar dados
      const connectorsResponse = await fetch('/api/connectors')
      const connectorsData = await connectorsResponse.json()
      setBankConnectors(connectorsData.banks || [])

      const banksResponse = await fetch('/api/banks')
      const banksData = await banksResponse.json()
      setBanks(banksData.banks || [])

      const accountsResponse = await fetch('/api/accounts')
      const accountsData = await accountsResponse.json()
      setAccounts(accountsData.accounts || [])

      // Carregar relatório
      try {
        const reportResponse = await fetch('/api/report?itemId=' + itemData.item.id)
        const reportData = await reportResponse.json()
        setStartDate(reportData.startDate)
        setCategoryBalances(reportData.categoryBalances)
      } catch (err) {
        console.error('Error loading report:', err)
      }

      setItemIdToUpdate(itemData.item.id)
      toast.success('Dados sincronizados com sucesso!', { autoClose: 3000 })
    } catch (error: any) {
      console.error('Error syncing data:', error)
      toast.error('Erro ao sincronizar dados. Tente atualizar a página.', { autoClose: 5000 })
    }
  }

  return (
    <div>
      <Head>
        <title>Pluggy My Expenses</title>
        <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css"></link>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet"></link>
      </Head>

      <main className="p-5">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center mb-4">
              <h1 className="pb-4">
                <i className="las la-wallet"></i> Pluggy My Expenses
              </h1>
            </div>
          </div>

          {/* Lista de Bancos */}
          <div className="row mb-4">
            <div className="col-12">
              <h3 className="mb-3">Conectar Bancos</h3>
              <button className="btn btn-primary btn-lg mb-3" onClick={copyCpf}>
                <i className="las la-copy"></i> Copiar CPF
              </button>
              {loading ? (
                <p>Carregando...</p>
              ) : (
                <div className="row">
                  {bankConnectors.map((bank) => (
                    <div key={bank.name} className="col-md-6 col-lg-4 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <h5 className="card-title">{bank.name}</h5>
                          {bank.isConnected ? (
                            <button
                              className="btn btn-success w-100"
                              disabled
                            >
                              <i className="las la-check-circle"></i> Conectado
                            </button>
                          ) : bank.connectorId ? (
                            <button
                              className="btn btn-primary w-100"
                              onClick={handleConnectBank}
                              disabled={isWidgetOpen}
                            >
                              <i className="las la-link"></i> Conectar
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary w-100"
                              disabled
                            >
                              <i className="las la-exclamation-circle"></i> Indisponível
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contas */}
          <div className="row mb-4">
            <div className="col-12">
              <h3 className="mb-3">Contas</h3>
              {loading ? (
                <p>Carregando...</p>
              ) : accounts.length === 0 ? (
                <div className="alert alert-info">
                  <i className="las la-info-circle"></i> Nenhuma conta encontrada.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Banco</th>
                        <th>Conta</th>
                        <th>Tipo</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => {
                        const bank = banks.find(b => b.itemId === account.itemId);
                        return (
                          <tr key={account.id}>
                            <td>{bank?.bankName || 'N/A'}</td>
                            <td>{account.name || account.id}</td>
                            <td>
                              <span className="badge bg-info">
                                {account.type} {account.subtype ? `- ${account.subtype}` : ''}
                              </span>
                            </td>
                            <td>
                              <strong className={account.balance && account.balance >= 0 ? 'text-success' : 'text-danger'}>
                                {account.currencyCode || 'R$'} {account.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Relatório por Categoria */}
          {categoryBalances && startDate && (
            <div className="row mb-4">
              <div className="col-12">
                <h3 className="mb-3">Movimentações desde {new Date(startDate).toLocaleDateString('pt-BR')} por categoria</h3>
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBalances.map(categoryBalance => (
                        <tr key={categoryBalance.category}>
                          <td>{categoryBalance.category}</td>
                          <td className={
                            `${categoryBalance.balance > 0 ? 'text-success' : 'text-danger'}`
                          }>
                            <strong>R$ {Math.abs(categoryBalance.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Widget de Conexão */}
          {isWidgetOpen && connectToken && (
            <div className="row">
              <div className="col-12">
                <PluggyConnect
                  updateItem={itemIdToUpdate}
                  connectToken={connectToken}
                  includeSandbox={true}
                  onClose={() => {
                    setIsWidgetOpen(false)
                    setConnectToken('')
                  }}
                  onSuccess={onSuccess}
                  onError={onError}
                />
              </div>
            </div>
          )}

        </div>
      </main>

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
