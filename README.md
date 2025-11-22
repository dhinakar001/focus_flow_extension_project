# FocusFlow - AI-Powered Productivity Dashboard

[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](https://github.com/focusflow/focusflow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)

**FocusFlow** is a production-grade, AI-powered productivity dashboard designed to help teams stay focused, track productivity metrics, and optimize their workflow. Built with enterprise-level security, performance optimizations, and scalability in mind.

---

## ✨ Features

### Core Features
- 🎯 **Focus Mode Management** - Start, stop, and track focus sessions
- 📊 **Productivity Analytics** - Daily, weekly, and monthly analytics with trend graphs
- 🤖 **AI-Powered Insights** - Focus Coach, Distraction Detector, Time Predictions, Smart Suggestions
- 🔔 **Zoho Cliq Integration** - Native integration with Zoho Cliq for seamless workflow
- 👥 **User Management** - Multi-user support with role-based access control
- 💳 **Subscription Plans** - Free and Pro plans with Stripe/Razorpay integration
- 📈 **Streaks & Gamification** - Track daily/weekly/monthly streaks and scores

### Security Features
- 🔒 **JWT Authentication** - Secure token-based authentication
- 🛡️ **CSRF Protection** - Cross-site request forgery protection
- ✅ **Input Validation** - Comprehensive input validation and sanitization
- 🔐 **XSS Prevention** - Cross-site scripting prevention
- 🚦 **Rate Limiting** - API rate limiting to prevent abuse
- 🔑 **Encryption** - AES-256-GCM encryption for sensitive data

### Performance Features
- ⚡ **Optimized Bundles** - Code splitting and tree shaking
- 🗄️ **Connection Pooling** - Optimized database connection pooling
- 📦 **Caching Ready** - Architecture ready for Redis caching
- 🚀 **Fast Response Times** - Optimized queries and indexes
- 📱 **Responsive Design** - Mobile-first responsive UI

<<<<<<< HEAD
---
=======
## Deployment
- Reference docs/DEPLOYMENT.md for CI/CD guidance and environment promotion checklists.
- The included vercel.json file illustrates a minimal serverless deployment target for widgets or APIs.
>>>>>>> origin/main

## 🏗️ Architecture

```
FocusFlow/
├── server/                 # Node.js backend
│   ├── controllers/        # Request handlers
│   ├── services/          # Business logic
│   ├── middlewares/       # Auth, validation, CSRF, etc.
│   ├── routes/            # API routes
│   ├── db/                # Database migrations
│   ├── schedulers/        # Background jobs
│   └── utils/             # Utilities
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API clients
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── python_service/        # Python AI service
│   └── src/
│       ├── ai/            # AI modules
│       └── api/           # FastAPI routes
├── widgets/               # Zoho Cliq widgets
└── docs/                  # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ and pip
- **PostgreSQL** 14+
- **Redis** (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/focusflow/focusflow.git
   cd focusflow
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   npm install
   
   # Python dependencies
   pip install -r python_service/requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Generate security keys**
   ```bash
   # Generate JWT secret (32 chars)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate encryption key (base64 32 bytes)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. **Run database migrations**
   ```bash
   # Using psql
   psql -U postgres -d focusflow -f server/db/migrations/001_create_tables.sql
   psql -U postgres -d focusflow -f server/db/migrations/002_ai_features_tables.sql
   psql -U postgres -d focusflow -f server/db/migrations/003_production_schema.sql
   psql -U postgres -d focusflow -f server/db/migrations/004_saas_schema.sql
   ```

6. **Start the services**
   ```bash
   # Start Node.js server (development)
   npm run dev
   
   # Start Python AI service (in another terminal)
   cd python_service
   uvicorn src.api.main:app --reload --port 8000
   
   # Start frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

7. **Access the application**
   - Backend API: http://localhost:4000
   - Frontend: http://localhost:5173
   - Python Service: http://localhost:8000
   - Health Check: http://localhost:4000/health

---

## 📚 API Documentation

Complete API documentation is available at `API_DOCUMENTATION.md`.

### Key Endpoints

- **Authentication**: `/auth/*`
- **Focus Modes**: `/modes/*`
- **Analytics**: `/analytics/*`
- **AI Features**: `/ai/*`
- **Subscriptions**: `/subscription/*`
- **Admin**: `/admin/*`
- **Health Check**: `/health`

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Required in Production

```bash
JWT_SECRET=<32-char-random-string>
TOKEN_ENCRYPTION_KEY=<base64-32-byte-key>
DATABASE_URL=<postgresql-connection-string>
```

### Security Best Practices

1. **Never commit `.env` files** - Use `.gitignore`
2. **Use strong secrets** - Minimum 32 characters for JWT secret
3. **Enable HTTPS** - Always use SSL/TLS in production
4. **Rotate secrets** - Regularly rotate encryption keys
5. **Monitor logs** - Set up log aggregation and monitoring

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

---

## 📦 Deployment

See `docs/DEPLOYMENT.md` for comprehensive deployment guide.

### Quick Deploy Options

**Vercel (Serverless)**
```bash
vercel deploy
```

**Docker**
```bash
docker build -t focusflow .
docker run -p 4000:4000 --env-file .env focusflow
```

**Traditional Server**
```bash
npm run build
NODE_ENV=production npm start
```

---

## 🔐 Security

FocusFlow includes enterprise-grade security features:

- ✅ **JWT Authentication** with refresh tokens
- ✅ **CSRF Protection** on state-changing requests
- ✅ **Input Validation** and sanitization
- ✅ **XSS Prevention** with Content Security Policy
- ✅ **SQL Injection Prevention** with parameterized queries
- ✅ **Rate Limiting** to prevent abuse
- ✅ **Helmet.js** for security headers
- ✅ **CORS** configuration
- ✅ **SSL/TLS** enforcement in production

See `SECURITY_PATCHES.md` for detailed security documentation.

---

## 📊 Performance

- **Lighthouse Score**: 88+ (expected)
- **Bundle Size**: Optimized with code splitting
- **Database**: Optimized queries with indexes
- **Caching**: Ready for Redis integration
- **CDN**: Ready for static asset CDN

See `AUDIT_FIXES_COMPLETE.md` for performance improvements.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Run linter before committing

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Zoho Cliq for the integration platform
- React, Express, and FastAPI communities
- All contributors and users

---

## 📞 Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/focusflow/focusflow/issues)
- **Email**: support@focusflow.app

---

## 🗺️ Roadmap

- [ ] Redis caching layer
- [ ] Real-time notifications via WebSockets
- [ ] Advanced AI features
- [ ] Mobile apps (iOS/Android)
- [ ] Team collaboration features
- [ ] Integration marketplace

---

**Version**: 2.0.2  
**Last Updated**: 2024-01-01  
**Status**: ✅ Production Ready
#   f o c u s _ f l o w _ e x t e n s i o n _ p r o j e c t  
 