# Será que vai chover?

Aplicação web responsiva construída com React 19 + Vite + TypeScript para responder rapidamente se você precisa sair com guarda-chuva. O app identifica automaticamente sua localização, consulta dados gratuitos da [Open-Meteo](https://open-meteo.com/) e apresenta um painel hiperlocal, com alertas inteligentes e suporte a PWA/offline.

## Principais recursos

- **Previsão hiperlocal:** leitura atual com temperatura, mensagem contextual, probabilidade de chuva e métricas detalhadas.
- **Busca manual e histórico:** pesquise outras cidades e reutilize consultas recentes com um toque abaixo do cartão principal.
- **Linha do tempo de 12 horas:** gráfico em barras destaca variações de temperatura e chance de chuva a cada hora.
- **Indicadores ambientais:** cards exibem umidade relativa e velocidade/rajadas de vento da última leitura.
- **Próximos dias sem duplicar hoje:** a seção ignora o dia já exibido no herói, mantendo apenas os próximos cinco dias úteis.
- **Alertas inteligentes + Web Push:** defina limiar de probabilidade, configure quiet hours e habilite push com cadastro automático.
- **PWA e cache offline:** workbox armazena API e assets essenciais; funciona sem rede após o primeiro carregamento.

## Arquitetura em camadas

| Camada | Responsabilidade |
| ------ | ---------------- |
| `src/models/weather.ts` | Tipos compartilhados (relatórios, pontos horários, erros) e constantes de negócio. |
| `src/services/weatherService.ts` | Integração com Open-Meteo: monta URLs, normaliza respostas, filtra dias passados e transforma dados por fuso. |
| `src/services/locationService.ts` | Reverse geocoding (BigDataCloud) e busca de cidades (Open-Meteo Geocoding). |
| `src/controllers/useWeatherController.ts` | Hook que orquestra geolocalização, histórico, preferências, alertas locais e fluxo de push. |
| `src/views/WeatherView.tsx` | UI declarativa do painel (hero, busca, gráficos, forecast, ações). |
| `api/_firebaseAdmin.ts`, `api/register-token.ts`, `api/send-notification.ts` | Funções serverless (Vercel) para registrar tokens e disparar notificações via Firebase Admin. |

## Executando localmente

```bash
npm install
npm run dev        # ambiente de desenvolvimento com HMR
npm run build      # validação TypeScript + bundle de produção
npm run preview    # servidor que inspeciona o build produzido
```

O app roda em [http://localhost:5173](http://localhost:5173). Para que a geolocalização funcione em produção, publique sob HTTPS; em desenvolvimento, o navegador pode pedir permissão explícita.

## Notificações push

1. Crie um projeto Firebase e habilite Cloud Messaging.
2. Preencha as variáveis `VITE_FIREBASE_*`, `VITE_PUSH_PUBLIC_KEY` e `FIREBASE_SERVICE_ACCOUNT` (JSON da service account) no `.env`/Vercel.
3. Ao ativar push no app, o token é salvo automaticamente pelo endpoint `POST /api/register-token` (Firestore em `pushSubscribers`).
4. Para remover, o botão "Cancelar push" chama `DELETE /api/register-token`.
5. Use `POST /api/send-notification` para disparar alertas:

```json
{
  "token": "TOKEN_SALVO",
  "title": "Alerta de chuva",
  "body": "70% de chance nas próximas horas",
  "url": "https://seu-dominio.com/"
}
```

O service worker (`public/custom-sw.js`) recebe a mensagem e abre o app ao tocar na notificação.

## Observações úteis

- Geolocalização exige HTTPS e pode ser recusada; o app oferece estados de erro amigáveis e fallback por busca manual.
- Alertas locais respeitam quiet hours e cooldown para evitar spam.
- O PWA armazena a última leitura; para forçar novas versões em desenvolvimento, desabilite/limpe o service worker antes de validar mudanças.
