import { RAIN_THRESHOLD } from '../models/weather'
import type { DailyForecast, GeoPoint, HourlyPoint, WeatherReport } from '../models/weather'

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

const getTodayString = (payload: OpenMeteoResponse) => {
  if (typeof payload.utc_offset_seconds === 'number') {
    const adjusted = new Date(Date.now() + payload.utc_offset_seconds * 1000)
    return adjusted.toISOString().slice(0, 10)
  }

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: payload.timezone ?? 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone: string
  utc_offset_seconds?: number
  current?: {
    time: string
    temperature_2m: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    wind_gusts_10m?: number
  }
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
  }
}

const buildUrl = (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    hourly: 'temperature_2m,precipitation_probability',
    timezone: 'auto',
    forecast_days: '7',
    past_days: '0',
  })

  return `${OPEN_METEO_ENDPOINT}?${params.toString()}`
}

const buildForecast = (payload: OpenMeteoResponse): DailyForecast[] => {
  const baseDate = payload.current?.time?.slice(0, 10) ?? getTodayString(payload)
  const baseValue = Date.parse(`${baseDate}T00:00:00Z`)
  const days = payload.daily?.time ?? []
  const entries = days.map((date, index) => {
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

  return entries
    .filter((day) => {
      const dayValue = Date.parse(`${day.date}T00:00:00Z`)
      return Number.isFinite(dayValue)
        ? dayValue >= baseValue
        : day.date >= baseDate
    })
    .slice(0, 5)
}

const normalizeHourly = (payload: OpenMeteoResponse): HourlyPoint[] => {
  const times = payload.hourly?.time ?? []
  const temperatures = payload.hourly?.temperature_2m ?? []
  const precipitation = payload.hourly?.precipitation_probability ?? []

  return times.slice(0, 12).map((time, index) => ({
    time,
    temperature: temperatures[index] ?? 0,
    precipitationProbability: precipitation[index] ?? 0,
  }))
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
    humidity: payload.current.relative_humidity_2m,
    windSpeed: payload.current.wind_speed_10m,
    windGust: payload.current.wind_gusts_10m,
    timezone: payload.timezone,
    updatedAt: payload.current.time ? new Date(payload.current.time) : new Date(),
    location: {
      latitude: requestedLocation.latitude,
      longitude: requestedLocation.longitude,
      label: requestedLocation.label,
    },
    forecast: buildForecast(payload),
    hourly: normalizeHourly(payload),
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
