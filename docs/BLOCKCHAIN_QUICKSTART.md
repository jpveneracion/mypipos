# Blockchain Integration - Quick Start Guide

## Installation

The blockchain integration is already included in myPiPOS. No additional installation required.

## Basic Usage

### 1. Look Up a Transaction

**Using the API:**
```typescript
const response = await fetch('/api/blockchain/transaction/YOUR_TXID');
const data = await response.json();

if (data.success) {
  console.log('Transaction:', data.transaction);
  console.log('Status:', data.transaction.status);
  console.log('Amount:', data.transaction.amount);
}
```

**Using the library directly:**
```typescript
import { getTransaction } from '@/lib/blockchain';

const result = await getTransaction('YOUR_TXID');

if (result.success) {
  console.log('Transaction:', result.transaction);
}
```

### 2. Verify a Payment

**API:**
```typescript
const response = await fetch(
  '/api/blockchain/transaction/YOUR_TXID?amount=3.14&recipient=ADDRESS'
);
const data = await response.json();

if (data.verified) {
  console.log('Payment verified!');
}
```

**Library:**
```typescript
import { verifyTransaction } from '@/lib/blockchain';

const result = await verifyTransaction('YOUR_TXID', 3.14, 'RECIPIENT_ADDRESS');

if (result.verified) {
  console.log('Payment verified!');
}
```

### 3. Check Transaction Status

```typescript
import { getTransactionStatus } from '@/lib/blockchain';

const result = await getTransactionStatus('YOUR_TXID');

if (result.success) {
  console.log('Status:', result.status); // 'confirmed' | 'pending' | 'failed'
}
```

### 4. Batch Lookups

```typescript
import { getBatchTransactions } from '@/lib/blockchain';

const txids = ['txid1', 'txid2', 'txid3'];
const results = await getBatchTransactions(txids);

for (const [txid, result] of results.entries()) {
  console.log(`${txid}:`, result.success ? 'Found' : 'Not found');
}
```

## React Integration

### Custom Hook

```typescript
import { useState, useEffect } from 'react';
import { getTransaction, type TransactionInfo } from '@/lib/blockchain';

export function useTransaction(txid: string) {
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransaction() {
      try {
        const result = await getTransaction(txid);
        if (result.success && result.transaction) {
          setTransaction(result.transaction);
        } else {
          setError(result.error || 'Failed to fetch transaction');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (txid) {
      fetchTransaction();
    }
  }, [txid]);

  return { transaction, loading, error };
}

// Usage in component
function TransactionDetails({ txid }: { txid: string }) {
  const { transaction, loading, error } = useTransaction(txid);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!transaction) return <div>No transaction found</div>;

  return (
    <div>
      <p>Status: {transaction.status}</p>
      <p>Amount: {transaction.amount} Pi</p>
      <p>From: {transaction.from}</p>
      <p>To: {transaction.to}</p>
    </div>
  );
}
```

## Common Use Cases

### Payment Verification

```typescript
async function verifyPayment(txid: string, amount: number, recipient: string) {
  const result = await verifyTransaction(txid, amount, recipient);

  if (!result.success) {
    throw new Error(result.error);
  }

  if (!result.verified) {
    throw new Error(result.error || 'Payment verification failed');
  }

  // Payment is verified, process order
  return result.transaction;
}
```

### Transaction Monitoring

```typescript
async function monitorTransaction(txid: string) {
  const maxAttempts = 20;
  const checkInterval = 30000; // 30 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const result = await getTransactionStatus(txid);

    if (result.success && result.status === 'confirmed') {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error('Transaction not confirmed after maximum attempts');
}
```

### Daily Reconciliation

```typescript
async function reconcileDailyTransactions(txids: string[]) {
  const results = await getBatchTransactions(txids);

  let totalAmount = 0;
  let confirmedCount = 0;
  let failedCount = 0;

  for (const [txid, result] of results.entries()) {
    if (result.success && result.transaction) {
      if (result.transaction.status === 'confirmed') {
        totalAmount += result.transaction.amount;
        confirmedCount++;
      } else {
        failedCount++;
      }
    }
  }

  return {
    totalAmount,
    confirmedCount,
    failedCount,
    total: txids.length,
  };
}
```

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blockchain/transaction/[txid]` | GET | Get transaction details |
| `/api/blockchain/transaction/[txid]?amount=X&recipient=Y` | GET | Verify payment |
| `/api/blockchain/batch` | POST | Batch transaction lookup |
| `/api/blockchain/health` | GET | Check blockchain explorer health |

## Error Handling

```typescript
import {
  BlockchainError,
  NetworkError,
  TransactionNotFoundError,
  InvalidTransactionError,
  RateLimitError
} from '@/lib/blockchain';

try {
  const result = await getTransaction('txid');
  if (!result.success) {
    throw new Error(result.error);
  }
} catch (error) {
  if (error instanceof TransactionNotFoundError) {
    console.log('Transaction does not exist');
  } else if (error instanceof RateLimitError) {
    console.log('Too many requests, please wait');
  } else if (error instanceof NetworkError) {
    console.log('Network error, please try again');
  } else {
    console.log('Unknown error:', error);
  }
}
```

## Configuration

```typescript
import { configureBlockchain } from '@/lib/blockchain';

// Customize settings
configureBlockchain({
  testnetUrl: 'https://blockexplorer.minepi.com/testnet/api',
  mainnetUrl: 'https://blockexplorer.minepi.com/api',
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  requestTimeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
});
```

## Cache Management

```typescript
import {
  cacheTransaction,
  getCachedTransaction,
  clearCache,
  clearExpiredCache
} from '@/lib/blockchain';

// Check cache first
const cached = getCachedTransaction('txid');
if (cached) {
  console.log('From cache:', cached);
}

// Clear all cache
clearCache();

// Clear only expired entries
clearExpiredCache();
```

## Testing

```typescript
import { getTransaction } from '@/lib/blockchain';

// Test transaction lookup
const result = await getTransaction('test-txid');
console.log('Transaction:', result);

// Test payment verification
const verification = await verifyTransaction('test-txid', 3.14);
console.log('Verification:', verification.verified);
```

## Best Practices

1. **Use caching**: The library automatically caches results to reduce API calls
2. **Handle errors**: Always check `success` field and handle errors appropriately
3. **Batch operations**: Use batch endpoint for multiple transactions
4. **Monitor rate limits**: Implement exponential backoff for rate limit errors
5. **Verify payments**: Always verify transactions before processing orders

## Troubleshooting

**Problem**: "Transaction not found"
- **Solution**: Verify TXID is correct and transaction exists on the network

**Problem**: "Rate limit exceeded"
- **Solution**: Use batch endpoints or implement client-side rate limiting

**Problem**: "Request timeout"
- **Solution**: Increase `requestTimeout` in configuration

**Problem**: "Invalid TXID format"
- **Solution**: Ensure TXID is a valid hex string (32-128 characters)

## Next Steps

- Read the [full documentation](./BLOCKCHAIN_INTEGRATION.md)
- Check [usage examples](./BLOCKCHAIN_EXAMPLES.md)
- Review [API tests](../src/app/api/blockchain/__tests__/route.test.ts)
- Explore [type definitions](../src/types/blockchain.ts)

## Support

For issues or questions:
- Check the documentation in `/docs/BLOCKCHAIN_INTEGRATION.md`
- Review the examples in `/docs/BLOCKCHAIN_EXAMPLES.md`
- Examine the test files for usage patterns
