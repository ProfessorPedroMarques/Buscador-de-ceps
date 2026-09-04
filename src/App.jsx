import { useCallback, useEffect, useRef, useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import ResultCard from './components/ResultCard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import MapModal from './components/MapModal.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Toast from './components/Toast.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const SUGESTOES = ['01001-000', '13010-100', '20040-020', '69900-062']

const enderecoTexto = (e) =>
  [e?.logradouro, e?.bairro, e?.localidade, e?.uf]
    .filter(Boolean)
    .join(', ') + (e?.cep ? ` — ${e.cep}` : '')

export default function App() {
  const [cep, setCep] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [shake, setShake] = useState(false)
  const [historico, setHistorico] = useLocalStorage('cep:historico', [])
  const [tema, setTema] = useLocalStorage('cep:tema', null)
  const [mapaAberto, setMapaAberto] = useState(false)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)

  /* Tema claro/escuro persistido (padrão: preferência do sistema) */
  useEffect(() => {
    const inicial =
      tema ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')
    document.documentElement.dataset.theme = inicial
    if (tema !== inicial) setTema(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alternarTema = () => {
    const novo =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = novo
    setTema(novo)
  }

  /* Notificações flutuantes */
  const notificar = useCallback((msg, tipo = 'info') => {
    setToast({ id: Date.now(), msg, tipo })
  }, [])

  /* Busca principal (passa pelo backend Express) */
  const buscar = useCallback(
    async (valor) => {
      const digitos = (valor ?? '').replace(/\D/g, '')
      if (digitos.length !== 8) {
        setStatus('error')
        setShake(true)
        setErro('Informe um CEP válido com 8 dígitos.')
        notificar('CEP incompleto — informe os 8 dígitos.', 'erro')
        return
      }

      setStatus('loading')
      setErro('')
      setResultado(null)

      try {
        const resposta = await fetch(`/api/cep/${digitos}`)
        const json = await resposta.json()
        if (!resposta.ok || !json.ok) {
          throw new Error(json.erro || 'CEP não encontrado.')
        }

        setResultado(json.data)
        setStatus('success')
        notificar('Endereço encontrado com sucesso!', 'sucesso')

        // Histórico: mais recente primeiro, sem duplicar (máx. 8)
        setHistorico((anterior) =>
          [
            {
              cep: json.data.cep,
              logradouro: json.data.logradouro,
              localidade: json.data.localidade,
              uf: json.data.uf,
              ts: Date.now(),
            },
            ...anterior.filter((item) => item.cep !== json.data.cep),
          ].slice(0, 8),
        )
      } catch (e) {
        setStatus('error')
        setShake(true)
        setErro(e.message)
        notificar(e.message, 'erro')
      }
    },
    [notificar, setHistorico],
  )

  const selecionarHistorico = (cepEscolhido) => {
    setCep(cepEscolhido)
    buscar(cepEscolhido)
    inputRef.current?.focus()
  }

  const copiarEndereco = async () => {
    if (!resultado) return
    try {
      await navigator.clipboard.writeText(enderecoTexto(resultado))
      notificar('Endereço copiado!', 'sucesso')
    } catch {
      notificar('Não foi possível copiar automaticamente.', 'erro')
    }
  }

  /* Tecla Esc fecha o mapa */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMapaAberto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const carregando = status === 'loading'

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <div>
            <h1>Buscador de CEP</h1>
            <p>Digite o CEP e localize o endereço no mapa</p>
          </div>
        </div>
        <ThemeToggle tema={tema} onToggle={alternarTema} />
      </header>

      <main className="app__main">
        <div
          className={shake ? 'search-wrap is-shake' : 'search-wrap'}
          onAnimationEnd={() => setShake(false)}
        >
          <SearchBar
            ref={inputRef}
            value={cep}
            onChange={setCep}
            onSubmit={buscar}
            loading={carregando}
            notificar={notificar}
          />
        </div>

        {status === 'error' && (
          <p className="app__erro" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            {erro}
          </p>
        )}

        {status === 'idle' && !resultado && (
          <section className="sugestoes" aria-label="Sugestões de CEP">
            <span className="sugestoes__titulo">Experimente:</span>
            {SUGESTOES.map((s, i) => (
              <button
                key={s}
                type="button"
                className="chip chip--sugestao"
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => selecionarHistorico(s)}
              >
                {s}
              </button>
            ))}
          </section>
        )}

        {carregando && (
          <section className="card card--skeleton" aria-busy="true" aria-label="Carregando endereço">
            <div className="skeleton skeleton--titulo" />
            <div className="skeleton" style={{ width: '68%' }} />
            <div className="skeleton" style={{ width: '52%' }} />
            <div className="skeleton" style={{ width: '40%' }} />
          </section>
        )}

        {status === 'success' && resultado && (
          <ResultCard
            data={resultado}
            onCopiar={copiarEndereco}
            onVerMapa={() => setMapaAberto(true)}
          />
        )}

        <HistoryPanel
          historico={historico}
          onSelect={selecionarHistorico}
          onLimpar={() => {
            setHistorico([])
            notificar('Histórico limpo.', 'info')
          }}
        />
      </main>

      <footer className="app__footer">
        Dados: <strong>ViaCEP</strong> · Mapas: <strong>OpenStreetMap</strong>
      </footer>

      <MapModal
        aberto={mapaAberto}
        endereco={resultado}
        onClose={() => setMapaAberto(false)}
        notificar={notificar}
      />

      <Toast toast={toast} onConcluido={() => setToast(null)} />
    </div>
  )
}
