# FocusFlow Quick Start Guide

## 🚀 Getting Started in 30 Minutes

### Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- PostgreSQL 15+ installed and running
- Redis 7+ installed and running
- Docker & Docker Compose (optional, for easier setup)

### Step 1: Clone and Setup (5 minutes)

```bash
# Navigate to project directory
cd FocusFlow

# Install root dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# (Add database URLs, API keys, etc.)
```

### Step 2: Database Setup (5 minutes)

```bash
# Start PostgreSQL and Redis (if using Docker)
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### Step 3: Install Service Dependencies (5 minutes)

```bash
# Install Core API dependencies
cd services/core-api
npm install

# Install AI Service dependencies
cd ../ai-service
pip install -r requirements.txt

# Install Frontend dependencies
cd ../../frontend/packages/dashboard
npm install

# Return to root
cd ../../..
```

### Step 4: Start Development Servers (5 minutes)

```bash
# Option 1: Start all services (recommended)
npm run dev

# Option 2: Start services individually
npm run dev:api        # Core API (port 4000)
npm run dev:ai         # AI Service (port 8000)
npm run dev:frontend   # Frontend (port 5173)
```

### Step 5: Verify Installation (5 minutes)

1. **Check API Health**:
   ```bash
   curl http://localhost:4000/health
   ```

2. **Check AI Service**:
   ```bash
   curl http://localhost:8000/health
   ```

3. **Open Frontend**:
   - Navigate to `http://localhost:5173`
   - You should see the FocusFlow dashboard

### Step 6: Configure Zoho Cliq (10 minutes)

1. **Get Zoho OAuth Credentials**:
   - Go to https://api-console.zoho.com/
   - Create a new Server-based Application
   - Note your Client ID and Client Secret

2. **Update .env**:
   ```env
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REDIRECT_URI=http://localhost:4000/auth/callback
   ```

3. **Update manifest.json**:
   - Update webhook URLs
   - Update widget URLs
   - Upload to Zoho Cliq Developer Console

---

## 📝 Development Workflow

### Daily Development

```bash
# Start all services
npm run dev

# Run tests
npm run test

# Check code quality
npm run lint
npm run format
```

### Making Changes

1. **Backend Changes**:
   - Edit files in `services/core-api/src/`
   - Changes auto-reload with nodemon

2. **AI Service Changes**:
   - Edit files in `services/ai-service/src/`
   - Restart service: `npm run dev:ai`

3. **Frontend Changes**:
   - Edit files in `frontend/packages/dashboard/src/`
   - Changes auto-reload with Vite HMR

4. **Database Changes**:
   - Edit `database/schema/schema.prisma`
   - Generate migration: `npm run db:migrate:create`
   - Apply migration: `npm run db:migrate`

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🏗️ Building for Production

```bash
# Build all packages
npm run build

# Build specific package
npm run build:api
npm run build:frontend

# Start production servers
npm run start:prod
```

---

## 🐳 Docker Development

```bash
# Start all services with Docker
docker-compose up

# Start specific services
docker-compose up postgres redis

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📚 Next Steps

1. **Read the Architecture Plan**: See `ARCHITECTURE_UPGRADE_PLAN.md`
2. **Follow Implementation Checklist**: See `IMPLEMENTATION_CHECKLIST.md`
3. **Review Technology Stack**: See `TECHNOLOGY_STACK.md`
4. **Start with Phase 1**: Foundation setup

---

## ❓ Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
# Find process using port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill process or change port in .env
```

**Database Connection Error**:
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check database credentials

**Redis Connection Error**:
- Check Redis is running
- Verify REDIS_URL in .env
- Test connection: `redis-cli ping`

**Module Not Found**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Prisma Client Error**:
```bash
# Regenerate Prisma client
npx prisma generate
```

---

## 🔗 Useful Links

- **Zoho Cliq API Docs**: https://www.zoho.com/cliq/help/developer/api/
- **Prisma Docs**: https://www.prisma.io/docs
- **React Docs**: https://react.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com

---

**Need Help?** Check the main `ARCHITECTURE_UPGRADE_PLAN.md` for detailed information.

