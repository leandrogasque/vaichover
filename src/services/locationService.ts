const BIG_DATA_CLOUD_ENDPOINT =
  'https://api.bigdatacloud.net/data/reverse-geocode-client'
const OPEN_METEO_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'

interface BigDataCloudResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

interface OpenMeteoSearchResponse {
  results?: Array<{
    id: number
    name: string
    latitude: number
    longitude: number
    country?: string
    country_code?: string
    admin1?: string
    admin2?: string
  }>
}

export interface CitySuggestion {
  id: number
  name: string
  latitude: number
  longitude: number
  admin1?: string
  admin2?: string
  country?: string
  country_code?: string
}

const formatReverseLabel = (payload: BigDataCloudResponse) => {
  const primary = payload.locality || payload.city
  const parts = [primary, payload.principalSubdivision, payload.countryName]
  return parts.filter(Boolean).join(', ')
}

export const formatCitySuggestionLabel = (city: CitySuggestion) => {
  const extras = [city.admin1, city.country ?? city.country_code]
  return [city.name, ...extras].filter(Boolean).join(', ')
}

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string | undefined> => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    localityLanguage: 'pt',
  })

  try {
    const response = await fetch(`${BIG_DATA_CLOUD_ENDPOINT}?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return undefined
    }

    const data = (await response.json()) as BigDataCloudResponse
    const label = formatReverseLabel(data)
    return label || undefined
  } catch {
    return undefined
  }
}

export const searchCities = async (query: string): Promise<CitySuggestion[]> => {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({
    name: trimmed,
    count: '5',
    language: 'pt',
  })

  const response = await fetch(`${OPEN_METEO_GEOCODING}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Não foi possível buscar essa cidade agora.')
  }

  const payload = (await response.json()) as OpenMeteoSearchResponse
  return (
    payload.results?.map((item) => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      admin1: item.admin1,
      admin2: item.admin2,
      country: item.country,
      country_code: item.country_code,
    })) ?? []
  )
}
