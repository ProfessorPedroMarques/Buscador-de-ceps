/**
 * linksCompra — generación de ENLACES REALES de compra/búsqueda de passagens.
 *
 * No existe una API pública gratuita de pasajes de ómnibus en Brasil y el
 * plan gratis de Amadeus requiere claves del usuario. Para que los datos sean
 * REALES usamos enlaces profundos (deep links) que abren el buscador del
 * sitio oficial YA con origen/destino/fecha prefijados:
 *
 *   ✈️  Google Flights  → https://www.google.com/travel/flights?origin=...&destination=...&departure=...
 *   ✈️  Skyscanner      → https://www.skyscanner.com.br/transporte/vuelos/{ORI}/{DES}/{AAAAMMDD}/
 *   🚌  ClickBus        → https://www.clickbus.com.br/   (buscador oficial de ómnibus)
 *   🚌  Buser           → https://www.buser.com.br/      (buscador oficial de ómnibus)
 */

/** "2026-09-20" (hoy + desplazamientoDias, por defecto +7). */
export const fechaFuturaIso = (desplazamientoDias = 7) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + desplazamientoDias)
  return d.toISOString().slice(0, 10)
}

/** Normaliza "São Paulo" → "sao-paulo" (slugs de URL). */
export const slugCiudad = (nombre) =>
  (nombre ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'destino'

/** Deep link a Google Flights (verificado: carga un buscador real). */
export function linkGoogleFlights({ iataOrigem, iataDestino, fecha }) {
  const d = fecha || fechaFuturaIso()
  return (
    'https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&source=ln' +
    `&origin=${iataOrigem}&destination=${iataDestino}&departure=${d}&type=1`
  )
}

/** Deep link a Skyscanner Brasil (verificado: carga un buscador real). */
export function linkSkyscanner({ iataOrigem, iataDestino, fecha }) {
  const d = (fecha || fechaFuturaIso()).replace(/-/g, '')
  return `https://www.skyscanner.com.br/transporte/vuelos/${iataOrigem}/${iataDestino}/${d}/`
}

/* ClickBus y Buser no exponen URLs públicas por ruta (SPA): abrimos su
   buscador oficial, donde se ven precios REALES al instante. */
export const linkClickBus = () => 'https://www.clickbus.com.br/'
export const linkBuser = () => 'https://www.buser.com.br/'

/** Despliega el enlace en una pestaña nueva con seguridad reforzada. */
export const abrirEnlace = (url) => window.open(url, '_blank', 'noopener')