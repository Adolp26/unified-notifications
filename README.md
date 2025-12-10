# Unified Notifications

> Sistema de notificações multi-canal escalável com filas, retry automático e cobertura de testes


[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Sobre o Projeto

Sistema de notificações multi-canal para **aprender arquitetura de software escalável na prática**.

### Motivação

Todo sistema precisa se comunicar com usuários - confirmação de pedido, código de autenticação, lembrete de reunião. Este projeto explora como construir isso do zero, cobrindo:

- Processamento assíncrono sem bloquear a aplicação
- Garantia de entrega com retry automático
- Templates reutilizáveis e dinâmicos
- Código testável e escalável

### O que contém

-  Envio de emails com templates customizáveis (Handlebars)
-  Processamento assíncrono com filas (Bull + Redis)
-  Retry automático com backoff exponencial
-  Priorização de mensagens (high/normal/low)
-  Agendamento de notificações
-  94% de cobertura de testes

### Conceitos Aplicados

**Arquitetura**
- Processamento assíncrono com filas (Bull + Redis)
- Event-driven architecture
- Separação de responsabilidades (API, Queue, Workers)
- Factory Pattern para registro de canais

**Resiliência**
- Retry com backoff exponencial (2s → 4s → 8s)
- Dead letter queues
- Graceful shutdown

**Qualidade**
- 70+ testes (unitários + integração)
- TypeScript strict mode
- 94% de cobertura

---

##  Preview

### Dashboard de Templates
```json
GET /api/v1/templates
{
  "templates": [
    {
      "name": "welcome_email",
      "channel": "email",
      "subject": "Bem-vindo, {{upper name}}!",
      "variables": ["name", "code", "expires_at"]
    }
  ]
}
```

### Monitoramento da Fila em Tempo Real
```json
GET /api/v1/notifications/stats
{
  "waiting": 5,      // Aguardando processamento
  "active": 2,       // Sendo processados agora
  "completed": 150,  // Enviados com sucesso
  "failed": 3,       // Falharam após 3 tentativas
  "delayed": 10      // Agendados para o futuro
}
```

### Status de Job Individual
```json
GET /api/v1/notifications/jobs/1
{
  "jobId": "1",
  "state": "completed",
  "progress": 100,
  "attemptsMade": 1,
  "processedOn": 1705318200000
}
```

---

## Quick Start (5 minutos)

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- Git

### Instalação Rápida

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/unified-notifications.git
cd unified-notifications

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais SMTP

# 4. Subir infraestrutura (PostgreSQL + Redis)
docker-compose up -d

# 5. Rodar migrations
npm run migration:run

# 6. Iniciar aplicação (API + Worker)
npm run dev:all
```

✅ **Pronto!** A API está rodando em `http://localhost:3000`

### 🚀 Teste Rápido

```bash
# 1. Criar um template
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "channel": "email",
    "subject": "Bem-vindo, {{name}}!",
    "body": "<h1>Olá {{name}}</h1><p>Obrigado por se cadastrar!</p>",
    "variables": ["name"]
  }'

# 2. Enviar notificação
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome_email",
    "recipient": {
      "email": "usuario@example.com",
      "name": "João Silva"
    },
    "data": {
      "name": "João Silva"
    }
  }'

# 3. Verificar status
curl http://localhost:3000/api/v1/notifications/stats
```

---

## Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   API       │─────▶│   Queue      │─────▶│   Workers   │
│  (Express)  │      │  (Bull/Redis)│      │  (Email)    │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                      │
       ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                     PostgreSQL                           │
│         (templates, notifications, delivery_logs)        │
└─────────────────────────────────────────────────────────┘
```

### Fluxo

1. Cliente → `POST /api/v1/notifications`
2. API valida e adiciona job na fila Redis
3. Worker processa job assincronamente
4. Template engine renderiza variáveis
5. Email channel envia via SMTP
6. Resultado registrado no banco

### Decisões Técnicas

**API separada dos Workers**: Resposta rápida ao cliente, processamento em background

**Bull + Redis**: Jobs persistidos, retry automático, priorização nativa

**Templates (Handlebars)**: Reutilização, lógica condicional sem alterar código

**PostgreSQL + Redis**: Dados estruturados no Postgres, jobs voláteis no Redis

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js 20 + TypeScript + Express |
| **Queue** | Bull + Redis |
| **Database** | PostgreSQL 15 + TypeORM |
| **Templates** | Handlebars |
| **Email** | Nodemailer |
| **Testing** | Jest + Supertest (94% coverage) |
| **DevOps** | Docker + Docker Compose |

---

## O que o Sistema Contém

| Feature | Descrição |
|---------|-----------|
| **Templates Dinâmicos** | Handlebars com variáveis, helpers e condicionais |
| **Email Channel** | SMTP via Nodemailer com pool de conexões |
| **Queue System** | Bull + Redis para processamento assíncrono |
| **Retry Automático** | Backoff exponencial (2s → 4s → 8s, 3 tentativas) |
| **Priorização** | high/normal/low |
| **Agendamento** | Envio em data/hora específica |
| **Type-Safety** | TypeScript strict mode |
| **Testes** | 70+ testes, 94% coverage |

### Roadmap

**Fase 2: Observabilidade**
- [ ] API Keys e rate limiting
- [ ] Delivery logs completos
- [ ] Logs estruturados (Winston)
- [ ] Métricas (Prometheus)

**Fase 3: Multi-Canal**
- [ ] SMS (Twilio)
- [ ] Push Notifications (Firebase)
- [ ] WhatsApp
- [ ] User preferences

**Fase 4: Avançado**
- [ ] Dashboard administrativo
- [ ] Webhooks de status
- [ ] A/B Testing de templates

---

## Documentação da API

### 1. Criar Template

```http
POST /api/v1/templates
Content-Type: application/json
```

```json
{
  "name": "welcome_email",
  "channel": "email",
  "subject": "Bem-vindo, {{upper name}}!",
  "body": "<h1>Olá {{name}}</h1><p>Seu código: <strong>{{code}}</strong></p><p>Expira em: {{formatDate expires_at}}</p>",
  "variables": ["name", "code", "expires_at"]
}
```

**Resposta (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "welcome_email",
  "channel": "email",
  "subject": "Bem-vindo, {{upper name}}!",
  "body": "<h1>Olá {{name}}</h1>...",
  "variables": ["name", "code", "expires_at"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

### 2. Enviar Notificação

```http
POST /api/v1/notifications
Content-Type: application/json
```

```json
{
  "templateName": "welcome_email",
  "recipient": {
    "email": "usuario@example.com",
    "name": "João Silva"
  },
  "data": {
    "code": "ABC123XYZ",
    "expires_at": "2025-01-20"
  },
  "priority": "high",
  "scheduledFor": "2025-01-15T14:00:00Z"
}
```

**Resposta (202 Accepted):**
```json
{
  "jobId": "1",
  "status": "queued",
  "queuedAt": "2025-01-15T10:30:00.000Z"
}
```

### 3. Verificar Status do Job

```http
GET /api/v1/notifications/jobs/:jobId
```

**Resposta:**
```json
{
  "jobId": "1",
  "state": "completed",
  "progress": 100,
  "data": {
    "templateName": "welcome_email",
    "recipient": { "email": "usuario@example.com" }
  },
  "attemptsMade": 1,
  "processedOn": 1705318200000,
  "finishedOn": 1705318201000
}
```

### 4. Estatísticas da Fila

```http
GET /api/v1/notifications/stats
```

**Resposta:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 3,
  "delayed": 10,
  "total": 170
}
```

### 5. Listar Templates

```http
GET /api/v1/templates
```

### 6. Preview de Template

```http
POST /api/v1/templates/:id/preview
Content-Type: application/json
```

```json
{
  "name": "João Silva",
  "code": "ABC123",
  "expires_at": "2025-01-20"
}
```

**Resposta:**
```json
{
  "original": {
    "subject": "Bem-vindo, {{upper name}}!",
    "body": "<h1>Olá {{name}}</h1>..."
  },
  "processed": {
    "subject": "Bem-vindo, JOÃO SILVA!",
    "body": "<h1>Olá João Silva</h1><p>Seu código: ABC123</p>..."
  },
  "missingVariables": []
}
```

---

## Template Engine

### Variáveis Simples
```handlebars
Olá {{name}}, seu email é {{email}}
```

### Helpers Disponíveis

| Helper | Exemplo | Resultado |
|--------|---------|-----------|
| `upper` | `{{upper name}}` | JOÃO SILVA |
| `lower` | `{{lower name}}` | joão silva |
| `formatDate` | `{{formatDate date}}` | 15/01/2025 |
| `truncate` | `{{truncate text 50}}` | Texto longo truncad... |
| `default` | `{{default value "padrão"}}` | Usa valor padrão se vazio |

### Condicionais
```handlebars
{{#if premium}}
  Você é um usuário premium!
{{else}}
  <a href="/upgrade">Faça upgrade para premium</a>
{{/if}}
```

### Loops
```handlebars
<ul>
{{#each items}}
  <li>{{this.name}}: R$ {{this.price}}</li>
{{/each}}
</ul>
```

### Objetos Aninhados
```handlebars
Nome: {{user.name}}
Email: {{user.email}}
Cidade: {{user.address.city}}
```

---

## Testes

```bash
# Rodar todos os testes
npm test

# Testes com watch mode (desenvolvimento)
npm run test:watch

# Coverage report detalhado
npm run test:coverage

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration
```

### Cobertura Atual: 94%+

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
template.service.ts       |   95.23 |    88.88 |     100 |   94.73 |
template-engine.service.ts|   98.50 |    95.45 |     100 |   98.30 |
notification.service.ts   |   96.77 |    90.90 |     100 |   96.55 |
queue.service.ts          |   94.50 |    92.30 |     100 |   94.20 |
email.channel.ts          |   96.80 |    94.10 |     100 |   96.50 |
--------------------------|---------|----------|---------|---------|
All files                 |   94.36 |    92.33 |     100 |   94.86 |
--------------------------|---------|----------|---------|---------|
```

### O que testamos:

- ✅ Validação de templates
- ✅ Processamento de variáveis e helpers
- ✅ Retry com backoff exponencial
- ✅ Priorização de jobs
- ✅ Agendamento de notificações
- ✅ Pool de conexões SMTP
- ✅ Tratamento de erros
- ✅ API endpoints (integração)

---

## Estrutura do Projeto

```
unified-notifications/
├── src/
│   ├── api/                        # Camada HTTP
│   │   ├── routes/
│   │   │   ├── notifications.routes.ts
│   │   │   └── templates.routes.ts
│   │   └── controllers/
│   │       ├── notification.controller.ts
│   │       └── template.controller.ts
│   │
│   ├── core/                       # Lógica de negócio
│   │   ├── notification.service.ts  # Orquestra envios
│   │   ├── queue.service.ts         # Gerencia filas Bull
│   │   └── template-engine.service.ts # Processa templates
│   │
│   ├── channels/                   # Canais de envio
│   │   ├── base.channel.ts          # Interface base
│   │   ├── email.channel.ts         # Nodemailer
│   │   └── channel.factory.ts       # Registro de canais
│   │
│   ├── workers/                    # Processadores assíncronos
│   │   └── notification.worker.ts   # Processa jobs da fila
│   │
│   ├── database/                   # Persistência
│   │   ├── entities/
│   │   │   └── template.entity.ts
│   │   └── migrations/
│   │       └── 1704900000000-CreateTemplatesTable.ts
│   │
│   ├── config/                     # Configurações
│   │   ├── database.config.ts
│   │   ├── queue.config.ts
│   │   └── channels.config.ts
│   │
│   ├── types/                      # TypeScript types
│   │   ├── notification.types.ts
│   │   ├── channel.types.ts
│   │   └── template.types.ts
│   │
│   └── index.ts                    # Entry point
│
├── tests/
│   ├── unit/                       # Testes unitários
│   │   ├── services/
│   │   │   ├── template.service.test.ts
│   │   │   ├── template-engine.service.test.ts
│   │   │   ├── notification.service.test.ts
│   │   │   └── queue.service.test.ts
│   │   └── channels/
│   │       └── email.channel.test.ts
│   │
│   └── integration/                # Testes de integração
│       └── api/
│           └── template.routes.test.ts
│
├── docker-compose.yml              # Dev environment
├── Dockerfile                      # Production build
├── .env.example                    # Template de variáveis
├── tsconfig.json                   # TypeScript config
├── jest.config.js                  # Jest config
├── package.json
└── README.md
```

---

## Configuração

### Variáveis de Ambiente

```bash
# Server
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notifications

REDIS_URL=redis://localhost:6379

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-app-password  # Use App Password do Gmail!

EMAIL_FROM_NAME=Unified Notifications
EMAIL_FROM_ADDRESS=noreply@yourapp.com
```

**Gmail**: Ative 2FA e gere App Password em https://myaccount.google.com/apppasswords

---

## Comandos

```bash
# Desenvolvimento
npm run dev:all          # API + Worker

# Build
npm run build
npm start

# Database
npm run migration:run

# Testes
npm test
npm run test:coverage

# Qualidade
npm run lint
npm run format
```

---

## Docker

```bash
# Iniciar PostgreSQL + Redis
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down

# Acessar PostgreSQL
docker exec -it notifications-db psql -U postgres -d notifications

# Acessar Redis
docker exec -it notifications-redis redis-cli
```

---

## Schema

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```



##  Conhecimentos Desenvolvidos

Este projeto foi criado para aprender e aplicar:

### Arquitetura & Design
- Implementação de **processamento assíncrono robusto** com filas
- **Event-driven architecture** na prática
- **Separação de responsabilidades** (API, Queue, Workers)
- **Factory Pattern** para registro de canais

### Resiliência & Confiabilidade
- **Retry com backoff exponencial**
- **Dead letter queues** (jobs que falharam definitivamente)
- **Graceful shutdown** (finalizar jobs antes de desligar)
- **Circuit breaker** pattern (roadmap)

### Testing & Quality
- Estratégias para testar **workers assíncronos**
- **Testes de integração** com banco real
- **Mocks e stubs** para SMTP
- Alcançar **94%+ de cobertura** de forma efetiva

### TypeScript
- **Generics** para type-safe channels
- **Utility types** (Pick, Omit, Partial)
- **Strict mode** na prática
- **Decorators** (TypeORM entities)

### DevOps & Infra
- **Docker multi-stage builds**
- **Docker Compose** para ambientes de desenvolvimento
- **Health checks** e observabilidade
- **Migrations** versionadas com TypeORM

---

## Troubleshooting

**Worker não processa jobs**
```bash
docker-compose ps  # Verificar se Redis está rodando
docker-compose logs redis
redis-cli ping  # Deve retornar PONG
```

**Emails não enviados**
```bash
cat .env | grep SMTP  # Verificar credenciais
docker-compose logs worker  # Ver erros
```

**Erro de conexão com banco**
```bash
docker-compose down -v  # Limpar tudo
docker-compose up -d
npm run migration:run
```