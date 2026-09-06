import { formatarPreco } from '../lib/transit/formato.js'

/**
 * Detalhe de um trecho de ônibus na timeline: linha, espera, embarque,
 * desembarque (onde descer), tarifa e formas de pagamento.
 */
export default function SequenciaOnibus({ etapa }) {
  const { linha } = etapa

  return (
    <>
      <p className="tl-titulo">
        Ônibus{' '}
        <span className="badge-linha" style={{ background: linha.cor }}>
          {linha.numero}
        </span>{' '}
        <span className="tl-linha-nome">{linha.nome}</span>
      </p>

      <p className="tl-detalhe">
        🕐 Próximo ônibus em ~{etapa.esperaMin} min (estimado) · ≈{' '}
        {etapa.paradas} paradas até o desembarque
      </p>

      <p className="tl-detalhe">
        <strong>Embarque:</strong> {etapa.embarque}
      </p>

      <p className="tl-detalhe tl-detalhe--desembarque">
        ⬇️ <strong>Desembarque:</strong> {etapa.desembarque}
      </p>

      <p className="tl-detalhe">
        💵 Tarifa: <strong>{formatarPreco(linha.tarifa)}</strong>
        {linha.operadora ? ` · ${linha.operadora}` : ''}
      </p>

      <div className="chip-pagamentos" aria-label="Formas de pagamento">
        {linha.pagamentos.map((p) => (
          <span key={p} className="chip-pagamento">
            {p}
          </span>
        ))}
      </div>
    </>
  )
}
