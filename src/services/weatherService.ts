import { RAIN_THRESHOLD } from '../models/weather'
import type { DailyForecast, GeoPoint, WeatherReport } from '../models/weather'

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone: string
  current?: {
    time: string
    temperature_2m: number
  }
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
  }
}

const buildUrl = (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    timezone: 'auto',
    forecast_days: '5',
  })

  return `${OPEN_METEO_ENDPOINT}?${params.toString()}`
}

const buildForecast = (payload: OpenMeteoResponse): DailyForecast[] => {
  const days = payload.daily?.time ?? []
  return days.slice(0, 5).map((date, index) => {
    const precipitationProbability =
      payload.daily?.precipitation_probability_max?.[index] ?? 0
    return {
      date,
      minTemp: payload.daily?.temperature_2m_min?.[index] ?? 0,
      maxTemp: payload.daily?.temperature_2m_max?.[index] ?? 0,
      precipitationProbability,
      willRain: precipitationProbability >= RAIN_THRESHOLD,
    }
  })
}

const normalizeReport = (
  payload: OpenMeteoResponse,
  requestedLocation: GeoPoint,
): WeatherReport => {
  if (!payload.current || typeof payload.current.temperature_2m !== 'number') {
    throw new Error('Resposta inesperada da API de clima')
  }

  const rainProbability =
    payload.daily?.precipitation_probability_max?.[0] ?? 0
  const precipitationSum = payload.daily?.precipitation_sum?.[0] ?? 0

  return {
    temperature: payload.current.temperature_2m,
    rainProbability,
    precipitationSum,
    willRain: rainProbability >= RAIN_THRESHOLD,
    timezone: payload.timezone,
    updatedAt: payload.current.time ? new Date(payload.current.time) : new Date(),
    location: {
      latitude: requestedLocation.latitude,
      longitude: requestedLocation.longitude,
      label: requestedLocation.label,
    },
    forecast: buildForecast(payload),
  }
}

export const fetchWeatherByCoords = async (
  latitude: number,
  longitude: number,
  label?: string,
): Promise<WeatherReport> => {
  const url = buildUrl(latitude, longitude)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Não foi possível consultar a API da Open-Meteo')
  }

  const data = (await response.json()) as OpenMeteoResponse

  return normalizeReport(data, { latitude, longitude, label })
}
