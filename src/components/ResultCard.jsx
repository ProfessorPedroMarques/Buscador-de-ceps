const Linha = ({ rotulo, valor, destaque, atraso }) => (
  <div
    className={destaque ? 'linha linha--destaque' : 'linha'}
    style={{ animationDelay: `${atraso}ms` }}
  >
    <span className="linha__rotulo">{rotulo}</span>
    <span className="linha__valor">{valor || '—'}</span>
  </div>
)

export default function ResultCard({ data, onCopiar, onVerMapa }) {
  return (
    <section className="card" aria-label="Endereço encontrado">
      <header className="card__topo">
        <div>
          <h2 className="card__titulo">{data.logradouro || 'Endereço sem logradouro'}</h2>
          {data.complemento && <p className="card__complemento">{data.complemento}</p>}
        </div>
        <span className="badge">{data.uf}</span>
      </header>

      <div className="card__linhas">
        <Linha rotulo="Bairro" valor={data.bairro} atraso={60} />
        <Linha rotulo="Cidade" valor={data.localidade} atraso={120} />
        <Linha rotulo="CEP" valor={data.cep} atraso={180} />
        <Linha rotulo="DDD" valor={data.ddd} atraso={240} />
        <Linha rotulo="IBGE" valor={data.ibge} atraso={300} />
      </div>

      <div className="card__acoes">
        <button type="button" className="btn btn--secundario" onClick={onCopiar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          Copiar endereço
        </button>
        <button type="button" className="btn btn--primario" onClick={onVerMapa}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Ver no mapa
        </button>
      </div>
    </section>
  )
}
