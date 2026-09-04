import { useEffect } from 'react'

/**
 * Notificação flutuante. Some sozinha após a duração da animação
 * (definida no CSS) e chama onConcluido para desmontar do DOM.
 */
export default function Toast({ toast, onConcluido }) {
  useEffect(() => {
    if (!toast) return
    const tempo = setTimeout(onConcluido, 3200)
    return () => clearTimeout(tempo)
  }, [toast, onConcluido])

  if (!toast) return null

  return (
    <div key={toast.id} className={`toast toast--${toast.tipo}`} role="status">
      {toast.msg}
    </div>
  )
}
