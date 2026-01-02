# Deploying Lingx

This guide covers deploying Lingx using Docker Compose.

## Prerequisites

- Docker 24+
- Docker Compose 2.x
- A server with at least 2GB RAM

## Quick Deploy

```bash
# Clone repository
git clone https://github.com/your-org/lingx.git
cd lingx

# Create environment file
cp .env.example .env

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Start services
docker-compose up -d
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | No | lingx | Database username |
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `POSTGRES_DB` | No | lingx | Database name |
| `JWT_SECRET` | Yes | - | Secret for JWT signing (min 32 chars) |
| `API_PORT` | No | 3001 | API server port |
| `WEB_PORT` | No | 3000 | Web server port |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:3001 | API URL for frontend |

## Production Configuration

### .env file

```bash
# Production .env
POSTGRES_USER=lingx
POSTGRES_PASSWORD=your-very-secure-password-here
POSTGRES_DB=lingx

# Generate with: openssl rand -base64 32
JWT_SECRET=your-jwt-secret-here

# Ports
API_PORT=3001
WEB_PORT=3000

# Update for your domain
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Docker Compose Override

Create `docker-compose.override.yml` for production settings:

```yaml
version: '3.8'

services:
  api:
    restart: always
    environment:
      - NODE_ENV=production

  web:
    restart: always
    environment:
      - NODE_ENV=production

  postgres:
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Reverse Proxy (nginx)

### Basic Configuration

```nginx
# /etc/nginx/sites-available/lingx
server {
    listen 80;
    server_name lingx.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lingx.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/lingx.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lingx.yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.lingx.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.lingx.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lingx.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable the Configuration

```bash
sudo ln -s /etc/nginx/sites-available/lingx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lingx.yourdomain.com -d api.lingx.yourdomain.com
```

## Database Operations

### Backup

```bash
# Full database backup
docker-compose exec postgres pg_dump -U lingx lingx > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker-compose exec postgres pg_dump -U lingx lingx | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore

```bash
# Restore from backup
cat backup.sql | docker-compose exec -T postgres psql -U lingx lingx

# Restore from compressed backup
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U lingx lingx
```

### Automated Backups

Create a cron job for daily backups:

```bash
# /etc/cron.d/lingx-backup
0 2 * * * root cd /path/to/lingx && docker-compose exec -T postgres pg_dump -U lingx lingx | gzip > /var/backups/lingx/backup_$(date +\%Y\%m\%d).sql.gz
```

## Upgrading

### Standard Upgrade

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Migrations run automatically on API startup
```

### Database Migration

If there are database schema changes:

```bash
# Stop services
docker-compose down

# Pull latest code
git pull

# Rebuild API (includes migration)
docker-compose build api

# Start services (migrations run automatically)
docker-compose up -d
```

## Health Checks

### Check Service Status

```bash
# Check all services
docker-compose ps

# View service logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### API Health Endpoint

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

### Database Health

```bash
docker-compose exec postgres pg_isready -U lingx -d lingx
```

## Monitoring

### Docker Stats

```bash
docker stats lingx-api lingx-web lingx-postgres
```

### Log Aggregation

For production, consider using a log aggregation service:

```yaml
# docker-compose.override.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Security Considerations

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (for redirect)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Environment Security

- Never commit `.env` files to git
- Use strong, unique passwords
- Rotate JWT_SECRET periodically (invalidates all sessions)
- Keep Docker and host OS updated

### Rate Limiting

The API includes built-in rate limiting:
- Authentication endpoints: 10 requests/minute
- General endpoints: 100 requests/minute

For additional protection, configure nginx rate limiting:

```nginx
# In http block
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# In server block
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3001;
}
```

## Troubleshooting

### Database Connection Errors

1. Check postgres is running: `docker-compose ps`
2. Check postgres logs: `docker-compose logs postgres`
3. Verify DATABASE_URL in API logs: `docker-compose logs api | grep DATABASE`
4. Test connection: `docker-compose exec postgres psql -U lingx -d lingx`

### API Not Starting

1. Check migrations: `docker-compose logs api | grep -i migration`
2. Verify JWT_SECRET is set: `grep JWT_SECRET .env`
3. Check for port conflicts: `netstat -tlnp | grep 3001`

### Web Not Loading

1. Verify API is healthy first
2. Check NEXT_PUBLIC_API_URL matches your setup
3. Review web logs: `docker-compose logs web`

### High Memory Usage

1. Check container stats: `docker stats`
2. Consider increasing server RAM
3. Tune PostgreSQL memory settings in docker-compose.yml:

```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=100
```

### Slow Responses

1. Check database indexes (migrations should handle this)
2. Monitor API response times in logs
3. Consider adding Redis cache (future enhancement)

## Scaling

### Horizontal Scaling (Future)

For high availability, consider:
- Load balancer in front of multiple API instances
- Read replicas for PostgreSQL
- Redis for session storage

### Vertical Scaling

Current recommended specs by load:

| Users | RAM | CPU | Storage |
|-------|-----|-----|---------|
| 1-10 | 2GB | 1 core | 20GB |
| 10-50 | 4GB | 2 cores | 50GB |
| 50-100 | 8GB | 4 cores | 100GB |
