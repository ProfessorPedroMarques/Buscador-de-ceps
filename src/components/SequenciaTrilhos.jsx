import { formatarPreco } from '../lib/transit/formato.js'

/** Cor do texto sobre a cor da linha (contraste). */
const textoContraste = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#101828' : '#fff'
}

/**
 * Detalhe de um trecho de metrô/trem na timeline: linha real (número-nome e
 * cor oficial), operadora, estação de embarque, onde descer, tarifa e pagamentos.
 */
export default function SequenciaTrilhos({ etapa }) {
  const { linha } = etapa
  const modo = linha.tipo === 'trem' ? 'Trem' : 'Metrô'

  return (
    <>
      <p className="tl-titulo">
        {modo}{' '}
        <span
          className="badge-linha"
          style={{ background: linha.cor, color: textoContraste(linha.cor) }}
        >
          {linha.numero}-{linha.nome}
        </span>{' '}
        <span className="tl-linha-nome">{linha.operadora}</span>
      </p>

      <p className="tl-detalhe">
        🕐 Próximo trem/metrô em ~{etapa.esperaMin} min (estimado) · ≈{' '}
        {etapa.estacoesNaViagem} estação{etapa.estacoesNaViagem > 1 ? 'ões' : ''} de viagem
      </p>

      <p className="tl-detalhe">
        <strong>Embarque:</strong> Estação {etapa.estacaoEmbarque}
      </p>

      <p className="tl-detalhe tl-detalhe--desembarque">
        ⬇️ <strong>Desça na:</strong> Estação {etapa.estacaoDesembarque}
      </p>

      <p className="tl-detalhe">
        💵 Tarifa: <strong>{formatarPreco(etapa.tarifa)}</strong> (integrada)
      </p>

      <div className="chip-pagamentos" aria-label="Formas de pagamento">
        {etapa.pagamentos.map((p) => (
          <span key={p} className="chip-pagamento">
            {p}
          </span>
        ))}
      </div>
    </>
  )
}
