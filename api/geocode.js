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

const limpar = (valor) => (valor ?? '').toString().trim()

export default async function handler(req, res) {
  const logradouro = limpar(req.query.logradouro)
  const cidade = limpar(req.query.cidade)
  const uf = limpar(req.query.uf)

  if (!cidade && !uf) {
    return res.status(400).json({ ok: false, erro: 'Informe cidade e/ou UF.' })
  }

  const chave = `geo:${logradouro}:${cidade}:${uf}`
  const emCache = obterCache(chave)
  if (emCache) return res.json(emCache)

  try {
    const partes = [logradouro, cidade, uf, 'Brasil'].filter(Boolean)
    const endereco = partes.join(', ')

    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
      `&addressdetails=1&accept-language=pt-BR&q=${encodeURIComponent(endereco)}`

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'buscador-de-cep/2.1 (projeto educacional)',
        'Accept-Language': 'pt-BR',
      },
    })
    if (!resposta.ok) throw new Error('Serviço de geocodificação indisponível.')

    const dados = await resposta.json()
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.json({
        ok: false,
        erro: 'Endereço não encontrado.',
        preciso: false,
      })
    }

    const primeiro = dados[0]
    const end = primeiro.address ?? {}
    const ufISO = end['ISO3166-2-lvl4'] ?? ''
    const resultado = {
      ok: true,
      lat: Number(primeiro.lat),
      lon: Number(primeiro.lon),
      displayName: primeiro.display_name,
      preciso: Boolean(logradouro),
      cidade: end.city ?? end.town ?? end.village ?? end.municipality ?? '',
      uf: ufISO ? ufISO.split('-')[1] : uf,
      dados: end,
    }
    salvarCache(chave, resultado)
    return res.json(resultado)
  } catch (erro) {
    return res.json({ ok: false, erro: erro.message || 'Falha na geocodificação.' })
  }
}