import { useCallback, useState } from 'react'

/**
 * Hook que mantém o estado sincronizado com o localStorage.
 * Funciona com valor direto ou função atualizadora (como o setState).
 */
export function useLocalStorage(chave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const salvo = localStorage.getItem(chave)
      return salvo !== null ? JSON.parse(salvo) : valorInicial
    } catch {
      return valorInicial
    }
  })

  const atualizar = useCallback(
    (novo) => {
      setValor((atual) => {
        const resolvido = typeof novo === 'function' ? novo(atual) : novo
        try {
          localStorage.setItem(chave, JSON.stringify(resolvido))
        } catch {
          /* armazenamento indisponível — segue apenas em memória */
        }
        return resolvido
      })
    },
    [chave],
  )

  return [valor, atualizar]
}
