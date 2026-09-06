import { PlanejadorRotas } from './PlanejadorRotas.js'
import { CatalogoViagens } from './CatalogoViagens.js'

/* Limiares por modo de viagem (km) */
const MIN_CARRO_KM = 10
const MIN_RODOVIARIO_KM = 45
const MIN_AVIAO_KM = 250

/**
 * PlanejadorViagens — decide, conforme a distância, quais modos de viagem
 * fazem sentido (urbano, rodoviário, avião, carro) e gera as opções com
 * empresa, horários e valores (estimativas determinísticas).
 *
 * @returns {{
 *   modos: Array<{ chave: string, titulo: string, icone: string, descricao: string, opcoes: Array }>,
 *   distanciaViaKm: number,
 *   interestadual: boolean
 * }}
 */
export class PlanejadorViagens {
  constructor({
    origem,
    destino,
    cidadeOrigem,
    ufOrigem,
    cidadeDestino,
    ufDestino,
    distanciaKm,
    geometria = null,
  }) {
    this.origem = origem
    this.destino = destino
    this.cidadeOrigem = cidadeOrigem
    this.ufOrigem = ufOrigem
    this.cidadeDestino = cidadeDestino
    this.ufDestino = ufDestino
    this.distanciaKm = distanciaKm
    this.geometria = geometria
    this.catalogo = new CatalogoViagens()
    this.seed =
      PlanejadorRotas.hash(
        `${origem?.toString() ?? ''}|${destino?.toString() ?? ''}`,
      ) || 1

    // Distância "de estrada": real (OSRM) quando disponível, senão estimada
    this.distanciaViaKm =
      geometria?.ok && Number.isFinite(geometria.distanciaKm) && geometria.distanciaKm > 0
        ? geometria.distanciaKm
        : this.distanciaKm * 1.25

    this.duracaoViaMin =
      geometria?.ok && Number.isFinite(geometria.duracaoMin) && geometria.duracaoMin > 0
        ? geometria.duracaoMin
        : (this.distanciaViaKm / 80) * 60 // 80 km/h de média

    this.pontosVia = geometria?.ok ? geometria.pontos : []
  }

  planejar() {
    const d = this.distanciaKm
    const modos = []

    const rodoviarioDisponivel = d >= MIN_RODOVIARIO_KM
    const aviaoDisponivel = d >= MIN_AVIAO_KM
    const carroDisponivel = d >= MIN_CARRO_KM

    if (rodoviarioDisponivel) {
      modos.push({
        chave: 'rodoviario',
        titulo: 'Rodoviária',
        icone: '🚌',
        descricao: 'Ônibus intermunicipal/interestadual',
        opcoes: this.catalogo.criarRodoviarias({
          origem: this.cidadeOrigem || 'sua origem',
          destino: this.cidadeDestino || 'o destino',
          distanciaViaKm: this.distanciaViaKm,
          seed: this.seed,
        }),
      })
    }

    if (aviaoDisponivel) {
      const opcoesAereas = this.catalogo.criarAereas({
        origem: this.cidadeOrigem,
        destino: this.cidadeDestino,
        ufOrigem: this.ufOrigem,
        ufDestino: this.ufDestino,
        distanciaKm: d,
        seed: this.seed,
      })
      if (opcoesAereas.length) {
        modos.push({
          chave: 'aviao',
          titulo: 'Avião',
          icone: '✈️',
          descricao: 'Voos das principais companhias',
          opcoes: opcoesAereas,
        })
      }
    }

    if (carroDisponivel) {
      modos.push({
        chave: 'carro',
        titulo: 'Carro',
        icone: '🚗',
        descricao: 'Por conta própria, com custo estimado',
        opcoes: [
          this.catalogo.criarCarro({
            duracaoMin: this.duracaoViaMin,
            distanciaViaKm: this.distanciaViaKm,
            pontos: this.pontosVia,
          }),
        ],
      })
    }

    return {
      modos,
      distanciaViaKm: this.distanciaViaKm,
      interestadual:
        Boolean(this.ufOrigem && this.ufDestino) && this.ufOrigem !== this.ufDestino,
      /* Necessário para os links oficiais de compra no frontend */
      metaViagem: {
        cidadeOrigem: this.cidadeOrigem,
        ufOrigem: this.ufOrigem,
        cidadeDestino: this.cidadeDestino,
        ufDestino: this.ufDestino,
      },
    }
  }
}
