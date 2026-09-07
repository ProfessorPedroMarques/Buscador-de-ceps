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
}