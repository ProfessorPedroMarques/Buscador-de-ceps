import { ViagemRodoviaria, ViagemAerea, ViagemCarro } from './TransporteViagem.js'

/**
 * CatalogoViagens — dados educativos de transporte de longo curso.
 *
 * ⚠️ TRANSPARÊNCIA: não há API gratuita de passagens em tempo real. Empresas,
 * horários e valores são ESTIMATIVAS determinísticas geradas por este app a
 * partir de dados públicos aproximados (aeroportos reais, viações e companhias
 * aéreas conhecidas, faixas de preço típicas). Sempre confirme na empresa.
 */

/* Aeroportos reais (cidade normalizada → IATA). Fallback: capital do estado. */
const AEROPORTOS = {
  'sao paulo': { iata: 'CGH', nome: 'Congonhas', capitalIata: 'GRU' },
  guarulhos: { iata: 'GRU', nome: 'Guarulhos Intl.' },
  campinas: { iata: 'VCP', nome: 'Viracopos Intl.' },
  'rio de janeiro': { iata: 'SDU', nome: 'Santos Dumont', capitalIata: 'GIG' },
  'belo horizonte': { iata: 'CNF', nome: 'Confins Intl.' },
  brasilia: { iata: 'BSB', nome: 'Pres. Juscelino Kubitschek Intl.' },
  curitiba: { iata: 'CWB', nome: 'Afonso Pena Intl.' },
  'porto alegre': { iata: 'POA', nome: 'Salgado Filho Intl.' },
  salvador: { iata: 'SSA', nome: 'Dep. Luís Eduardo Magalhães Intl.' },
  recife: { iata: 'REC', nome: 'Guararapes Intl.' },
  fortaleza: { iata: 'FOR', nome: 'Pinto Martins Intl.' },
  manaus: { iata: 'MAO', nome: 'Eduardo Gomes Intl.' },
  belem: { iata: 'BEL', nome: 'Val-de-Cans Intl.' },
  goiania: { iata: 'GYN', nome: 'Santa Genoveva' },
  cuiaba: { iata: 'CGB', nome: 'Marechal Rondon Intl.' },
  'campo grande': { iata: 'CGR', nome: 'Antonio João Corrêa' },
  vitoria: { iata: 'VIX', nome: 'Eurico de Aguiar Salles' },
  florianopolis: { iata: 'FLN', nome: 'Hercílio Luz Intl.' },
  natal: { iata: 'NAT', nome: 'São Gonçalo do Amarante' },
  maceio: { iata: 'MCZ', nome: 'Zumbi dos Palmares Intl.' },
  'joao pessoa': { iata: 'JPA', nome: 'Presidente Castro Pinto' },
  aracaju: { iata: 'AJU', nome: 'Santa Maria' },
  teresina: { iata: 'THE', nome: 'Senador Petrônio Portella' },
  'sao luis': { iata: 'SLZ', nome: 'Marechal Cunha Machado Intl.' },
  palmas: { iata: 'PMW', nome: 'Brigadeiro Lysias Rodrigues' },
  'boa vista': { iata: 'BVB', nome: 'Atlas Brasil Cantanhede Intl.' },
  macapa: { iata: 'MCP', nome: 'Internacional de Macapá' },
  'rio branco': { iata: 'RBR', nome: 'Plácido de Castro Intl.' },
  'porto velho': { iata: 'PVH', nome: 'Governador Jorge Teixeira Intl.' },
  santos: { iata: 'QSD', nome: 'voos regionais', capitalIata: 'CGH' },
  sorocaba: { iata: 'QDV', nome: 'voos regionais', capitalIata: 'CGH' },
}

/* Capital de cada UF (fallback de aeroporto). */
const CAPITAIS = {
  AC: 'rio branco',
  AL: 'maceio',
  AP: 'macapa',
  AM: 'manaus',
  BA: 'salvador',
  CE: 'fortaleza',
  DF: 'brasilia',
  ES: 'vitoria',
  GO: 'goiania',
  MA: 'sao luis',
  MT: 'cuiaba',
  MS: 'campo grande',
  MG: 'belo horizonte',
  PA: 'belem',
  PB: 'joao pessoa',
  PR: 'curitiba',
  PE: 'recife',
  PI: 'teresina',
  RJ: 'rio de janeiro',
  RN: 'natal',
  RS: 'porto alegre',
  RO: 'porto velho',
  RR: 'boa vista',
  SC: 'florianopolis',
  SP: 'sao paulo',
  SE: 'aracaju',
  TO: 'palmas',
}

/* Viações rodoviárias conhecidas + descrição curta. */
const VIACOES = [
  { nome: 'Viação Cometa', descricao: 'Tradicional do Sudeste — frota com Wi-Fi e tomadas' },
  { nome: 'Expresso Brasileiro', descricao: 'Especialista no eixo SP–Rio' },
  { nome: 'Viação Penha', descricao: 'Referência Sul–Sudeste, ônibus leito noturnos' },
  { nome: 'Itapemirim', descricao: 'Rede nacional com mais de 70 anos de estrada' },
  { nome: 'Auto Viação 1001', descricao: 'Litoral RJ–SP e Nordeste, frota executiva' },
  { nome: 'Viação Util', descricao: 'Convencionais e leitos com Wi-Fi a bordo' },
  { nome: 'Gontijo', descricao: 'Grande malha Sudeste–Nordeste/Centro-Oeste' },
  { nome: 'Pássaro Marron', descricao: 'Grupo Expresso Brasileiro — rotas estaduais' },
  { nome: 'Real Expresso', descricao: 'Centro-Oeste e DF com frotas modernas' },
  { nome: 'Emtram', descricao: 'Bahia, Goiás e DF — executivos e leitos' },
  { nome: 'Nacional Expresso', descricao: 'SP–Paraná–Santa Catarina' },
  { nome: 'Viação Catarinense', descricao: 'Sul do país, semi-leitos e leitos' },
]

/* Companhias aéreas + descrição. */
const AEREAS = [
  { nome: 'LATAM', prefixo: 'LA', descricao: 'Maior grupo aéreo da América Latina' },
  { nome: 'GOL', prefixo: 'G3', descricao: 'Malha doméstica ampla com tarifas promocionais' },
  { nome: 'Azul', prefixo: 'AD', descricao: 'Líder em aeroportos regionais e conexões em Viracopos' },
]

const GRADE_RODOVIARIA = ['06:00', '08:30', '11:00', '14:00', '17:30', '21:00', '23:30']
const GRADE_AEREA = ['06:30', '09:15', '12:40', '16:20', '19:50', '22:10']

const TIPOS_ASSENTO = [
  { tipo: 'Executivo', fator: 1.15, amenidades: ['Ar-condicionado', 'Tomada USB', 'Wi-Fi', 'Banheiro a bordo'] },
  { tipo: 'Semi-leito', fator: 1.32, amenidades: ['Encosto reclinável', 'Ar-condicionado', 'Tomada USB', 'Manta'] },
  { tipo: 'Leito-cama', fator: 1.65, amenidades: ['Poltrona 180°', 'Wi-Fi', 'Manta e travesseiro', 'Serviço de bordo'] },
]

const normalizar = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/* Converte "06:30" em minutos do dia. */
const horaParaMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/* Converte minutos (pode passar de 24 h) de volta para "HH:MM". */
const minParaHora = (min) => {
  const total = ((Math.round(min) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export class CatalogoViagens {
  /** Aeroporto servindo a cidade/UF informada (ou null). */
  aeroportoDe(cidade, uf) {
    const direto = AEROPORTOS[normalizar(cidade)]
    if (direto) return direto
    const capital = CAPITAIS[(uf ?? '').toUpperCase()]
    const porCapital = capital ? AEROPORTOS[capital] : null
    if (porCapital) {
      return {
        ...porCapital,
        nome: `${porCapital.nome} (capital mais próxima)`,
        viaCapital: true,
      }
    }
    return null
  }

  /** Escolhe `n` viações distintas de forma determinística. */
  viacoes(seed, n = 3) {
    const usadas = new Set()
    const lista = []
    let h = seed
    while (lista.length < n && usadas.size < VIACOES.length) {
      h = (h * 1103515245 + 12345) >>> 0
      const i = h % VIACOES.length
      if (!usadas.has(i)) {
        usadas.add(i)
        lista.push(VIACOES[i])
      }
    }
    return lista
  }

  /** Escolhe até `n` companhias aéreas distintas de forma determinística. */
  aereas(seed, n = 3) {
    const lista = []
    let h = seed
    while (lista.length < n && lista.length < AEREAS.length) {
      h = (h * 1103515245 + 12345) >>> 0
      const a = AEREAS[h % AEREAS.length]
      if (!lista.some((x) => x.nome === a.nome)) lista.push(a)
    }
    return lista
  }

  /** Partida determinística da grade horária. */
  partidaRodoviaria(seed, deslocamento = 0) {
    return GRADE_RODOVIARIA[(seed + deslocamento) % GRADE_RODOVIARIA.length]
  }

  partidaAerea(seed, deslocamento = 0) {
    return GRADE_AEREA[(seed + deslocamento) % GRADE_AEREA.length]
  }

  /**
   * Gera opções de ônibus rodoviário (uma por viação/tipo de assento).
   */
  criarRodoviarias({ origem, destino, distanciaViaKm, seed, quantidade = 3 }) {
    const duracaoBase =
      (distanciaViaKm / 70) * 60 + // 70 km/h de média em rodovia
      Math.floor(distanciaViaKm / 250) * 20 + // parada de descanso a cada 250 km
      30 // check-in na rodoviária

    return this.viacoes(seed, quantidade).map((viacao, i) => {
      const h = ((seed + i * 48611) >>> 0) || 1
      const config = TIPOS_ASSENTO[h % TIPOS_ASSENTO.length]
      const valor = Math.round((18 + distanciaViaKm * 0.16) * config.fator)
      const partida = this.partidaRodoviaria(seed, i * 2)
      const duracao = Math.round(duracaoBase + (h % 40)) // variação por tráfego
      const chegadaMin = horaParaMin(partida) + duracao

      return new ViagemRodoviaria({
        empresa: viacao.nome,
        descricaoEmpresa: viacao.descricao,
        assento: config.tipo,
        amenidades: config.amenidades,
        pontosParada: Math.floor(distanciaViaKm / 250),
        numeroServico: String(4000 + (h % 6000)), // número do ônibus/serviço a pegar
        nomeServico: `${origem} ↔ ${destino}`, // nome da rota
        valor,
        duracaoMin: duracao,
        partida,
        chegada: minParaHora(chegadaMin),
        diaSeguinte: chegadaMin >= 1440,
        localPartida: `Terminal Rodoviário de ${origem}`,
        localChegada: `Terminal Rodoviário de ${destino}`,
      })
    })
  }

  /**
   * Gera opções de voo (uma por companhia). Retorna [] quando não há
   * aeroportos adequados nas duas pontas.
   */
  criarAereas({
    origem,
    destino,
    ufOrigem,
    ufDestino,
    distanciaKm,
    seed,
    quantidade = 3,
  }) {
    const apOrigem = this.aeroportoDe(origem, ufOrigem)
    const apDestino = this.aeroportoDe(destino, ufDestino)
    if (!apOrigem || !apDestino || apOrigem.iata === apDestino.iata) return []

    return this.aereas(seed, quantidade).map((aerea, i) => {
      const h = ((seed + i * 71023) >>> 0) || 1
      const comConexao = distanciaKm < 250 || h % 5 === 0 // ~20% com conexão
      const vooDiretoMin = 35 + (distanciaKm / 800) * 60
      const espera = 70 + (h % 70)
      const duracao = Math.round(
        comConexao ? vooDiretoMin * 1.5 + espera : vooDiretoMin + 30,
      )
      const valorBase = 120 + distanciaKm * 0.32
      const variacao = 0.75 + ((h % 60) / 60) * 0.6 // 0.75–1.35
      const valor = Math.max(89, Math.round(valorBase * variacao)) - 0.1
      const partida = this.partidaAerea(seed, i)
      const chegadaMin = horaParaMin(partida) + duracao

      return new ViagemAerea({
        empresa: aerea.nome,
        descricaoEmpresa: aerea.descricao,
        voo: `${aerea.prefixo} ${1000 + (h % 9000)}`,
        iataOrigem: apOrigem.iata,
        iataDestino: apDestino.iata,
        aeroportoOrigem: `${apOrigem.nome} (${apOrigem.iata})`,
        aeroportoDestino: `${apDestino.nome} (${apDestino.iata})`,
        conexoes: comConexao ? 1 : 0,
        valor,
        duracaoMin: duracao,
        partida,
        chegada: minParaHora(chegadaMin),
        diaSeguinte: chegadaMin >= 1440,
        localPartida: `Aeroporto ${apOrigem.nome} — ${apOrigem.iata}`,
        localChegada: `Aeroporto ${apDestino.nome} — ${apDestino.iata}`,
      })
    })
  }

  /** Opção de carro com custo estimado de combustível + pedágio. */
  criarCarro({ duracaoMin, distanciaViaKm, pontos = [] }) {
    const litros = distanciaViaKm / 12 // 12 km/L na estrada
    const custoCombustivel = Math.round(litros * 6.09 * 100) / 100 // gasolina ~R$ 6,09/L
    const custoPedagio =
      distanciaViaKm > 30 ? Math.round(distanciaViaKm * 0.09 * 100) / 100 : 0
    return new ViagemCarro({
      duracaoMin: Math.round(duracaoMin),
      distanciaKm: distanciaViaKm,
      custoCombustivel,
      custoPedagio,
      pontos,
    })
  }
}
