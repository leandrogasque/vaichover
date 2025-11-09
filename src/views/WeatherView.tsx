import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useWeatherController } from '../controllers/useWeatherController'
import type { HourlyPoint, WeatherReport } from '../models/weather'

type WeatherTheme = 'rain' | 'storm' | 'hot' | 'cold' | 'mild'
type ForecastTheme = 'wet' | 'storm' | 'hot' | 'cold' | 'mild'

const formatTemperature = (value: number) => Math.round(value)

const formatTime = (date: Date, timezone?: string) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone ?? 'UTC',
    }).format(date)
  } catch {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
}

const formatWeekday = (dateStr: string, timezone?: string) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      timeZone: timezone ?? 'UTC',
    })
      .format(new Date(dateStr))
      .replace('.', '')
  } catch {
    return dateStr
  }
}

const formatHourLabel = (dateStr: string, timezone?: string) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone ?? 'UTC',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

const buildRainMessage = (report: WeatherReport) =>
  report.willRain ? 'Sim, leve o guarda-chuva.' : 'Hoje não deve chover.'

const formatLocationLabel = (report: WeatherReport) => {
  if (report.location.label) return report.location.label
  return `Lat ${report.location.latitude.toFixed(2)}, Lon ${report.location.longitude.toFixed(2)}`
}

const HeroParticles = ({ theme }: { theme: WeatherTheme }) => {
  const count = theme === 'storm' ? 10 : theme === 'rain' ? 8 : theme === 'hot' ? 6 : 7
  return (
    <div className="hero-particles" data-theme={theme}>
      {Array.from({ length: count }).map((_, index) => {
        const left = 5 + (index * (90 / count))
        const top = 10 + ((index * 23) % 60)
        return (
          <span
            key={`${theme}-particle-${index}`}
            style={{
              animationDelay: `${index * 0.25}s`,
              left: `${left}%`,
              top: `${top}%`,
            }}
          />
        )
      })}
    </div>
  )
}

const heroIcons: Record<WeatherTheme, ReactNode> = {
  rain: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <linearGradient id="rain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        d="M20 34c0-11 9-20 20-20 8 0 14 4 18 10 8 1 14 8 14 16 0 9-7 16-16 16H22c-7 0-12-5-12-12 0-6 5-11 10-10Z"
        fill="url(#rain)"
      />
      <line x1="24" y1="58" x2="18" y2="72" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" />
      <line x1="38" y1="58" x2="32" y2="74" stroke="#bfdbfe" strokeWidth="4" strokeLinecap="round" />
      <line x1="52" y1="58" x2="48" y2="72" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  storm: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path
        d="M20 34c0-11 9-20 20-20 8 0 14 4 18 10 8 1 14 8 14 16 0 9-7 16-16 16H22c-7 0-12-5-12-12 0-6 5-11 10-10Z"
        fill="#312e81"
      />
      <polyline
        points="34 52 44 52 40 64 50 64 36 78 40 66 30 66 34 52"
        fill="#facc15"
        stroke="#fde047"
        strokeLinejoin="round"
      />
    </svg>
  ),
  hot: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="18" fill="#f97316" />
      <g stroke="#fb923c" strokeWidth="4" strokeLinecap="round">
        <line x1="40" y1="8" x2="40" y2="0" />
        <line x1="40" y1="80" x2="40" y2="72" />
        <line x1="8" y1="40" x2="0" y2="40" />
        <line x1="80" y1="40" x2="72" y2="40" />
        <line x1="12" y1="12" x2="6" y2="6" />
        <line x1="68" y1="68" x2="74" y2="74" />
        <line x1="68" y1="12" x2="74" y2="6" />
        <line x1="12" y1="68" x2="6" y2="74" />
      </g>
    </svg>
  ),
  cold: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="32" r="18" fill="#38bdf8" />
      <path d="M40 50v20" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 66h20" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  mild: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="30" cy="34" r="16" fill="#fde047" />
      <path
        d="M50 30c8 0 14 6 14 14s-6 14-14 14H26c-6 0-10-4-10-10 0-5 3-9 8-10"
        fill="#bfdbfe"
        stroke="#93c5fd"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  ),
}

const detectTheme = (report?: WeatherReport): WeatherTheme => {
  if (!report) return 'mild'
  if (report.willRain && report.rainProbability >= 75) return 'storm'
  if (report.willRain) return 'rain'
  if (report.temperature >= 30) return 'hot'
  if (report.temperature <= 18) return 'cold'
  return 'mild'
}

const detectForecastTheme = (day: WeatherReport['forecast'][number]): ForecastTheme => {
  if (day.precipitationProbability >= 80) return 'storm'
  if (day.precipitationProbability >= 50) return 'wet'
  if (day.maxTemp >= 32) return 'hot'
  if (day.maxTemp <= 20) return 'cold'
  return 'mild'
}

const ForecastIcon = ({ theme }: { theme: ForecastTheme }) => {
  switch (theme) {
    case 'storm':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path
            d="M12 18c0-6 5-10 10-10 4 0 7 2 9 5 4 1 7 4 7 8s-3 7-7 7H13c-3 0-6-2-6-5 0-3 2-5 5-5Z"
            fill="#312e81"
          />
          <polyline
            points="16 24 22 24 20 30 26 30 18 38 20 31 15 31 16 24"
            fill="#fde047"
            stroke="#facc15"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'wet':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M14 17c0-4 3-7 7-7 3 0 5 2 7 4 3 0 5 3 5 6s-3 6-6 6H15c-3 0-5-2-5-4s2-5 4-5Z" fill="#2563eb" />
          <circle cx="14" cy="30" r="3" fill="#93c5fd" />
          <circle cx="22" cy="33" r="2" fill="#bfdbfe" />
          <circle cx="28" cy="29" r="2.5" fill="#93c5fd" />
        </svg>
      )
    case 'hot':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="9" fill="#f97316" />
          <g stroke="#fb923c" strokeWidth="2" strokeLinecap="round">
            <line x1="20" y1="5" x2="20" y2="0" />
            <line x1="20" y1="40" x2="20" y2="35" />
            <line x1="5" y1="20" x2="0" y2="20" />
            <line x1="40" y1="20" x2="35" y2="20" />
            <line x1="7" y1="7" x2="3" y2="3" />
            <line x1="33" y1="33" x2="37" y2="37" />
            <line x1="33" y1="7" x2="37" y2="3" />
            <line x1="7" y1="33" x2="3" y2="37" />
          </g>
        </svg>
      )
    case 'cold':
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="15" r="8" fill="#38bdf8" />
          <path d="M20 22v12" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
          <path d="M14 34h12" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="14" cy="16" r="8" fill="#fde047" />
          <path
            d="M24 14c4 0 7 3 7 7s-3 7-7 7H11c-3 0-5-2-5-5 0-3 2-5 4-5"
            fill="#bfdbfe"
            stroke="#93c5fd"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}

const HourlyChart = ({
  points,
  timezone,
}: {
  points: HourlyPoint[]
  timezone?: string
}) => {
  const data = points.slice(0, 12)
  if (data.length < 2) {
    return null
  }

  const temps = data.map((point) => point.temperature)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const range = Math.max(maxTemp - minTemp, 1)
  const width = 320
  const height = 120

  const tempPoints = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((point.temperature - minTemp) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="hourly-card">
      <div className="hourly-chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendência das próximas horas">
          <polyline className="hourly-temp-line" points={tempPoints} />
          {data.map((point, index) => {
            const barWidth = 12
            const x = (index / (data.length - 1)) * width - barWidth / 2
            const barHeight = (point.precipitationProbability / 100) * height
            return (
              <rect
                key={`bar-${point.time}`}
                className="hourly-rain-bar"
                x={Math.max(0, x)}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                rx={4}
              />
            )
          })}
        </svg>
      </div>
      <div className="hourly-labels">
        {data.map((point) => (
          <div key={point.time}>
            <span>{formatHourLabel(point.time, timezone)}</span>
            <small>{Math.round(point.temperature)}°</small>
          </div>
        ))}
      </div>
    </div>
  )
}

const buildInsight = (report: WeatherReport) => {
  if (report.willRain && report.precipitationSum > 5) {
    return 'Volume consistente de chuva previsto: considere rotas cobertas.'
  }
  if (!report.willRain && report.temperature >= 30) {
    return 'Calor predominante; hidrate-se e use roupas leves.'
  }
  if (!report.willRain && report.temperature <= 18) {
    return 'Amanhecer frio e seco. Camadas extras fazem diferença.'
  }
  if (report.rainProbability > 50) {
    return 'A chuva pode chegar em janelas curtas. Atualize antes de sair.'
  }
  return 'Clima equilibrado. Mantenha o radar ligado caso o vento mude.'
}

const formatConfidence = (value: number) => {
  if (value >= 80) return 'Muito alta'
  if (value >= 50) return 'Moderada'
  return 'Baixa'
}

const Skeleton = () => (
  <div className="skeleton-wrapper" aria-hidden="true">
    <div className="skeleton hero" />
    <div className="skeleton grid" />
  </div>
)

export const WeatherView = () => {
  const {
    state,
    refresh,
    isLoading,
    searchWeather,
    selectSavedLocation,
    history,
    preferences,
    updatePreferences,
    canNotify,
    notificationPermission,
    requestNotificationPermission,
  } = useWeatherController()
  const { report, error, status } = state
  const [query, setQuery] = useState('')

  const theme = useMemo(() => detectTheme(report), [report])
  const statusElement = useMemo(() => {
    if (status === 'idle' || status === 'loading') {
      return (
        <p className="status-message">
          {status === 'idle'
            ? 'Buscando sua localização...'
            : 'Consultando a previsão mais recente...'}
        </p>
      )
    }

    if (status === 'error' && error) {
      return (
        <p className="status-message error" role="alert">
          {error.message}
        </p>
      )
    }

    if (status === 'success' && report) {
      return (
        <p className="status-message success">
          Última atualização às {formatTime(report.updatedAt, report.timezone)}
        </p>
      )
    }

    return null
  }, [status, error, report])

  const showSkeleton = status === 'loading' && !report

  const feelsLike = useMemo(() => {
    if (!report) return null
    return Math.round(report.temperature + (report.willRain ? -1.5 : 1.5))
  }, [report])

  const canShare = typeof navigator.share === 'function'

  const notificationStatusCopy = useMemo(() => {
    if (!canNotify) return 'Seu navegador não suporta notificações.'
    if (notificationPermission === 'denied') {
      return 'Notificações bloqueadas. Altere nas configurações do navegador para reativar.'
    }
    if (!preferences.enabled) {
      return 'Alertas desativados. Ative para receber aviso quando a chuva passar do limite.'
    }
    if (notificationPermission === 'default') {
      return 'Permita notificações para receber alertas automáticos.'
    }
    return `Alertas ativos: avisaremos quando a chance de chuva passar de ${preferences.threshold}%.`
  }, [canNotify, notificationPermission, preferences.enabled, preferences.threshold])

  const needsPermissionPrompt = error?.code === 'GEO_DENIED'

  const onSubmitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    searchWeather(query)
  }

  const handleShare = async () => {
    if (!report || !canShare) return
    try {
      await navigator.share({
        title: 'Será que vai chover?',
        text: `${report.location.label ?? 'Sua localização'}: ${formatTemperature(
          report.temperature,
        )}°C · ${buildRainMessage(report)}`,
        url: window.location.href,
      })
    } catch {
      // usuário cancelou
    }
  }

  const handleThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    updatePreferences({ threshold: Number(event.target.value) })
  }

  const toggleAlerts = () => {
    updatePreferences({ enabled: !preferences.enabled })
  }

  const handleNotificationPermission = () => {
    requestNotificationPermission()
  }

  return (
    <>
      <form className="search-bar" onSubmit={onSubmitSearch}>
        <input
          type="search"
          name="city"
          className="search-input"
          placeholder="Digite uma cidade (ex.: Recife)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Pesquisar outra cidade"
        />
        <button type="submit" className="search-button" disabled={isLoading}>
          Buscar
        </button>
      </form>

      {history.length > 0 && (
        <div className="history-chips">
          <span>Cidades recentes:</span>
          <div className="chip-list">
            {history.map((item) => (
              <button
                key={item.label}
                type="button"
                className="history-chip"
                onClick={() => selectSavedLocation(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsPermissionPrompt && (
        <div className="permission-banner" role="alert">
          <div>
            <strong>Ative sua localização</strong>
            <p>
              O navegador bloqueou o GPS. Toque em “Permitir localização” ou selecione uma cidade
              recente para habilitar previsões hiperlocais.
            </p>
          </div>
          <button type="button" onClick={refresh}>
            Permitir localização
          </button>
        </div>
      )}

      {canNotify && (
        <section className="alerts-card">
          <header>
            <p>Alertas inteligentes</p>
            <span>Receba avisos quando a probabilidade de chuva atingir seu limite.</span>
          </header>
          <label className="slider-label">
            <span>Probabilidade mínima: {preferences.threshold}%</span>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={preferences.threshold}
              onChange={handleThresholdChange}
            />
          </label>
          <div className="alerts-controls">
            <button
              type="button"
              className="secondary-button"
              data-state={preferences.enabled ? 'active' : 'inactive'}
              onClick={toggleAlerts}
            >
              {preferences.enabled ? 'Desativar alertas' : 'Ativar alertas'}
            </button>
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                className="secondary-button outline"
                onClick={handleNotificationPermission}
              >
                Permitir notificações
              </button>
            )}
          </div>
          <small className="alerts-status">{notificationStatusCopy}</small>
        </section>
      )}

      <section className="status">{statusElement}</section>

      {showSkeleton && <Skeleton />}

      {report && (
        <>
          <section className="weather-hero" data-theme={theme}>
            <div className="hero-gradient" aria-hidden="true" />
            <div className="hero-wave" aria-hidden="true" />
            <HeroParticles theme={theme} />
            <div className="hero-icon">{heroIcons[theme]}</div>

            <div className="hero-info">
              <p className="location-chip">{formatLocationLabel(report)}</p>
              <p className="temperature">
                <span>{formatTemperature(report.temperature)}</span>
                <sup>&deg;C</sup>
              </p>

              <p className="rain-message">{buildRainMessage(report)}</p>

              <div className="probability-pill">
                <span>Probabilidade</span>
                <strong>{Math.round(report.rainProbability)}%</strong>
              </div>

              <p className="hero-insight">{buildInsight(report)}</p>
            </div>
          </section>

          <section className="meta-grid">
            <article className="meta-card" data-variant="rain">
              <header>
                <span>Acumulado previsto</span>
                <strong>{report.precipitationSum.toFixed(1)} mm</strong>
              </header>
              <p>
                Valores acima de 5&nbsp;mm indicam chuva perceptível durante boa parte do dia.
              </p>
            </article>

            <article className="meta-card" data-variant="confidence">
              <header>
                <span>Confiança do modelo</span>
                <strong>{formatConfidence(report.rainProbability)}</strong>
              </header>
              <p>Open-Meteo cruza modelos globais para gerar este score em tempo real.</p>
            </article>

            <article className="meta-card" data-variant="feel">
              <header>
                <span>Sensação estimada</span>
                <strong>{feelsLike !== null ? `${feelsLike}\u00B0C` : '--'}</strong>
              </header>
              <p>Considera a combinação de umidade e tendência de vento para ajustes rápidos.</p>
            </article>
          </section>

          {report.hourly.length > 0 && (
            <section className="hourly-section">
              <header>
                <p>Próximas horas</p>
                <span>Temperatura e chance de chuva ao longo das próximas 12 horas.</span>
              </header>
              <HourlyChart points={report.hourly} timezone={report.timezone} />
            </section>
          )}

          {report.forecast.length > 0 && (
            <section className="forecast-section">
              <header>
                <p>Próximos dias</p>
                <span>Atualize antes de sair para validar a última projeção.</span>
              </header>
              <div className="forecast-cards">
                {report.forecast.map((day, index) => {
                  const dayTheme = detectForecastTheme(day)
                  return (
                    <article
                      key={day.date}
                      className="forecast-card"
                      data-theme={dayTheme}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="forecast-card__top">
                        <div>
                          <p className="forecast-day">{formatWeekday(day.date, report.timezone)}</p>
                          <p className="forecast-temp">
                            <span>{Math.round(day.maxTemp)}°</span>
                            <small>{Math.round(day.minTemp)}°</small>
                          </p>
                        </div>
                        <div className="forecast-icon">
                          <ForecastIcon theme={dayTheme} />
                        </div>
                      </div>

                      <p className="forecast-prob">
                        Chuva {Math.round(day.precipitationProbability)}%
                      </p>
                      <div className="forecast-bar">
                        <span
                          style={{
                            width: `${Math.min(100, Math.round(day.precipitationProbability))}%`,
                          }}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <div className="actions-row">
        <button
          type="button"
          className="refresh-button"
          onClick={refresh}
          disabled={isLoading}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar agora'}
        </button>
        {canShare && report && (
          <button type="button" className="secondary-button" onClick={handleShare}>
            Compartilhar previsão
          </button>
        )}
      </div>

      {status === 'error' && error && (
        <div className="toast" role="alert">
          <strong>Algo bloqueou a leitura.</strong>
          <span>{error.message}</span>
        </div>
      )}
    </>
  )
}
