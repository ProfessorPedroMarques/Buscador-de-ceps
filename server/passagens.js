/**
 * Preços REAIS de passagens (opcional, sem dados falsos).
 * ---------------------------------------------------------------
 * ✈️ VOOS — API Amadeus Self-Service (plano gratuito):
 *    1. Crie uma conta em https://developers.amadeus.com
 *    2. Copie as chaves do app "Flight Offers Search"
 *    3. Defina no ambiente:
 *         AMADEUS_CLIENT_ID=... AMADEUS_CLIENT_SECRET=...
 *    → Com as chaves, este endpoint retorna OFERTAS REAIS (companhia,
 *      horários, conexões e preço em BRL). Sem chaves, responde
 *      { ok: false, motivo: 'sem-chaves' } de forma transparente.
 *
 * 🚌 ÔNIBUS — gateway próprio opcional:
 *    Defina CLICKBUS_API_URL apontando para um serviço que devolva
 *    { items: [{ empresa, partida, chegada, preco, assento }] }.
 *    (A ClickBus e as viações não oferecem API pública sem contrato.)
 *
 * Cache de 30 minutos para respeitar as cotas das APIs.
 */
const cachePassagens = new Map()
const TTL_PASSAGEM = 30 * 60 * 1000

let tokenCacheAmadeus = null // { token, expiraEm }

function obterDoCache(chave) {
  const item = cachePassagens.get(chave)
  if (!item) return null
  if (Date.now() - item.ts > TTL_PASSAGEM) {
    cachePassagens.delete(chave)
    return null
  }
  return item.valor
}

function salvarNoCache(chave, valor) {
  cachePassagens.set(chave, { valor, ts: Date.now() })
}

async function tokenAmadeus() {
  if (tokenCacheAmadeus && Date.now() < tokenCacheAmadeus.expiraEm) {
    return tokenCacheAmadeus.token
  }
  const id = process.env.AMADEUS_CLIENT_ID
  const seg = process.env.AMADEUS_CLIENT_SECRET
  if (!id || !seg) return null

  const resposta = await fetch(
    'https://test.api.amadeus.com/v1/security/oauth2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: id,
        client_secret: seg,
      }),
    },
  )
  if (!resposta.ok) throw new Error('Falha na autenticação da Amadeus')
  const dados = await resposta.json()
  tokenCacheAmadeus = {
    token: dados.access_token,
    expiraEm: Date.now() + (dados.expires_in - 120) * 1000,
  }
  return tokenCacheAmadeus.token
}

const horaDe = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/* Código de companhia aérea (IATA) → nome comercial. */
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

/* Enlaces profundos hacia buscadores reales de pasajes (Google Flights y
   Skyscanner aceptan estos formatos; verificados al desplegar la URL). */
const linkGoogleFlights = (origemIata, destinoIata, data) =>
  `https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&source=ln&origin=${origemIata}&destination=${destinoIata}&departure=${data}&type=1`

const linkSkyscanner = (origemIata, destinoIata, data) =>
  `https://www.skyscanner.com.br/transporte/vuelos/${origemIata}/${destinoIata}/${data.replace(/-/g, '')}/`

const linkClickBus = () => 'https://www.clickbus.com.br/'
const linkBuser = () => 'https://www.buser.com.br/'

/* Normaliza texto para comparação (minúsculas + sem acentos). */
const normalizarTexto = (v) =>
  (v ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/*
 * Preços REAIS "a partir de" extraídos da página pública da ClickBus
 * (https://www.clickbus.com.br/), que exibe as rotas mais procuradas do
 * Brasil com o menor preço disponível no momento. Não há API pública
 * gratuita de passagens rodoviárias, então este é o dado mais real que
 * conseguimos obter sem contrato — cobre apenas rotas populares.
 */
async function precosReaisClickBus(origem, destino) {
  const alvoOrigem = normalizarTexto(origem)
  const alvoDestino = normalizarTexto(destino)
  if (!alvoOrigem || !alvoDestino) return null

  const resposta = await fetch(
    'https://www.clickbus.com.br/',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    },
  )
  if (!resposta.ok) return null
  const html = await resposta.text()

  // Converte o HTML em texto simples (sem scripts/estilos/tags).
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
  const limpo = normalizarTexto(texto)

  // Acha "origem destino" (ou "destino origem") no texto da página.
  const par1 = `${alvoOrigem} ${alvoDestino}`
  const par2 = `${alvoDestino} ${alvoOrigem}`
  let idx = limpo.indexOf(par1)
  if (idx === -1) idx = limpo.indexOf(par2)
  if (idx === -1) return null

  // Na sequência, procura o menor preço "a partir de R$ X" (240 caracteres).
  const pedaco = limpo.slice(idx, idx + 240)
  const precos = []
  const rePreco = /r\$\s*(\d{1,4})\s*(?:[.,]\s*(\d{2}))?/g
  let m
  while ((m = rePreco.exec(pedaco)) !== null) {
    const valor = Number(`${m[1]}.${m[2] ?? '00'}`)
    if (Number.isFinite(valor) && valor > 0) precos.push(valor)
  }
  if (!precos.length) return null

  return {
    ok: true,
    fonte: 'ClickBus — página pública (preço real "a partir de")',
    ofertas: [
      {
        empresa: 'ClickBus',
        descricao: `A partir de — ${origem} → ${destino} (preço real da página da ClickBus)`,
        partida: '',
        chegada: '',
        preco: Math.min(...precos),
        assento: '',
        link: 'https://www.clickbus.com.br/',
      },
    ],
  }
}

function registrarRotasPassagens(app) {
  /* ✈️ Ofertas reais de voos (Amadeus) */
  app.get('/api/passagens/aviao', async (req, res) => {
    const origemIata = (req.query.origemIata ?? '').toString().toUpperCase().slice(0, 3)
    const destinoIata = (req.query.destinoIata ?? '').toString().toUpperCase().slice(0, 3)
    const data = (req.query.data ?? '').toString() // YYYY-MM-DD

    if (
      !/^[A-Z]{3}$/.test(origemIata) ||
      !/^[A-Z]{3}$/.test(destinoIata) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
      return res.status(400).json({ ok: false, motivo: 'parâmetros inválidos' })
    }

    const chave = `pass:aviao:${origemIata}:${destinoIata}:${data}`
    const emCache = obterDoCache(chave)
    if (emCache) return res.json(emCache)

    try {
      const token = await tokenAmadeus()
      if (!token) {
        return res.json({
          ok: false,
          motivo: 'sem-chaves',
          mensagem:
            'Preços reais de voo exigem chaves gratuitas da Amadeus (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET). Use os links oficiais abaixo para ver valores ao vivo.',
        })
      }

      const url =
        `https://test.api.amadeus.com/v2/shopping/flight-offers` +
        `?originLocationCode=${origemIata}&destinationLocationCode=${destinoIata}` +
        `&departureDate=${data}&adults=1&currencyCode=BRL&max=5`

      const resposta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resposta.ok) throw new Error(`Amadeus respondeu ${resposta.status}`)

      const dados = await resposta.json()
      const ofertas = (dados?.data ?? []).map((oferta) => {
        const segmentos = oferta.itineraries?.[0]?.segments ?? []
        const primeiro = segmentos[0]
        const ultimo = segmentos[segmentos.length - 1]
        const codigoAerea =
          oferta.validatingAirlineCodes?.[0] ?? primeiro?.carrierCode ?? '—'
        return {
          empresa: codigoAerea,
          empresaNome: NOMES_AEREAS[codigoAerea] ?? `Companhia ${codigoAerea}`,
          voos: segmentos.map((s) => `${s.carrierCode}${s.number}`),
          partida: horaDe(primeiro?.departure?.at),
          chegada: horaDe(ultimo?.arrival?.at),
          conexoes: Math.max(0, segmentos.length - 1),
          preco: Number(oferta.price?.grandTotal ?? oferta.price?.total ?? 0),
          moeda: oferta.price?.currency ?? 'BRL',
          origemIata,
          destinoIata,
          data,
          linkGoogleFlights: linkGoogleFlights(origemIata, destinoIata, data),
          linkSkyscanner: linkSkyscanner(origemIata, destinoIata, data),
        }
      })

      const resultado = {
        ok: ofertas.length > 0,
        fonte: 'Amadeus — dados reais',
        ofertas,
      }
      salvarNoCache(chave, resultado)
      return res.json(resultado)
    } catch (e) {
      return res.json({ ok: false, motivo: e.message })
    }
  })

  /* 🚌 Passagens de ônibus: gateway próprio ou scraping da página da ClickBus */
  app.get('/api/passagens/onibus', async (req, res) => {
    const origem = (req.query.origem ?? '').toString().slice(0, 80)
    const destino = (req.query.destino ?? '').toString().slice(0, 80)
    const data = (req.query.data ?? '').toString()

    if (!origem || !destino || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ ok: false, motivo: 'parâmetros inválidos' })
    }

    const chave = `pass:onibus:${origem}:${destino}:${data}`
    const emCache = obterDoCache(chave)
    if (emCache) return res.json(emCache)

    /* 1) Gateway próprio configurado pelo usuário (API contratada). */
    const base = process.env.CLICKBUS_API_URL
    if (base) {
      try {
        const url = `${base}?origem=${encodeURIComponent(origem)}&destino=${encodeURIComponent(destino)}&data=${data}`
        const resposta = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (resposta.ok) {
          const dados = await resposta.json()
          const ofertas = (dados?.items ?? []).map((i) => ({
            empresa: i.empresa ?? '—',
            partida: i.partida ?? '',
            chegada: i.chegada ?? '',
            preco: Number(i.preco ?? 0),
            assento: i.assento ?? '',
            link: i.link ?? null,
          }))
          const resultado = {
            ok: ofertas.length > 0,
            fonte: 'gateway próprio (dados reais)',
            ofertas,
          }
          salvarNoCache(chave, resultado)
          return res.json(resultado)
        }
      } catch {
        /* segue para o scraping abaixo */
      }
    }

    /* 2) Sem gateway: scraping da página pública da ClickBus (rotas populares
       com preço real "a partir de"). Se falhar, responde de forma transparente. */
    try {
      const real = await precosReaisClickBus(origem, destino)
      if (real) {
        salvarNoCache(chave, real)
        return res.json(real)
      }
    } catch {
      /* segue para a resposta sem-gateway */
    }

    return res.json({
      ok: false,
      motivo: 'sem-gateway',
      mensagem:
        'Não há API pública gratuita de passagens rodoviárias no Brasil. Configure CLICKBUS_API_URL com um gateway próprio ou use os links oficiais (ClickBus/Buser) para ver valores ao vivo.',
    })
  })
}

export default registrarRotasPassagens
