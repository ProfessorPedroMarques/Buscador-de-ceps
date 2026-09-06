/**
 * Helpers de formatação pt-BR usados pelas classes de rota e pelos componentes.
 */

/** 1.24 km → "1,2 km" | 0.45 → "450 m" */
export const formatarDistancia = (km) => {
  if (!Number.isFinite(km) || km <= 0) return '0 m'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/** 42.4 → "42 min" | 75 → "1 h 15 min" */
export const formatarDuracao = (min) => {
  if (!Number.isFinite(min) || min <= 0) return '0 min'
  if (min < 60) return `${Math.max(1, Math.round(min))} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
}

/** 4.5 → "R$ 4,50" | 0 → "Grátis" */
export const formatarPreco = (valor) => {
  if (!Number.isFinite(valor) || valor <= 0) return 'Grátis'
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}
