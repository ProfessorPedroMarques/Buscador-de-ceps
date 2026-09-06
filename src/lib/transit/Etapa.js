import { formatarDistancia, formatarDuracao } from './formato.js'

/**
 * Hierarquia de etapas de uma rota (Programação Orientada a Objetos):
 * Etapa (abstrata) → EtapaCaminhada | EtapaOnibus | EtapaChegada.
 * Cada subclasse define seu ícone/título/descrição (polimorfismo).
 */
export class Etapa {
  constructor({ tipo, duracaoMin = 0, distanciaKm = 0, pontos = [] }) {
    if (new.target === Etapa) {
      throw new Error(
        'Etapa é abstrata — instancie EtapaCaminhada, EtapaOnibus ou EtapaChegada.',
      )
    }
    this.tipo = tipo
    this.duracaoMin = duracaoMin
    this.distanciaKm = distanciaKm
    this.pontos = pontos // [[lat, lon], ...] — geometria para o mapa
  }

  get icone() {
    return '•'
  }

  get titulo() {
    return 'Etapa'
  }

  get descricao() {
    return ''
  }
}

/** Trecho percorrido a pé (do ponto de origem ao ponto de ônibus, por ex.). */
export class EtapaCaminhada extends Etapa {
  constructor({ instrucao, ...resto }) {
    super({ tipo: 'caminhada', ...resto })
    this.instrucao = instrucao
  }

  get icone() {
    return '🚶'
  }

  get titulo() {
    return `Caminhe ${formatarDistancia(this.distanciaKm)}`
  }

  get descricao() {
    return `${this.instrucao} (≈ ${formatarDuracao(this.duracaoMin)})`
  }
}

/** Trecho de ônibus: linha, embarque, desembarque e paradas estimadas. */
export class EtapaOnibus extends Etapa {
  constructor({
    linha,
    embarque,
    desembarque,
    paradas,
    esperaMin = 0,
    ...resto
  }) {
    super({ tipo: 'onibus', ...resto })
    this.linha = linha
    this.embarque = embarque
    this.desembarque = desembarque
    this.paradas = paradas
    this.esperaMin = esperaMin
  }

  get icone() {
    return '🚌'
  }

  get titulo() {
    return `Linha ${this.linha.numero} — ${this.linha.nome}`
  }

  get descricao() {
    return `${this.embarque} → ${this.desembarque} · ≈ ${this.paradas} paradas`
  }

  get preco() {
    return this.linha.tarifa
  }
}

/** Trecho de metrô/trem: linha real, estações e operadora. */
export class EtapaTrilhos extends Etapa {
  constructor({
    linhaTrilhos,
    estacaoEmbarque,
    estacaoDesembarque,
    estacoesNaViagem = 0,
    esperaMin = 4,
    tarifa = 0,
    pagamentos = [],
    ...resto
  }) {
    super({ tipo: 'trilhos', ...resto })
    this.linha = linhaTrilhos // { tipo, numero, nome, cor, operadora }
    this.estacaoEmbarque = estacaoEmbarque
    this.estacaoDesembarque = estacaoDesembarque
    this.estacoesNaViagem = estacoesNaViagem
    this.esperaMin = esperaMin
    this.tarifa = tarifa
    this.pagamentos = pagamentos
  }

  get icone() {
    return this.linha?.tipo === 'trem' ? '🚆' : '🚇'
  }

  get titulo() {
    return `${this.linha.tipo === 'trem' ? 'Trem' : 'Metrô'} linha ${this.linha.numero}-${this.linha.nome}`
  }

  get descricao() {
    return `${this.linha.operadora} · ${this.estacaoEmbarque} → ${this.estacaoDesembarque}`
  }

  get preco() {
    return this.tarifa ?? 0
  }
}

/** Etapa final: chegada ao destino. */
export class EtapaChegada extends Etapa {
  constructor({ destinoRotulo = '', ...resto }) {
    super({ tipo: 'chegada', ...resto })
    this.destinoRotulo = destinoRotulo
  }

  get icone() {
    return '🏁'
  }

  get titulo() {
    return 'Chegou ao destino!'
  }

  get descricao() {
    return this.destinoRotulo
      ? `Destino: ${this.destinoRotulo}`
      : 'Bom trajeto!'
  }
}
