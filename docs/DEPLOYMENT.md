# FocusFlow Deployment Guide

Comprehensive guide for deploying FocusFlow to production environments.

---

## 📋 Pre-Deployment Checklist

### Security
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Generate encryption key (base64 32 bytes)
- [ ] Set strong database password
- [ ] Configure SSL/TLS certificates
- [ ] Enable HTTPS enforcement
- [ ] Review and configure CORS
- [ ] Set up rate limiting
- [ ] Configure firewall rules

### Database
- [ ] Create production PostgreSQL database
- [ ] Run all migrations
- [ ] Create database backups
- [ ] Configure connection pooling
- [ ] Set up database monitoring

### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Configure all environment variables
- [ ] Set up log aggregation
- [ ] Configure error tracking
- [ ] Set up monitoring and alerts

---

## 🚀 Deployment Options

### Option 1: Vercel (Serverless - Recommended)

**Best for:** Quick deployment, automatic scaling, zero server management

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Configure `vercel.json`**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server/index.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set environment variables**
   ```bash
   vercel env add JWT_SECRET
   vercel env add DATABASE_URL
   # ... add all required env vars
   ```

**Advantages:**
- ✅ Automatic scaling
- ✅ Zero server management
- ✅ Built-in CDN
- ✅ Free tier available

**Considerations:**
- ⚠️ Function timeout limits (10s for free tier)
- ⚠️ Cold start latency
- ⚠️ Database connection limits

---

### Option 2: Docker (Containerized)

**Best for:** Consistent deployments, Kubernetes, container orchestration

1. **Create `Dockerfile`**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   
   # Install dependencies
   RUN npm ci --only=production
   
   # Copy application code
   COPY . .
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs && \
       adduser -S nodejs -u 1001
   USER nodejs
   
   # Expose port
   EXPOSE 4000
   
   # Start server
   CMD ["node", "server/index.js"]
   ```

2. **Create `.dockerignore`**
   ```
   node_modules
   .git
   .env
   *.log
   .DS_Store
   ```

3. **Build and run**
   ```bash
   docker build -t focusflow:latest .
   docker run -p 4000:4000 --env-file .env focusflow:latest
   ```

4. **Docker Compose (with PostgreSQL)**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "4000:4000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://user:pass@db:5432/focusflow
       depends_on:
         - db
       env_file:
         - .env
     
     db:
       image: postgres:14-alpine
       environment:
         - POSTGRES_DB=focusflow
         - POSTGRES_USER=user
         - POSTGRES_PASSWORD=pass
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

**Advantages:**
- ✅ Consistent environments
- ✅ Easy scaling
- ✅ Works with Kubernetes
- ✅ Version control for deployments

---

### Option 3: Traditional VPS/Cloud Server

**Best for:** Full control, custom configurations, existing infrastructure

1. **Setup server (Ubuntu/Debian)**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Clone and setup application**
   ```bash
   git clone https://github.com/focusflow/focusflow.git
   cd focusflow
   npm install --production
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

4. **Run migrations**
   ```bash
   psql -U postgres -d focusflow -f server/db/migrations/001_create_tables.sql
   # ... run all migrations
   ```

5. **Start with PM2**
   ```bash
   pm2 start server/index.js --name focusflow
   pm2 save
   pm2 startup  # Enable auto-start on reboot
   ```

6. **Setup Nginx reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name api.focusflow.app;
       
       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.focusflow.app
   ```

**Advantages:**
- ✅ Full control
- ✅ Custom configurations
- ✅ No vendor lock-in
- ✅ Predictable costs

**Considerations:**
- ⚠️ Server management required
- ⚠️ Manual scaling
- ⚠️ Security maintenance

---

## 🔧 Configuration

### Environment Variables

Set these in your deployment platform:

**Required:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/focusflow
JWT_SECRET=<32-char-random-string>
TOKEN_ENCRYPTION_KEY=<base64-32-byte-key>
```

**Optional but Recommended:**
```bash
LOG_LEVEL=info
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
FRONTEND_URL=https://focusflow.app
ALLOWED_ORIGINS=https://focusflow.app
```

### Database Configuration

**Production Database Setup:**
```sql
-- Create database
CREATE DATABASE focusflow;

-- Create user
CREATE USER focusflow_user WITH PASSWORD 'strong-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE focusflow TO focusflow_user;

-- Run migrations
\c focusflow
\i server/db/migrations/001_create_tables.sql
-- ... run all migrations
```

**Connection Pool Settings:**
```bash
DB_POOL_SIZE=20  # Increase for production
DB_CONNECTION_TIMEOUT=5000
DB_IDLE_TIMEOUT=30000
DB_SSL=true  # Enable SSL for production
```

---

## 📊 Monitoring & Logging

### Recommended Tools

1. **Application Monitoring**
   - **New Relic** - APM monitoring
   - **Datadog** - Infrastructure monitoring
   - **Sentry** - Error tracking

2. **Log Aggregation**
   - **Papertrail** - Log management
   - **Loggly** - Centralized logging
   - **ELK Stack** - Elasticsearch, Logstash, Kibana

3. **Uptime Monitoring**
   - **UptimeRobot** - Free uptime monitoring
   - **Pingdom** - Advanced monitoring
   - **StatusCake** - Multi-location monitoring

### Health Check Endpoint

```bash
# Check health
curl https://api.focusflow.app/health

# Response:
{
  "status": "ok",
  "service": "FocusFlow",
  "version": "2.0.2",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🔐 Security Hardening

### Production Security Checklist

- [ ] **HTTPS Enforcement**
  ```nginx
  # Redirect HTTP to HTTPS
  server {
      listen 80;
      return 301 https://$host$request_uri;
  }
  ```

- [ ] **Security Headers** (via Helmet.js - already configured)
  - Content Security Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security

- [ ] **Database Security**
  - Use SSL/TLS connections
  - Restrict database access by IP
  - Use strong passwords
  - Regular backups

- [ ] **Environment Variables**
  - Never commit `.env` files
  - Use secret management (AWS Secrets Manager, HashiCorp Vault)
  - Rotate secrets regularly

- [ ] **Rate Limiting** (already configured)
  - API endpoints: 100 req/15min
  - Auth endpoints: 10 req/15min

---

## 📈 Performance Optimization

### Production Optimizations

1. **Enable Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Enable Caching**
   ```javascript
   // Use Redis for caching
   const redis = require('redis');
   const client = redis.createClient(process.env.REDIS_URL);
   ```

3. **Database Indexes** (already in migrations)
   - All foreign keys indexed
   - Timestamp columns indexed
   - Frequently queried columns indexed

4. **CDN for Static Assets**
   - Upload frontend build to CDN
   - Configure CDN caching headers

---

## 🔄 Backup & Recovery

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump focusflow > backups/focusflow_$DATE.sql
```

### Automated Backups (Cron)

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### Restore from Backup

```bash
psql -U postgres -d focusflow < backups/focusflow_20240101_020000.sql
```

---

## 🚨 Troubleshooting

### Common Issues

**Issue: Database connection errors**
```bash
# Check database status
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Issue: High memory usage**
```bash
# Check process memory
pm2 monit

# Restart if needed
pm2 restart focusflow
```

**Issue: Slow response times**
```bash
# Check database queries
# Enable query logging in PostgreSQL
# Review slow query log
```

---

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs focusflow`
- Review health endpoint: `/health`
- Check database connectivity
- Verify environment variables

---

**Last Updated:** 2024-01-01  
**Version:** 2.0.2
