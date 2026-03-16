# Parse - Production Deployment Guide

This guide covers deploying Parse to production with **Vercel** (frontend), **Railway** (backend + PostgreSQL), **AWS S3** (file storage), and **Sentry** (error monitoring).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS S3 Setup](#step-1-aws-s3-setup)
3. [Sentry Setup](#step-2-sentry-setup)
4. [Deploy Backend to Railway](#step-3-deploy-backend-to-railway)
5. [Deploy Frontend to Vercel](#step-4-deploy-frontend-to-vercel)
6. [Configure Email Service](#step-5-configure-email-service)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- GitHub account with your code pushed
- AWS account (for S3 file storage)
- Sentry account (free): https://sentry.io
- Vercel account (free): https://vercel.com
- Railway account ($5/month credit): https://railway.app
- Resend account (for emails): https://resend.com
- Anthropic API key: https://console.anthropic.com

---

## Step 1: AWS S3 Setup

### 1.1 Create S3 Bucket

1. Go to AWS Console → S3
2. Click **Create bucket**
3. Configure:
   - Bucket name: `parse-uploads-production` (must be globally unique)
   - Region: `us-east-1` (or your preferred region)
   - Uncheck "Block all public access" (for presigned URLs)
   - Enable versioning (recommended)
4. Click **Create bucket**

### 1.2 Configure CORS

1. Go to your bucket → Permissions → CORS
2. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-app.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 1.3 Create IAM User

1. Go to IAM → Users → Create user
2. User name: `parse-s3-user`
3. Attach policy → Create policy with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::parse-uploads-production",
        "arn:aws:s3:::parse-uploads-production/*"
      ]
    }
  ]
}
```

4. Create access keys and save:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## Step 2: Sentry Setup

### 2.1 Create Sentry Projects

1. Go to https://sentry.io and create an organization
2. Create two projects:
   - **parse-backend** (Node.js)
   - **parse-frontend** (Next.js)

### 2.2 Get DSN Values

1. Go to each project → Settings → Client Keys (DSN)
2. Copy the DSN for each:
   - Backend: `SENTRY_DSN`
   - Frontend: `NEXT_PUBLIC_SENTRY_DSN`

### 2.3 Create Auth Token (for source maps)

1. Go to Settings → Auth Tokens
2. Create new token with scopes:
   - `project:releases`
   - `project:write`
   - `org:read`
3. Save as `SENTRY_AUTH_TOKEN`

---

## Step 3: Deploy Backend to Railway

### 3.1 Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your Parse repository

### 3.2 Add PostgreSQL Database

1. In your Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway automatically provisions the database

### 3.3 Configure Backend Service

1. Click on the GitHub service
2. Go to **Settings** → **Root Directory**: `backend`
3. Go to **Variables** and add:

```bash
# Database (Railway provides this automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Security - generate with: openssl rand -base64 32
JWT_SECRET=<your-secure-random-string-32-chars-minimum>

# Server
PORT=3001
NODE_ENV=production

# Frontend (update after Vercel deploy)
FRONTEND_URL=https://your-app.vercel.app

# AI Service
ANTHROPIC_API_KEY=sk-ant-api03-...

# Email Service
RESEND_API_KEY=re_...
EMAIL_FROM=Parse <noreply@yourdomain.com>

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=parse-uploads-production

# Error Monitoring
SENTRY_DSN=https://...@....ingest.sentry.io/...
```

### 3.4 Generate Domain

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Save the URL (e.g., `parse-backend.up.railway.app`)

### 3.5 Verify Deployment

Check these health endpoints:
- `https://your-backend.railway.app/api/health` - Server health
- `https://your-backend.railway.app/api/health/db` - Database connection
- `https://your-backend.railway.app/api/health/s3` - S3 configuration

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Import Project

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New** → **Project**
3. Import your Parse repository

### 4.2 Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`

### 4.3 Add Environment Variables

```bash
# Backend API
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org
SENTRY_PROJECT=parse-frontend
```

### 4.4 Deploy

Click **Deploy** and wait for the build to complete.

### 4.5 Update Backend CORS

Go back to Railway and update `FRONTEND_URL` with your actual Vercel URL.

---

## Step 5: Configure Email Service

### 5.1 Set Up Resend

1. Go to https://resend.com and create account
2. Add and verify your domain
3. Create API key with "Full access"
4. Add to Railway backend:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=Parse <noreply@yourdomain.com>`

### 5.2 Test Emails

1. Register a new user
2. Check for verification email
3. Test password reset flow

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `PORT` | Yes | Server port (3001) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `ANTHROPIC_API_KEY` | Yes* | Claude AI API key |
| `RESEND_API_KEY` | Yes* | Email service API key |
| `AWS_ACCESS_KEY_ID` | Yes* | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes* | AWS credentials |
| `AWS_REGION` | Yes* | AWS region (e.g., us-east-1) |
| `AWS_S3_BUCKET` | Yes* | S3 bucket name |
| `SENTRY_DSN` | Recommended | Error tracking DSN |
| `NODE_ENV` | Recommended | Set to "production" |

*Required for full functionality

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API endpoint |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | WebSocket endpoint |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Error tracking DSN |
| `SENTRY_AUTH_TOKEN` | Recommended | For source map uploads |
| `SENTRY_ORG` | Recommended | Sentry organization slug |
| `SENTRY_PROJECT` | Recommended | Sentry project slug |

---

## Post-Deployment Checklist

### Security
- [ ] JWT_SECRET is at least 32 characters
- [ ] All API keys are set (not defaults)
- [ ] CORS is configured correctly
- [ ] S3 bucket has proper permissions
- [ ] Rate limiting is active (check logs)

### Functionality
- [ ] Health checks pass (`/api/health`, `/api/health/db`, `/api/health/s3`)
- [ ] User registration works
- [ ] Email verification sends
- [ ] Password reset works
- [ ] File upload works
- [ ] AI analysis works
- [ ] Real-time updates work (Socket.io)

### Monitoring
- [ ] Sentry is receiving events
- [ ] Logs are visible in Railway
- [ ] Database backups are configured

### Performance
- [ ] Frontend loads under 3 seconds
- [ ] API responses under 500ms
- [ ] No console errors

---

## Troubleshooting

### Backend won't start
```bash
# Check Railway logs for specific errors
# Common issues:
- DATABASE_URL not set or invalid
- JWT_SECRET missing
- Node version mismatch (requires Node 18+)
```

### Database connection fails
```bash
# Verify DATABASE_URL format:
postgresql://user:pass@host:5432/db?sslmode=require

# Check if PostgreSQL addon is provisioned in Railway
```

### S3 upload fails
```bash
# Verify all AWS variables are set:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_S3_BUCKET

# Check S3 bucket CORS configuration
# Verify IAM user has correct permissions
```

### Email not sending
```bash
# Check Resend dashboard for errors
# Verify domain is verified
# Check RESEND_API_KEY is correct
# Verify EMAIL_FROM matches verified domain
```

### WebSocket connection fails
```bash
# Ensure NEXT_PUBLIC_SOCKET_URL points to Railway URL
# Check CORS allows WebSocket connections
# Verify backend is accessible
```

### Sentry not receiving errors
```bash
# Verify DSN is correct
# Check NODE_ENV is "production"
# Test with: Sentry.captureMessage("Test")
```

---

## Monitoring & Maintenance

### Daily
- Check Sentry for new errors
- Monitor Railway resource usage

### Weekly
- Review API response times
- Check S3 storage usage
- Review user analytics

### Monthly
- Rotate API keys if needed
- Update dependencies
- Review and optimize database queries
- Check for security advisories

### Database Backups

Railway provides automatic backups. To configure:

1. Go to Railway → PostgreSQL service
2. Enable automatic backups
3. Set retention period

For manual backups:
```bash
# Using Railway CLI
railway connect postgres
pg_dump $DATABASE_URL > backup.sql
```

---

## Custom Domain (Optional)

### Vercel (Frontend)
1. Project Settings → Domains
2. Add your domain
3. Configure DNS as instructed
4. Enable HTTPS (automatic)

### Railway (Backend)
1. Service Settings → Networking
2. Add custom domain
3. Configure DNS CNAME
4. Update `FRONTEND_URL` with new domain

---

## Costs

| Service | Free Tier | Production |
|---------|-----------|------------|
| Railway | $5/month credit | ~$10-20/month |
| Vercel | Generous free tier | $20/month (Pro) |
| AWS S3 | 5GB free | ~$0.023/GB |
| Sentry | 5K errors/month | $26/month (Team) |
| Resend | 3K emails/month | $20/month |
| Anthropic | Pay per use | ~$3/1M tokens |

**Estimated total**: $30-50/month for small production app
