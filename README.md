# Será que vai chover?

Aplicação web responsiva criada com React + Vite + TypeScript. Ela identifica automaticamente a localização do usuário (smartphone ou desktop) e consulta a API gratuita da [Open-Meteo](https://open-meteo.com/) para mostrar a temperatura atual e indicar se existe chance real de chuva no dia.

## Stack e arquitetura

- **Vite + React 19 + TypeScript:** renderização rápida, HMR e tipagem segura.
- **Modelo (Model):** `src/models/weather.ts` define os contratos de dados e limites de negócio, enquanto `src/services/weatherService.ts` centraliza a comunicação com a Open-Meteo.
- **Controle (Controller):** `src/controllers/useWeatherController.ts` é um hook que orquestra geolocalização, buscas manuais por cidade, chamadas à API e estado global da tela.
- **Visão (View):** componentes React em `src/views/WeatherView.tsx` e `src/App.tsx` renderizam o cartão com temperatura, mensagem sobre chuva e feedback de status.
- **Camada de estilo:** CSS moderno no escopo do App (`src/App.css` + `src/index.css`) para oferecer UI limpa e responsiva pronta para dispositivos móveis.
- **Busca manual + histórico:** a barra no topo usa o geocoding público da Open-Meteo para localizar cidades e salvar consultas recentes como fallback quando o GPS é negado.
- **Timeline horária e compartilhamento:** um cartão exclusivo mostra a tendência das próximas 12 horas e o botão “Compartilhar previsão” usa a Web Share API para enviar o resumo para outras pessoas.
- **Alertas inteligentes:** defina um limite mínimo de probabilidade e receba notificações quando o app detectar chuva acima do patamar escolhido (requer permissão do navegador).
- **Web Push (opcional):** configure o Firebase Cloud Messaging (`VITE_FIREBASE_*` + `VITE_PUSH_PUBLIC_KEY`) e use o painel para gerar o token FCM que será enviado ao backend.

## Como executar localmente

1. Instale as dependências:  
   ```bash
   npm install
   ```
2. Suba o servidor de desenvolvimento (com HMR):  
   ```bash
   npm run dev
   ```
3. Gere o build de produção (valida o TypeScript e empacota os assets):  
   ```bash
   npm run build
   ```
4. Para inspecionar o build, rode `npm run preview`.

## Observações importantes

- A geolocalização exige conexão segura (`https://`) quando hospedada na web. Ao testar localmente via `npm run dev`, o navegador pode pedir permissão explícita para compartilhar a localização.
- Caso o usuário negue o acesso ou o dispositivo não ofereça GPS, o app mostra mensagens amigáveis e permite tentar novamente ou pesquisar manualmente a cidade desejada.
- A aplicação pode ser instalada como PWA (Adicionar à tela inicial) e mantém os últimos dados no modo offline.
- Alertas funcionam somente após conceder permissão de notificações; caso o navegador bloqueie, libere nas configurações do site.
- Toda a lógica é client-side, utilizando apenas APIs gratuitas, sem necessidade de chaves ou infraestrutura adicional.

## Push remoto (Firebase Cloud Messaging)

1. Gere as chaves Web Push no console do Firebase (Configurações do projeto > Cloud Messaging) e copie o `firebaseConfig` (API key, sender id, etc.).
2. Preencha o `.env` com `VITE_FIREBASE_*` + `VITE_PUSH_PUBLIC_KEY` e reinicie o projeto.
3. No cartão “Alertas Inteligentes”, clique em **Ativar push**. Copie o token FCM exibido no textarea e salve-o no backend.
4. No servidor, use o `firebase-admin` (`messaging().sendToDevice(token, payload)`) para enviar notificações. O `public/custom-sw.js` (com Firebase Messaging) mostra o alerta e abre o app ao toque.
