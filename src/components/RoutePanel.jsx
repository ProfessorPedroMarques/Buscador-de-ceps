import { useState } from 'react'
import { formatarDistancia, formatarDuracao, formatarPreco } from '../lib/transit/formato.js'
import SequenciaOnibus from './SequenciaOnibus.jsx'
import SequenciaTrilhos from './SequenciaTrilhos.jsx'
import PainelViagens from './PainelViagens.jsx'

/**
 * Painel "Como chegar" — experiência inspirada no Moovit:
 * chips com as opções de rota + timeline detalhada da rota selecionada,
 * com embarque, desembarque, tarifa e formas de pagamento. Para distâncias
 * maiores, abas de viagem: 🚌 Rodoviária · ✈️ Avião · 🚗 Carro.
 */
export default function RoutePanel({
  planejamento,
  origemRotulo,
  destinoRotulo,
  onSelecionar,
  onAbrirMapa,
  onTentarNovamente,
  onTrocarOrigem,
  onRestaurar,
  onVerMapaCarro,
}) {
  const { status, rotas, indice, erro, mensagem, viagens } = planejamento
  const rota = rotas[indice] ?? null
  /* Índices de las etapas de transporte (õnibus/metrò/tren) en la lista completa
     — sirve para marcar visualmente las BALDEACIONES entre ellas. */
  const indicesTransporte =
    rota?.etapas
      .map((e, i) => (e.tipo === 'onibus' || e.tipo === 'trilhos') ? i : -1)
      .filter((i) => i >= 0) ?? []
  const modosViagem = viagens?.modos ?? []
  const [abaAtiva, setAbaAtiva] = useState('urbano')
  const abaModo = modosViagem.find((m) => m.chave === abaAtiva)
  const mostrarAbas = status === 'ready' && modosViagem.length > 0

  return (
    <section className="rota-panel" aria-label="Sugestões de rota de ônibus">
      <header className="rota-panel__cabecalho">
        <h2 className="rota-panel__titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
            <path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.6 6.8 19.7 6 18.6 6H4a2 2 0 0 0-2 2v10h3" />
            <circle cx="7" cy="18" r="2" />
            <path d="M9 18h5" />
            <circle cx="16" cy="18" r="2" />
          </svg>
          Como chegar
        </h2>
        <div className="rota-panel__topo-acoes">
          {onRestaurar && (
            <button
              type="button"
              className="btn btn--restaurar"
              onClick={onRestaurar}
              title="Limpiar y comenzar una nueva búsqueda"
            >
              ↺ Restaurar
            </button>
          )}
          <button type="button" className="rota-trocar-origem" onClick={onTrocarOrigem} title="Trocar a origem (GPS ou CEP manual)">
            🔄 Trocar origem
          </button>
          <span className="rota-panel__selo" title="Linhas reais de metró/trem + estimaciones urbanas">
            real + estimado
          </span>
        </div>
      </header>

      <div className="rota-od">
        <div className="rota-od__item">
          <span className="rota-od__pino rota-od__pino--origem" aria-hidden="true" />
          <div className="rota-od__texto">
            <small>Origem</small>
            <strong>{origemRotulo || 'Sua localização'}</strong>
          </div>
        </div>
        <div className="rota-od__item">
          <span className="rota-od__pino rota-od__pino--destino" aria-hidden="true" />
          <div className="rota-od__texto">
            <small>Destino</small>
            <strong>{destinoRotulo || '—'}</strong>
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div className="rota-detalhe" aria-busy="true">
          {mensagem && <p className="rota-detalhe__obs">{mensagem}</p>}
          <div className="skeleton skeleton--titulo" />
          <div className="skeleton" style={{ width: '72%' }} />
          <div className="skeleton" style={{ width: '58%' }} />
          <div className="skeleton" style={{ width: '44%' }} />
        </div>
      )}

      {status === 'error' && (
        <div className="rota-erro" role="alert">
          <p>{erro}</p>
          <button type="button" className="btn btn--secundario" onClick={onTentarNovamente}>
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && rotas.length === 0 && (
        <div className="rota-erro rota-erro--info">
          <p>{mensagem || 'Sem rotas para exibir.'}</p>
        </div>
      )}

      {status === 'ready' && (
        <>
          {mostrarAbas && (
            <div className="viagem-abas viagem-abas--painel" role="tablist" aria-label="Modos de deslocamento">
              <button
                type="button"
                role="tab"
                aria-selected={abaAtiva === 'urbano'}
                className={abaAtiva === 'urbano' ? 'viagem-aba is-ativo' : 'viagem-aba'}
                onClick={() => setAbaAtiva('urbano')}
              >
                🏙️ Na cidade
                <small>ônibus urbano</small>
              </button>
              {modosViagem.map((m) => (
                <button
                  key={m.chave}
                  type="button"
                  role="tab"
                  aria-selected={abaAtiva === m.chave}
                  className={abaAtiva === m.chave ? 'viagem-aba is-ativo' : 'viagem-aba'}
                  onClick={() => setAbaAtiva(m.chave)}
                >
                  {m.icone} {m.titulo}
                  <small>{m.descricao}</small>
                </button>
              ))}
            </div>
          )}

          {abaModo ? (
            <PainelViagens viagens={viagens} onVerMapaCarro={onVerMapaCarro} />
          ) : (
            rota && (
              <>
                <div className="rota-chips" role="tablist" aria-label="Opções de rota">
                  {rotas.map((r, i) => (
                    <button
                      key={`${r.etiqueta}-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={i === indice}
                      className={i === indice ? 'rota-chip is-ativo' : 'rota-chip'}
                      style={{ animationDelay: `${i * 60}ms` }}
                      onClick={() => onSelecionar(i)}
                    >
                      <span className="rota-chip__topo">
                        <span className="rota-chip__etiqueta">
                          {r.destaque ? '⭐ ' : ''}
                          {r.etiqueta}
                        </span>
                        {r.trocas > 0 && (
                          <span className="rota-chip__trocas">
                            {r.trocas} troca{r.trocas > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                      <strong className="rota-chip__tempo">
                        {formatarDuracao(r.tempoTotalMin)}
                      </strong>
                      <span className="rota-chip__linhas">
                        {r.etapasOnibus.map((e, j) => (
                          <span
                            key={j}
                            className="badge-linha badge-linha--mini"
                            style={{ background: e.linha.cor }}
                          >
                            {e.linha.numero}
                          </span>
                        ))}
                      </span>
                      <span className="rota-chip__modos">
                        {r.etapasOnibus.map((e, j) => (
                          <span key={`m${j}`} className="modal-chip-modo">
                            {e.tipo === 'trilhos'
                              ? (e.linha.tipo === 'trem' ? '🚆 Tren' : '🚇 Metrò')
                              : '🚌 Ônibus'}
                          </span>
                        ))}
                        {r.trocas > 0 && (
                          <span className="modal-chip-modo">🔁 baldeación</span>
                        )}
                      </span>
                      <span className="rota-chip__meta">
                        {formatarPreco(r.preco)} · 🚶 {formatarDistancia(r.caminhadaKm)}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="rota-detalhe">
                  <p className="rota-detalhe__resumo">
                    <strong>{formatarDuracao(rota.tempoTotalMin)}</strong> de viagem ·{' '}
                    {formatarPreco(rota.preco)} ·{' '}
                    {rota.trocas
                      ? `${rota.trocas} troca${rota.trocas > 1 ? 's' : ''}`
                      : 'sem trocas'}{' '}
                    · 🚶 {formatarDistancia(rota.caminhadaKm)}
                  </p>

                  {rota.observacao && <p className="rota-detalhe__obs">{rota.observacao}</p>}

                  <ol className="timeline">
                    {rota.etapas.map((etapa, i) => (
                      <li
                        key={i}
                        className={i === rota.etapas.length - 1 ? 'tl-etapa tl-etapa--fim' : 'tl-etapa'}
                      >
                        <span
                          className={`tl-icone tl-icone--${etapa.tipo}`}
                          style={
                            etapa.tipo === 'onibus'
                              ? {
                                  background: `${etapa.linha.cor}1f`,
                                  color: etapa.linha.cor,
                                  borderColor: etapa.linha.cor,
                                }
                              : undefined
                          }
                          aria-hidden="true"
                        >
                          {etapa.icone}
                        </span>
                        <div className="tl-conteudo">
                          {etapa.tipo === 'onibus' ? (
                            <SequenciaOnibus etapa={etapa} />
                          ) : etapa.tipo === 'trilhos' ? (
                            <SequenciaTrilhos etapa={etapa} />
                          ) : (
                            <>
                              <p className="tl-titulo">{etapa.titulo}</p>
                              <p className="tl-detalhe">{etapa.descricao}</p>
                            </>
                          )}
                          {(() => {
                            const pos =
                              (etapa.tipo === 'onibus' || etapa.tipo === 'trilhos')
                                ? indicesTransporte.indexOf(i)
                                : -1
                            const hayBaldeo =
                              pos > -1 &&
                              indicesTransporte.length > 1 &&
                              pos < indicesTransporte.length - 1
                            return hayBaldeo
                              ? (
                                  <span className="tl-baldeo">
                                    🔁 Baldeación: baja del transporte y toma el
                                    siguiente ({indicesTransporte.length - pos - 1} más)
                                  </span>
                                )
                              : null
                          })()}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="rota-rodape">
                    <button type="button" className="btn btn--primario" onClick={onAbrirMapa}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true">
                        <path d="m9 20-6 2V6l6-2 6 2 6-2v16l-6 2-6-2Z" />
                        <path d="M9 4v16m6-14v16" />
                      </svg>
                      Ver rota no mapa
                    </button>
                    <button type="button" className="btn btn--secundario" onClick={onTentarNovamente}>
                      Planejar novamente
                    </button>
                  </div>

                  <p className="rota-aviso">
                    ℹ️ Rotas, linhas, paradas e tarifas são <strong>estimativas educativas</strong> geradas
                    por este aplicativo — confirme sempre com a prefeitura ou operadora da sua cidade.
                  </p>
                </div>
              </>
            )
          )}
        </>
      )}
    </section>
  )
}
