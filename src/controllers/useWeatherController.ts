import { useCallback, useEffect, useState } from 'react'
import type { WeatherError, WeatherState } from '../models/weather'
import { fetchWeatherByCoords } from '../services/weatherService'
import {
  formatCitySuggestionLabel,
  reverseGeocode,
  searchCities,
} from '../services/locationService'

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
}

const mapGeoError = (error: GeolocationPositionError): WeatherError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'GEO_DENIED',
        message:
          'Permissão de localização negada. Ative o GPS para descobrir se vai chover.',
      }
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'GEO_UNAVAILABLE',
        message:
          'Não foi possível determinar sua localização. Tente novamente em instantes.',
      }
    case error.TIMEOUT:
    default:
      return {
        code: 'UNKNOWN',
        message:
          'A consulta demorou mais do que o esperado. Tente novamente mais tarde.',
      }
  }
}

export const useWeatherController = () => {
  const [state, setState] = useState<WeatherState>({ status: 'idle' })

  const loadWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: 'error',
        error: {
          code: 'GEO_UNAVAILABLE',
          message:
            'Seu dispositivo não oferece geolocalização. Digite a cidade manualmente.',
        },
      })
      return
    }

    setState({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [label, report] = await Promise.all([
            reverseGeocode(coords.latitude, coords.longitude).catch(() => undefined),
            fetchWeatherByCoords(coords.latitude, coords.longitude),
          ])

          const enrichedReport = label
            ? {
                ...report,
                location: {
                  ...report.location,
                  label,
                },
              }
            : report

          setState({ status: 'success', report: enrichedReport })
        } catch (error) {
          setState({
            status: 'error',
            error: {
              code: 'NETWORK',
              message:
                error instanceof Error
                  ? error.message
              : 'Não foi possível buscar o clima agora.',
            },
          })
        }
      },
      (geoError) => {
        setState({
          status: 'error',
          error: mapGeoError(geoError),
        })
      },
      GEO_OPTIONS,
    )
  }, [])

  const searchWeather = useCallback(async (query: string) => {
    const normalized = query.trim()
    if (!normalized) {
      setState({
        status: 'error',
        error: {
          code: 'UNKNOWN',
          message: 'Digite o nome de uma cidade para pesquisar.',
        },
      })
      return
    }

    setState({ status: 'loading' })

    try {
      const matches = await searchCities(normalized)
      const target = matches[0]

      if (!target) {
        throw new Error('Não encontramos essa cidade. Tente outro nome.')
      }

      const label = formatCitySuggestionLabel(target)
      const report = await fetchWeatherByCoords(target.latitude, target.longitude, label)
      setState({ status: 'success', report })
    } catch (error) {
      setState({
        status: 'error',
        error: {
          code: 'NETWORK',
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível buscar essa cidade agora.',
        },
      })
    }
  }, [])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  return {
    state,
    isLoading: state.status === 'loading',
    refresh: loadWeather,
    searchWeather,
  }
}
