# Vercel Deployment Setup Guide

This guide will help you set up the necessary environment variables for deploying myPiPOS to Vercel.

## Prerequisites

1. **Neon PostgreSQL Database**: Get your connection string from [console.neon.tech](https://console.neon.tech/)
2. **Pi Network API Key**: Get your API key from [developers.minepi.com](https://developers.minepi.com)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)

## Environment Variables Setup

### 1. Database Configuration

**Variable Name**: `DATABASE_URL`
**Description**: Neon PostgreSQL connection string
**How to get**:
  1. Go to [console.neon.tech](https://console.neon.tech/)
  2. Select your project
  3. Copy the connection string
  4. Format: `postgresql://user:password@host/database?sslmode=require`

### 2. Pi Network Configuration

**Variable Name**: `PI_API_URL`
**Description**: Pi Network API endpoint
**Values**:
  - Development: `https://api.testnet.minepi.com/v2`
  - Production: `https://api.minepi.com/v2`

**Variable Name**: `PI_API_KEY`
**Description**: Pi Network API key for server-side operations
**How to get**:
  1. Go to [developers.minepi.com](https://developers.minepi.com)
  2. Create/select your app
  3. Copy your API key

**Variable Name**: `PI_WALLET_ADDRESS`
**Description**: Platform wallet address for A2U payments
**How to get**:
  1. Create/import a Pi Network wallet
  2. Copy your wallet address (starts with 'G' or similar)
  3. This will be the sender address for platform-to-user payments

**Variable Name**: `PI_WALLET_PRIVATE_KEY` or `PI_WALLET_SEED`
**Description**: Private key or seed phrase for wallet operations
**How to get**:
  1. From your Pi Network wallet settings
  2. Export private key or seed phrase
  3. **WARNING**: Keep this extremely secure!
  4. Never share or commit to version control

**Security Notes**:
  - Use environment-specific wallets (testnet vs mainnet)
  - Never use production wallet for development
  - Consider using Vercel's encrypted environment variables
  - Rotate keys if compromised

### 3. Application Configuration

**Variable Name**: `NEXT_PUBLIC_APP_URL`
**Description**: Your application URL
**Values**:
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.vercel.app`

**Variable Name**: `NEXTAUTH_SECRET`
**Description**: Secret key for NextAuth authentication
**How to generate**: Run `openssl rand -base64 32` in your terminal

**Variable Name**: `NEXTAUTH_URL`
**Description**: Your application URL for NextAuth
**Values**: Same as `NEXT_PUBLIC_APP_URL`

### 4. Environment

**Variable Name**: `NODE_ENV`
**Description**: Environment mode
**Values**: `development` or `production`

## Setting Up in Vercel

### Method 1: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each environment variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Corresponding value
   - **Environment**: Select appropriate environments (Production, Preview, Development)
4. Click **Save** for each variable
5. **Redeploy** your project after adding variables

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add DATABASE_URL
vercel env add PI_API_URL
vercel env add PI_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add NODE_ENV

# Deploy to production
vercel --prod
```

## Pre-deployment Checklist

- [ ] `DATABASE_URL` is set to your Neon PostgreSQL connection string
- [ ] `PI_API_URL` points to correct environment (testnet vs production)
- [ ] `PI_API_KEY` is valid and has required permissions
- [ ] `NEXT_PUBLIC_APP_URL` matches your deployment domain
- [ ] `NEXTAUTH_SECRET` is a secure random string
- [ ] `NEXTAUTH_URL` matches your deployment domain
- [ ] `NODE_ENV` is set to `production` for production deployments

## Testing Your Deployment

1. **Check environment variables**: Go to Vercel dashboard → Settings → Environment Variables
2. **Test database connection**: Check deployment logs for database connection errors
3. **Test API endpoints**: Use `/api/health` or similar endpoints to verify connectivity
4. **Test Pi Network integration**: Make a small test payment

## Common Issues & Solutions

### Issue: Database connection fails
**Solution**: 
- Verify `DATABASE_URL` format
- Check Neon database is active
- Ensure IP whitelist allows Vercel connections

### Issue: Pi Network API errors
**Solution**:
- Verify `PI_API_KEY` is correct
- Check `PI_API_URL` points to correct network (testnet vs mainnet)
- Ensure API key has required permissions

### Issue: Authentication failures
**Solution**:
- Regenerate `NEXTAUTH_SECRET`
- Ensure `NEXTAUTH_URL` matches your domain exactly
- Clear browser cookies and cache

## Post-deployment Steps

1. **Run database migrations**:
   ```bash
   # SSH into your deployment or use Vercel CLI
   vercel env pull .env.local
   npm run migrate
   ```

2. **Test critical flows**:
   - User registration/login
   - POS functionality
   - Payment processing
   - Invoice generation

3. **Set up monitoring**:
   - Vercel Analytics
   - Error tracking (e.g., Sentry)
   - Database performance monitoring

## Environment-Specific Configurations

### Development (.env.local)
```env
DATABASE_URL=postgresql://localhost/mypipos_dev
PI_API_URL=https://api.testnet.minepi.com/v2
PI_API_KEY=your-test-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Production (Vercel)
```env
DATABASE_URL=your-neon-production-url
PI_API_URL=https://api.minepi.com/v2
PI_API_KEY=your-production-api-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generated-secure-random-string
NEXTAUTH_URL=https://your-domain.vercel.app
NODE_ENV=production
```

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)
- **Pi Network Docs**: [developers.minepi.com](https://developers.minepi.com)

---

**Last Updated**: 2026-05-25
**Version**: 1.0