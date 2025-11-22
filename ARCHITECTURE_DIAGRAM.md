# FocusFlow Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Zoho Cliq Platform"
        Bot[Bot Interface]
        Widget[Cliq Widgets]
        Slash[Slash Commands]
    end
    
    subgraph "API Gateway"
        Gateway[API Gateway<br/>Auth & Rate Limiting]
    end
    
    subgraph "Core Services"
        CoreAPI[Core API Service<br/>Node.js + TypeScript]
        AIService[AI Service<br/>Python + FastAPI]
        Analytics[Analytics Service<br/>Node.js + TypeScript]
        Worker[Worker Service<br/>Background Jobs]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>+ TimescaleDB)]
        Cache[(Redis<br/>Cache & Queue)]
    end
    
    subgraph "Frontend"
        Dashboard[React Dashboard]
        Widgets[React Widgets]
    end
    
    Bot --> Gateway
    Widget --> Gateway
    Slash --> Gateway
    
    Gateway --> CoreAPI
    Gateway --> AIService
    Gateway --> Analytics
    
    CoreAPI --> DB
    CoreAPI --> Cache
    CoreAPI --> AIService
    CoreAPI --> Analytics
    
    AIService --> Cache
    Analytics --> DB
    Analytics --> Cache
    
    Worker --> Cache
    Worker --> DB
    
    Dashboard --> CoreAPI
    Widgets --> CoreAPI
```

---

## Data Flow: Focus Mode Activation

```mermaid
sequenceDiagram
    participant User
    participant Cliq
    participant Gateway
    participant CoreAPI
    participant AI
    participant DB
    participant Cache
    participant Worker
    participant Frontend
    
    User->>Cliq: Start Focus Mode
    Cliq->>Gateway: POST /api/modes/start
    Gateway->>CoreAPI: Authenticated Request
    CoreAPI->>DB: Create Focus Session
    CoreAPI->>Cache: Update User State
    CoreAPI->>Worker: Schedule End Job
    CoreAPI->>Frontend: WebSocket Update
    CoreAPI->>Cliq: Success Response
    Cliq->>User: Confirmation
    
    Note over Worker: Timer Running
    
    Worker->>DB: Check Expired Sessions
    Worker->>CoreAPI: Finalize Session
    CoreAPI->>AI: Generate Summary
    CoreAPI->>Cache: Update State
    CoreAPI->>Frontend: Session End Event
    CoreAPI->>Cliq: Send Notification
```

---

## Data Flow: Message Prioritization

```mermaid
sequenceDiagram
    participant Cliq
    participant Gateway
    participant CoreAPI
    participant AI
    participant Cache
    participant User
    
    Cliq->>Gateway: Incoming Message
    Gateway->>CoreAPI: Message Event
    CoreAPI->>Cache: Check User Mode
    
    alt User in Focus Mode
        CoreAPI->>AI: Analyze Message Priority
        AI->>AI: Extract Features<br/>(Sentiment, Keywords, Sender)
        AI->>AI: ML Model Prediction
        AI->>CoreAPI: Priority Score (0-100)
        
        alt High Priority (>80)
            CoreAPI->>Cache: Store Message
            CoreAPI->>Cliq: Notify User
            Cliq->>User: High Priority Alert
        else Medium Priority (50-80)
            CoreAPI->>Cache: Queue for Review
            CoreAPI->>Cliq: Silent Queue
        else Low Priority (<50)
            CoreAPI->>Cache: Block Silently
            Note over CoreAPI: No Notification
        end
    else User Not in Focus
        CoreAPI->>Cliq: Deliver Message
        Cliq->>User: Normal Delivery
    end
```

---

## Service Communication

```mermaid
graph LR
    subgraph "Request Flow"
        A[Client Request] --> B[API Gateway]
        B --> C{Route}
        C -->|/api/focus| D[Core API]
        C -->|/api/ai| E[AI Service]
        C -->|/api/analytics| F[Analytics]
    end
    
    subgraph "Core API Operations"
        D --> G[Business Logic]
        G --> H[Repository Layer]
        H --> I[(Database)]
        G --> J[Cache Layer]
        J --> K[(Redis)]
        G --> L[Queue]
        L --> M[Worker Service]
    end
    
    subgraph "AI Service Operations"
        E --> N[NLP Pipeline]
        N --> O[ML Models]
        O --> P[Priority Score]
        E --> Q[OpenAI API]
    end
    
    subgraph "Analytics Operations"
        F --> R[Event Processor]
        R --> S[Time Series DB]
        S --> I
        R --> T[Aggregation]
        T --> U[Insights]
    end
```

---

## Database Schema Overview

```mermaid
erDiagram
    USERS ||--o{ FOCUS_SESSIONS : has
    USERS ||--o{ USER_MODES : has
    USERS ||--o{ OAUTH_CREDENTIALS : has
    
    FOCUS_SESSIONS ||--o{ BLOCKED_MESSAGES : generates
    FOCUS_SESSIONS ||--o{ MODE_TRANSITIONS : triggers
    FOCUS_SESSIONS ||--o{ SESSION_SUMMARIES : produces
    
    USERS ||--o{ ANALYTICS_EVENTS : generates
    USERS ||--o{ PRODUCTIVITY_METRICS : tracks
    
    FOCUS_SESSIONS ||--o{ AUTOMATION_RULES : triggers
    AUTOMATION_RULES ||--o{ WORKFLOWS : executes
    
    USERS {
        string id PK
        string cliq_user_id
        string email
        timestamp created_at
    }
    
    FOCUS_SESSIONS {
        int id PK
        string user_id FK
        string mode_label
        int duration_minutes
        timestamp started_at
        timestamp ended_at
    }
    
    BLOCKED_MESSAGES {
        int id PK
        int session_id FK
        string channel_id
        text message_preview
        jsonb payload
    }
    
    ANALYTICS_EVENTS {
        int id PK
        string user_id FK
        string event_type
        jsonb metadata
        timestamp created_at
    }
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX / Cloud Load Balancer]
    end
    
    subgraph "API Gateway Cluster"
        G1[Gateway Instance 1]
        G2[Gateway Instance 2]
        G3[Gateway Instance N]
    end
    
    subgraph "Core API Cluster"
        C1[Core API 1]
        C2[Core API 2]
        C3[Core API N]
    end
    
    subgraph "AI Service Cluster"
        A1[AI Service 1]
        A2[AI Service 2]
    end
    
    subgraph "Analytics Cluster"
        AN1[Analytics 1]
        AN2[Analytics 2]
    end
    
    subgraph "Worker Cluster"
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker N]
    end
    
    subgraph "Database Cluster"
        DB1[(PostgreSQL Primary)]
        DB2[(PostgreSQL Replica)]
    end
    
    subgraph "Cache Cluster"
        R1[(Redis Master)]
        R2[(Redis Replica)]
    end
    
    LB --> G1
    LB --> G2
    LB --> G3
    
    G1 --> C1
    G1 --> C2
    G2 --> C2
    G2 --> C3
    G3 --> C1
    G3 --> C3
    
    C1 --> A1
    C2 --> A2
    C3 --> A1
    
    C1 --> AN1
    C2 --> AN2
    
    C1 --> DB1
    C2 --> DB1
    C3 --> DB1
    AN1 --> DB2
    AN2 --> DB2
    
    C1 --> R1
    C2 --> R1
    C3 --> R1
    W1 --> R1
    W2 --> R1
    W3 --> R1
    
    W1 --> DB1
    W2 --> DB1
    W3 --> DB1
```

---

## Component Interaction Matrix

| Component | Interacts With | Communication Method |
|-----------|---------------|---------------------|
| API Gateway | Core API, AI Service, Analytics | HTTP/REST |
| Core API | Database, Redis, AI Service, Analytics | Direct DB, HTTP, Redis |
| AI Service | Core API, Redis, OpenAI | HTTP, Redis Pub/Sub |
| Analytics Service | Database, Redis, Core API | Direct DB, Redis, HTTP |
| Worker Service | Redis Queue, Database | BullMQ, Direct DB |
| Frontend | Core API | HTTP, WebSocket |
| Database | All Services | PostgreSQL Protocol |
| Redis | All Services | Redis Protocol |

---

## Technology Stack Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  React 18 + TypeScript + Tailwind CSS + Vite            │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                   API Gateway Layer                      │
│         Express + TypeScript + Rate Limiting             │
└────┬───────────────┬───────────────┬────────────────────┘
     │               │               │
┌────▼────┐   ┌──────▼──────┐   ┌───▼──────────┐
│ Core API│   │ AI Service  │   │  Analytics   │
│ Node.js │   │  Python     │   │   Node.js    │
│ + TS    │   │  FastAPI    │   │   + TS       │
└────┬────┘   └──────┬──────┘   └───┬──────────┘
     │               │               │
     └───────┬───────┴───────┬───────┘
             │               │
     ┌───────▼───────┐  ┌────▼──────┐
     │  PostgreSQL   │  │   Redis   │
     │ + TimescaleDB │  │  Cache    │
     └───────────────┘  └───────────┘
```

---

## Request Lifecycle

```
1. User Action
   ↓
2. Zoho Cliq Webhook/API Call
   ↓
3. API Gateway
   ├─ Authentication
   ├─ Rate Limiting
   └─ Request Routing
   ↓
4. Core API Service
   ├─ Business Logic
   ├─ Validation
   └─ Service Orchestration
   ↓
5. Data Layer
   ├─ Database Query (PostgreSQL)
   ├─ Cache Check (Redis)
   └─ Queue Job (BullMQ)
   ↓
6. External Services (if needed)
   ├─ AI Service (Priority Analysis)
   ├─ Analytics Service (Event Tracking)
   └─ Zoho APIs (Cliq, Calendar)
   ↓
7. Response
   ├─ Update Cache
   ├─ Trigger WebSocket Event
   └─ Return to Client
```

---

## Caching Strategy

```
┌─────────────────────────────────────────┐
│           Cache Layers                   │
├─────────────────────────────────────────┤
│ L1: In-Memory Cache (Node.js)           │
│     - Session data                       │
│     - Frequently accessed objects         │
│     TTL: 5 minutes                       │
├─────────────────────────────────────────┤
│ L2: Redis Cache                         │
│     - User state                         │
│     - Focus session data                 │
│     - API response cache                 │
│     TTL: 1 hour                          │
├─────────────────────────────────────────┤
│ L3: Database Query Cache                │
│     - Query result cache                 │
│     - Materialized views                 │
│     TTL: 24 hours                        │
└─────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│        Security Layers                  │
├─────────────────────────────────────────┤
│ 1. Network Security                     │
│    - HTTPS/TLS                          │
│    - VPN (if on-premise)                │
├─────────────────────────────────────────┤
│ 2. API Gateway Security                 │
│    - Rate Limiting                      │
│    - IP Whitelisting                    │
│    - Request Validation                 │
├─────────────────────────────────────────┤
│ 3. Authentication & Authorization       │
│    - OAuth 2.0 (Zoho)                   │
│    - JWT Tokens                         │
│    - Role-Based Access Control          │
├─────────────────────────────────────────┤
│ 4. Data Security                        │
│    - Encryption at Rest                 │
│    - Encryption in Transit              │
│    - Token Encryption (AES-256-GCM)     │
├─────────────────────────────────────────┤
│ 5. Application Security                 │
│    - Input Validation (Zod)             │
│    - SQL Injection Prevention (Prisma)    │
│    - XSS Protection (React)             │
└─────────────────────────────────────────┘
```

---

**Note**: These diagrams use Mermaid syntax and can be rendered in most modern markdown viewers including GitHub, GitLab, and many documentation tools.

