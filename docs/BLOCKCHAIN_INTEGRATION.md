# Blockchain Integration Documentation

## Overview

This module provides comprehensive blockchain integration for the Pi Network, including transaction lookup, verification, caching, and API endpoints.

## Features

- **Transaction Lookup**: Fetch transaction details by TXID from Pi Network blockchain explorer
- **Transaction Verification**: Verify payments against expected amounts and recipients
- **Smart Caching**: In-memory caching with configurable TTL to reduce API calls
- **Error Handling**: Comprehensive error handling with retry logic and rate limit protection
- **Batch Operations**: Look up multiple transactions in a single request
- **Type Safety**: Full TypeScript support with detailed type definitions

## Installation

The blockchain utilities are located in `src/lib/blockchain.ts` and API endpoints are in `src/app/api/blockchain/`.

## Configuration

### Default Configuration

```typescript
import { configureBlockchain } from '@/lib/blockchain';

configureBlockchain({
  testnetUrl: 'https://blockexplorer.minepi.com/testnet/api',
  mainnetUrl: 'https://blockexplorer.minepi.com/api',
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  requestTimeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
});
```

### Environment Variables

The blockchain explorer automatically switches between testnet and mainnet based on:

- `NEXT_PUBLIC_PI_NETWORK` environment variable
- `NODE_ENV` (development uses testnet)

## API Usage

### 1. Get Transaction Details

**Endpoint**: `GET /api/blockchain/transaction/[txid]`

**Example**:
```typescript
const response = await fetch('/api/blockchain/transaction/abc123...');
const data = await response.json();

// Response
{
  "success": true,
  "transaction": {
    "txid": "abc123...",
    "status": "confirmed",
    "amount": 3.1415926,
    "from": "sender-address",
    "to": "recipient-address",
    "timestamp": "2026-01-22T00:00:00.000Z",
    "blockNumber": 12345,
    "blockHash": "block-hash",
    "confirmations": 10
  },
  "cached": false
}
```

### 2. Verify Transaction Payment

**Endpoint**: `GET /api/blockchain/transaction/[txid]?amount=3.14&recipient=address`

**Query Parameters**:
- `amount` (required): Expected payment amount in Pi
- `recipient` (optional): Expected recipient address

**Example**:
```typescript
const response = await fetch(
  '/api/blockchain/transaction/abc123...?amount=3.1415926&recipient=GABC123...'
);
const data = await response.json();

// Response
{
  "success": true,
  "verified": true,
  "transaction": { ... }
}
```

### 3. Batch Transaction Lookup

**Endpoint**: `POST /api/blockchain/batch`

**Body**:
```json
{
  "txids": ["txid1", "txid2", "txid3"]
}
```

**Example**:
```typescript
const response = await fetch('/api/blockchain/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txids: ['abc123...', 'def456...']
  })
});

const data = await response.json();

// Response
{
  "success": true,
  "results": {
    "abc123...": {
      "success": true,
      "transaction": { ... }
    },
    "def456...": {
      "success": false,
      "error": "Transaction not found"
    }
  },
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

### 4. Health Check

**Endpoint**: `GET /api/blockchain/health`

**Example**:
```typescript
const response = await fetch('/api/blockchain/health');
const data = await response.json();

// Response
{
  "success": true,
  "healthy": true,
  "explorer": "https://blockexplorer.minepi.com/testnet/api",
  "timestamp": "2026-01-22T00:00:00.000Z",
  "status": "operational"
}
```

## Library Usage

### Direct Library Functions

```typescript
import {
  getTransaction,
  verifyTransaction,
  getTransactionStatus,
  cacheTransaction,
  getCachedTransaction,
  clearCache,
  type TransactionInfo,
  type TransactionResponse
} from '@/lib/blockchain';

// Get transaction details
const result: TransactionResponse = await getTransaction('txid...');
if (result.success && result.transaction) {
  console.log('Amount:', result.transaction.amount);
  console.log('Status:', result.transaction.status);
}

// Verify payment
const verification = await verifyTransaction(
  'txid...',
  3.1415926,
  'recipient-address'
);

if (verification.verified) {
  console.log('Payment verified!');
}

// Get transaction status only
const status = await getTransactionStatus('txid...');
console.log('Status:', status.status);

// Manual cache management
cacheTransaction('txid...', transactionData);
const cached = getCachedTransaction('txid...');
clearCache(); // Clear all cache
clearExpiredCache(); // Clear only expired entries
```

## Transaction Status Values

- `confirmed`: Transaction is confirmed and irreversible
- `pending`: Transaction is waiting for confirmation
- `failed`: Transaction failed
- `unknown`: Status could not be determined

## Error Handling

The module provides specific error classes:

```typescript
import {
  BlockchainError,
  NetworkError,
  RateLimitError,
  TransactionNotFoundError,
  InvalidTransactionError
} from '@/lib/blockchain';

try {
  const result = await getTransaction('txid...');
  if (!result.success) {
    throw new Error(result.error);
  }
} catch (error) {
  if (error instanceof TransactionNotFoundError) {
    // Handle missing transaction
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
  } else if (error instanceof NetworkError) {
    // Handle network issues
  }
}
```

## Caching Strategy

### How Caching Works

1. **First Request**: Fetch from blockchain explorer and cache the result
2. **Subsequent Requests**: Return cached data if within TTL (default 5 minutes)
3. **Cache Expiry**: Cached entries automatically expire after TTL
4. **Manual Control**: You can manually clear cache or specific entries

### Cache Management

```typescript
// Check if transaction is cached
const cached = getCachedTransaction('txid...');

// Manually cache a transaction
cacheTransaction('txid...', transactionData);

// Clear all cache
clearCache();

// Clear only expired entries (recommended for cleanup)
clearExpiredCache();
```

## Rate Limiting

The module handles rate limiting automatically:

- **Automatic Retry**: Retries failed requests with exponential backoff
- **Rate Limit Detection**: Detects 429 status codes
- **Configurable**: Adjust retry count and delay in configuration

```typescript
configureBlockchain({
  maxRetries: 5,        // Increase retry attempts
  retryDelay: 2000,     // Increase delay between retries
});
```

## Testing

Run the blockchain integration tests:

```bash
npm test src/lib/__tests__/blockchain.test.ts
```

## Security Considerations

1. **Non-Custodial**: This integration does not handle private keys
2. **Read-Only**: Only reads blockchain data, no transaction signing
3. **API Key**: No API keys required for blockchain explorer
4. **Rate Limits**: Implements rate limit protection
5. **Input Validation**: Validates all TXID formats before API calls

## Performance Optimization

1. **Caching**: Reduces API calls by caching results
2. **Batch Requests**: Use batch endpoint for multiple transactions
3. **Concurrency Control**: Batch operations limit concurrent requests
4. **Timeout Handling**: Configurable timeouts prevent hanging requests

## Future Enhancements

- **Soroban Integration**: Smart contract interaction support
- **WebSocket**: Real-time transaction monitoring
- **Metrics**: Usage analytics and performance tracking
- **Multi-Network**: Support for additional blockchain networks

## Troubleshooting

### Common Issues

**Issue**: "Transaction not found"
- **Solution**: Verify TXID is correct and transaction exists on the network

**Issue**: "Rate limit exceeded"
- **Solution**: Implement client-side rate limiting or use batch endpoints

**Issue**: "Request timeout"
- **Solution**: Increase `requestTimeout` in configuration

**Issue**: "Invalid TXID format"
- **Solution**: Ensure TXID is a valid hex string (32-128 characters)

## Support

For issues or questions about the blockchain integration, please refer to:
- Pi Network Documentation: https://docs.minepi.com
- Pi Network Block Explorer: https://blockexplorer.minepi.com

## License

This blockchain integration is part of the myPiPOS project.
