import { formatarPreco } from './formato.js'

/**
 * Hierarquia de viagens de longo curso (POO):
 * TransporteViagem (abstrata) → ViagemRodoviaria | ViagemAerea | ViagemCarro.
 * Cada subclasse guarda empresa, horários, valor e detalhes próprios.
 */
export class TransporteViagem {
  constructor({
    modo,
    empresa,
    descricaoEmpresa = '',
    valor = 0,
    duracaoMin = 0,
    partida = '',
    chegada = '',
    diaSeguinte = false,
    localPartida = '',
    localChegada = '',
    observacao = '',
  }) {
    if (new.target === TransporteViagem) {
      throw new Error(
        'TransporteViagem é abstrata — instancie ViagemRodoviaria, ViagemAerea ou ViagemCarro.',
      )
    }
    this.modo = modo
    this.empresa = empresa
    this.descricaoEmpresa = descricaoEmpresa
    this.valor = valor
    this.duracaoMin = duracaoMin
    this.partida = partida // "06:00"
    this.chegada = chegada // "09:45"
    this.diaSeguinte = diaSeguinte
    this.localPartida = localPartida
    this.localChegada = localChegada
    this.observacao = observacao
  }

  get valorTexto() {
    return formatarPreco(this.valor)
  }

  get duracaoTexto() {
    const h = Math.floor(this.duracaoMin / 60)
    const m = Math.round(this.duracaoMin % 60)
    if (!h) return `${Math.max(1, m)} min`
    return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
  }
}

/** Viagem de ônibus rodoviário (intermunicipal/interestadual). */
export class ViagemRodoviaria extends TransporteViagem {
  constructor({
    assento,
    amenidades = [],
    pontosParada = 0,
    numeroServico = '', // número do ônibus/serviço (ex.: "5123")
    nomeServico = '', // nome da rota (ex.: "São Paulo ↔ Rio de Janeiro")
    ...resto
  }) {
    super({ modo: 'rodoviario', ...resto })
    this.assento = assento
    this.amenidades = amenidades
    this.pontosParada = pontosParada
    this.numeroServico = numeroServico
    this.nomeServico = nomeServico
  }

  get icone() {
    return '🚌'
  }

  get resumo() {
    return `${this.empresa} · Ônibus ${this.numeroServico} ${this.nomeServico} · ${this.assento} · ${this.duracaoTexto} · ${this.valorTexto}`
  }
}

/** Viagem aérea (companhia aérea + voo). */
export class ViagemAerea extends TransporteViagem {
  constructor({
    voo,
    iataOrigem,
    iataDestino,
    aeroportoOrigem,
    aeroportoDestino,
    conexoes = 0,
    ...resto
  }) {
    super({ modo: 'aviao', ...resto })
    this.voo = voo
    this.iataOrigem = iataOrigem
    this.iataDestino = iataDestino
    this.aeroportoOrigem = aeroportoOrigem
    this.aeroportoDestino = aeroportoDestino
    this.conexoes = conexoes
  }

  get icone() {
    return '✈️'
  }

  get resumo() {
    return `${this.empresa} ${this.voo} · ${this.iataOrigem}→${this.iataDestino} · ${this.duracaoTexto} · ${this.valorTexto}`
  }
}

/** Viagem de carro (custo estimado de combustível + pedágios). */
export class ViagemCarro extends TransporteViagem {
  constructor({
    duracaoMin,
    distanciaKm,
    custoCombustivel,
    custoPedagio,
    pontos = [],
  }) {
    super({
      modo: 'carro',
      empresa: 'Seu carro',
      descricaoEmpresa: 'Viagem por conta própria — liberdade total no trajeto',
      duracaoMin,
      partida: 'Quando você quiser',
      chegada: 'Você define o ritmo das paradas',
      localPartida: 'Sua origem',
      localChegada: 'Seu destino',
    })
    this.distanciaKm = distanciaKm
    this.custoCombustivel = custoCombustivel
    this.custoPedagio = custoPedagio
    this.pontos = pontos
  }

  get icone() {
    return '🚗'
  }

  get custoTotal() {
    return this.custoCombustivel + this.custoPedagio
  }

  get resumo() {
    return `Carro · ${this.duracaoTexto} · ${formatarPreco(this.custoTotal)} de custos`
  }
}
