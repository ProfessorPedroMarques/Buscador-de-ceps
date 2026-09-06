import { LinhaOnibus } from './LinhaOnibus.js'

/**
 * CatalogoLinhas — perfil de transporte público por cidade.
 *
 * ⚠️ IMPORTANTE (transparência): não existe uma API nacional gratuita de
 * itinerários de ônibus em tempo real. Os dados abaixo são ESTIMATIVAS
 * educativas: tarifas aproximadas das capitais (sujeitas a mudanças) e nomes
 * de cartões municipais conhecidos. Para cidades fora do catálogo, um perfil
 * plausível é gerado de forma determinística a partir de um "seed".
 */
const PALETA = [
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
]

const TIPOS = ['Expresso', 'Direto', 'Circular', 'Troncal', 'Noturno']

const normalizar = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/* Perfis por cidade: tarifa aproximada, cartão municipal e números típicos. */
const DADOS = {
  'sao paulo|sp': {
    tarifa: 5.0,
    cartao: 'Bilhete Único',
    operadora: 'SPTrans',
    linhas: ['702U-10', '8000-10', '5105-10', '636N-10', '917M-10', 'N101-11'],
  },
  'rio de janeiro|rj': {
    tarifa: 4.65,
    cartao: 'Bilhete Único Carioca',
    operadora: 'Mobilidade Rio',
    linhas: ['485', '606', '438', '917', 'SP33', '371'],
  },
  'belo horizonte|mg': {
    tarifa: 5.25,
    cartao: 'BHBus',
    operadora: 'BHTrans',
    linhas: ['5301', '7105', 'A512', 'S52', '6102', '910A'],
  },
  'curitiba|pr': {
    tarifa: 4.5,
    cartao: 'Cartão Transporte',
    operadora: 'URBS',
    linhas: ['020', '503', '130', '605', 'X40', '215'],
  },
  'porto alegre|rs': {
    tarifa: 4.8,
    cartao: 'Cartão TRI',
    operadora: 'EPTC',
    linhas: ['T1', '533', 'R10', '480', '314', 'C9'],
  },
  salvador: {
    tarifa: 4.1,
    cartao: 'Cartão Mais',
    operadora: 'Superintendência de Trânsito',
    linhas: ['A25', 'L37', '101', '1802', 'P41', 'N13'],
  },
  'rio branco|ac': {
    tarifa: 4.0,
    cartao: 'Cartão municipal',
    operadora: 'Sistema municipal',
    linhas: ['B12', 'C30', '045', 'T7'],
  },
  recife: {
    tarifa: 4.65,
    cartao: 'Bilhete Único',
    operadora: 'RECIFE TRANSPORTE',
    linhas: ['512', '943', 'L33', 'CAT11', '803', 'D45'],
  },
  fortaleza: {
    tarifa: 4.5,
    cartao: 'Cartão Expresso',
    operadora: 'Etufor',
    linhas: ['103', '512', '718', 'M28', 'PB03', '601'],
  },
  brasilia: {
    tarifa: 5.0,
    cartao: 'Cartão Brasília',
    operadora: 'DFTrans',
    linhas: ['108.1', '311.3', 'A801', 'S113', '451.4', 'J701'],
  },
  goiania: {
    tarifa: 4.5,
    cartao: 'Cartão BNZ',
    operadora: 'RMTC',
    linhas: ['005', '218', 'B70', 'T17', '335', '811'],
  },
  manaus: {
    tarifa: 4.5,
    cartao: 'Cartão Manaus',
    operadora: 'Manauspref',
    linhas: ['014', '305', 'J13', 'B42', '706', 'C11'],
  },
  florianopolis: {
    tarifa: 5.0,
    cartao: 'Cartão CityBus',
    operadora: 'Consórcio Intermunicipal',
    linhas: ['330', '470', 'L45', '820', '135', 'C2'],
  },
  campinas: {
    tarifa: 4.9,
    cartao: 'Cartão municipal',
    operadora: 'EMDEC',
    linhas: ['332', '108', 'T41', '267', '591', 'R73'],
  },
  santos: {
    tarifa: 4.5,
    cartao: 'Cartão municipal',
    operadora: 'DERSA/STU',
    linhas: ['171', '432', 'S24', '065', '538', 'B14'],
  },
}

/* Linhas REAIS de metrô/trem urbano por cidade (número, nome, cor oficial,
   operadora e estações principais). Usadas nas rotas com baldeação/trilhos. */
const TRILHOS = {
  'sao paulo|sp': [
    { tipo: 'metrô', numero: '4', nome: 'Amarela', cor: '#FFD700', operadora: 'Metrô de São Paulo', estacoes: ['Luz', 'República', 'Higienópolis-Mackenzie', 'Paulista', 'Oscar Freire', 'Fradique Coutinho', 'Pinheiros', 'Butantã', 'Vila Sônia'] },
    { tipo: 'metrô', numero: '1', nome: 'Azul', cor: '#0044CC', operadora: 'Metrô de São Paulo', estacoes: ['Tucuruvi', 'Parada Inglesa', 'Santana', 'Carandiru', 'Portuguesa-Tietê', 'Armênia', 'Tiradentes', 'Luz', 'São Bento', 'Sé', 'Liberdade', 'Ana Rosa', 'Paraíso', 'Santa Cruz', 'Jabaquara'] },
    { tipo: 'metrô', numero: '2', nome: 'Verde', cor: '#00A859', operadora: 'Metrô de São Paulo', estacoes: ['Vila Madalena', 'Sumaré', 'Santa Cecília', 'Marechal Deodoro', 'Consolação', 'Trianon-Masp', 'Brigadeiro', 'Paraíso', 'Ana Rosa', 'Chácara Klabin', 'Sacomã', 'Vila Prudente'] },
    { tipo: 'metrô', numero: '3', nome: 'Vermelha', cor: '#EF3125', operadora: 'Metrô de São Paulo', estacoes: ['Palmeiras-Barra Funda', 'Lapa', 'Santa Cecília', 'República', 'Anhangabaú', 'Sé', 'Pedro II', 'Brás', 'Bresser-Mooca', 'Belém', 'Tatuapé', 'Corinthians-Itaquera'] },
    { tipo: 'metrô', numero: '5', nome: 'Lilás', cor: '#A02974', operadora: 'Metrô de São Paulo', estacoes: ['Capão Redondo', 'Vila das Belezas', 'Giovanni Gronchi', 'Santo Amaro', 'Largo Treze', 'Adolfo Pinheiro', 'Alto da Boa Vista', 'Borba Gato', 'Brooklin', 'Moema', 'AACD-Servidor', 'Santa Cruz', 'Chácara Klabin'] },
    { tipo: 'trem', numero: '7', nome: 'Rubi', cor: '#C62828', operadora: 'CPTM', estacoes: ['Luz', 'Palmeiras-Barra Funda', 'Água Branca', 'Piqueri', 'Pirituba', 'Vila Clarice', 'Jaraguá', 'Franco da Rocha', 'Francisco Morato', 'Caieiras', 'Brás'] },
    { tipo: 'trem', numero: '9', nome: 'Esmeralda', cor: '#00995D', operadora: 'CPTM', estacoes: ['Osasco', 'Presidente Altino', 'Ceasa', 'Cidade Universitária', 'Pinheiros', 'Hebraica-Rebouças', 'Vila Olímpia', 'Cidade Jardim', 'Morumbi', 'Santo Amaro', 'Granja Julieta', 'Jurubatuba'] },
    { tipo: 'trem', numero: '11', nome: 'Coral', cor: '#FF6D00', operadora: 'CPTM', estacoes: ['Luz', 'Brás', 'Tatuapé', 'Engenheiro Goulart', 'USP Leste', 'Itaquaquecetuba', 'Calmon Viana', 'Estudantes', 'Suzano', 'Mogi das Cruzes'] },
  ],
  'rio de janeiro|rj': [
    { tipo: 'metrô', numero: '1', nome: 'Linha 1', cor: '#00A0DF', operadora: 'MetrôRio', estacoes: ['Uruguai', 'Saens Peña', 'Estácio', 'Maracanã', 'Cidade Nova', 'Central', 'Uruguaiana', 'Carioca', 'Cinelândia', 'Glória', 'Catete', 'Flamengo', 'Botafogo', 'Cardeal Arcoverde', 'Siqueira Campos', 'Cantagalo', 'General Osório'] },
    { tipo: 'metrô', numero: '2', nome: 'Linha 2', cor: '#00995D', operadora: 'MetrôRio', estacoes: ['Pavuna', 'Coelho Neto', 'Colégio', 'Irajá', 'Vicente de Carvalho', 'Engenho da Rainha', 'Inhaúma', 'Del Castilho', 'Maria da Graça', 'Nova América', 'Triagem', 'Maracanã', 'São Cristóvão', 'Central'] },
    { tipo: 'trem', numero: 'Deodoro', nome: 'SuperVia', cor: '#FDB913', operadora: 'SuperVia', estacoes: ['Central do Brasil', 'São Cristóvão', 'Triagem', 'Ramos', 'Marechal Hermes', 'Deodoro', 'Vila Militar', 'Realengo', 'Padre Miguel', 'Bangu', 'Senador Camará', 'Santa Cruz'] },
  ],
  'belo horizonte|mg': [
    { tipo: 'metrô', numero: '1', nome: 'Azul', cor: '#005CAB', operadora: 'Metrô de Belo Horizonte (CBTU)', estacoes: ['Vilarinho', 'Floramar', 'Primeiro de Maio', 'São Gabriel', 'Minas Shopping', 'Santa Tereza', 'Carlos Prates', 'Lagoinha', 'Central', 'Gameleira', 'Vila Oeste', 'Cidade Industrial', 'Betim'] },
  ],
  'porto alegre|rs': [
    { tipo: 'trem', numero: '1', nome: 'Trensurb', cor: '#F7941D', operadora: 'Trensurb', estacoes: ['Mercado', 'Rodoviária', 'São Pedro', 'Farrapos', 'Lomba do Pinheiro', 'Aeroporto', 'Anchieta', 'Fátima', 'Sarandi', 'Canoas', 'Mathias Velho', 'Rio Branco', 'Niterói', 'Sapucaia', 'Portão', 'São Leopoldo', 'Unilasalle', 'Novo Hamburgo'] },
  ],
  'recife|pe': [
    { tipo: 'metrô', numero: 'Centro', nome: 'Linha Centro', cor: '#E30613', operadora: 'Metrô do Recife (CBTU)', estacoes: ['Camaragibe', 'Cosme e Damião', 'Tancredo Neves', 'Vasco da Gama', 'Dois Irmãos', 'Aflitos', 'Rosarinho', 'Encruzilhada', 'Derby', 'Largo da Paz', 'Joana Bezerra', 'Recife'] },
    { tipo: 'metrô', numero: 'Sul', nome: 'Linha Sul', cor: '#0072BC', operadora: 'Metrô do Recife (CBTU)', estacoes: ['Recife', 'Largo da Paz', 'Ilha do Retiro', 'Imbiribeira', 'Boa Viagem', 'Monteiro', 'Prazeres', 'Cajueiro Seco', 'Cabo de Santo Agostinho'] },
  ],
  'salvador|ba': [
    { tipo: 'metrô', numero: '1', nome: 'Azul', cor: '#00954C', operadora: 'Metrô de Salvador (CBTU)', estacoes: ['Pirajá', 'Campinas', 'Bom Juá', 'Acesso Norte', 'Rodoviária', 'Brotas', 'Campo da Pólvora', 'Lapa', 'Lapinha', 'Retiro', 'Águas Claras'] },
  ],
  'brasilia|df': [
    { tipo: 'metrô', numero: '1', nome: 'Linha Verde', cor: '#00A859', operadora: 'Metrô-DF', estacoes: ['Central', 'Galeria', 'Guará', 'Feira', '112 Sul', '114 Sul', 'Asa Sul', 'Arniqueiras', 'Águas Claras', 'Ceilândia Sul', 'Ceilândia'] },
    { tipo: 'metrô', numero: '2', nome: 'Linha Laranja', cor: '#F26722', operadora: 'Metrô-DF', estacoes: ['Central', 'Galeria', 'Guará', 'Samambaia', 'Terminal Samambaia', 'Ceilândia'] },
  ],
}

export class CatalogoLinhas {
  #cachePerfis = new Map()

  /** Linhas de metrô/trem da cidade (ou []). */
  trilhosDe(cidade, uf) {
    const chave = `${normalizar(cidade)}|${normalizar(uf)}`
    return TRILHOS[chave] ?? []
  }

  /** Tarifa e pagamentos do perfil urbano da cidade (uso nas etapas de trilhos). */
  tarifaDe(cidade, uf, seed = 1) {
    const perfil = this.#perfilDe(cidade, uf, seed)
    return {
      tarifa: perfil.tarifa,
      pagamentos: perfil.pagamentos,
      cartao: perfil.cartao,
    }
  }

  /** Perfil da cidade (do catálogo) ou gerado deterministicamente pelo seed. */
  #perfilDe(cidade, uf, seed) {
    const chave = `${normalizar(cidade)}|${normalizar(uf)}`
    const chaveCache = `${chave}#${seed}`
    if (this.#cachePerfis.has(chaveCache)) return this.#cachePerfis.get(chaveCache)

    const doCatalogo = DADOS[chave]
    const perfil = doCatalogo
      ? { ...doCatalogo }
      : {
          tarifa: Math.round((4 + (seed % 16) / 10) * 100) / 100, // R$ 4,00–5,50
          cartao: 'Cartão municipal',
          operadora: 'Sistema municipal',
          linhas: [],
          apelido: cidade || 'Principal',
        }

    perfil.pagamentos = [
      'Cartão de débito/crédito (sem contato)',
      `Cartão municipal (${perfil.cartao})`,
      'Vale-transporte',
      'Dinheiro',
      'QR Code PIX (parte da frota)',
    ]

    this.#cachePerfis.set(chaveCache, perfil)
    return perfil
  }

  /**
   * Cria `quantidade` linhas plausíveis para a cidade/bairro informados,
   * determinísticas para o mesmo seed (mesma busca → mesmas linhas).
   */
  criarLinhas({ cidade, uf, bairro, quantidade = 4, seed = 1 }) {
    const perfil = this.#perfilDe(cidade, uf, seed)
    const destino = bairro || perfil.apelido || cidade || 'Principal'
    const linhas = []
    const usados = new Set()

    for (let i = 0; i < quantidade; i++) {
      const h = ((seed + i * 2654435761) >>> 0) || 1
      let numero = perfil.linhas.length
        ? perfil.linhas[i % perfil.linhas.length]
        : String(100 + (h % 899))
      if (usados.has(numero)) numero = `${numero}/${i + 1}`
      usados.add(numero)

      const tipo = TIPOS[(h >> 3) % TIPOS.length]
      const nome = `${tipo} — Centro ↔ ${destino}`
      const cor = PALETA[(h >> 5) % PALETA.length]

      linhas.push(
        new LinhaOnibus({
          numero,
          nome,
          cor,
          tarifa: perfil.tarifa,
          pagamentos: perfil.pagamentos,
          operadora: perfil.operadora,
        }),
      )
    }
    return linhas
  }
}
