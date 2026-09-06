import { useCallback, useState } from 'react'

/**
 * useGeolocation — hook que pede a localização do usuário via
 * navigator.geolocation e guarda coordenadas/erro/carregando.
 * Retorna { coords, erro, carregando, solicitar }.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  /** Pede permissão e resolve com { lat, lon, precisao } ou null. */
  const solicitar = useCallback(
    () =>
      new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          setErro('Seu navegador não suporta geolocalização.')
          return resolve(null)
        }

        setCarregando(true)
        setErro('')

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              precisao: pos.coords.accuracy,
            }
            setCoords(c)
            setCarregando(false)
            resolve(c)
          },
          (err) => {
            const mensagens = {
              1: 'Permissão de localização negada. Autorize o acesso no navegador e tente novamente.',
              2: 'Localização indisponível no momento.',
              3: 'Tempo esgotado ao obter sua localização.',
            }
            const msg = mensagens[err.code] ?? 'Não foi possível obter sua localização.'
            setErro(msg)
            setCarregando(false)
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
        )
      }),
    [],
  )

  return { coords, erro, carregando, solicitar }
}
