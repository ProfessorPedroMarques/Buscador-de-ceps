/**
 * LinhaOnibus — representa uma linha de ônibus com tarifa e formas de pagamento.
 */
export class LinhaOnibus {
  constructor({ numero, nome, cor, tarifa, pagamentos = [], operadora = '' }) {
    this.numero = String(numero)
    this.nome = nome
    this.cor = cor
    this.tarifa = Number(tarifa)
    this.pagamentos = pagamentos
    this.operadora = operadora
  }

  get resumo() {
    return `${this.numero} — ${this.nome}`
  }

  get tarifaTexto() {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.tarifa)
  }
}
