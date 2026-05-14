# HCB Platform — Configuration Guide

**Version:** 3.0.0 | **Date:** 2026-03-28

---

## 1. Development Setup (5 minutes)

### Prerequisites
| Tool | Min Version | Check Command |
|------|-------------|---------------|
| Java | 17+ | `java -version` |
| Maven | 3.9+ | `mvn -version` |
| Node.js | 18+ | `node -v` |
| npm | 10+ | `npm -v` |
| SQLite | 3.35+ | `sqlite3 --version` |

### Step-by-Step

```bash
# 1. Clone / open workspace
cd c:\Users\ashut\OneDrive\Desktop\credit-harmony

# 2. Start frontend
npm install
npm run dev
# → http://localhost:8080

# 3. Start backend (new terminal)
cd backend
mvn clean package -DskipTests
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# → http://localhost:8090
# Database auto-created at: backend/data/hcb_platform.db
# Seed data auto-loaded on first run

# 4. Verify backend health
curl http://localhost:8090/actuator/health
# Expected: {"status":"UP"}
```

---

## 2. Environment Variables Reference

### Development (No env vars required — defaults used)

All development defaults are embedded in `application.yml`. The service starts with no configuration needed.

### Production (All required)

Create a `.env` file or set system environment variables:

```bash
# ─── REQUIRED IN PRODUCTION ────────────────────────────────────────────────

# JWT signing secret — minimum 32 characters (256 bits)
# Generate: openssl rand -hex 32
HCB_JWT_SECRET=your-production-jwt-secret-minimum-256-bits-here-replace-now

# Database (PostgreSQL)
DATABASE_URL=jdbc:postgresql://your-db-host:5432/hcb_platform
DB_USERNAME=hcb_app
DB_PASSWORD=your-db-password

# PII encryption key — exactly 32 characters (AES-256)
# Generate: openssl rand -base64 24
HCB_PII_KEY=your-32-char-pii-encryption-key!!

# HMAC pepper for hash fields
# Generate: openssl rand -hex 16
HCB_HMAC_PEPPER=your-hmac-pepper-value-here

# CORS origins (comma-separated, no trailing slashes)
HCB_CORS_ORIGINS=https://your-frontend-domain.com

# ─── OPTIONAL ──────────────────────────────────────────────────────────────

# Server port (default: 8090)
SERVER_PORT=8090

# Spring active profile
SPRING_PROFILES_ACTIVE=prod

# H2 console (dev only — these are ignored in prod profile)
HCB_H2_USER=admin
HCB_H2_PASS=admin123
```

---

## 3. Database Configuration

### SQLite (Development)

The database is automatically initialized from `create_tables.sql` and `seed_data.sql` on each startup when `spring.sql.init.mode=always` (dev profile).

```yaml
spring:
  datasource:
    url: jdbc:sqlite:${HCB_DB_PATH:./data/hcb_platform.db}
  jpa:
    database-platform: org.hibernate.community.dialect.SQLiteDialect
```

**Reset the database:**
```bash
rm backend/data/hcb_platform.db
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Direct inspection:**
```bash
sqlite3 backend/data/hcb_platform.db ".tables"
sqlite3 backend/data/hcb_platform.db "SELECT name, institution_lifecycle_status FROM institutions;"
```

### PostgreSQL (Production)

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
  sql:
    init:
      mode: never  # Use Flyway for prod migrations
```

**Production schema setup:**
```bash
# Run the DDL script once
psql -U hcb_app -d hcb_platform -f backend/src/main/resources/db/create_tables.sql

# Load seed data (one time only)
psql -U hcb_app -d hcb_platform -f backend/src/main/resources/db/seed_data.sql
```

---

## 4. H2 Console Access (Development Only)

```
URL: http://localhost:8090/h2-console
Driver Class: org.sqlite.JDBC (change to SQLite driver)
JDBC URL: jdbc:sqlite:./data/hcb_platform.db
User Name: admin
Password: admin123
```

> Note: The H2 console is configured to display the SQLite database. Direct SQLite inspection via `sqlite3` CLI is more reliable for full-featured querying.

---

## 5. JWT Configuration

```yaml
hcb:
  jwt:
    # Signing secret — MUST be overridden in production via HCB_JWT_SECRET env var
    secret: ${HCB_JWT_SECRET:hcb-super-secret-dev-key-min-256-bits-long-replace-in-prod-2026}
    
    # Access token expiry (15 minutes = 900 seconds)
    access-token-expiry-seconds: 900
    
    # Refresh token expiry (7 days = 604800 seconds)
    refresh-token-expiry-seconds: 604800
```

**Generate a secure JWT secret:**
```bash
openssl rand -hex 32
# Example output: a3f7d2e1b9c4... (use this as HCB_JWT_SECRET)
```

---

## 6. Security Configuration Checklist

Before going to production:

- [ ] `HCB_JWT_SECRET` set to cryptographically random 32+ char value
- [ ] `HCB_PII_KEY` set to exactly 32 characters
- [ ] `HCB_HMAC_PEPPER` set to random value
- [ ] `H2 console disabled` (auto-disabled in prod profile)
- [ ] `HCB_CORS_ORIGINS` set to specific production origins (no wildcard)
- [ ] TLS 1.3 configured on reverse proxy/load balancer
- [ ] Database service account has only read/write permissions (no DDL)
- [ ] `spring.profiles.active=prod` set
- [ ] `server.error.include-message=never` verified (default in config)
- [ ] Secrets stored in secrets manager (not in `.env` files in source control)

---

## 7. Logging Configuration

### Development
```yaml
logging:
  level:
    com.hcb: DEBUG
    org.springframework.security: INFO
    org.hibernate.SQL: DEBUG
```

### Production
```yaml
logging:
  level:
    com.hcb: INFO
    org.springframework.security: WARN
  # Configure external appender (ELK / CloudWatch) in production
```

---

## 8. Frontend Configuration

The frontend uses environment variables via `.env` files. For local development pointing to the backend:

```bash
# .env.local (not committed to git)
VITE_API_BASE_URL=http://localhost:8090
```

---

## 9. Key Rotation Procedure

### JWT Secret Rotation
1. Generate new secret: `openssl rand -hex 32`
2. Update `HCB_JWT_SECRET` environment variable
3. Restart application (all active access tokens expire within 15 minutes; users must re-login)
4. Revoke all refresh tokens: `DELETE FROM refresh_tokens WHERE is_revoked = 0` (forces re-login for all users)

### PII Encryption Key Rotation
1. Generate new key
2. Write migration script to re-encrypt all `full_name_encrypted` and `date_of_birth_encrypted` fields with new key
3. Update `HCB_PII_KEY` environment variable
4. Restart application

> Document key rotation dates in your operations runbook. Recommended rotation cadence: JWT secret annually, PII key every 2 years.
