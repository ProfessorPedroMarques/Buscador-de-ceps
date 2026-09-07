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

export default async function handler(req, res) {
  const lat1 = Number(req.query.lat1)
  const lon1 = Number(req.query.lon1)
  const lat2 = Number(req.query.lat2)
  const lon2 = Number(req.query.lon2)

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return res.status(400).json({ ok: false, erro: 'Coordenadas inválidas.' })
  }

  const chave = `rota:${lat1.toFixed(4)},${lon1.toFixed(4)},${lat2.toFixed(4)},${lon2.toFixed(4)}`
  const emCache = obterCache(chave)
  if (emCache) return res.json(emCache)

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${lon1},${lat1};${lon2},` +
      `${lat2}?overview=full&geometries=geojson`

    const resposta = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resposta.ok) throw new Error('Serviço de rota indisponível.')

    const dados = await resposta.json()
    const rota = dados?.routes?.[0]
    if (!rota) throw new Error('Sem rota.')

    const pontosFinais =
      rota.geometry?.coordinates?.map(([lon, lat]) => [lat, lon]) ?? []

    const resultado = {
      ok: true,
      distanciaKm: rota.distance / 1000,
      duracaoMin: rota.duration / 60,
      pontos: pontosFinais,
    }
    salvarCache(chave, resultado)
    return res.json(resultado)
  } catch {
    return res.json({ ok: false, erro: 'Serviço de rota indisponível.' })
  }
}