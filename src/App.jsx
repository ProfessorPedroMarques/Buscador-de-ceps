import { useCallback, useEffect, useRef, useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import ResultCard from './components/ResultCard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import MapModal from './components/MapModal.jsx'
import RoutePanel from './components/RoutePanel.jsx'
import RouteMapModal from './components/RouteMapModal.jsx'
import SeletorOrigem from './components/SeletorOrigem.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Toast from './components/Toast.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { geocodificar, obterGeometriaRota } from './lib/api.js'
import { formatarPreco } from './lib/transit/formato.js'
import { GeoPoint } from './lib/transit/GeoPoint.js'
import { PlanejadorRotas } from './lib/transit/PlanejadorRotas.js'
import { PlanejadorViagens } from './lib/transit/PlanejadorViagens.js'
import './styles-rota.css'

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
  const [rotaMapaAberto, setRotaMapaAberto] = useState(false)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)
  const rotaRef = useRef(null)

  /* Estado do planejamento de rota ("modo Moovit") */
  const [planejamento, setPlanejamento] = useState({
    status: 'idle', // idle | loading | ready | error
    rotas: [],
    indice: 0,
    erro: '',
    mensagem: '',
    meta: { origemRotulo: '', destinoRotulo: '' },
    viagens: { modos: [], distanciaViaKm: 0, interestadual: false },
  })
  /* Origem escolhida (GPS ou CEP manual) + seletor de origem */
  const [origem, setOrigem] = useState(null)
  const [seletorAberto, setSeletorAberto] = useState(false)
  /* Pseudo-rota do carro para o mapa (quando aberto pela aba Carro) */
  const [rotaCarroPseudo, setRotaCarroPseudo] = useState(null)
  const { coords: coordsGeo, solicitar: pedirLocalizacao } = useGeolocation()

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

  /* Planeja rotas urbanas + viagens (rodoviária/avião/carro) a partir da origem */
  const planejarRota = useCallback(
    async (origemInfo) => {
      if (!resultado) return
      setSeletorAberto(false)
      setPlanejamento((p) => ({
        status: 'loading',
        rotas: [],
        indice: 0,
        erro: '',
        mensagem: 'Localizando o destino…',
        meta: {
          origemRotulo: origemInfo.rotulo,
          destinoRotulo: resultado.logradouro || resultado.localidade,
        },
        viagens: p.viagens ?? { modos: [], distanciaViaKm: 0, interestadual: false },
      }))
      setTimeout(
        () => rotaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
        80,
      )

      try {
        const geoDestino = await geocodificar({
          logradouro: resultado.logradouro,
          cidade: resultado.localidade,
          uf: resultado.uf,
        })
        if (!geoDestino.ok) {
          throw new Error('Não foi possível localizar as coordenadas do destino.')
        }

        const origemPonto = new GeoPoint(
          origemInfo.ponto.lat,
          origemInfo.ponto.lon,
          origemInfo.rotulo,
        )
        const destinoPonto = new GeoPoint(
          geoDestino.lat,
          geoDestino.lon,
          resultado.logradouro || resultado.localidade,
        )

        setPlanejamento((p) => ({ ...p, mensagem: 'Calculando rotas e viagens…' }))
        const geometria = await obterGeometriaRota(origemPonto, destinoPonto)

        /* Rotas urbanas (ônibus urbano / a pé) */
        const planejador = new PlanejadorRotas({
          origem: origemPonto,
          destino: destinoPonto,
          endereco: resultado,
          geometria,
        })
        const { rotas, mensagem } = planejador.planejar()

        /* Viagens de longo curso (rodoviária, avião, carro) */
        const planejadorViagens = new PlanejadorViagens({
          origem: origemPonto,
          destino: destinoPonto,
          cidadeOrigem: origemInfo.cidade,
          ufOrigem: origemInfo.uf,
          cidadeDestino: resultado.localidade,
          ufDestino: resultado.uf,
          distanciaKm: origemPonto.distanciaPara(destinoPonto),
          geometria,
        })
        const viagens = planejadorViagens.planejar()

        setPlanejamento({
          status: 'ready',
          rotas,
          indice: 0,
          erro: '',
          mensagem,
          meta: {
            origemRotulo: origemInfo.rotulo,
            destinoRotulo: resultado.logradouro || resultado.localidade,
          },
          viagens,
        })
        notificar(
          viagens.modos.length
            ? `Rota urbana + ${viagens.modos.length} modo(s) de viagem encontrados!`
            : `${rotas.length} opções de rota encontradas!`,
          'sucesso',
        )
      } catch (e) {
        setPlanejamento({
          status: 'error',
          rotas: [],
          indice: 0,
          erro: e.message,
          mensagem: '',
          meta: {
            origemRotulo: origemInfo.rotulo,
            destinoRotulo: resultado.logradouro || '',
          },
          viagens: { modos: [], distanciaViaKm: 0, interestadual: false },
        })
        notificar(e.message, 'erro')
      }
    },
    [resultado, notificar],
  )

  /* Clique em "Como chegar": usa a origem salva ou abre o seletor */
  const abrirComoChegar = useCallback(() => {
    if (!resultado) return
    if (origem) {
      planejarRota(origem)
    } else {
      setSeletorAberto(true)
    }
  }, [resultado, origem, planejarRota])

  /* Origem definida no SeletorOrigem (GPS ou CEP manual) */
  const definirOrigem = useCallback(
    (origemInfo) => {
      setOrigem(origemInfo)
      setSeletorAberto(false)
      planejarRota(origemInfo)
    },
    [planejarRota],
  )

  /* Mapa da rota de carro (pseudo-rota compatível com RouteMapModal) */
  const abrirMapaCarro = useCallback(
    (carro) => {
      setRotaCarroPseudo({
        etapas: [
          {
            tipo: 'carro',
            pontos: carro.pontos,
            linha: { cor: '#f59e0b', numero: 'Carro', nome: 'Rota rodoviária' },
          },
        ],
        etapasOnibus: [],
        trocas: 0,
        tempoTexto: carro.duracaoTexto,
        precoTexto: formatarPreco(carro.custoTotal),
        origemRotulo: origem?.rotulo ?? 'Origem',
        destinoRotulo: resultado?.logradouro || resultado?.localidade || 'Destino',
      })
      setRotaMapaAberto(true)
    },
    [origem, resultado],
  )

  /* Restaura o app ao estado inicial (nova busca) após uma busca */
  const restaurarBusqueda = useCallback(() => {
    setCep('')
    setResultado(null)
    setStatus('idle')
    setErro('')
    setShake(false)
    setMapaAberto(false)
    setRotaMapaAberto(false)
    setSeletorAberto(false)
    setRotaCarroPseudo(null)
    setPlanejamento({
      status: 'idle',
      rotas: [],
      indice: 0,
      erro: '',
      mensagem: '',
      meta: { origemRotulo: '', destinoRotulo: '' },
      viagens: { modos: [], distanciaViaKm: 0, interestadual: false },
    })
    notificar('Pronto para uma nova busca! ✈️', 'info')
    inputRef.current?.focus()
  }, [notificar])

  /* Tecla Esc fecha os mapas */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMapaAberto(false)
        setRotaMapaAberto(false)
        setSeletorAberto(false)
      }
    }
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
            <p>Do CEP ao seu destino: ônibus municipal, metrô, trem e avião 🛫</p>
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
          <section className="hero-viaje" aria-label="Sua viagem começa aqui">
            <div className="hero-viaje__cielo" aria-hidden="true">
              <span className="hero-sol" />
              <span className="hero-nube hero-nube--1" />
              <span className="hero-nube hero-nube--2" />
              <span className="hero-nube hero-nube--3" />
              <span className="hero-avion">✈️</span>
            </div>
            <div className="hero-viaje__contenido">
              <h2 className="hero-viaje__titulo">Sua viagem começa com um CEP 📍</h2>
              <p className="hero-viaje__texto">
                Digite o <strong>CEP do seu destino</strong> e mostraremos como chegar
                em <strong>ônibus municipal ou intermunicipal</strong> (com número e nome
                da linha), <strong>metrô ou trem</strong> (estação, linha e baldeações) — e
                para distâncias longas, <strong>avião ou estrada</strong> com links reais de
                compra na ClickBus, Buser, Google Flights e Skyscanner.
              </p>
              <div className="hero-pasos" aria-hidden="true">
                <span className="hero-paso">🔍 CEP</span>
                <i>→</i>
                <span className="hero-paso">🚌 Ônibus municipal</span>
                <i>→</i>
                <span className="hero-paso">🚇 Metrò / Tren</span>
                <i>→</i>
                <span className="hero-paso">✈️ Avião</span>
              </div>
            </div>
          </section>
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
            onComoChegar={abrirComoChegar}
            onRestaurar={restaurarBusqueda}
            planejandoRota={planejamento.status === 'loading'}
          />
        )}

        <div ref={rotaRef}>
          {planejamento.status !== 'idle' && (
            <RoutePanel
              planejamento={planejamento}
              origemRotulo={planejamento.meta.origemRotulo}
              destinoRotulo={
                planejamento.meta.destinoRotulo ||
                planejamento.rotas[0]?.destinoRotulo
              }
              onSelecionar={(i) =>
                setPlanejamento((p) => ({ ...p, indice: i }))
              }
              onAbrirMapa={() => setRotaMapaAberto(true)}
              onTentarNovamente={abrirComoChegar}
              onTrocarOrigem={() => setSeletorAberto(true)}
              onRestaurar={restaurarBusqueda}
              onVerMapaCarro={abrirMapaCarro}
            />
          )}
        </div>

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
        Dados: <strong>ViaCEP</strong> · Mapas: <strong>OpenStreetMap</strong> · Rotas:{' '}
        <strong>OSRM</strong> · Passagens reais: <strong>Amadeus</strong> · Compra:{' '}
        <strong>ClickBus · Buser · Google Flights · Skyscanner</strong>
      </footer>

      <MapModal
        aberto={mapaAberto}
        endereco={resultado}
        onClose={() => setMapaAberto(false)}
        notificar={notificar}
      />

      <RouteMapModal
        aberto={rotaMapaAberto}
        rota={rotaCarroPseudo ?? planejamento.rotas[planejamento.indice] ?? null}
        onClose={() => {
          setRotaMapaAberto(false)
          setRotaCarroPseudo(null)
        }}
      />

      <SeletorOrigem
        aberto={seletorAberto}
        onFechar={() => setSeletorAberto(false)}
        onDefinir={definirOrigem}
        notificar={notificar}
        pedirLocalizacao={pedirLocalizacao}
        temGps={coordsGeo}
      />

      <Toast toast={toast} onConcluido={() => setToast(null)} />
    </div>
  )
}
