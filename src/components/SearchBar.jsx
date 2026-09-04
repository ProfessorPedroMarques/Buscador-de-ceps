import { forwardRef, useState } from 'react'

const mascaraCep = (valor) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  return digitos.length > 5
    ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
    : digitos
}

function SearchBar(
  { value, onChange, onSubmit, loading, notificar },
  ref,
) {
  const [focado, setFocado] = useState(false)

  const colar = async () => {
    try {
      const texto = await navigator.clipboard.readText()
      if (!texto) throw new Error('vazio')
      onChange(mascaraCep(texto))
      notificar('CEP colado da área de transferência.', 'info')
    } catch {
      notificar('Não foi possível acessar a área de transferência.', 'erro')
    }
  }

  return (
    <div className={focado ? 'search is-focado' : 'search'}>
      <svg className="search__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>

      <input
        ref={ref}
        className="search__input"
        type="text"
        inputMode="numeric"
        placeholder="00000-000"
        aria-label="Digite o CEP"
        maxLength={9}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(mascaraCep(e.target.value))}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        onKeyDown={(e) => e.key === 'Enter' && !loading && onSubmit(value)}
      />

      {value && !loading && (
        <button
          type="button"
          className="search__acao"
          onClick={() => onChange('')}
          aria-label="Limpar campo"
          title="Limpar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <button
        type="button"
        className="search__acao"
        onClick={colar}
        aria-label="Colar da área de transferência"
        title="Colar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      </button>

      <button
        type="button"
        className="search__btn"
        onClick={() => onSubmit(value)}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Buscando…</span>
          </>
        ) : (
          'Buscar'
        )}
      </button>
    </div>
  )
}

export default forwardRef(SearchBar)
