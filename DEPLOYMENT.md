# 🚀 Deployment Guide

Hướng dẫn deploy LayBo Store Bot lên production.

---

## 🎯 Deployment Checklist

### Pre-deployment

- [ ] Test locally với `npm run dev`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Test webhook với `node test-webhook.js`
- [ ] Commit all changes to Git
- [ ] Update environment variables
- [ ] Review security settings

### Post-deployment

- [ ] Verify database connection
- [ ] Test bot commands
- [ ] Test webhook endpoint
- [ ] Configure SePay webhook URL
- [ ] Monitor logs for errors
- [ ] Test full purchase flow

---

## 🌐 Option 1: Railway (Recommended)

**Pros:** Easiest, auto-deploy, free tier, built-in PostgreSQL

**Steps:**

### 1. Tạo Railway Account

Vào [railway.app](https://railway.app) và đăng ký (dùng GitHub)

### 2. Tạo Project Mới

```
New Project → Deploy from GitHub → Select Repository
```

### 3. Add PostgreSQL

```
New → Database → PostgreSQL
```

Railway sẽ tự động tạo `DATABASE_URL`

### 4. Set Environment Variables

Click vào service → Variables → Add:

```
BOT_TOKEN=your_bot_token
ADMIN_CHAT_ID=your_chat_id
SEPAY_WEBHOOK_SECRET=your_secret
ORDER_EXPIRE_MINUTES=15
NODE_ENV=production
```

`DATABASE_URL` đã tự động có từ PostgreSQL service.

### 5. Configure Build

Railway tự động detect và chạy:
- `npm install`
- `npm run build`
- `npm start`

Nếu cần custom, tạo `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "npm run db:migrate:deploy && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 6. Deploy

Railway tự động deploy sau mỗi push to main branch.

### 7. Get Domain

Railway cung cấp domain: `your-app.up.railway.app`

Hoặc thêm custom domain trong Settings.

### 8. Configure SePay Webhook

```
https://your-app.up.railway.app/webhooks/sepay
```

### 9. View Logs

```
Click service → Logs
```

### 10. Database Management

```
Click PostgreSQL → Connect → Use PgAdmin or Prisma Studio
```

**Cost:** Free tier cho hobby projects

---

## ☁️ Option 2: Render

**Pros:** Free tier, good for static sites + backend

**Steps:**

### 1. Tạo Account

[render.com](https://render.com) → Sign up với GitHub

### 2. Tạo PostgreSQL Database

```
New → PostgreSQL → Create
```

Copy **Internal Database URL**

### 3. Tạo Web Service

```
New → Web Service → Connect Repository
```

### 4. Configure Service

**Settings:**
- **Name:** laybo-store-bot
- **Environment:** Node
- **Build Command:** 
  ```bash
  npm install && npm run db:migrate:deploy && npm run build
  ```
- **Start Command:** 
  ```bash
  npm start
  ```

### 5. Environment Variables

Add trong Environment tab:

```
BOT_TOKEN=your_token
ADMIN_CHAT_ID=your_id
DATABASE_URL=<internal_database_url>
SEPAY_WEBHOOK_SECRET=your_secret
NODE_ENV=production
ORDER_EXPIRE_MINUTES=15
```

### 6. Deploy

Click **Create Web Service**

Render sẽ build và deploy.

### 7. Domain

Render cung cấp: `your-app.onrender.com`

### 8. SePay Webhook

```
https://your-app.onrender.com/webhooks/sepay
```

**⚠️ Note:** Free tier có thể sleep sau 15 phút không activity. Webhook đầu tiên sẽ bị chậm.

**Solution:** Upgrade lên paid tier ($7/month) hoặc dùng cron-job.org để ping service.

**Cost:** Free tier available, Starter $7/month

---

## 💻 Option 3: VPS (DigitalOcean, Linode, AWS EC2)

**Pros:** Full control, no vendor lock-in

**Example: Ubuntu 22.04 LTS**

### 1. Connect to VPS

```bash
ssh root@your_server_ip
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should be v20.x
```

### 4. Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 5. Create Database & User

```bash
sudo -u postgres psql

CREATE DATABASE laybo_store;
CREATE USER laybo WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE laybo_store TO laybo;
\q
```

### 6. Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 7. Clone Repository

```bash
cd /opt
git clone https://github.com/your-username/laybo-store-bot.git
cd laybo-store-bot
```

### 8. Install Dependencies

```bash
npm install
```

### 9. Configure Environment

```bash
nano .env
```

Paste:

```env
BOT_TOKEN=your_token
ADMIN_CHAT_ID=your_chat_id
DATABASE_URL=postgresql://laybo:strong_password_here@localhost:5432/laybo_store
SEPAY_WEBHOOK_SECRET=your_secret
NODE_ENV=production
ORDER_EXPIRE_MINUTES=15
PORT=3000
```

Save: `Ctrl+X`, `Y`, `Enter`

### 10. Run Migrations

```bash
npm run db:migrate:deploy
npm run db:seed
```

### 11. Build Application

```bash
npm run build
```

### 12. Start with PM2

```bash
pm2 start dist/index.js --name laybo-bot
pm2 save
pm2 startup  # Follow instructions
```

### 13. Setup Nginx (Reverse Proxy)

```bash
apt install -y nginx

nano /etc/nginx/sites-available/laybo
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/laybo /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 14. Setup SSL with Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

Follow prompts.

### 15. Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 16. Auto-restart on Reboot

```bash
pm2 startup systemd
# Follow the command output
pm2 save
```

### 17. Update Application

```bash
cd /opt/laybo-store-bot
git pull
npm install
npm run build
npm run db:migrate:deploy
pm2 restart laybo-bot
```

### 18. View Logs

```bash
pm2 logs laybo-bot
pm2 monit  # Real-time monitoring
```

**Cost:** $5-10/month for basic VPS

---

## 🐳 Option 4: Docker + Docker Compose

**Pros:** Reproducible, isolated environment

### 1. Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
      - DATABASE_URL=postgresql://laybo:password@db:5432/laybo_store
      - SEPAY_WEBHOOK_SECRET=${SEPAY_WEBHOOK_SECRET}
      - NODE_ENV=production
      - ORDER_EXPIRE_MINUTES=15
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=laybo
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=laybo_store
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. Create .dockerignore

```
node_modules
dist
.env
.git
*.log
```

### 4. Deploy

```bash
# Build and start
docker-compose up -d

# Run migrations
docker-compose exec app npm run db:migrate:deploy
docker-compose exec app npm run db:seed

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

---

## 🔍 Monitoring & Logging

### Health Checks

```bash
# Check if service is running
curl https://your-domain.com/health
```

### Railway Logs

```
Service → Logs → Real-time stream
```

### PM2 Logs (VPS)

```bash
pm2 logs laybo-bot
pm2 monit
```

### Database Monitoring

```bash
# Railway
Database → Metrics

# VPS
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

---

## 🔐 Security Best Practices

1. **Use HTTPS** (always)
2. **Implement webhook signature validation**
3. **Use strong database passwords**
4. **Regular security updates**
5. **Firewall configuration**
6. **Backup database regularly**
7. **Monitor logs for suspicious activity**
8. **Rate limiting** (for production)

---

## 🔄 CI/CD (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: laybo-store-bot
```

---

## 📊 Performance Optimization

### Production Checklist

- [ ] Enable gzip compression (Nginx)
- [ ] Setup CDN for static assets (if any)
- [ ] Database indexing (already in Prisma schema)
- [ ] Connection pooling (Prisma default)
- [ ] Implement caching (Redis) for high traffic
- [ ] Load balancing (if scaling horizontally)

---

## 💾 Backup Strategy

### Database Backup (Railway)

Railway auto-backup trong paid plan.

### Manual Backup (VPS)

```bash
# Backup
pg_dump -U laybo laybo_store > backup_$(date +%Y%m%d).sql

# Restore
psql -U laybo laybo_store < backup_20260111.sql
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="laybo_store_$DATE.sql"

pg_dump -U laybo laybo_store > "$BACKUP_DIR/$FILENAME"
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Cron job:

```bash
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 🆘 Troubleshooting

### Bot không phản hồi

```bash
# Check logs
pm2 logs laybo-bot

# Restart
pm2 restart laybo-bot
```

### Database connection error

```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql $DATABASE_URL
```

### Webhook không hoạt động

```bash
# Test endpoint
curl -X POST https://your-domain.com/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "paymentRef": "TEST"}'

# Check server logs
pm2 logs laybo-bot --lines 100
```

---

## 📞 Support

Need help? Contact @ducngg411

---

Made with ❤️ for LayBo Store
