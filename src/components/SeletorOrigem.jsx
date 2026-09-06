import { useState } from 'react'
import { GeoPoint } from '../lib/transit/GeoPoint.js'
import { consultarCep, geocodificar, geocodificarReversa, mascaraCep } from '../lib/api.js'

/**
 * SeletorOrigem — modal para definir a origem da viagem:
 *  • aba GPS: usa a localização do navegador (+ geocodificação reversa);
 *  • aba manual: a pessoa digita o CEP de onde ela está (ViaCEP + geocode).
 */
export default function SeletorOrigem({
  aberto,
  onFechar,
  onDefinir,
  notificar,
  pedirLocalizacao,
  temGps,
}) {
  const [aba, setAba] = useState('gps')
  const [cep, setCep] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  if (!aberto) return null

  const definirViaGps = async () => {
    setCarregando(true)
    setErro('')
    try {
      let local = temGps
      if (!local) local = await pedirLocalizacao()
      if (!local) {
        throw new Error('Não foi possível obter a localização. Verifique a permissão do navegador.')
      }

      const reversa = await geocodificarReversa(local.lat, local.lon).catch(() => null)
      onDefinir({
        ponto: new GeoPoint(local.lat, local.lon, reversa?.rotulo || 'Sua localização'),
        rotulo: reversa?.rotulo || 'Sua localização',
        cidade: reversa?.cidade || '',
        uf: reversa?.uf || '',
        cep: reversa?.dados?.postcode || '',
        tipo: 'gps',
      })
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  const definirViaCep = async (e) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    try {
      const endereco = await consultarCep(cep)
      const geo = await geocodificar({
        logradouro: endereco.logradouro,
        cidade: endereco.localidade,
        uf: endereco.uf,
      })
      if (!geo.ok) throw new Error('Não foi possível localizar esse CEP no mapa.')

      const rotulo =
        [endereco.logradouro, endereco.bairro].filter(Boolean).join(', ') ||
        endereco.localidade
      onDefinir({
        ponto: new GeoPoint(geo.lat, geo.lon, rotulo),
        rotulo,
        cidade: endereco.localidade,
        uf: endereco.uf,
        cep: endereco.cep,
        tipo: 'manual',
      })
      notificar('Origem definida pelo CEP!', 'sucesso')
    } catch (e2) {
      setErro(e2.message)
      notificar(e2.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Definir localização de origem">
        <header className="modal__topo">
          <div className="modal__titulo">
            <strong>De onde você vai partir?</strong>
            <span>Escolha sua localização para calcular a rota</span>
          </div>
          <button type="button" className="search__acao" onClick={onFechar} aria-label="Fechar seletor de origem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="modal__corpo seletor-origem">
          <div className="seletor-origem__abas" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'gps'}
              className={aba === 'gps' ? 'seletor-aba is-ativo' : 'seletor-aba'}
              onClick={() => setAba('gps')}
            >
              📍 Minha localização
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'manual'}
              className={aba === 'manual' ? 'seletor-aba is-ativo' : 'seletor-aba'}
              onClick={() => setAba('manual')}
            >
              ✏️ Digitar CEP
            </button>
          </div>

          {erro && (
            <p className="seletor-origem__erro" role="alert">
              {erro}
            </p>
          )}

          {aba === 'gps' ? (
            <div className="seletor-origem__corpo">
              <p className="seletor-origem__texto">
                {temGps
                  ? 'Sua localização já foi detectada — confirme para usar.'
                  : 'Vamos pedir permissão ao navegador para detectar onde você está.'}
              </p>
              <button
                type="button"
                className="btn btn--primario"
                onClick={definirViaGps}
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Localizando…
                  </>
                ) : (
                  <>📍 Usar minha localização</>
                )}
              </button>
            </div>
          ) : (
            <form className="seletor-origem__corpo" onSubmit={definirViaCep}>
              <p className="seletor-origem__texto">
                Digite o CEP do endereço de onde você vai partir.
              </p>
              <div className="seletor-origem__form">
                <input
                  className="seletor-origem__input"
                  type="text"
                  inputMode="numeric"
                  placeholder="00000-000"
                  aria-label="CEP de origem"
                  maxLength={9}
                  autoComplete="off"
                  value={cep}
                  onChange={(e) => setCep(mascaraCep(e.target.value))}
                />
                <button
                  type="submit"
                  className="btn btn--primario"
                  disabled={carregando || cep.replace(/\D/g, '').length !== 8}
                >
                  {carregando ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Buscando…
                    </>
                  ) : (
                    'Definir origem'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
