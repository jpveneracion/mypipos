# Pi Network Integration Guide

## 🥧 Pi Network Credentials Explained

### **NO App ID Required** (Authentication)
Modern Pi Network SDK v2.0 **does not require an App ID** for user authentication.

**Authentication Flow:**
1. Frontend: `Pi.authenticate()` → returns `accessToken`
2. Backend: Calls `https://api.minepi.com/v2/me` with `Bearer: {accessToken}` to verify user
3. Database: Creates/updates user based on verified Pi data

### **YES API Key Required** (Payments)
Server-side payment operations **DO require an API Key** from Pi Network developers portal.

**Payment Operations Requiring API Key:**
- Payment approval (`/payments/{id}/approve`)
- Payment completion (`/payments/{id}/complete`)  
- Payment verification (`/payments/{id}`)
- Blockchain transaction submission

## 🔑 Getting Your Pi Network API Key

1. **Visit Pi Network Developers Portal**
   - Go to: https://developers.minepi.com
   - Sign up/login with your Pi Network account

2. **Create a New App**
   - Click "Create New App"
   - Fill in app details (name, description, etc.)
   - Your API key will be generated

3. **Copy Your API Key**
   - Found in your app dashboard
   - Format: Typically starts with `pi_` or similar prefix
   - Keep this secret! Never commit to git

## ⚙️ Environment Configuration

### **Development (.env.local)**
```bash
# Pi Network API URLs
PI_API_URL=https://api.minepi.com/v2
PI_API_KEY=your-pi-api-key-here

# For testnet development:
# PI_API_URL=https://api.testnet.minepi.com/v2
```

### **Production (Vercel/Deployment)**
Add these environment variables in your deployment platform:
- `PI_API_URL=https://api.minepi.com/v2`
- `PI_API_KEY=your-production-api-key`

## 🔒 Security Best Practices

### **API Key Protection**
- ✅ Store in environment variables (never in code)
- ✅ Use different keys for dev/production
- ✅ Rotate keys periodically
- ❌ Never commit `.env` files to git
- ❌ Never expose API keys in client-side code

### **Authentication Security**
- ✅ Access tokens only stored in localStorage (session-based)
- ✅ Server-side verification via Pi API
- ✅ RLS policies for database access control
- ❌ No permanent credentials in frontend

## 📡 API Endpoints

### **Authentication (No API Key)**
```typescript
// POST /api/auth/pi
// Body: { accessToken: string }
// Verifies user via Pi API and creates/updates database record
```

### **Payments (API Key Required)**
```typescript
// POST /api/payments/approve
// Body: { paymentId: string }
// Approves payment using server-side API key

// POST /api/payments/complete  
// Body: { paymentId: string, txid: string }
// Completes payment after blockchain transaction

// POST /api/payments/verify
// Body: { paymentId: string }
// Verifies payment status using API key
```

## 🧪 Testing Integration

### **Local Development**
1. Set up environment variables in `.env.local`
2. Test authentication flow (no API key needed)
3. Test payment flow (API key required)

### **Testnet vs Mainnet**
```bash
# Testnet (for development/testing)
PI_API_URL=https://api.testnet.minepi.com/v2

# Mainnet (production)
PI_API_URL=https://api.minepi.com/v2
```

## 📚 Additional Resources

- **Pi Network Docs:** https://developers.minepi.com/docs
- **Pi SDK Reference:** https://developers.minepi.com/docs/sdk
- **Payments API:** https://developers.minepi.com/docs/payments-api
- **My Reference Implementation:** `E:\laragon\www\mypiroll-nxt\mypiroll`

## 🚀 Common Issues

### **Authentication Issues**
- **Problem:** "Pi SDK not available"
- **Solution:** Ensure Pi Network SDK script is loaded in `<head>`

### **Payment Issues** 
- **Problem:** "PI_API_KEY not configured"
- **Solution:** Add API key to environment variables
- **Problem:** "Invalid API key"
- **Solution:** Verify API key is correct and not expired

### **CORS Issues**
- **Problem:** API calls blocked by CORS
- **Solution:** Use Next.js API routes as proxy (already implemented)

## ✅ Implementation Checklist

- [ ] Get API key from https://developers.minepi.com
- [ ] Add `PI_API_URL` and `PI_API_KEY` to `.env.local`
- [ ] Test authentication flow (login with Pi)
- [ ] Test payment flow (create/approve/complete)
- [ ] Configure production environment variables
- [ ] Set up monitoring for payment operations
- [ ] Test with testnet before mainnet deployment

---

**Your myPiPOS app is ready for Pi Network integration! 🎉**