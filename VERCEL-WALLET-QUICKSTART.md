# 🚀 Quick Start: Pi Network Wallet Setup for Vercel

## What You Need to Add to Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables** and add these:

### 1. PI_WALLET_ADDRESS
- **Your Pi Network wallet address** (public address)
- **Format**: Typically starts with 'G' followed by 50+ characters
- **How to get**: Pi Browser → Wallet → Copy Address
- **Example**: `GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 2. PI_WALLET_PRIVATE_KEY (Option A)
- **Your wallet's private key** (keep secret!)
- **Format**: Hex string starting with '0x'
- **How to get**: Pi Browser → Wallet → Settings → Export Private Key
- **Example**: `0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 3. PI_WALLET_SEED (Option B - Alternative to Private Key)
- **Your wallet's seed phrase** (12 or 24 words)
- **Format**: Space-separated or comma-separated words
- **How to get**: Pi Browser → Wallet → Settings → Show Seed Phrase
- **Example**: `word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12`

## ⚠️ CRITICAL SECURITY NOTES

- **NEVER** use your main Pi wallet for development/testing
- **CREATE** separate testnet and mainnet wallets
- **USE** testnet wallet first: `PI_API_URL=https://api.testnet.minepi.com/v2`
- **ONLY** switch to mainnet when everything works perfectly
- **CONSIDER** using Vercel's encrypted environment variables feature

## Step-by-Step Vercel Setup

### 1. Open Vercel Project
```
vercel login
vercel link
```

### 2. Add Environment Variables (CLI Method)
```bash
# Add wallet address
vercel env add PI_WALLET_ADDRESS
# Paste your wallet address when prompted

# Add private key (choose one method)
vercel env add PI_WALLET_PRIVATE_KEY
# Paste your private key when prompted

# OR add seed phrase
vercel env add PI_WALLET_SEED
# Paste your seed phrase when prompted
```

### 3. Choose Environment Scope
- **Development**: Use testnet wallet
- **Preview**: Use testnet wallet
- **Production**: Use mainnet wallet (only when ready!)

### 4. Deploy
```bash
vercel --prod
```

## 🧪 Test Your Setup

After deployment, test your wallet configuration:

```bash
# Test wallet endpoint
curl https://your-domain.vercel.app/api/debug/test-wallet
```

**Expected response:**
```json
{
  "success": true,
  "wallet": {
    "address": "GXXXXXXXXXX...",
    "network": "testnet",
    "hasCredentials": true
  },
  "configuration": {
    "PI_WALLET_ADDRESS": "Set ✓",
    "PI_WALLET_PRIVATE_KEY": "Set ✓"
  }
}
```

## 🔧 Troubleshooting

### Error: "PI_WALLET_ADDRESS not set"
**Solution**: Add the environment variable in Vercel dashboard

### Error: "Invalid wallet address format"  
**Solution**: Verify address starts with 'G' or 'H' and is 50+ characters

### Error: "Either PI_WALLET_PRIVATE_KEY or PI_WALLET_SEED must be set"
**Solution**: Add one (not both) of these environment variables

### Error: "Insufficient balance"
**Solution**: Ensure your wallet has enough Pi for A2U payments

## 📋 Pre-Deployment Checklist

- [ ] Testnet wallet set up for development
- [ ] Mainnet wallet set up for production (separate from testnet)
- [ ] PI_WALLET_ADDRESS added to Vercel environment variables
- [ ] PI_WALLET_PRIVATE_KEY or PI_WALLET_SEED added
- [ ] PI_API_URL points to correct network (testnet/mainnet)
- [ ] Wallet has sufficient Pi balance
- [ ] Tested with `/api/debug/test-wallet` endpoint
- [ ] Test Pi claim feature works successfully

## 🎯 Next Steps

1. **Test locally** with testnet credentials first
2. **Deploy to Vercel** with testnet configuration
3. **Test Test Pi claim feature** in preview deployment
4. **Switch to mainnet** only when everything works
5. **Monitor transactions** on Pi blockchain explorer

## 📚 Full Documentation

- **Complete Wallet Guide**: [PI-WALLET-SETUP.md](PI-WALLET-SETUP.md)
- **Vercel Setup Guide**: [VERCEL-SETUP.md](VERCEL-SETUP.md)
- **A2U Payment Documentation**: [docs/complete-pos-payment-ecosystem.md](docs/complete-pos-payment-ecosystem.md)

---

**Need help?** Check the full wallet setup guide for detailed instructions and security best practices.