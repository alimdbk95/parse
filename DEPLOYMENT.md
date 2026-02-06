# Parse - Deployment Guide

This guide walks you through deploying Parse to production using **Vercel** (frontend) and **Railway** (backend + PostgreSQL).

## Prerequisites

- GitHub account with your code pushed
- Vercel account (free): https://vercel.com
- Railway account (free tier available): https://railway.app
- Your Anthropic API key for Claude AI

---

## Step 1: Push Code to GitHub

1. Create a new repository on GitHub
2. Initialize git and push your code:

```bash
cd /Users/ali/Documents/Parse
git init
git add .
git commit -m "Initial commit - Parse application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/parse.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your Parse repository

### 2.2 Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create the database

### 2.3 Configure Backend Service

1. Click on the GitHub service (your code)
2. Go to **Settings** → **Root Directory**
3. Set to: `backend`
4. Go to **Variables** tab and add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-a-secure-random-string>
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

> **Note:** Replace `your-app.vercel.app` with your actual Vercel URL after deploying frontend

### 2.4 Generate Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `parse-backend-production.up.railway.app`)

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Project

1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your Parse repository

### 3.2 Configure Build Settings

1. **Framework Preset:** Next.js
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `.next`

### 3.3 Add Environment Variables

Add these environment variables:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```

> Replace `your-backend.railway.app` with your actual Railway URL

### 3.4 Deploy

Click **"Deploy"** and wait for the build to complete.

---

## Step 4: Update CORS Settings

After both are deployed, update the Railway backend:

1. Go to Railway → your backend service → Variables
2. Update `FRONTEND_URL` to your actual Vercel URL

---

## Step 5: Run Database Migrations

Railway should run migrations automatically on deploy. If not:

1. Go to Railway → your backend service
2. Open the **Deploy** logs to verify migrations ran
3. Or use Railway CLI: `railway run npm run db:migrate`

---

## Environment Variables Summary

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Railway |
| `JWT_SECRET` | Secret for JWT tokens | `your-secure-random-string` |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://parse.vercel.app` |
| `ANTHROPIC_API_KEY` | Claude AI API key | `sk-ant-api03-...` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | `https://parse-backend.railway.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket endpoint | `https://parse-backend.railway.app` |

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure PostgreSQL database is provisioned

### Frontend can't connect to backend
- Verify CORS is configured (check FRONTEND_URL)
- Confirm API URL is correct in Vercel env vars
- Check browser console for errors

### Database migration fails
- Ensure DATABASE_URL is correctly set
- Try running migrations manually via Railway CLI

### WebSocket connection fails
- Ensure NEXT_PUBLIC_SOCKET_URL points to Railway URL
- Verify backend is running and accessible

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed

### Railway
1. Go to Service Settings → Networking
2. Add custom domain
3. Configure DNS CNAME to Railway URL

---

## Costs

- **Railway**: Free tier includes $5/month credit (enough for small apps)
- **Vercel**: Free tier includes generous limits for hobby projects
- **Anthropic**: Pay per API usage

For production with higher traffic, consider Railway Pro ($20/month) and Vercel Pro ($20/month).
