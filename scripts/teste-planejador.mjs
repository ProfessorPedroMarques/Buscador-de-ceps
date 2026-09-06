/* Teste rápido dos planejadores (rode: npm run teste:planejador) */
import { PlanejadorRotas } from '../src/lib/transit/PlanejadorRotas.js'
import { PlanejadorViagens } from '../src/lib/transit/PlanejadorViagens.js'
import { GeoPoint } from '../src/lib/transit/GeoPoint.js'

const cenarios = [
  {
    nome: 'São Paulo (catálogo, rota longa)',
    origem: new GeoPoint(-23.5613, -46.6565, 'Av. Paulista, Bela Vista, São Paulo'),
    destino: new GeoPoint(-23.5558, -46.6604, ''),
    endereco: {
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    },
  },
  {
    nome: 'Cidade fora do catálogo (perfil gerado)',
    origem: new GeoPoint(-5.0892, -42.8016, 'Rua Coelho e Castro, Centro, Teresina'),
    destino: new GeoPoint(-5.0745, -42.7936, ''),
    endereco: {
      cep: '64000-150',
      logradouro: 'Rua Coelho e Castro',
      bairro: 'Centro',
      localidade: 'Teresina',
      uf: 'PI',
    },
  },
  {
    nome: 'Distância curta (a pé incluído)',
    origem: new GeoPoint(-23.5613, -46.6565, 'Av. Paulista'),
    destino: new GeoPoint(-23.5565, -46.6605, ''),
    endereco: {
      cep: '01310-100',
      logradouro: 'Av. Paulista',
      bairro: 'Bela Vista',
      localidade: 'São Paulo',
      uf: 'SP',
    },
  },
]

let falhas = 0

/* --------- Parte 1: rotas urbanas (PlanejadorRotas) --------- */
for (const c of cenarios) {
  const planejador = new PlanejadorRotas({
    origem: c.origem,
    destino: c.destino,
    endereco: c.endereco,
    geometria: null,
  })
  const { rotas, distanciaKm, mensagem } = planejador.planejar()

  console.log(`\n=== URBANO: ${c.nome} — ${distanciaKm.toFixed(2)} km ===`)
  if (mensagem) console.log('Mensagem:', mensagem)

  if (!rotas.length && !mensagem) {
    console.error('✗ Nenhuma rota gerada!')
    falhas++
    continue
  }

  for (const rota of rotas) {
    console.log(`${rota.destaque ? '⭐ MELHOR' : '       '} ${rota.resumo}`)

    if (!Number.isFinite(rota.tempoTotalMin) || rota.tempoTotalMin <= 0) {
      console.error('✗ tempoTotalMin inválido!')
      falhas++
    }
    rota.etapas.forEach((e) => {
      if (e.tipo === 'onibus' && (!Array.isArray(e.pontos) || e.pontos.length < 2)) {
        console.error(`✗ etapa ônibus sem geometria (${e.linha.numero})!`)
        falhas++
      }
    })
  }
}

/* --------- Parte 2: viagens de longo curso (PlanejadorViagens) --------- */
/* Cenários de viagens de longo curso (distâncias simuladas em linha reta) */
const cenariosViagem = [
  {
    nome: 'Interestadual longa (SP → Salvador, ~1.700 km)',
    origem: { cidade: 'São Paulo', uf: 'SP', ponto: new GeoPoint(-23.5613, -46.6565) },
    destino: { cidade: 'Salvador', uf: 'BA', ponto: new GeoPoint(-12.9714, -38.5014) },
  },
  {
    nome: 'Interestadual média (Curitiba → São Paulo, ~340 km)',
    origem: { cidade: 'Curitiba', uf: 'PR', ponto: new GeoPoint(-25.4284, -49.2733) },
    destino: { cidade: 'São Paulo', uf: 'SP', ponto: new GeoPoint(-23.5613, -46.6565) },
  },
  {
    nome: 'Intermunicipal (Campinas → São Paulo, ~85 km)',
    origem: { cidade: 'Campinas', uf: 'SP', ponto: new GeoPoint(-22.9056, -47.0608) },
    destino: { cidade: 'São Paulo', uf: 'SP', ponto: new GeoPoint(-23.5613, -46.6565) },
  },
  {
    nome: 'Curta (sem viagens, ~7 km)',
    origem: { cidade: 'São Paulo', uf: 'SP', ponto: new GeoPoint(-23.5613, -46.6565) },
    destino: { cidade: 'São Paulo', uf: 'SP', ponto: new GeoPoint(-23.5213, -46.6165) },
  },
]

for (const c of cenariosViagem) {
  const d = c.origem.ponto.distanciaPara(c.destino.ponto)
  const planejador = new PlanejadorViagens({
    origem: c.origem.ponto,
    destino: c.destino.ponto,
    cidadeOrigem: c.origem.cidade,
    ufOrigem: c.origem.uf,
    cidadeDestino: c.destino.cidade,
    ufDestino: c.destino.uf,
    distanciaKm: d,
    geometria: null,
  })
  const { modos, distanciaViaKm, interestadual } = planejador.planejar()

  console.log(
    `\n=== ${c.nome} — ${d.toFixed(0)} km (via ≈ ${distanciaViaKm.toFixed(0)} km) ${interestadual ? '[INTERESTADUAL]' : ''} ===`,
  )

  for (const modo of modos) {
    console.log(`  ${modo.icone} ${modo.titulo} (${modo.opcoes.length} opções):`)
    for (const op of modo.opcoes) {
      console.log(`     • ${op.resumo}`)
      console.log(
        `       ${op.partida} → ${op.chegada}${op.diaSeguinte ? ' (+1 dia)' : ''} | ${op.localPartida} → ${op.localChegada}`,
      )
      if (op.modo === 'aviao' && !op.voo) {
        console.error('✗ voo sem número!')
        falhas++
      }
      if (op.modo === 'carro' && (!op.pontos !== undefined && op.custoTotal <= 0 && op.custoPedagio === 0 && op.custoCombustivel === 0)) {
        console.error('✗ carro sem custos!')
        falhas++
      }
      if (!Number.isFinite(op.valor) && op.modo !== 'carro') {
        console.error('✗ valor inválido!')
        falhas++
      }
    }
  }

  if (!modos.length) {
    console.log('  (nenhum modo de viagem para esta distância — esperado para curtas)')
  } else {
    const chaves = modos.map((m) => m.chave)
    if (d >= 45 && !chaves.includes('rodoviario')) {
      console.error('✗ rodoviário deveria estar disponível!')
      falhas++
    }
    if (d >= 250 && !chaves.includes('aviao')) {
      console.error('✗ avião deveria estar disponível (capitais com aeroporto)!')
      falhas++
    }
    if (d >= 10 && !chaves.includes('carro')) {
      console.error('✗ carro deveria estar disponível!')
      falhas++
    }
  }
}

console.log(falhas ? `\n✗ ${falhas} problema(s) encontrado(s)` : '\n✓ Todos os cenários OK')
process.exit(falhas ? 1 : 0)
