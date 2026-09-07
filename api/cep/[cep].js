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
  const cep = (req.query.cep || '').replace(/\D/g, '')
  
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
    res.status(404).json({ ok: false, erro: erro.message || 'Falha ao consultar o CEP.' })
  }
}