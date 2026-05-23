# Vercel Deployment with Neon Database Guide

## 🚀 Vercel + Neon Database Setup

This guide walks you through deploying myPiPOS on Vercel with Neon PostgreSQL database.

---

## Step 1: Create Neon Database Account

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project:
   - **Project name:** `myPiPOS` (or your preferred name)
   - **Region:** Choose closest to your users (recommended: US East)
   - **PostgreSQL version:** 16 (latest)

---

## Step 2: Get Neon Connection Details

After creating your Neon project, you'll get a connection string like:
```
postgresql://username:password@ep-xyz-123.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Copy this connection string** - you'll need it for Vercel environment variables.

---

## Step 3: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

### Database Configuration
```
DATABASE_URL=postgresql://username:password@ep-xyz-123.us-east-1.aws.neon.tech/neondb?sslmode=require

# Or individual variables (alternative format)
DB_HOST=ep-xyz-123.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-username
DB_PASSWORD=your-password
```

### Pi Network Configuration
```
NEXT_PUBLIC_PI_APP_ID=your-pi-app-id
PI_API_KEY=your-pi-api-key
```

### Application Configuration
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

---

## Step 4: Prepare Database Migrations

Since Vercel doesn't have persistent filesystem access, you'll need to run migrations differently:

### Option A: Run Migrations Locally with Neon Connection
```bash
# Set DATABASE_URL to Neon connection string
export DATABASE_URL="postgresql://username:password@ep-xyz-123.aws.neon.tech/neondb?sslmode=require"

# Run migrations
npm run migrate
```

### Option B: Use Vercel Postgres (Recommended)
1. In Vercel, go to **Storage** → **Create Database**
2. Choose **Neon PostgreSQL**
3. Vercel will automatically set `DATABASE_URL` and `POSTGRES_URL` environment variables

---

## Step 5: Deploy to Vercel

### Via Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add environment variables from Step 3
6. Click **"Deploy"**

### Via Vercel CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

---

## Step 6: Run Migrations on Neon

### Using Vercel CLI:
```bash
# Connect to your Vercel project
vercel link

# Open a remote shell
vercel env pull .env.local

# Set DATABASE_URL to your Neon connection string
# Then run migrations
npm run migrate
```

### Using Neon CLI:
```bash
# Install Neon CLI
npm i -g @neondatabase/serverless

# Run migrations directly on Neon
neon db-migrate apply --name myPiPOS
```

---

## Step 7: Verify Deployment

1. Check your Vercel deployment logs
2. Test your application URL: `https://your-app.vercel.app`
3. Test database connectivity
4. Verify Pi Network authentication

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test Neon connection directly
psql $DATABASE_URL

# If psql is not available, use:
npm run db:test
```

### Migration Failures
- Check that `DATABASE_URL` is correctly set
- Verify Neon database is active (not paused)
- Check migration file permissions

### Build Failures
- Check environment variables in Vercel dashboard
- Verify all dependencies are in package.json
- Check build logs for specific errors

---

## 📊 Neon Database Management

### View Your Database
- Go to [Neon Console](https://console.neon.tech)
- Select your project
- Use **SQL Editor** to run queries
- View tables, indexes, and data

### Monitor Performance
- Neon provides built-in monitoring
- Check query performance
- Monitor connection usage
- Set up alerts for issues

### Backup & Restore
- Neon handles automatic backups
- Point-in-time recovery available
- Branching for development/testing

---

## 🚦 Production Considerations

### Security
- ✅ Neon uses SSL by default
- ✅ Row-Level Security (RLS) enabled in schema
- ✅ Environment variables for sensitive data
- ✅ Never commit `.env` files

### Performance
- ✅ Neon scales automatically
- ✅ Connection pooling available
- ✅ Edge functions for global distribution
- ✅ Database indexes optimized

### Monitoring
- Set up Vercel Analytics
- Enable Neon monitoring
- Monitor error rates
- Track API response times

---

## 📝 Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] All environment variables configured
- [ ] Home page loads correctly
- [ ] Pi Network authentication works
- [ ] Customer dashboard functional
- [ ] API endpoints responding
- [ ] Error monitoring configured
- [ ] Backup strategy confirmed
- [ ] Performance baseline established
- [ ] Security audit completed

---

**Your myPiPOS app is now live on Vercel with Neon database! 🎉**

For issues or questions, check:
- [Vercel Docs](https://vercel.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
