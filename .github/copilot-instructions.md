# Copilot Instructions for AI Agents

## Visão Geral
Este projeto é um MVP dockerizado para gestão de frota, composto por:
- **Backend**: Node.js, Express, Sequelize (Postgres), Socket.IO
- **Frontend**: React + Vite
- **Banco**: Postgres 16

## Estrutura e Fluxos Principais
- Backend está em `backend/src/` com rotas, controllers, models, middleware e serviços.
- Migrações e seeds do banco ficam em `backend/migrations/` e `backend/seeders/`.
- Frontend está em `frontend/src/` com componentes React e integração via `api.js`.
- Comunicação em tempo real via Socket.IO (`backend/src/services/socket.js`).
- Logs críticos e auditoria básica em `backend/src/utils/logger.js`.

## Convenções e Padrões
- Autenticação JWT, middleware em `backend/src/middleware/auth.js`.
- Troca de senha obrigatória no primeiro login (ver controllers e seeds).
- Agendamento de veículos com bloqueio de datas e períodos (AM/PM) — lógica em `backend/src/controllers/bookings.js` e componentes React.
- Gestores podem agendar para terceiros e atribuir motoristas; apenas o nome do motorista é visível ao solicitante.
- Notificações em tempo real para agendamentos e alterações relevantes.

## Workflows Essenciais
- **Build/Run com Docker:**
  - `docker compose build`
  - `docker compose up -d`
  - Migrações: `docker exec -it gf_api npm run db:migrate`
  - Seeds: `docker exec -it gf_api npm run db:seed`
- **Execução local:**
  - Backend: `npm install && npm run db:migrate && npm run db:seed && npm run dev`
  - Frontend: `npm install && npm run dev`
- **Testes:** Não há testes automatizados implementados neste MVP.

## Integrações e Dependências
- Banco: Postgres 16 (configuração em `.env` e `sequelize.config.mjs`).
- Variáveis de ambiente: copie `.env.example` para `.env` e ajuste conforme necessário.
- Docker Compose orquestra todos os serviços.

## Exemplos de Padrões
- Rotas RESTful em `backend/src/routes/`.
- Controllers desacoplados das rotas.
- Models Sequelize em `backend/src/models/`.
- Frontend consome API via `frontend/src/api.js`.

## Recomendações para Agentes
- Siga os padrões de separação de responsabilidades (controller, service, model, route).
- Use as rotas e controllers existentes como referência para novas features.
- Mantenha a compatibilidade com Docker e variáveis de ambiente.
- Documente endpoints e fluxos relevantes ao alterar ou criar APIs.

---

Se alguma seção estiver incompleta ou pouco clara, peça feedback ao usuário para iterar e melhorar as instruções.
