import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Endereço em texto simples para busca externa no Google Maps */
const enderecoTexto = (e) =>
  [e?.logradouro, e?.localidade, e?.uf, 'Brasil'].filter(Boolean).join(', ')

/** Mapa Leaflet montado apenas quando existem coordenadas */
function MapaLeaflet({ coords }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const pin = L.divIcon({
      className: 'map-pin',
      html: '<span class="map-pin__dot"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 23],
    })
    L.marker(coords, { icon: pin }).addTo(map)

    map.setView(coords, 15)
    const tempo = setTimeout(() => map.flyTo(coords, 17, { duration: 1.2 }), 350)

    return () => {
      clearTimeout(tempo)
      map.remove()
    }
  }, [coords])

  return <div ref={containerRef} className="modal__mapa" />
}

export default function MapModal({ aberto, endereco, onClose, notificar }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [coords, setCoords] = useState(null)
  const [local, setLocal] = useState('')

  /* Consulta a geocodificação sempre que o modal abre */
  useEffect(() => {
    if (!aberto || !endereco) return
    let ativo = true

    setCarregando(true)
    setErro('')
    setCoords(null)
    setLocal('')

    const params = new URLSearchParams({
      logradouro: endereco.logradouro ?? '',
      cidade: endereco.localidade ?? '',
      uf: endereco.uf ?? '',
    })

    fetch(`/api/geocode?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!ativo) return
        if (!json.ok) throw new Error(json.erro || 'Coordenadas não encontradas.')
        setCoords([json.lat, json.lon])
        setLocal(json.displayName ?? '')
        if (!json.preciso) {
          notificar('Exibindo a região aproximada da cidade.', 'info')
        }
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))

    return () => {
      ativo = false
    }
  }, [aberto, endereco, notificar])

  if (!aberto) return null

  const queryMaps = coords
    ? coords.join(',')
    : encodeURIComponent(enderecoTexto(endereco))
  const linkMaps = `https://www.google.com/maps/search/?api=1&query=${queryMaps}`

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Mapa do endereço">
        <header className="modal__topo">
          <div className="modal__titulo">
            <strong>{endereco?.logradouro || endereco?.localidade}</strong>
            <span>{local || `${endereco?.localidade ?? ''} - ${endereco?.uf ?? ''}`}</span>
          </div>
          <button type="button" className="search__acao" onClick={onClose} aria-label="Fechar mapa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="modal__corpo">
          {carregando && (
            <div className="modal__aviso">
              <span className="spinner spinner--grande" aria-hidden="true" />
              <p>Localizando o endereço no mapa…</p>
            </div>
          )}

          {!carregando && erro && (
            <div className="modal__aviso">
              <span className="modal__icone-erro" aria-hidden="true">📍</span>
              <p>{erro}</p>
              <a className="btn btn--secundario" href={linkMaps} target="_blank" rel="noreferrer">
                Tentar no Google Maps
              </a>
            </div>
          )}

          {!carregando && coords && <MapaLeaflet coords={coords} />}
        </div>

        <footer className="modal__rodape">
          <button
            type="button"
            className="btn btn--secundario"
            onClick={() => {
              if (!coords) return
              navigator.clipboard
                .writeText(coords.join(', '))
                .then(() => notificar('Coordenadas copiadas!', 'sucesso'))
                .catch(() => notificar('Não foi possível copiar.', 'erro'))
            }}
            disabled={!coords}
          >
            Copiar coordenadas
          </button>
          <a className="btn btn--primario" href={linkMaps} target="_blank" rel="noreferrer">
            Abrir no Google Maps
          </a>
        </footer>
      </div>
    </div>
  )
}
