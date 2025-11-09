export interface GeoPoint {
  latitude: number
  longitude: number
  label?: string
}

export interface WeatherReport {
  temperature: number
  rainProbability: number
  precipitationSum: number
  willRain: boolean
  timezone: string
  updatedAt: Date
  location: GeoPoint
  forecast: DailyForecast[]
}

export interface WeatherError {
  code: 'GEO_DENIED' | 'GEO_UNAVAILABLE' | 'NETWORK' | 'UNKNOWN'
  message: string
}

export interface WeatherState {
  status: 'idle' | 'loading' | 'success' | 'error'
  report?: WeatherReport
  error?: WeatherError
}

export const RAIN_THRESHOLD = 40

export interface DailyForecast {
  date: string
  minTemp: number
  maxTemp: number
  precipitationProbability: number
  willRain: boolean
}
