import { useCallback, useState } from 'react'
import { formatarDistancia, formatarPreco } from '../lib/transit/formato.js'
import {
  dataFuturaISO,
  linkGoogleFlights,
  linkSkyscanner,
  linkClickBus,
  linkBuser,
} from '../lib/linksCompra.js'

/* Código de companhia aérea (Amadeus) → nome comercial. */
const NOMES_AEREAS = {
  LA: 'LATAM',
  G3: 'GOL',
  AD: 'Azul Brasil',
  Y4: 'Volaris',
  AV: 'Avianca',
  IB: 'Iberia',
  AM: 'Aeroméxico',
  LH: 'Lufthansa',
  AF: 'Air France',
  KL: 'KLM',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  TK: 'Turkish Airlines',
  '9B': 'Volar Brasil',
  '2A': 'Aerolíneas Argentinas',
}

/**
 * PainelViagens — abas por modo (🚌 Rodoviária / ✈️ Avião / 🚗 Carro) com
 * cartões das opções: empresa, horários de partida/chegada, valor e detalhes.
 */
export default function PainelViagens({ viagens, onVerMapaCarro }) {
  const [aba, setAba] = useState(viagens.modos[0]?.chave)
  const modo = viagens.modos.find((m) => m.chave === aba) ?? viagens.modos[0]
  const [data, setData] = useState(() => dataFuturaISO(7))
  const [reais, setReais] = useState(null) // { estado, aviao, onibus, fonte }
  const [carregandoReais, setCarregandoReais] = useState(false)

  if (!viagens.modos.length) return null

  const opcaoAviao =
    viagens.modos.find((m) => m.chave === 'aviao')?.opcoes?.[0]
  const opcaoRodoviaria =
    viagens.modos.find((m) => m.chave === 'rodoviario')?.opcoes?.[0]
  const meta = viagens.metaViagem ?? {}

  /* Consulta PREÇOS reais ao backend (Amadeus para voos; gateway próprio para
     ônibus). Sem chaves, o backend responde { ok:false, motivo } de forma
     transparente e mostramos os enlaces oficiais de compra de cada opção. */
  const buscarReais = useCallback(async () => {
    setCarregandoReais(true)
    setReais({ estado: 'buscando' })
    const r = { estado: 'pronto', aviao: null, onibus: null, fonte: '' }
    try {
      if (opcaoAviao) {
        const params = new URLSearchParams({
          origemIata: opcaoAviao.iataOrigem,
          destinoIata: opcaoAviao.iataDestino,
          data,
        })
        const res = await fetch(`/api/passagens/aviao?${params}`)
        const json = await res.json()
        r.aviao = json
        r.fonte = json?.fonte || r.fonte
      }
      if (opcaoRodoviaria) {
        const params2 = new URLSearchParams({
          origem: meta.cidadeOrigem || '',
          destino: meta.cidadeDestino || '',
          data,
        })
        const res2 = await fetch(`/api/passagens/onibus?${params2}`)
        const json2 = await res2.json()
        r.onibus = json2
        r.fonte = r.fonte || json2?.fonte || ''
      }
      if (!r.aviao?.ok && !r.onibus?.ok) r.estado = 'falha'
    } catch {
      r.estado = 'falha'
    }
    setReais(r)
    setCarregandoReais(false)
  }, [opcaoAviao, opcaoRodoviaria, meta.cidadeOrigem, meta.cidadeDestino, data])

  return (
    <div className="painel-viagens">
      <header className="painel-viagens__cabecalho">
        <h3 className="painel-viagens__titulo">
          🧭 Viagens de longo curso
          {viagens.interestadual && (
            <span className="badge-interestadual">Interestadual</span>
          )}
        </h3>
        <span className="painel-viagens__dist">
          ≈ {formatarDistancia(viagens.distanciaViaKm)} de estrada
        </span>
      </header>

      <div className="viagem-fila-data">
        <span className="viagem-data-rotulo">🗓️ Data da viagem</span>
        <input
          type="date"
          className="viagem-data-input"
          value={data}
          min={dataFuturaISO(0)}
          onChange={(e) => {
            if (!e.target.value) return
            setData(e.target.value)
            setReais(null)
          }}
          aria-label="Data da viagem para buscar passagens reais"
        />
        <button
          type="button"
          className="btn btn--reais"
          onClick={buscarReais}
          disabled={carregandoReais}
        >
          {carregandoReais ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Buscando preços reais…
            </>
          ) : (
            <>🔎 Preços reais ao vivo</>
          )}
        </button>
        <span className="badge-vivo">dados reais</span>
      </div>

      {reais?.estado === 'buscando' && (
        <div className="real-bandera" role="status">
          Consultando <strong>Amadeus</strong> (voos) e o gateway de ônibus
          (ClickBus)…
        </div>
      )}

      {reais?.estado === 'pronto' && (
        <div className="real-bandera" role="status">
          ✅ <strong>Ofertas reais</strong> para {data.replace(/-/g, '/')}
          {reais.fonte ? ` · fonte: ${reais.fonte}` : ''}. Abaixo de cada
          opção está o link oficial de compra.
        </div>
      )}

      {reais?.estado === 'falha' && (
        <div className="real-bandera real-bandera--aviso" role="alert">
          ⚠️ Não foi possível consultar agora. Abra os buscadores reais (
          <strong>ClickBus</strong>, <strong>Buser</strong>,{' '}
          <strong>Google Flights</strong> ou <strong>Skyscanner</strong>) nos
          botões de cada opção para ver preços reais e comprar.
        </div>
      )}

      <div className="viagem-abas" role="tablist" aria-label="Modos de viagem">
        {viagens.modos.map((m) => (
          <button
            key={m.chave}
            type="button"
            role="tab"
            aria-selected={m.chave === modo?.chave}
            className={m.chave === modo?.chave ? 'viagem-aba is-ativo' : 'viagem-aba'}
            onClick={() => setAba(m.chave)}
          >
            {m.icone} {m.titulo}
            <small>{m.opcoes.length} opção{m.opcoes.length > 1 ? 'ões' : ''}</small>
          </button>
        ))}
      </div>

      {modo?.chave === 'carro' ? (
        <CardCarro carro={modo.opcoes[0]} onVerMapa={onVerMapaCarro} />
      ) : (
        <div className="viagem-lista">
          {modo?.opcoes.map((op, i) =>
            op.modo === 'rodoviario' ? (
              <CardRodoviario key={op.empresa + i} viagem={op} atraso={i * 70} />
            ) : (
              <CardAviao key={op.empresa + i} viagem={op} atraso={i * 70} data={data} />
            ),
          )}
        </div>
      )}

      {modo?.chave === 'aviao' && reais?.aviao?.ok && modo.opcoes[0] && (
        <RealOfertasAviao ofertas={reais.aviao.ofertas} data={data} iataOrigem={modo.opcoes[0].iataOrigem} iataDestino={modo.opcoes[0].iataDestino} />
      )}
      {modo?.chave === 'rodoviario' && reais?.onibus?.ok && (
        <RealOfertasOnibus ofertas={reais.onibus.ofertas} />
      )}

      <p className="rota-aviso">
        ℹ️ Empresas, horários e valores são <strong>estimativas educativas</strong> geradas por
        este aplicativo — confira os horários e compre sua passagem no site oficial ou guichê
        da empresa.
      </p>
    </div>
  )
}

/* ---------------- Cartões por modo ---------------- */

function Horarios({ viagem }) {
  return (
    <div className="viagem-horarios">
      <div className="viagem-hora">
        <span className="viagem-hora__rotulo">Partida</span>
        <strong>{viagem.partida}</strong>
        <small>{viagem.localPartida}</small>
      </div>
      <div className="viagem-horarios__linha" aria-hidden="true">
        <span>{viagem.duracaoTexto}</span>
        <i />
      </div>
      <div className="viagem-hora viagem-hora--fim">
        <span className="viagem-hora__rotulo">Chegada</span>
        <strong>
          {viagem.chegada}
          {viagem.diaSeguinte && <em className="viagem-dia-seguinte">+1 dia</em>}
        </strong>
        <small>{viagem.localChegada}</small>
      </div>
    </div>
  )
}

function CardRodoviario({ viagem, atraso }) {
  return (
    <article className="viagem-card" style={{ animationDelay: `${atraso}ms` }}>
      <header className="viagem-card__topo">
        <div>
          <strong className="viagem-card__empresa">
            🚌 {viagem.empresa}
          </strong>
          {viagem.numeroServico && (
            <p className="viagem-onibus-embarque">
              Pegue o ônibus{' '}
              <span className="badge-servico" title="Número do ônibus a pegar">
                {viagem.numeroServico}
              </span>
            </p>
          )}
          {viagem.nomeServico ? (
            <p className="servico-nome">{viagem.nomeServico}</p>
          ) : (
            <p className="viagem-card__empresa-desc">{viagem.descricaoEmpresa}</p>
          )}
        </div>
        <div className="viagem-card__preco">
          <strong>{formatarPreco(viagem.valor)}</strong>
          <small>por pessoa</small>
        </div>
      </header>

      <div className="viagem-card__badges">
        <span className="badge-assento">{viagem.assento}</span>
        {viagem.pontosParada > 0 && (
          <span className="badge-paradas">{viagem.pontosParada} parada(s) de descanso</span>
        )}
      </div>

      <Horarios viagem={viagem} />

      <div className="chip-pagamentos">
        {viagem.amenidades.map((a) => (
          <span key={a} className="chip-pagamento">
            {a}
          </span>
        ))}
      </div>

      <div className="enlaces-compra" aria-label="Comprar nos sites oficiais de ônibus">
        <a
          className="viagem-link viagem-link--compra"
          href={linkClickBus()}
          target="_blank"
          rel="noopener noreferrer"
        >
          🚌 ClickBus — preços reais
        </a>
        <a
          className="viagem-link viagem-link--compra"
          href={linkBuser()}
          target="_blank"
          rel="noopener noreferrer"
        >
          🚌 Buser — preços reais
        </a>
      </div>
    </article>
  )
}

function CardAviao({ viagem, atraso, data }) {
  return (
    <article className="viagem-card" style={{ animationDelay: `${atraso}ms` }}>
      <header className="viagem-card__topo">
        <div>
          <strong className="viagem-card__empresa">
            ✈️ {viagem.empresa} <span className="viagem-voo">· voo {viagem.voo}</span>
          </strong>
          <p className="viagem-card__empresa-desc">{viagem.descricaoEmpresa}</p>
        </div>
        <div className="viagem-card__preco">
          <strong>{formatarPreco(viagem.valor)}</strong>
          <small>a partir de</small>
        </div>
      </header>

      <div className="viagem-card__badges">
        <span className="badge-assento">{viagem.iataOrigem} → {viagem.iataDestino}</span>
        <span className={viagem.conexoes ? 'badge-paradas' : 'badge-direto'}>
          {viagem.conexoes ? `1 conexão (+${Math.round(viagem.duracaoMin * 0.25)} min)` : 'Voo direto'}
        </span>
      </div>

      <Horarios viagem={viagem} />

      <p className="viagem-aeroportos">
        🛫 {viagem.aeroportoOrigem}
        <br />
        🛬 {viagem.aeroportoDestino}
      </p>

      <div className="chip-pagamentos">
        <span className="chip-pagamento">Bagagem de mão incluída</span>
        <span className="chip-pagamento">Check-in online</span>
        <span className="chip-pagamento">Cartão de crédito / PIX</span>
      </div>

      <div className="enlaces-compra" aria-label="Ver precios reais y comprar vuelos">
        <a
          className="viagem-link viagem-link--compra"
          href={linkGoogleFlights({
            iataOrigem: viagem.iataOrigem,
            iataDestino: viagem.iataDestino,
            data,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          🔎 Google Flights — preços reais
        </a>
        <a
          className="viagem-link viagem-link--compra"
          href={linkSkyscanner({
            iataOrigem: viagem.iataOrigem,
            iataDestino: viagem.iataDestino,
            data,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          🔎 Skyscanner — preços reais
        </a>
      </div>
    </article>
  )
}

/* ---------------- Ofertas REAIS do backend ---------------- */

function OfertaRealAviao({ oferta, data, iataOrigem, iataDestino }) {
  const empresa =
    NOMES_AEREAS[oferta.empresa] ?? `Companhia ${oferta.empresa}`
  return (
    <div className="oferta-real">
      <strong>
        ✈️ {empresa}{' '}
        <small>{oferta.voos?.join(' · ')}</small>
      </strong>
      <small>
        {oferta.partida} → {oferta.chegada}
        {oferta.conexoes ? ` · ${oferta.conexoes} conexão` : ' · direto'}
      </small>
      <div className="oferta-real__preco">
        <strong>{formatarPreco(oferta.valor)}</strong>
        <small>{oferta.moeda}</small>
      </div>
      <div className="enlaces-compra">
        <a
          className="viagem-link viagem-link--compra"
          href={linkGoogleFlights({ iataOrigem, iataDestino, data })}
          target="_blank"
          rel="noopener noreferrer"
        >
          Comprar no Google Flights
        </a>
        <a
          className="viagem-link viagem-link--compra"
          href={linkSkyscanner({ iataOrigem, iataDestino, data })}
          target="_blank"
          rel="noopener noreferrer"
        >
          Comprar no Skyscanner
        </a>
      </div>
    </div>
  )
}

function OfertaRealOnibus({ oferta }) {
  return (
    <div className="oferta-real">
      <strong>
        🚌 {oferta.empresa}{' '}
        {oferta.assento && <small>· {oferta.assento}</small>}
      </strong>
      <small>
        {oferta.descricao || `${oferta.partida} → ${oferta.chegada}`}
        {oferta.link && ' · preço real do site'}
      </small>
      <div className="oferta-real__preco">
        <strong>{formatarPreco(oferta.valor)}</strong>
        <small>a partir de</small>
      </div>
      <div className="enlaces-compra">
        {oferta.link ? (
          <a
            className="viagem-link viagem-link--compra"
            href={oferta.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            🎫 Comprar passagem
          </a>
        ) : (
          <>
            <a
              className="viagem-link viagem-link--compra"
              href={linkClickBus()}
              target="_blank"
              rel="noopener noreferrer"
            >
              ClickBus — comprar
            </a>
            <a
              className="viagem-link viagem-link--compra"
              href={linkBuser()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buser — comprar
            </a>
          </>
        )}
      </div>
    </div>
  )
}

function RealOfertasAviao({ ofertas, data, iataOrigem, iataDestino }) {
  return (
    <div role="region" aria-label="Ofertas reais de voo">
      {ofertas.map((o, i) => (
        <OfertaRealAviao
          key={`real-${i}`}
          oferta={o}
          data={data}
          iataOrigem={iataOrigem}
          iataDestino={iataDestino}
        />
      ))}
    </div>
  )
}

function RealOfertasOnibus({ ofertas }) {
  return (
    <div role="region" aria-label="Ofertas reais de ônibus">
      {ofertas.map((o, i) => (
        <OfertaRealOnibus key={`realbus-${i}`} oferta={o} />
      ))}
    </div>
  )
}

function CardCarro({ carro, onVerMapa }) {
  return (
    <article className="viagem-card">
      <header className="viagem-card__topo">
        <div>
          <strong className="viagem-card__empresa">🚗 Seu carro</strong>
          <p className="viagem-card__empresa-desc">
            Viagem por conta própria — liberdade total no trajeto
          </p>
        </div>
        <div className="viagem-card__preco">
          <strong>{formatarPreco(carro.custoTotal)}</strong>
          <small>custos estimados</small>
        </div>
      </header>

      <div className="viagem-card__badges">
        <span className="badge-assento">{formatarDistancia(carro.distanciaKm)}</span>
        <span className="badge-paradas">{carro.duracaoTexto} de viagem</span>
      </div>

      <div className="chip-pagamentos">
        <span className="chip-pagamento">
          ⛽ Combustível: {formatarPreco(carro.custoCombustivel)} (12 km/L · gasolina)
        </span>
        {carro.custoPedagio > 0 && (
          <span className="chip-pagamento">
            🛣️ Pedágios: {formatarPreco(carro.custoPedagio)} (estimado)
          </span>
        )}
        <span className="chip-pagamento">
          👥 Dividido por 4: {formatarPreco(carro.custoTotal / 4)} por pessoa
        </span>
      </div>

      {onVerMapa && (
        <div className="rota-rodape">
          <button type="button" className="btn btn--secundario" onClick={() => onVerMapa(carro)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true">
              <path d="m9 20-6 2V6l6-2 6 2 6-2v16l-6 2-6-2Z" />
              <path d="M9 4v16m6-14v16" />
            </svg>
            Ver rota no mapa
          </button>
        </div>
      )}
    </article>
  )
}
