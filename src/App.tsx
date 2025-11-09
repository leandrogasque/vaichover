import './App.css'
import brandLogo from './assets/logo.svg'
import { WeatherView } from './views/WeatherView'

const App = () => (
  <div className="app-shell">
    <main className="card">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <img src={brandLogo} alt="Será que vai chover? logomarca" loading="lazy" />
          </div>
          <div className="brand-copy">
            <p className="brand-title">Será que vai chover?</p>
            <span className="brand-tagline">Clima hiperlocal em segundos</span>
          </div>
        </div>
        <p className="eyebrow">Radar pessoal de chuva</p>
        <h1>Será que vai chover?</h1>
        <p className="subtitle">
          Um painel hiperlocal que cruza temperatura, tendência e probabilidade para você decidir em
          segundos se precisa sair preparado.
        </p>
        <p className="microcopy">
          Atualize sempre que mudar de bairro ou quiser previsões mais finas. Funciona offline ao
          adicionar à tela inicial.
        </p>
      </header>

      <WeatherView />
    </main>

    <footer>
      <p>
        Criado por Leandro Gasque &amp; Codex · Dados: {' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>
      </p>
    </footer>
  </div>
)

export default App
