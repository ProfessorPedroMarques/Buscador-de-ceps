/**
 * linksCompra — geração de LINKS REAIS de compra/busca de passagens.
 *
 * Não existe API pública gratuita de passagens de ônibus no Brasil e o
 * plano grátis da Amadeus exige chaves do usuário. Para que os dados sejam
 * REAIS usamos deep links que abrem o buscador do site oficial JÁ com
 * origem/destino/data preenchidos:
 *
 *   ✈️  Google Flights  → https://www.google.com/travel/flights?origin=...&destination=...&departure=...
 *   ✈️  Skyscanner      → https://www.skyscanner.com.br/transporte/vuelos/{ORI}/{DES}/{AAAAMMDD}/
 *   🚌  ClickBus        → https://www.clickbus.com.br/   (buscador oficial de ônibus)
 *   🚌  Buser           → https://www.buser.com.br/      (buscador oficial de ônibus)
 */

/** "2026-09-20" (hoje + deslocamentoDias, padrão +7). */
export const dataFuturaISO = (deslocamentoDias = 7) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + deslocamentoDias)
  return d.toISOString().slice(0, 10)
}

/** Normaliza "São Paulo" → "sao-paulo" (slugs de URL). */
export const slugCidade = (nome) =>
  (nome ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'destino'

/** Deep link ao Google Flights (verificado: carrega um buscador real). */
export function linkGoogleFlights({ iataOrigem, iataDestino, data }) {
  const d = data || dataFuturaISO()
  return (
    'https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&source=ln' +
    `&origin=${iataOrigem}&destination=${iataDestino}&departure=${d}&type=1`
  )
}

/** Deep link ao Skyscanner Brasil (verificado: carrega um buscador real). */
export function linkSkyscanner({ iataOrigem, iataDestino, data }) {
  const d = (data || dataFuturaISO()).replace(/-/g, '')
  return `https://www.skyscanner.com.br/transporte/vuelos/${iataOrigem}/${iataDestino}/${d}/`
}

/* ClickBus e Buser não expõem URLs públicas por rota (SPA): abrimos o
   buscador oficial, onde os preços REAIS aparecem na hora. */
export const linkClickBus = () => 'https://www.clickbus.com.br/'
export const linkBuser = () => 'https://www.buser.com.br/'

/** Abre o link em uma nova aba com segurança reforçada. */
export const abrirLink = (url) => window.open(url, '_blank', 'noopener')