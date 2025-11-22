# FocusFlow Technology Stack

## Complete Technology Reference

### Backend Services

#### API Gateway
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Purpose**: Request routing, authentication, rate limiting
- **Key Libraries**:
  - `express` - Web framework
  - `express-rate-limit` - Rate limiting
  - `helmet` - Security headers
  - `cors` - CORS handling
  - `compression` - Response compression

#### Core API Service
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **Purpose**: Business logic, data management
- **Key Libraries**:
  - `express` - Web framework
  - `prisma` - ORM
  - `@prisma/client` - Prisma client
  - `zod` - Schema validation
  - `ioredis` - Redis client
  - `bullmq` - Job queue
  - `winston` - Logging
  - `jsonwebtoken` - JWT handling

#### AI Service
- **Runtime**: Python 3.11+
- **Framework**: FastAPI 0.110+
- **Purpose**: ML/AI features
- **Key Libraries**:
  - `fastapi` - Web framework
  - `uvicorn` - ASGI server
  - `pydantic` - Data validation
  - `transformers` - Hugging Face transformers
  - `torch` - PyTorch (for ML models)
  - `scikit-learn` - ML utilities
  - `spacy` - NLP
  - `sentence-transformers` - Embeddings
  - `openai` - OpenAI API client
  - `numpy` - Numerical computing
  - `pandas` - Data manipulation

#### Analytics Service
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Purpose**: Analytics and insights
- **Key Libraries**:
  - `express` - Web framework
  - `@prisma/client` - Database access
  - `ioredis` - Caching
  - `date-fns` - Date utilities
  - `lodash` - Utilities

#### Worker Service
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Purpose**: Background job processing
- **Key Libraries**:
  - `bullmq` - Job queue
  - `ioredis` - Redis client
  - `node-cron` - Cron scheduling
  - `winston` - Logging

---

### Database & Storage

#### PostgreSQL
- **Version**: 15+
- **Extensions**:
  - TimescaleDB (time-series data)
  - pg_trgm (text search)
  - pg_stat_statements (query stats)
- **Purpose**: Primary data store
- **Connection**: Prisma ORM

#### Redis
- **Version**: 7+
- **Purpose**:
  - Session storage
  - Caching
  - Job queue backend
  - Real-time state
- **Client**: ioredis

---

### Frontend

#### Main Dashboard
- **Framework**: React 18+
- **Language**: TypeScript 5.x
- **Build Tool**: Vite 5.x
- **State Management**: Zustand 4.x
- **Routing**: React Router 6.x
- **UI Framework**: Tailwind CSS 3.x
- **Component Library**: shadcn/ui
- **Charts**: Recharts 2.x
- **Real-time**: Socket.io-client
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod

#### Widgets
- **Framework**: React 18+
- **Build**: Vite (library mode)
- **Styling**: Tailwind CSS
- **Purpose**: Embeddable Cliq widgets

#### UI Components Library
- **Framework**: React 18+
- **Build**: Vite (library mode)
- **Styling**: Tailwind CSS
- **Distribution**: npm package

---

### DevOps & Infrastructure

#### Containerization
- **Docker**: Latest stable
- **Docker Compose**: Latest stable
- **Purpose**: Local development and deployment

#### CI/CD
- **Platform**: GitHub Actions
- **Purpose**: Automated testing and deployment

#### Monitoring (Optional)
- **APM**: New Relic / Datadog
- **Error Tracking**: Sentry
- **Logging**: Winston → ELK Stack
- **Metrics**: Prometheus + Grafana

#### Infrastructure as Code (Optional)
- **Tool**: Terraform
- **Purpose**: Cloud infrastructure management

#### Orchestration (Optional)
- **Platform**: Kubernetes
- **Purpose**: Container orchestration at scale

---

### Development Tools

#### Code Quality
- **Linter**: ESLint 8.x
- **Formatter**: Prettier 3.x
- **Type Checking**: TypeScript
- **Pre-commit**: Husky + lint-staged

#### Testing
- **Unit Testing**: Jest 29.x
- **E2E Testing**: Playwright / Cypress
- **API Testing**: Supertest
- **Coverage**: Istanbul / c8

#### Build Tools
- **Monorepo**: Turborepo / Nx
- **Package Manager**: npm / pnpm
- **Bundler**: Vite (frontend), esbuild (backend)

#### Documentation
- **API Docs**: Swagger/OpenAPI
- **Code Docs**: JSDoc / TypeDoc
- **Architecture**: Mermaid diagrams

---

### Third-Party Services

#### AI/ML
- **OpenAI API**: GPT-4 for advanced features
- **Hugging Face**: Pre-trained models
- **Purpose**: LLM features, embeddings

#### Zoho Integration
- **Zoho Cliq API**: Bot and widget integration
- **Zoho Calendar API**: Calendar sync
- **Zoho CRM API**: (Optional) CRM integration
- **Zoho Projects API**: (Optional) Project tracking

#### Authentication
- **OAuth 2.0**: Zoho OAuth
- **JWT**: Token-based auth
- **Session**: Redis-backed sessions

---

### Package Versions (Recommended)

#### Backend (package.json)
```json
{
  "dependencies": {
    "express": "^4.19.0",
    "typescript": "^5.3.3",
    "@prisma/client": "^5.8.0",
    "prisma": "^5.8.0",
    "zod": "^3.22.4",
    "ioredis": "^5.3.2",
    "bullmq": "^5.3.0",
    "winston": "^3.11.0",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.5",
    "dotenv": "^16.4.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

#### AI Service (requirements.txt)
```
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.0
transformers==4.36.0
torch==2.1.2
scikit-learn==1.4.0
spacy==3.7.2
sentence-transformers==2.2.2
openai==1.10.0
numpy==1.26.3
pandas==2.1.4
python-dotenv==1.0.0
redis==5.0.1
```

#### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "zustand": "^4.4.7",
    "axios": "^1.6.5",
    "recharts": "^2.10.3",
    "socket.io-client": "^4.6.1",
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "date-fns": "^3.0.6",
    "lucide-react": "^0.309.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33"
  }
}
```

---

### Version Compatibility Matrix

| Component | Minimum Version | Recommended Version |
|-----------|----------------|---------------------|
| Node.js | 18.0.0 | 20.11.0 LTS |
| Python | 3.11.0 | 3.11.7 |
| PostgreSQL | 15.0 | 16.1 |
| Redis | 7.0 | 7.2 |
| Docker | 24.0 | Latest |
| TypeScript | 5.0 | 5.3.3 |

---

### Performance Targets

- **API Response Time**: < 200ms (p95)
- **Database Query Time**: < 50ms (p95)
- **Cache Hit Rate**: > 80%
- **Frontend Load Time**: < 2s
- **Time to Interactive**: < 3s

---

### Security Considerations

- **Dependencies**: Regular security audits (npm audit, pip-audit)
- **Secrets**: Environment variables, never commit secrets
- **Encryption**: AES-256-GCM for sensitive data
- **HTTPS**: Enforced for all connections
- **Rate Limiting**: Per-user and per-IP limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: React's built-in XSS protection
- **CORS**: Properly configured CORS policies

---

**Last Updated**: 2024

