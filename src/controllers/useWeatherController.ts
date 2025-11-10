import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteToken, getToken } from 'firebase/messaging'
import type { WeatherError, WeatherReport, WeatherState } from '../models/weather'
import { fetchWeatherByCoords } from '../services/weatherService'
import {
  formatCitySuggestionLabel,
  reverseGeocode,
  searchCities,
} from '../services/locationService'
import { getFirebaseMessaging } from '../lib/firebase'

interface SavedLocation {
  label: string
  latitude: number
  longitude: number
}

type TemperatureUnit = 'celsius' | 'fahrenheit'

const HISTORY_KEY = 'vaichover.history'
const PREF_KEY = 'vaichover.alertPrefs'
const HISTORY_LIMIT = 5
const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000
const pushPublicKey = import.meta.env.VITE_PUSH_PUBLIC_KEY

interface AlertPreferences {
  enabled: boolean
  threshold: number
  lastNotifiedAt?: string
  unit: TemperatureUnit
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

const DEFAULT_PREFS: AlertPreferences = {
  enabled: false,
  threshold: 60,
  unit: 'celsius',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
}

const firebaseEnvReady =
  typeof import.meta.env !== 'undefined' &&
  Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  )

const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator
const pushConfigured = Boolean(pushPublicKey && firebaseEnvReady)

const readHistory = (): SavedLocation[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SavedLocation =>
        typeof entry?.label === 'string' &&
        typeof entry?.latitude === 'number' &&
        typeof entry?.longitude === 'number',
    )
  } catch {
    return []
  }
}

const writeHistory = (entries: SavedLocation[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // ignore quota/storage errors silently
  }
}

const readPreferences = (): AlertPreferences => {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PREFS,
      ...parsed,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

const writePreferences = (prefs: AlertPreferences) => {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

const mapGeoError = (error: GeolocationPositionError): WeatherError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'GEO_DENIED',
        message:
          'Permissão de localização negada. Ative o GPS ou selecione uma cidade manualmente.',
      }
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'GEO_UNAVAILABLE',
        message: 'Não foi possível determinar sua localização. Tente novamente em instantes.',
      }
    case error.TIMEOUT:
    default:
      return {
        code: 'UNKNOWN',
        message: 'A consulta demorou mais do que o esperado. Tente novamente mais tarde.',
      }
  }
}

const mergeReportLabel = (report: WeatherReport, label?: string): WeatherReport => {
  if (!label) return report
  return {
    ...report,
    location: {
      ...report.location,
      label,
    },
  }
}

const convertTemperature = (value: number, unit: TemperatureUnit) =>
  unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value

const isWithinQuietHours = (prefs: AlertPreferences, reference = new Date()) => {
  if (!prefs.quietHoursEnabled) return false
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const start = toMinutes(prefs.quietHoursStart)
  const end = toMinutes(prefs.quietHoursEnd)
  const current = reference.getHours() * 60 + reference.getMinutes()

  if (start <= end) {
    return current >= start && current < end
  }
  return current >= start || current < end
}

export const useWeatherController = () => {
  const [state, setState] = useState<WeatherState>({ status: 'idle' })
  const [history, setHistory] = useState<SavedLocation[]>(() => readHistory())
  const [preferences, setPreferences] = useState<AlertPreferences>(() => readPreferences())
  const canNotify = useMemo(() => typeof window !== 'undefined' && 'Notification' in window, [])
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    canNotify ? Notification.permission : 'default',
  )
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'error'>(
    'idle',
  )

  const syncPushToken = useCallback(async (token: string, action: 'register' | 'unregister') => {
    if (!token) return
    try {
      await fetch('/api/register-token', {
        method: action === 'register' ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
    } catch {
      // best effort
    }
  }, [])

  const persistHistory = useCallback((entry: SavedLocation) => {
    setHistory((current) => {
      const filtered = current.filter((item) => item.label !== entry.label)
      const updated = [entry, ...filtered].slice(0, HISTORY_LIMIT)
      writeHistory(updated)
      return updated
    })
  }, [])

  useEffect(() => {
    if (!pushSupported || !pushConfigured) return
    const fetchExistingToken = async () => {
      try {
        const messaging = getFirebaseMessaging()
        if (!messaging) return
        const registration = await navigator.serviceWorker.ready
        const token = await getToken(messaging, {
          vapidKey: pushPublicKey || undefined,
          serviceWorkerRegistration: registration,
        })
        if (token) {
          setPushToken(token)
          setPushStatus('subscribed')
          await syncPushToken(token, 'register')
        }
      } catch {
        // ignore
      }
    }
    fetchExistingToken().catch(() => undefined)
  }, [syncPushToken])

  const updatePreferences = useCallback((partial: Partial<AlertPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...partial }
      writePreferences(next)
      return next
    })
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (!canNotify) return 'default'
    try {
      const result = await Notification.requestPermission()
      setNotificationPermission(result)
      return result
    } catch {
      return notificationPermission
    }
  }, [canNotify, notificationPermission])

  const subscribePush = useCallback(async () => {
    if (!pushSupported || !pushConfigured) {
      setPushStatus('error')
      throw new Error('Push nao suportado ou VAPID nao configurado.')
    }
    setPushStatus('subscribing')
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      setPushStatus('error')
      throw new Error('Permissao de notificacao negada.')
    }
    try {
      const messaging = getFirebaseMessaging()
      if (!messaging) {
        throw new Error('Firebase Messaging nao pode ser inicializado.')
      }
      const registration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey: pushPublicKey || undefined,
        serviceWorkerRegistration: registration,
      })
      if (!token) {
        throw new Error('Nao foi possivel gerar o token do Firebase.')
      }
      setPushToken(token)
      setPushStatus('subscribed')
      await syncPushToken(token, 'register')
      return token
    } catch (error) {
      setPushStatus('error')
      throw error
    }
  }, [requestNotificationPermission, syncPushToken])

  const unsubscribePush = useCallback(async () => {
    if (!pushSupported) return
    try {
      const messaging = getFirebaseMessaging()
      const currentToken = pushToken
      if (messaging) {
        await deleteToken(messaging)
      }
      if (currentToken) {
        await syncPushToken(currentToken, 'unregister')
      }
      setPushToken(null)
      setPushStatus('idle')
    } catch (error) {
      setPushStatus('error')
      throw error
    }
  }, [pushToken, syncPushToken])

  const maybeSendNotification = useCallback(
    (report: WeatherReport, prefs: AlertPreferences) => {
      if (!prefs.enabled || !canNotify || notificationPermission !== 'granted') return
      if (report.rainProbability < prefs.threshold) return
      if (isWithinQuietHours(prefs)) return
      const now = Date.now()
      const last = prefs.lastNotifiedAt ? new Date(prefs.lastNotifiedAt).getTime() : 0
      if (now - last < NOTIFY_COOLDOWN_MS) return

      try {
        const unitSymbol = prefs.unit === 'fahrenheit' ? '°F' : '°C'
        const tempValue = Math.round(convertTemperature(report.temperature, prefs.unit))
        const body = `${report.location.label ?? 'Sua localização'} · ${tempValue}${unitSymbol} · ${Math.round(
          report.rainProbability,
        )}% de chance de chuva`
        new Notification('Vai chover nas próximas horas?', { body })
        updatePreferences({ lastNotifiedAt: new Date().toISOString() })
      } catch {
        // Notification instantiation pode falhar em alguns navegadores
      }
    },
    [canNotify, notificationPermission, updatePreferences],
  )

  const handleSuccess = useCallback(
    (report: WeatherReport) => {
      setState({ status: 'success', report })
      if (report.location.label) {
        persistHistory({
          label: report.location.label,
          latitude: report.location.latitude,
          longitude: report.location.longitude,
        })
      }
      maybeSendNotification(report, preferences)
    },
    [persistHistory, maybeSendNotification, preferences],
  )

  const loadWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: 'error',
        error: {
          code: 'GEO_UNAVAILABLE',
          message:
            'Seu dispositivo não oferece geolocalização. Digite ou escolha a cidade manualmente.',
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

          const enrichedReport = mergeReportLabel(report, label)
          handleSuccess(enrichedReport)
        } catch (error) {
          setState({
            status: 'error',
            error: {
              code: 'NETWORK',
              message:
                error instanceof Error ? error.message : 'Não foi possível buscar o clima agora.',
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
  }, [handleSuccess])

  const searchWeather = useCallback(
    async (query: string) => {
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
        handleSuccess(mergeReportLabel(report, label))
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
    },
    [handleSuccess],
  )

  const selectSavedLocation = useCallback(
    async (entry: SavedLocation) => {
      setState({ status: 'loading' })
      try {
        const report = await fetchWeatherByCoords(entry.latitude, entry.longitude, entry.label)
        handleSuccess(report)
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
    },
    [handleSuccess],
  )

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  return {
    state,
    isLoading: state.status === 'loading',
    refresh: loadWeather,
    searchWeather,
    selectSavedLocation,
    history,
    preferences,
    updatePreferences,
    canNotify,
    notificationPermission,
    requestNotificationPermission,
    pushSupported,
    pushConfigured,
    pushStatus,
    pushToken,
    subscribePush,
    unsubscribePush,
  }
}





