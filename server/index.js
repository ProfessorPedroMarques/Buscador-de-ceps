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
