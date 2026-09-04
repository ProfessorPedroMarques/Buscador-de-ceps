export default function HistoryPanel({ historico, onSelect, onLimpar }) {
  if (!historico.length) return null

  return (
    <section className="historico" aria-label="Buscas recentes">
      <div className="historico__cabecalho">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="15" height="15" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Buscas recentes
        </h3>
        <button type="button" className="historico__limpar" onClick={onLimpar}>
          Limpar tudo
        </button>
      </div>

      <div className="historico__chips">
        {historico.map((item, i) => (
          <button
            key={item.cep}
            type="button"
            className="chip"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => onSelect(item.cep)}
            title={item.logradouro ? `${item.logradouro}, ${item.localidade} - ${item.uf}` : item.cep}
          >
            {item.logradouro
              ? `${item.logradouro}, ${item.localidade} - ${item.uf}`
              : item.cep}
          </button>
        ))}
      </div>
    </section>
  )
}
