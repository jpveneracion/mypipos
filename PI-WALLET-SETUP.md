# Pi Network Wallet Setup Guide

This guide will help you set up your Pi Network wallet credentials for myPiPOS platform operations.

## What You Need

1. **Pi Network Wallet Address** - Public address for receiving/sending Pi
2. **Private Key/Seed Phrase** - Secret credentials for wallet operations

## Security First

⚠️ **CRITICAL SECURITY NOTES:**
- **NEVER** share your private key or seed phrase
- **NEVER** commit these credentials to version control
- **NEVER** use production wallet for development/testing
- **ALWAYS** use separate wallets for testnet and mainnet
- **CONSIDER** using hardware wallets for large amounts

## Getting Your Wallet Credentials

### Method 1: Using Pi Browser Wallet

1. **Open Pi Browser App**
   - Download from app store
   - Login with your Pi account

2. **Access Wallet**
   - Navigate to "Wallet" in Pi Browser
   - Click on your profile/settings

3. **Export Wallet Address**
   - Your wallet address is displayed publicly
   - Format: Typically starts with 'G' followed by alphanumeric characters
   - Copy this address for `PI_WALLET_ADDRESS`

4. **Export Private Key/Seed**
   - Go to Wallet Settings → Security
   - Look for "Export Private Key" or "Show Seed Phrase"
   - You may need to enter your Pi password
   - Copy the private key OR seed phrase for `PI_WALLET_PRIVATE_KEY`

### Method 2: Using Pi Network CLI/API

1. **Install Pi SDK**
   ```bash
   npm install @pi/network/pi-sdk
   ```

2. **Create Wallet Programmatically**
   ```javascript
   const Pi = require('@pi/network/pi-sdk');
   
   // Generate new wallet
   const wallet = Pi.Wallet.createRandom();
   
   console.log('Address:', wallet.address);
   console.log('Private Key:', wallet.privateKey);
   console.log('Seed Phrase:', wallet.mnemonic.phrase);
   ```

3. **Import Existing Wallet**
   ```javascript
   const wallet = Pi.Wallet.fromMnemonic(yourSeedPhrase);
   console.log('Address:', wallet.address);
   ```

### Method 3: Using Pi Network Testnet Faucet (for development)

1. **Get Testnet Pi**
   - Visit Pi Network testnet faucet
   - Create/import testnet wallet
   - Get free test Pi for development

2. **Use Testnet Credentials**
   - Testnet wallet address
   - Testnet private key
   - Only works with `PI_API_URL=https://api.testnet.minepi.com/v2`

## Environment Variables Configuration

### Format Options

**Option 1: Private Key**
```env
PI_WALLET_ADDRESS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PI_WALLET_PRIVATE_KEY=0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Option 2: Seed Phrase**
```env
PI_WALLET_ADDRESS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PI_WALLET_SEED=word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12
```

**Option 3: Seed Phrase (comma-separated)**
```env
PI_WALLET_SEED=word1,word2,word3,word4,word5,word6,word7,word8,word9,word10,word11,word12
```

## Setting Up in Vercel

### Step 1: Add to Environment Variables

1. Go to Vercel Project → Settings → Environment Variables
2. Add the following:

```env
PI_WALLET_ADDRESS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PI_WALLET_PRIVATE_KEY=0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 2: Choose Environment Scope

- **Development**: Use testnet wallet
- **Preview**: Use testnet wallet  
- **Production**: Use mainnet wallet (with proper security)

### Step 3: Redeploy

After adding environment variables, redeploy your application:
```bash
vercel --prod
```

## Testing Your Wallet Setup

### 1. Verify Wallet Connection

Create a test endpoint to verify wallet credentials:

```typescript
// src/app/api/test-wallet/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const walletAddress = process.env.PI_WALLET_ADDRESS;
  const hasPrivateKey = !!process.env.PI_WALLET_PRIVATE_KEY || !!process.env.PI_WALLET_SEED;
  
  return NextResponse.json({
    walletAddress: walletAddress?.substring(0, 10) + '...', // Partial address for security
    hasCredentials: hasPrivateKey,
    network: process.env.PI_API_URL?.includes('testnet') ? 'testnet' : 'mainnet'
  });
}
```

### 2. Test A2U Payment

Use your Test Pi Claim feature to verify wallet operations:
- Claim 1 test Pi as a customer
- Check database for A2U payment record
- Verify transaction on Pi blockchain explorer

## Wallet Operations

### Sending A2U Payments

Your wallet will be used for:
- **Customer Rewards**: Test Pi claims
- **Refunds**: Processing customer refunds
- **Merchant Payouts**: Paying merchants their share
- **Platform Transfers**: Moving funds between wallets

### Security Best Practices

1. **Separate Wallets by Environment**
   - Development wallet (testnet)
   - Staging wallet (testnet)
   - Production wallet (mainnet)

2. **Limit Wallet Access**
   - Only use in server-side code
   - Never expose to client-side JavaScript
   - Use environment variables only

3. **Monitor Wallet Activity**
   - Set up transaction monitoring
   - Alert on unusual activity
   - Regular security audits

4. **Backup Procedures**
   - Securely backup seed phrases
   - Store in encrypted format
   - Test recovery process

## Troubleshooting

### Issue: Invalid Wallet Address
**Solution**: 
- Verify address format (starts with 'G')
- Check for extra spaces or characters
- Ensure address matches network (testnet vs mainnet)

### Issue: Transaction Fails
**Solution**:
- Verify wallet has sufficient Pi balance
- Check API URL matches wallet network
- Ensure private key is correct

### Issue: Security Warnings
**Solution**:
- Never hardcode credentials in code
- Use Vercel's encrypted environment variables
- Rotate credentials if accidentally exposed

## Advanced Configuration

### Multiple Wallets

For different operations, you can use multiple wallets:

```env
# Platform rewards wallet
PI_REWARDS_WALLET_ADDRESS=G...
PI_REWARDS_WALLET_PRIVATE_KEY=0x...

# Refunds wallet  
PI_REFUNDS_WALLET_ADDRESS=G...
PI_REFUNDS_WALLET_PRIVATE_KEY=0x...

# Payouts wallet
PI_PAYOUTS_WALLET_ADDRESS=G...
PI_PAYOUTS_WALLET_PRIVATE_KEY=0x...
```

### Hardware Wallet Integration

For enhanced security:
1. Use hardware wallet (Ledger, Trezor)
2. Store only public address in environment
3. Manual approval for large transactions
4. Cold storage for majority of funds

## Resources

- **Pi Network Wallet**: [wallet.pi](https://wallet.pi)
- **Pi Network Developer Docs**: [developers.minepi.com](https://developers.minepi.com)
- **Pi Blockchain Explorer**: [explorer.minepi.com](https://explorer.minepi.com)
- **Testnet Faucet**: [faucet.minepi.com](https://faucet.minepi.com)

---

**Last Updated**: 2026-05-25
**Version**: 1.0

⚠️ **Remember**: Always test with testnet wallets and small amounts before using real funds on mainnet!