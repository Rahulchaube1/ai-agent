# FlowForge

**Next-generation visual workflow automation platform with AI-native capabilities.**

FlowForge is an open-core workflow automation platform that competes with n8n, Zapier, and Make. It combines a powerful DAG-based execution engine with a visual node editor, a flexible plugin system, and first-class AI features — all designed for teams that need enterprise-grade reliability without sacrificing developer experience.

---

## Architecture

```
                           FlowForge — High-Level Architecture

  +---------------------------+        +----------------------------+
  |        Frontend           |        |       Admin Dashboard      |
  |    (React + Vite + TS)    |        |      (React + Vite)        |
  |                           |        |                            |
  |  - Visual Node Editor     |        |  - User & Org Management  |
  |  - Workflow Dashboard     |        |  - System Monitoring       |
  |  - Execution Logs         |        |  - Audit Logs              |
  +------------+--------------+        +-------------+--------------+
               |                                     |
               +------------------+------------------+
                                  |
                                  v
                  +-------------------------------+
                  |         API Gateway           |
                  |          (NestJS)             |
                  |                               |
                  |  - REST & GraphQL endpoints   |
                  |  - Auth (JWT + RBAC)          |
                  |  - Rate limiting              |
                  |  - Request validation         |
                  +------+---------------+--------+
                         |               |
              +----------+               +----------+
              v                                     v
  +-----------------------+           +---------------------------+
  |   Execution Engine    |           |     Plugin Registry       |
  |                       |           |                           |
  |  - DAG scheduler      |           |  - Built-in integrations  |
  |  - Dependency solver  |           |  - Community plugins      |
  |  - Retry / backoff    |           |  - Sandboxed runtime      |
  |  - Error propagation  |           +---------------------------+
  +----------+------------+
             |
             v
  +-----------------------+           +---------------------------+
  |       Workers         |<--------->|       Redis Queue         |
  |                       |           |      (BullMQ)             |
  |  - Node executors     |           |                           |
  |  - AI task runners    |           |  - Job scheduling         |
  |  - Webhook handlers   |           |  - Pub/Sub events         |
  |  - Sandboxed scripts  |           |  - Caching layer          |
  +-----------------------+           +---------------------------+
             |
             v
  +---------------------------+
  |       PostgreSQL          |
  |                           |
  |  - Workflows & versions   |
  |  - Execution history      |
  |  - Users & organizations  |
  |  - Credentials vault      |
  +---------------------------+
```

---

## Features

### Core Platform
- **Visual Node Editor** — drag-and-drop workflow builder with real-time preview and auto-layout
- **DAG-Based Execution Engine** — deterministic scheduling with dependency resolution, parallel branches, and conditional routing
- **200+ Integrations** — pre-built connectors for SaaS tools, databases, APIs, and file systems
- **Plugin System** — extend the platform with custom nodes, triggers, and credential types
- **Version Control** — full workflow versioning with diff, rollback, and branch support

### AI-Native
- **AI Node** — call any LLM (OpenAI, Anthropic, local models) as a workflow step
- **Natural Language Workflow Builder** — describe a workflow in plain English and let AI scaffold it
- **Smart Error Recovery** — AI-assisted suggestions when a node fails
- **Data Mapper Copilot** — AI that auto-maps fields between nodes

### Enterprise
- **Multi-Tenancy** — full organization and workspace isolation
- **RBAC & SSO** — role-based access control with SAML/OIDC single sign-on
- **Audit Logging** — immutable record of every action for compliance
- **High Availability** — horizontally scalable workers and stateless API servers
- **Encrypted Credential Vault** — AES-256 encrypted storage for third-party secrets

---

## Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Frontend           | React 19, TypeScript, Vite, TailwindCSS, Zustand |
| Node Editor        | React Flow, custom node renderers                |
| API Gateway        | NestJS, TypeScript, GraphQL (Code-First)         |
| Execution Engine   | Custom DAG scheduler (TypeScript)                |
| Job Queue          | BullMQ + Redis                                   |
| Database           | PostgreSQL 16, Prisma ORM                        |
| Auth               | Passport.js, JWT, RBAC                           |
| Infrastructure     | Docker, Docker Compose, Kubernetes (Helm)        |
| CI/CD              | GitHub Actions                                   |
| Testing            | Vitest, Playwright, Supertest                    |

---

## Project Structure

```
flowforge/
  packages/
    api/            # NestJS API gateway and core backend
    engine/         # DAG-based workflow execution engine
    worker/         # Job consumer and node executor processes
    web/            # React frontend and visual node editor
    shared/         # Shared types, utilities, and constants
    plugins/        # Built-in plugin packages
  docker/           # Dockerfiles and compose configuration
  docs/             # Architecture decision records and guides
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- Docker and Docker Compose
- PostgreSQL 16 (or use the provided Docker setup)
- Redis 7+ (or use the provided Docker setup)

### Setup

```bash
# Clone the repository
git clone https://github.com/flowforge/flowforge.git
cd flowforge

# Copy environment variables
cp .env.example .env

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start all packages in development mode
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

---

## Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start all packages in watch mode            |
| `npm run build`      | Build all packages for production           |
| `npm run lint`       | Lint all packages                           |
| `npm run test`       | Run tests across all packages               |
| `npm run typecheck`  | Type-check all packages                     |
| `npm run docker:up`  | Start Docker infrastructure services        |
| `npm run docker:down`| Stop Docker infrastructure services         |
| `npm run db:migrate` | Run database migrations                     |
| `npm run db:seed`    | Seed the database with sample data          |

---

## License

Copyright FlowForge, Inc. All rights reserved.
