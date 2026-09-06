/**
 * Camada fina de acesso à API do backend (Express).
 * Mantém os fetches centralizados fora dos componentes.
 */

/** Mascara um CEP no formato 00000-000 (usado pelo SearchBar e SeletorOrigem). */
export const mascaraCep = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '').slice(0, 8)
  return digitos.length > 5
    ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
    : digitos
}

/** Consulta o endereço de um CEP (ViaCEP, via backend). */
export async function consultarCep(cep) {
  const digitos = (cep ?? '').replace(/\D/g, '')
  if (digitos.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos.')
  }
  const resposta = await fetch(`/api/cep/${digitos}`)
  const json = await resposta.json()
  if (!resposta.ok || !json.ok) {
    throw new Error(json.erro || 'CEP não encontrado.')
  }
  return json.data
}

/** Converte endereço (ViaCEP) em latitude/longitude via Nominatim. */
export async function geocodificar({ logradouro, cidade, uf }) {
  const params = new URLSearchParams({
    logradouro: logradouro ?? '',
    cidade: cidade ?? '',
    uf: uf ?? '',
  })
  const resposta = await fetch(`/api/geocode?${params}`)
  return resposta.json()
}

/** Descobre o endereço aproximado a partir das coordenadas do usuário. */
export async function geocodificarReversa(lat, lon) {
  const resposta = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`)
  if (!resposta.ok) throw new Error('Serviço de localização reversa indisponível.')
  return resposta.json()
}

/**
 * Busca a geometria real da via entre dois pontos (OSRM).
 * Nunca lança: em caso de falha devolve { ok: false } e o frontend
 * usa uma curva sintética como fallback.
 */
export async function obterGeometriaRota(origem, destino) {
  try {
    const params = new URLSearchParams({
      lat1: origem.lat,
      lon1: origem.lon,
      lat2: destino.lat,
      lon2: destino.lon,
    })
    const resposta = await fetch(`/api/rota?${params}`)
    if (!resposta.ok) return { ok: false }
    return resposta.json()
  } catch {
    return { ok: false }
  }
}
