# ClientHub Deployment Guide

## Deploying to Cloudflare

ClientHub consists of two parts:
1. **Frontend (React + Vite)** → Deploy to Cloudflare Pages
2. **Backend (Node.js + Express + PostgreSQL)** → Deploy to Cloudflare Workers or external service

### Prerequisites

1. **GitHub Account**: https://github.com
2. **Cloudflare Account**: https://dash.cloudflare.com
3. **PostgreSQL Database**: Use a hosted service like:
   - Supabase (Free tier): https://supabase.com
   - Neon (Free tier): https://neon.tech
   - Railway (Free tier): https://railway.app
   - Render (Free tier): https://render.com

---

## Step 1: Prepare Your Code

### Update Environment Variables

#### Backend (.env for development)
```bash
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="generate_a_strong_32+_character_secret"
CLIENT_URL="https://your-app.pages.dev"
```

#### Frontend (.env.production)
```bash
VITE_API_URL="https://your-api-url.com/api"
VITE_SOCKET_URL="https://your-api-url.com"
```

---

## Step 2: Deploy Backend (API)

### Option A: Deploy to Render (Recommended)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all from `server/.env.example`

### Option B: Deploy to Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables from dashboard
5. Set root directory to `server`

### Option C: Deploy to Fly.io

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. From `server` directory:
```bash
fly launch
fly secrets set DATABASE_URL="your_db_url" JWT_SECRET="your_secret"
fly deploy
```

---

## Step 3: Deploy Frontend (Cloudflare Pages)

### Using Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to "Workers & Pages" → "Create application" → "Pages"
3. Click "Connect to Git"
4. Select your GitHub repository
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `cd client && npm install && npm run build`
   - **Build output directory**: `client/dist`
   - **Root directory**: Leave empty (we use `cd client`)
6. Add environment variables:
   - `VITE_API_URL`: Your backend API URL (from Step 2)
   - `VITE_SOCKET_URL`: Your backend URL
   - `VITE_RAZORPAY_KEY_ID`: Your Razorpay key (optional)
7. Click "Save and Deploy"

---

## Step 4: Initialize Database

After backend is deployed:

1. SSH into your backend service or use their console
2. Run:
```bash
npx prisma db push
npm run seed
```

This creates the database schema and seed data (demo admin account).

---

## Step 5: Update Frontend with Backend URL

1. In Cloudflare Pages dashboard, go to Settings → Environment Variables
2. Update `VITE_API_URL` with your actual backend URL
3. Trigger a new deployment

---

## Alternative: Deploy to GitLab + GitLab Pages

### Push to GitLab

```bash
git remote add gitlab https://gitlab.com/yourusername/clienthub.git
git push gitlab main
```

### Deploy Frontend (GitLab Pages)

Create `.gitlab-ci.yml` in root:

```yaml
image: node:20

pages:
  stage: deploy
  script:
    - cd client
    - npm install
    - npm run build
    - mkdir -p ../public
    - cp -r dist/* ../public/
  artifacts:
    paths:
      - public
  only:
    - main
```

---

## Demo Credentials

After seeding the database, use these credentials (all share the same password):

**Admin:**
- Email: `admin@demo.com`
- Password: `Demo@1234`

**Team Member:**
- Email: `team@demo.com`
- Password: `Demo@1234`

**Client:**
- Email: `client@demo.com`
- Password: `Demo@1234`

⚠️ **Change these passwords immediately in production!**

---

## Troubleshooting

### Login Issues

1. **Check CORS**: Ensure `CLIENT_URL` in backend matches your frontend URL
2. **Check JWT_SECRET**: Must be set and at least 16 characters
3. **Check Database**: Ensure `DATABASE_URL` is correct and database is accessible
4. **Check API URL**: Frontend `VITE_API_URL` must point to correct backend

### Build Errors

1. **Node version**: Ensure using Node 18+ or 20+
2. **Dependencies**: Run `npm install` in both client and server directories
3. **Prisma**: Run `npx prisma generate` after installing dependencies

---

## Security Checklist for Production

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (32+ random characters)
- [ ] Use production database (not development)
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Use environment variables (never commit secrets)
- [ ] Enable Razorpay production mode (not test)
- [ ] Configure proper SMTP for emails

---

## Need Help?

Open an issue on GitHub or check the documentation in `docs/` directory.
