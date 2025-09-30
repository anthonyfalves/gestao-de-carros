# Sistema de Gestão de Frota — MVP (Primeira Entrega)

Este repositório contém um **MVP Dockerizado** com:
- **Backend**: Node.js + Express + Sequelize (Postgres) + Socket.IO
- **Frontend**: React + Vite
- **Banco**: Postgres 16

## 📦 Como executar (com Docker)

> Pré-requisitos: Docker e Docker Compose instalados.

```bash
# 1) Dentro da pasta do projeto:
docker compose build

# 2) Subir os serviços
docker compose up -d

# 3) Rodar as migrações e seeds (dentro do container backend)
docker exec -it gf_api npm run db:migrate
docker exec -it gf_api npm run db:seed
```

Acesse o frontend em: **http://localhost:5173**  
API em: **http://localhost:4000**

### 🔐 Usuários iniciais (seeds)
- **admin** | senha: `12345` (vai exigir troca no primeiro login)
- **gestor** | senha: `12345`
- **usuario** | senha: `12345`

> No primeiro acesso, será exigida a troca de senha (conforme documentação).

## 🚀 Funcionalidades do MVP
- Login com **troca de senha obrigatória** no primeiro acesso.
- **Agendamento** de veículos com calendário estilo Airbnb/Booking.
- **Bloqueio de datas** já ocupadas por veículo e **meio período destacado** (AM/PM).
- Gestor agenda **para terceiros** e **atribui motorista** (apenas **nome do motorista** visível ao solicitante).
- **Ticket único** por agendamento.
- **Notificações em tempo real** (Socket.IO).
- **Senhas criptografadas** e **logs de operações críticas**.

## 🧰 Execução local sem Docker (opcional)

### Backend
```bash
cd backend
cp .env.example .env   # ajuste as variáveis se necessário
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📚 Documentação rápida da API
Após subir, consulte `http://localhost:4000/health` e as rotas em `backend/src/routes`.

## 📝 Notas
Este MVP foi desenhado para atender à primeira entrega da documentação enviada.
Relatórios/Auditoria detalhada não fazem parte desta entrega (apenas logs críticos).
