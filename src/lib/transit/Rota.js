import { formatarDistancia, formatarDuracao, formatarPreco } from './formato.js'

/**
 * Rota — agrupa etapas (caminhada/ônibus/chegada) e expõe totais calculados
 * por getters (encapsulamento): tempo, preço, trocas e distância a pé.
 */
export class Rota {
  constructor({
    etiqueta,
    etapas = [],
    observacao = '',
    origemRotulo = '',
    destinoRotulo = '',
  }) {
    this.etiqueta = etiqueta
    this.etapas = etapas
    this.observacao = observacao
    this.origemRotulo = origemRotulo
    this.destinoRotulo = destinoRotulo
    this.destaque = false // marcado como "melhor rota" pelo PlanejadorRotas
    this.pontuacao = Infinity
  }

  get etapasOnibus() {
    return this.etapas.filter((e) => e.tipo === 'onibus' || e.tipo === 'trilhos')
  }

  /** Quantidade de baldeações (trocas de ônibus). */
  get trocas() {
    return Math.max(0, this.etapasOnibus.length - 1)
  }

  get tempoTotalMin() {
    return this.etapas.reduce((total, e) => total + e.duracaoMin, 0)
  }

  get distanciaTotalKm() {
    return this.etapas.reduce((total, e) => total + e.distanciaKm, 0)
  }

  get caminhadaKm() {
    return this.etapas
      .filter((e) => e.tipo === 'caminhada')
      .reduce((total, e) => total + e.distanciaKm, 0)
  }

  /** Soma das tarifas dos trechos pagos (ônibus e metrô/trem). */
  get preco() {
    return this.etapasOnibus.reduce((total, e) => total + (e.preco ?? 0), 0)
  }

  get tempoTexto() {
    return formatarDuracao(this.tempoTotalMin)
  }

  get precoTexto() {
    return formatarPreco(this.preco)
  }

  /** União das formas de pagamento de todas as linhas da rota. */
  get pagamentos() {
    const unicos = new Set()
    this.etapasOnibus.forEach((e) =>
      e.linha.pagamentos.forEach((p) => unicos.add(p)),
    )
    return [...unicos]
  }

  /** Todos os pontos da rota (para ajustar o mapa por bounds). */
  get todosPontos() {
    return this.etapas.flatMap((e) => e.pontos)
  }

  get resumo() {
    return `${this.etiqueta}: ${this.tempoTexto}, ${this.precoTexto}, ${
      this.trocas ? `${this.trocas} troca(s)` : 'sem trocas'
    }, a pé ${formatarDistancia(this.caminhadaKm)}`
  }
}
