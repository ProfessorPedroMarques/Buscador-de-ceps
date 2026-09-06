/**
 * Backend do Buscador de CEP
 * ---------------------------------------------------------------
 * - GET /api/cep/:cep    → consulta o ViaCEP (com cache em memória)
 * - GET /api/geocode     → converte endereço em latitude/longitude
 *                          usando o Nominatim (OpenStreetMap)
 * - Em produção serve também o build do frontend (pasta /dist)
 */
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import registrarRotasPassagens from './passagens.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

/* ------------------------- utilidades ------------------------- */

// Cache simples em memória com tempo de vida (TTL)
const cache = new Map()
const TTL = 10 * 60 * 1000 // 10 minutos

function obterCache(chave) {
  const item = cache.get(chave)
  if (!item) return null
  if (Date.now() - item.ts > TTL) {
    cache.delete(chave)
    return null
  }
  return item.valor
}

function salvarCache(chave, valor) {
  cache.set(chave, { valor, ts: Date.now() })
}

// Rate limit bem simples por IP (evita abusar das APIs externas)
const janelas = new Map()
const LIMITE = 40
const JANELA_MS = 60_000

function rateLimit(req, res, next) {
  const ip = req.ip || 'desconhecido'
  const agora = Date.now()
  const registro = janelas.get(ip)

  if (!registro || agora - registro.ts > JANELA_MS) {
    janelas.set(ip, { ts: agora, n: 1 })
    return next()
  }

  registro.n += 1
  if (registro.n > LIMITE) {
    return res.status(429).json({
      ok: false,
      erro: 'Muitas requisições. Aguarde um instante e tente novamente.',
    })
  }
  next()
}

app.use('/api', rateLimit)

const limpar = (valor) => (valor ?? '').toString().trim()

/* -------------------------- ViaCEP ---------------------------- */

app.get('/api/cep/:cep', async (req, res) => {
  const cep = limpar(req.params.cep).replace(/\D/g, '')
  if (cep.length !== 8) {
    return res.status(400).json({ ok: false, erro: 'O CEP deve ter 8 dígitos.' })
  }

  const chave = `cep:${cep}`
  const emCache = obterCache(chave)
  if (emCache) return res.json({ ok: true, data: emCache, cache: true })

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    if (!resposta.ok) throw new Error('CEP não encontrado.')
    const dados = await resposta.json()
    if (dados.erro) throw new Error('CEP não encontrado.')

    const {
      cep: cepFormatado,
      logradouro,
      complemento,
      bairro,
      localidade,
      uf,
      ddd,
      ibge,
    } = dados

    const resultado = {
      cep: cepFormatado,
      logradouro,
      complemento,
      bairro,
      localidade,
      uf,
      ddd,
      ibge,
    }

    salvarCache(chave, resultado)
    res.json({ ok: true, data: resultado })
  } catch (erro) {
    res
      .status(404)
      .json({ ok: false, erro: erro.message || 'Falha ao consultar o CEP.' })
  }
})

/* ------------- Geocodificação (Nominatim / OSM) --------------- */

app.get('/api/geocode', async (req, res) => {
  const logradouro = limpar(req.query.logradouro)
  const cidade = limpar(req.query.cidade)
  const uf = limpar(req.query.uf)

  if (!logradouro && !cidade) {
    return res
      .status(400)
      .json({ ok: false, erro: 'Informe ao menos a cidade para localizar.' })
  }

  const chave = `geo:${logradouro}|${cidade}|${uf}`
  const emCache = obterCache(chave)
  if (emCache) return res.json(emCache)

  // Tenta o endereço completo e, se falhar, cai para a cidade/UF.
  const tentativas = []
  if (logradouro && cidade) tentativas.push([logradouro, cidade, uf, 'Brasil'])
  if (cidade) tentativas.push([cidade, uf, 'Brasil'])
  if (logradouro) tentativas.push([logradouro, 'Brasil'])

  for (const partes of tentativas) {
    const q = partes.filter(Boolean).join(', ')
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' +
        encodeURIComponent(q)

      const resposta = await fetch(url, {
        headers: {
          'User-Agent': 'buscador-de-cep/2.0 (projeto educacional)',
          'Accept-Language': 'pt-BR',
        },
      })
      if (!resposta.ok) continue

      const lista = await resposta.json()
      if (Array.isArray(lista) && lista.length > 0) {
        const resultado = {
          ok: true,
          lat: Number.parseFloat(lista[0].lat),
          lon: Number.parseFloat(lista[0].lon),
          displayName: lista[0].display_name,
          // "preciso" = verdadeiro quando a busca usou o endereço completo
          preciso: partes.length >= 4,
        }
        salvarCache(chave, resultado)
        return res.json(resultado)
      }
    } catch {
      // segue para a próxima tentativa
    }
  }

  res.status(404).json({
    ok: false,
    erro: 'Não foi possível localizar as coordenadas deste endereço.',
  })
})

/* ------------- Rota real via OSRM (OpenStreetMap) --------------- */

app.get('/api/rota', async (req, res) => {
  const lat1 = Number(req.query.lat1)
  const lon1 = Number(req.query.lon1)
  const lat2 = Number(req.query.lat2)
  const lon2 = Number(req.query.lon2)

  const validos =
    [lat1, lon1, lat2, lon2].every(Number.isFinite) &&
    Math.abs(lat1) <= 90 &&
    Math.abs(lat2) <= 90 &&
    Math.abs(lon1) <= 180 &&
    Math.abs(lon2) <= 180

  if (!validos) {
    return res.status(400).json({ ok: false, erro: 'Coordenadas inválidas.' })
  }

  const chave = `rota:${lat1.toFixed(4)},${lon1.toFixed(4)},${lat2.toFixed(4)},${lon2.toFixed(4)}`
  const emCache = obterCache(chave)
  if (emCache) return res.json(emCache)

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`

  try {
    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'buscador-de-cep/2.1 (projeto educacional)',
      },
    })
    if (!resposta.ok) throw new Error('OSRM indisponível.')

    const dados = await resposta.json()
    const rota = dados?.routes?.[0]
    if (!rota) throw new Error('Rota não encontrada.')

    // GeoJSON vem [lon, lat] — convertemos para [lat, lon] e simplificamos
    // a geometria para no máximo ~300 pontos (payload leve para o mapa).
    const pontos = rota.geometry.coordinates.map(([lon, lat]) => [lat, lon])
    const passo = Math.max(1, Math.ceil(pontos.length / 300))
    const pontosFinais = pontos.filter(
      (_, i) => i % passo === 0 || i === pontos.length - 1,
    )

    const resultado = {
      ok: true,
      distanciaKm: rota.distance / 1000,
      duracaoMin: rota.duration / 60,
      pontos: pontosFinais,
    }
    salvarCache(chave, resultado)
    return res.json(resultado)
  } catch {
    // Sem rota real: devolve ok:false e o frontend usa curva sintética.
    return res.json({ ok: false, erro: 'Serviço de rota indisponível.' })
  }
})

/* ------------- Geocodificação reversa (Nominatim/OSM) ----------- */

app.get('/api/reverse', async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ ok: false, erro: 'Coordenadas inválidas.' })
  }

  const chave = `rev:${lat.toFixed(4)},${lon.toFixed(4)}`
  const emCache = obterCache(chave)
  if (emCache) return res.json(emCache)

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=17` +
      `&addressdetails=1&accept-language=pt-BR&lat=${lat}&lon=${lon}`

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'buscador-de-cep/2.1 (projeto educacional)',
        'Accept-Language': 'pt-BR',
      },
    })
    if (!resposta.ok) throw new Error('Indisponível.')

    const dados = await resposta.json()
    const end = dados?.address ?? {}
    const ufISO = end['ISO3166-2-lvl4'] ?? '' // ex.: "BR-SP"
    const resultado = {
      ok: true,
      rotulo:
        [
          end.road ?? end.pedestrian ?? end.footway,
          end.suburb ?? end.neighbourhood ?? end.quarter,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(', ') ||
        dados?.display_name ||
        'Sua localização',
      cidade:
        end.city ?? end.town ?? end.village ?? end.municipality ?? '',
      uf: ufISO ? ufISO.split('-')[1] : '',
      dados: end,
    }
    salvarCache(chave, resultado)
    return res.json(resultado)
  } catch {
    return res.json({ ok: false, erro: 'Localização reversa indisponível.' })
  }
})

/* ------------- Passagens reais (Amadeus / gateway) ------------- */
registrarRotasPassagens(app)

/* ---------- produção: serve o build do frontend (Vite) -------- */

const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) =>
    res.sendFile(path.join(dist, 'index.html')),
  )
} else {
  // Sem build do frontend, devolve uma orientação amigável em vez
  // do "Cannot GET /", que parece que a página "não abre".
  app.get('/', (_req, res) =>
    res.type('html').send(
      `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><title>Buscador de CEP</title></head>
  <body style="font-family:system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:0 20px;line-height:1.6">
    <h1>📮 Buscador de CEP</h1>
    <p>O frontend ainda não foi construído. Escolha uma opção:</p>
    <ul>
      <li><strong>Desenvolvimento:</strong> rode <code>npm install</code> e depois <code>npm run dev</code>, e acesse <a href="http://localhost:5173">http://localhost:5173</a>.</li>
      <li><strong>Produção:</strong> rode <code>npm run build</code> e reinicie <code>npm start</code>.</li>
    </ul>
  </body>
</html>`,
    ),
  )
}

app.listen(PORT, () => {
  console.log(`✅ API do Buscador de CEP em http://localhost:${PORT}`)
})
