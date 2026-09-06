import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatarDuracao, formatarPreco } from '../lib/transit/formato.js'

/** Pino pequeno de ponto de ônibus (embarque/desembarque). */
const pinoParada = (cor) =>
  L.divIcon({
    className: 'bus-stop-wrap',
    html: `<span class="bus-stop" style="--cor:${cor}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

/** Pino grande de origem/destino. */
const pinoPonto = (classe, emoji) =>
  L.divIcon({
    className: 'rota-pin-wrap',
    html: `<span class="rota-pin ${classe}">${emoji}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  })

/** Mapa Leaflet com a rota: ônibus colorido, caminhada tracejada e pinos. */
function MapaRota({ rota }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const todosPontos = []

    rota.etapas.forEach((etapa) => {
      if (etapa.tipo === 'onibus') {
        L.polyline(etapa.pontos, {
          color: etapa.linha.cor,
          weight: 5,
          opacity: 0.92,
          lineCap: 'round',
        })
          .addTo(map)
          .bindPopup(
            `<strong>Linha ${etapa.linha.numero}</strong><br/>${etapa.linha.nome}<br/>Tarifa: ${formatarPreco(etapa.linha.tarifa)}`,
          )
      } else if (etapa.tipo === 'carro' && etapa.pontos.length > 1) {
        L.polyline(etapa.pontos, {
          color: '#f59e0b',
          weight: 5,
          opacity: 0.92,
          lineCap: 'round',
        })
          .addTo(map)
          .bindPopup('<strong>🚗 Rota de carro</strong><br/>Via rodoviária (OSRM)')
      } else if (etapa.tipo === 'trilhos' && etapa.pontos.length > 1) {
        /* Metrô/trem: cor oficial da linha + marcação pontilhada dupla */
        L.polyline(etapa.pontos, {
          color: etapa.linha.cor,
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
        })
          .addTo(map)
          .bindPopup(
            `<strong>${etapa.linha.tipo === 'trem' ? '🚆 Trem' : '🚇 Metrô'} ${etapa.linha.numero}-${etapa.linha.nome}</strong><br/>${etapa.linha.operadora}<br/>${etapa.estacaoEmbarque} → ${etapa.estacaoDesembarque}`,
          )
      } else if (etapa.tipo === 'caminhada' && etapa.pontos.length > 1) {
        L.polyline(etapa.pontos, {
          color: '#94a3b8',
          weight: 4,
          dashArray: '2 8',
          opacity: 0.9,
          lineCap: 'round',
        }).addTo(map)
      }
      todosPontos.push(...etapa.pontos)
    })

    if (todosPontos.length) {
      const primeiro = todosPontos[0]
      const ultimo = todosPontos[todosPontos.length - 1]

      L.marker(primeiro, { icon: pinoPonto('rota-pin--origem', '🚶') })
        .addTo(map)
        .bindPopup(`<strong>Origem</strong><br/>${rota.origemRotulo}`)

      L.marker(ultimo, { icon: pinoPonto('rota-pin--destino', '🎯') })
        .addTo(map)
        .bindPopup(`<strong>Destino</strong><br/>${rota.destinoRotulo}`)

      rota.etapasOnibus.forEach((etapa) => {
        L.marker(etapa.pontos[0], { icon: pinoParada(etapa.linha.cor) })
          .addTo(map)
          .bindPopup(`<strong>🚏 Embarque</strong><br/>${etapa.embarque}`)

        const fim = etapa.pontos[etapa.pontos.length - 1]
        L.marker(fim, { icon: pinoParada(etapa.linha.cor) })
          .addTo(map)
          .bindPopup(
            `<strong>⬇️ Desembarque aqui</strong><br/>${etapa.desembarque}`,
          )
      })

      map.fitBounds(
        L.latLngBounds(todosPontos.map((p) => L.latLng(p[0], p[1]))),
        { padding: [42, 42] },
      )
    }

    return () => map.remove()
  }, [rota])

  return <div ref={containerRef} className="modal__mapa" />
}

export default function RouteMapModal({ aberto, rota, onClose }) {
  if (!aberto || !rota) return null

  const destinoQuery = encodeURIComponent(rota.destinoRotulo || '')
  const linkMaps = `https://www.google.com/maps/dir/?api=1&destination=${destinoQuery}`

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Mapa da rota de ônibus">
        <header className="modal__topo">
          <div className="modal__titulo">
            <strong>Rota até {rota.destinoRotulo}</strong>
            <span>
              {rota.tempoTexto} · {rota.precoTexto} ·{' '}
              {rota.trocas ? `${rota.trocas} troca(s)` : 'sem trocas'}
            </span>
          </div>
          <button type="button" className="search__acao" onClick={onClose} aria-label="Fechar mapa da rota">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="modal__corpo">
          <div className="mapa-legenda">
            <span>
              <i className="legenda-leg legenda-leg--onibus" /> ônibus
            </span>
            <span>
              <i className="legenda-leg legenda-leg--carro" /> carro
            </span>
            <span>
              <i className="legenda-leg legenda-leg--pe" /> caminhada
            </span>
            <span>
              <i className="legenda-ponto" /> embarque / desembarque
            </span>
          </div>
          <MapaRota rota={rota} />
        </div>

        <footer className="modal__rodape">
          <button type="button" className="btn btn--secundario" onClick={onClose}>
            Fechar
          </button>
          <a className="btn btn--primario" href={linkMaps} target="_blank" rel="noreferrer">
            Abrir no Google Maps
          </a>
        </footer>
      </div>
    </div>
  )
}
