/**
 * GeoPoint — ponto geográfico imutável (Programação Orientada a Objetos).
 * Encapsula latitude/longitude e utilidades de geometria esférica.
 */
export class GeoPoint {
  static RAIO_TERRA_KM = 6371

  constructor(lat, lon, rotulo = '') {
    this.lat = Number(lat)
    this.lon = Number(lon)
    this.rotulo = rotulo
  }

  /** Ponto válido dentro dos limites geográficos. */
  get valido() {
    return (
      Number.isFinite(this.lat) &&
      Number.isFinite(this.lon) &&
      Math.abs(this.lat) <= 90 &&
      Math.abs(this.lon) <= 180
    )
  }

  /** Distância até outro ponto, em km (fórmula de Haversine). */
  distanciaPara(outro) {
    const rad = Math.PI / 180
    const dLat = (outro.lat - this.lat) * rad
    const dLon = (outro.lon - this.lon) * rad
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.lat * rad) *
        Math.cos(outro.lat * rad) *
        Math.sin(dLon / 2) ** 2
    return 2 * GeoPoint.RAIO_TERRA_KM * Math.asin(Math.sqrt(a))
  }

  /** Rumo inicial (bearing) até outro ponto, em graus (0° = norte). */
  rumoPara(outro) {
    const rad = Math.PI / 180
    const lat1 = this.lat * rad
    const lat2 = outro.lat * rad
    const dLon = (outro.lon - this.lon) * rad
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    return (Math.atan2(y, x) / rad + 360) % 360
  }

  /** Novo ponto deslocado `metros` na direção `rumoGraus`. */
  deslocar(metros, rumoGraus) {
    const d = metros / 1000 / GeoPoint.RAIO_TERRA_KM
    const rumo = (rumoGraus * Math.PI) / 180
    const lat1 = (this.lat * Math.PI) / 180
    const lon1 = (this.lon * Math.PI) / 180
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(rumo),
    )
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(rumo) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
      )
    return new GeoPoint(
      (lat2 * 180) / Math.PI,
      (lon2 * 180) / Math.PI,
      this.rotulo,
    )
  }

  paraArray() {
    return [this.lat, this.lon]
  }

  toString() {
    return `${this.lat.toFixed(5)}, ${this.lon.toFixed(5)}`
  }
}
