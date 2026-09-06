import { GeoPoint } from './GeoPoint.js'
import { EtapaCaminhada, EtapaOnibus, EtapaTrilhos, EtapaChegada } from './Etapa.js'
import { Rota } from './Rota.js'
import { CatalogoLinhas } from './CatalogoLinhas.js'

/* Parâmetros do modelo (velocidades urbanas típicas) */
const VEL_A_PE_KMH = 4.8
const VEL_ONIBUS_KMH = 18
const VEL_ONIBUS_LENTA_KMH = 15
const KM_POR_PARADA = 0.55 // distância média entre pontos de ônibus
const MIN_POR_PARADA = 0.55 // tempo médio parado por ponto

/**
 * PlanejadorRotas — orquestrador do "modo Moovit".
 *
 * Recebe origem/destino (GeoPoint), o endereço do CEP e a geometria da via
 * (do OSRM, ou null para gerar uma curva sintética) e monta várias opções de
 * rota: a pé, ônibus direto, com baldeação e "menos caminhada". Depois
 * pontua, ordena e marca a melhor rota (menor pontuação).
 */
export class PlanejadorRotas {
  constructor({ origem, destino, endereco = {}, geometria = null }) {
    if (!(origem instanceof GeoPoint) || !(destino instanceof GeoPoint)) {
      throw new Error('Origem e destino devem ser instâncias de GeoPoint.')
    }
    this.origem = origem
    this.destino = destino
    this.endereco = endereco
    this.geometria =
      geometria?.ok &&
      Array.isArray(geometria.pontos) &&
      geometria.pontos.length > 1
        ? geometria
        : null
    this.catalogo = new CatalogoLinhas()
    this.seed = PlanejadorRotas.hash(
      `${endereco?.cep ?? ''}|${origem.toString()}|${destino.toString()}`,
    )
  }

  /** Hash determinístico (FNV-1a) para gerar dados estáveis por busca. */
  static hash(texto) {
    let h = 2166136261
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return Math.abs(h >>> 0) || 1
  }

  /* --------------------- geometria -------------------- */

  /** Pontos completos da via: do OSRM ou curva sintética (fallback). */
  #pontosDaVia() {
    if (this.geometria) return this.geometria.pontos
    return this.#curvaSintetica()
  }

  /** Curva de Bézier quadrática com desvio lateral determinístico. */
  #curvaSintetica() {
    const N = 28
    const d = this.origem.distanciaPara(this.destino)
    const rumo = this.origem.rumoPara(this.destino)
    const desvio = ((this.seed % 50) / 50 - 0.5) * 0.4
    const meio = this.origem
      .deslocar((d * 1000) / 2, rumo)
      .deslocar(d * 1000 * desvio, rumo + 90)

    const pontos = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const lat =
        (1 - t) ** 2 * this.origem.lat +
        2 * (1 - t) * t * meio.lat +
        t ** 2 * this.destino.lat
      const lon =
        (1 - t) ** 2 * this.origem.lon +
        2 * (1 - t) * t * meio.lon +
        t ** 2 * this.destino.lon
      pontos.push([lat, lon])
    }
    return pontos
  }

  /** Recorta o trecho da geometria entre as frações f1 e f2 (0..1). */
  #fatia(pontos, f1, f2) {
    const n = pontos.length
    const i1 = Math.max(0, Math.min(n - 2, Math.round(f1 * (n - 1))))
    const i2 = Math.max(i1 + 1, Math.min(n - 1, Math.round(f2 * (n - 1))))
    return pontos.slice(i1, i2 + 1)
  }

  /* ------------------- etapas / rotas ------------------ */

  #caminhada(pontos, distanciaKm, instrucao) {
    return new EtapaCaminhada({
      distanciaKm,
      duracaoMin: Math.max(1, Math.round((distanciaKm / VEL_A_PE_KMH) * 60)),
      pontos,
      instrucao,
    })
  }

  #trechoOnibus({
    linha,
    pontos,
    distanciaKm,
    embarque,
    desembarque,
    esperaMin,
    velocidade = VEL_ONIBUS_KMH,
  }) {
    const paradas = Math.max(1, Math.round(distanciaKm / KM_POR_PARADA))
    const duracao =
      (distanciaKm / velocidade) * 60 + paradas * MIN_POR_PARADA + esperaMin
    return new EtapaOnibus({
      linha,
      distanciaKm,
      duracaoMin: Math.max(3, Math.round(duracao)),
      pontos,
      embarque,
      desembarque,
      paradas,
      esperaMin,
    })
  }

  #rotuloOrigem() {
    return this.origem.rotulo || 'sua localização'
  }

  #rotuloDestino() {
    return (
      this.endereco?.logradouro ||
      this.endereco?.bairro ||
      this.endereco?.localidade ||
      'o destino'
    )
  }

  #linhas(qtd) {
    return this.catalogo.criarLinhas({
      cidade: this.endereco?.localidade,
      uf: this.endereco?.uf,
      bairro: this.endereco?.bairro,
      quantidade: qtd,
      seed: this.seed,
    })
  }

  /** Linha de metrô/trem da cidade escolhida pelo seed (ou null). */
  #trilhoAleatorio() {
    const trilhos = this.catalogo.trilhosDe(
      this.endereco?.localidade,
      this.endereco?.uf,
    )
    if (!trilhos.length) return null
    return trilhos[this.seed % trilhos.length]
  }

  /* ------------------- metrô / trem ------------------- */

  /**
   * Rota usando metrô/trem (com linhas e estações reais do catálogo):
   * caminhada/ônibus até a estação → trilhos → caminhada até o destino.
   */
  #rotaComTrilhos(d, pontos, trilho, linhaOnibus) {
    const estacoes = trilho.estacoes
    const idxEmbarque = this.seed % Math.max(2, Math.floor(estacoes.length / 2))
    const span = Math.max(2, Math.min(5, 2 + (this.seed % 4)))
    const idxDesembarque = Math.min(estacoes.length - 1, idxEmbarque + span)
    const estacaoEmbarque = estacoes[idxEmbarque]
    const estacaoDesembarque = estacoes[idxDesembarque]
    const estacoesNaViagem = idxDesembarque - idxEmbarque

    const andarEstacao = Math.min(0.8, 0.3 + (this.seed % 4) * 0.08)
    const andarDestino = Math.min(0.6, 0.2 + (this.seed % 3) * 0.07)
    const espera = 4 + (this.seed % 5)
    const distTrilhos = Math.max(1, d - andarEstacao - andarDestino)
    const duracaoTrilhos = Math.round(estacoesNaViagem * 2.2 + espera)

    const f1 = Math.min(0.35, andarEstacao / d)
    const f2 = Math.max(f1 + 0.15, 1 - andarDestino / d)
    const etapas = []

    if (d > 6 && linhaOnibus) {
      /* Ônibus curto até perto da estação (baldeação) */
      const andarOnibus = Math.min(0.5, 0.2 + (this.seed % 3) * 0.06)
      const fBus = f1 * 0.5
      etapas.push(
        this.#caminhada(
          this.#fatia(pontos, 0, fBus),
          andarOnibus,
          'Caminhe até o ponto de ônibus',
        ),
      )
      etapas.push(
        this.#trechoOnibus({
          linha: linhaOnibus,
          pontos: this.#fatia(pontos, fBus, f1),
          distanciaKm: Math.max(0.5, (f1 - fBus) * d),
          embarque: `Ponto próximo a ${this.#rotuloOrigem()}`,
          desembarque: `Perto da Estação ${estacaoEmbarque}`,
          esperaMin: 4 + (this.seed % 5),
        }),
      )
      etapas.push(
        this.#caminhada(
          this.#fatia(pontos, f1, f1),
          0.05,
          `Entrada da Estação ${estacaoEmbarque}`,
        ),
      )
    } else {
      etapas.push(
        this.#caminhada(
          this.#fatia(pontos, 0, f1),
          andarEstacao,
          `Caminhe até a Estação ${estacaoEmbarque}`,
        ),
      )
    }

    etapas.push(
      new EtapaTrilhos({
        linhaTrilhos: trilho,
        estacaoEmbarque,
        estacaoDesembarque,
        estacoesNaViagem,
        esperaMin: espera,
        distanciaKm: distTrilhos,
        duracaoMin: duracaoTrilhos,
        pontos: this.#fatia(pontos, f1, f2),
        tarifa: this.catalogo.tarifaDe(this.endereco?.localidade, this.endereco?.uf, this.seed).tarifa,
        pagamentos: this.catalogo.tarifaDe(this.endereco?.localidade, this.endereco?.uf, this.seed).pagamentos,
      }),
    )
    etapas.push(
      this.#caminhada(
        this.#fatia(pontos, f2, 1),
        andarDestino,
        `Caminhe da Estação ${estacaoDesembarque} até o destino`,
      ),
    )
    etapas.push(new EtapaChegada({ destinoRotulo: this.#rotuloDestino() }))

    const modoTrilhos = trilho.tipo === 'trem' ? 'Trem' : 'Metrô'
    return new Rota({
      etiqueta: d > 6 && linhaOnibus ? `Ônibus + ${modoTrilhos}` : modoTrilhos,
      observacao: `Linha ${trilho.numero}-${trilho.nome} (${trilho.operadora}) — desça na Estação ${estacaoDesembarque}. ${modoTrilhos} escapa do trânsito.`,
      origemRotulo: this.#rotuloOrigem(),
      destinoRotulo: this.#rotuloDestino(),
      etapas,
    })
  }

  /* ------------------ opções de rota ------------------- */

  #rotaAPe(d, pontos) {
    return new Rota({
      etiqueta: 'A pé',
      observacao: 'Sem custo — mais ecológico para distâncias curtas.',
      origemRotulo: this.#rotuloOrigem(),
      destinoRotulo: this.#rotuloDestino(),
      etapas: [
        this.#caminhada(pontos, d, 'Siga até o destino'),
        new EtapaChegada({ destinoRotulo: this.#rotuloDestino() }),
      ],
    })
  }

  #rotaDireta(d, pontos, linha) {
    const andarEmbarque = Math.min(0.7, 0.25 + (this.seed % 5) * 0.08)
    const andarDesembarque = Math.min(0.35, 0.12 + (this.seed % 3) * 0.06)
    const espera = 3 + (this.seed % 7)
    const distOnibus = Math.max(0.4, d - andarEmbarque - andarDesembarque)
    const f1 = Math.min(0.45, andarEmbarque / d)
    const f2 = Math.max(f1 + 0.1, 1 - andarDesembarque / d)

    return new Rota({
      etiqueta: 'Direto',
      observacao: 'Sem baldeação — o ônibus vai direto ao seu destino.',
      origemRotulo: this.#rotuloOrigem(),
      destinoRotulo: this.#rotuloDestino(),
      etapas: [
        this.#caminhada(
          this.#fatia(pontos, 0, f1),
          andarEmbarque,
          'Caminhe até o ponto de ônibus',
        ),
        this.#trechoOnibus({
          linha,
          pontos: this.#fatia(pontos, f1, f2),
          distanciaKm: distOnibus,
          embarque: `Ponto próximo a ${this.#rotuloOrigem()}`,
          desembarque: `Ponto próximo a ${this.#rotuloDestino()}`,
          esperaMin: espera,
        }),
        this.#caminhada(
          this.#fatia(pontos, f2, 1),
          andarDesembarque,
          'Caminhe até o destino',
        ),
        new EtapaChegada({ destinoRotulo: this.#rotuloDestino() }),
      ],
    })
  }

  #rotaComBaldeacao(d, pontos, linhas) {
    const andar1 = Math.min(0.5, 0.2 + (this.seed % 4) * 0.05)
    const andarTroca = Math.min(0.3, 0.12 + (this.seed % 3) * 0.04)
    const andarFim = 0.15
    const distUteis = Math.max(1, d - andar1 - andarTroca - andarFim)
    const parte1 = distUteis * (0.45 + (this.seed % 15) / 100)
    const parte2 = Math.max(0.5, distUteis - parte1)
    const espera1 = 3 + (this.seed % 6)
    const espera2 = 4 + ((this.seed >> 3) % 6)

    const fA = andar1 / d
    const fB = Math.min(0.85, fA + parte1 / d)
    const fC = Math.min(0.92, fB + andarTroca / d)
    const fD = Math.max(fC + 0.03, 1 - andarFim / d)

    /* Segundo trecho pode ser metrô/trem quando a cidade tem trilhos */
    const trilho = (this.seed % 2) === 0 ? this.#trilhoAleatorio() : null
    const etapas = [
      this.#caminhada(
        this.#fatia(pontos, 0, fA),
        andar1,
        'Caminhe até o primeiro ponto',
      ),
      this.#trechoOnibus({
        linha: linhas[0],
        pontos: this.#fatia(pontos, fA, fB),
        distanciaKm: parte1,
        embarque: `Ponto próximo a ${this.#rotuloOrigem()}`,
        desembarque: trilho
          ? `Perto da Estação ${trilho.estacoes[this.seed % Math.min(4, trilho.estacoes.length)]}`
          : 'Ponto de baldeação (estimado)',
        esperaMin: espera1,
      }),
      this.#caminhada(
        this.#fatia(pontos, fB, fC),
        andarTroca,
        trilho
          ? `Caminhe até a entrada da Estação ${trilho.estacoes[this.seed % Math.min(4, trilho.estacoes.length)]}`
          : 'Caminhe até o ponto da próxima linha',
      ),
    ]

    if (trilho) {
      /* Baldeação para metrô/trem: linhas e estações reais */
      const estacoes = trilho.estacoes
      const idxEmb = this.seed % Math.min(4, estacoes.length)
      const idxDes = Math.min(estacoes.length - 1, idxEmb + Math.max(2, this.seed % 5))
      const perfilTarifa = this.catalogo.tarifaDe(
        this.endereco?.localidade,
        this.endereco?.uf,
        this.seed,
      )
      etapas.push(
        new EtapaTrilhos({
          linhaTrilhos: trilho,
          estacaoEmbarque: estacoes[idxEmb],
          estacaoDesembarque: estacoes[idxDes],
          estacoesNaViagem: idxDes - idxEmb,
          esperaMin: espera2,
          distanciaKm: parte2,
          duracaoMin: Math.round(
            (idxDes - idxEmb) * 2.2 + espera2 + (parte2 / VEL_ONIBUS_KMH) * 30,
          ),
          pontos: this.#fatia(pontos, fC, fD),
          tarifa: perfilTarifa.tarifa,
          pagamentos: perfilTarifa.pagamentos,
        }),
      )
      etapas.push(
        this.#caminhada(
          this.#fatia(pontos, fD, 1),
          andarFim,
          'Caminhe até o destino',
        ),
      )
    } else {
      etapas.push(
        this.#trechoOnibus({
          linha: linhas[1],
          pontos: this.#fatia(pontos, fC, fD),
          distanciaKm: parte2,
          embarque: 'Ponto de baldeação',
          desembarque: `Ponto próximo a ${this.#rotuloDestino()}`,
          esperaMin: espera2,
        }),
      )
      etapas.push(
        this.#caminhada(
          this.#fatia(pontos, fD, 1),
          andarFim,
          'Caminhe até o destino',
        ),
      )
    }

    etapas.push(new EtapaChegada({ destinoRotulo: this.#rotuloDestino() }))

    const etiqueta = trilho
      ? `Ônibus + ${trilho.tipo === 'trem' ? 'Trem' : 'Metrô'}`
      : '1 baldeação'

    return new Rota({
      etiqueta,
      observacao: trilho
        ? `Baldeação: ônibus até a estação e ${trilho.tipo === 'trem' ? 'trem' : 'metrô'} linha ${trilho.numero}-${trilho.nome} (${trilho.operadora}) até a Estação ${trilho.estacoes[Math.min(trilho.estacoes.length - 1, (this.seed % Math.min(4, trilho.estacoes.length)) + Math.max(2, this.seed % 5))]}. Com o cartão municipal pode haver desconto de integração.`
        : 'Dois ônibus — costuma ser mais rápido em trajetos longos. Com o cartão municipal pode haver desconto de integração.',
      origemRotulo: this.#rotuloOrigem(),
      destinoRotulo: this.#rotuloDestino(),
      etapas,
    })
  }

  #rotaMenosCaminhada(d, pontos, linha) {
    const andarEmbarque = 0.12
    const andarDesembarque = 0.08
    const espera = 6 + (this.seed % 8)
    const distOnibus = Math.max(0.4, d - andarEmbarque - andarDesembarque)
    const f1 = Math.min(0.3, andarEmbarque / d)
    const f2 = Math.max(f1 + 0.1, 1 - andarDesembarque / d)

    return new Rota({
      etiqueta: 'Menos caminhada',
      observacao: 'Embarca mais perto de casa e desce mais perto do destino.',
      origemRotulo: this.#rotuloOrigem(),
      destinoRotulo: this.#rotuloDestino(),
      etapas: [
        this.#caminhada(
          this.#fatia(pontos, 0, f1),
          andarEmbarque,
          'Caminhe até o ponto de ônibus mais próximo',
        ),
        this.#trechoOnibus({
          linha,
          pontos: this.#fatia(pontos, f1, f2),
          distanciaKm: distOnibus,
          embarque: `Ponto próximo a ${this.#rotuloOrigem()}`,
          desembarque: 'Ponto em frente ao destino (estimado)',
          esperaMin: espera,
          velocidade: VEL_ONIBUS_LENTA_KMH,
        }),
        this.#caminhada(
          this.#fatia(pontos, f2, 1),
          andarDesembarque,
          'Caminhe até o destino',
        ),
        new EtapaChegada({ destinoRotulo: this.#rotuloDestino() }),
      ],
    })
  }

  /* --------------------- planejamento ------------------- */

  /**
   * Monta, pontua e ordena as opções de rota.
   * @returns {{ rotas: Rota[], distanciaKm: number, mensagem: string }}
   */
  planejar() {
    const d = this.origem.distanciaPara(this.destino)

    if (!(d > 0.08)) {
      return {
        rotas: [],
        distanciaKm: d,
        mensagem: 'Você já está praticamente no destino! 🎉',
      }
    }

    const pontos = this.#pontosDaVia()
    const linhas = this.#linhas(4)
    const rotas = []

    if (d <= 2.2) rotas.push(this.#rotaAPe(d, pontos))
    rotas.push(this.#rotaDireta(d, pontos, linhas[0]))
    if (d >= 3.2)
      rotas.push(this.#rotaComBaldeacao(d, pontos, [linhas[1], linhas[2]]))
    rotas.push(this.#rotaMenosCaminhada(d, pontos, linhas[3] ?? linhas[0]))

    /* Rota com metrô/trem (linhas e estações reais do catálogo) */
    const trilho = this.#trilhoAleatorio()
    if (trilho && d >= 2.5) {
      rotas.push(this.#rotaComTrilhos(d, pontos, trilho, linhas[0]))
    }

    /* Pontuação: tempo total + penalidade por troca + penalidade por caminhada */
    rotas.forEach(
      (r) =>
        (r.pontuacao = r.tempoTotalMin + r.trocas * 8 + r.caminhadaKm * 4),
    )
    rotas.sort((a, b) => a.pontuacao - b.pontuacao)
    rotas[0].destaque = true

    return { rotas, distanciaKm: d, mensagem: '' }
  }
}
