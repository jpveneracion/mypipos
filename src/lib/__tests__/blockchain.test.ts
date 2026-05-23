/**
 * Blockchain Integration Tests
 * Tests for blockchain utilities and transaction lookup
 */

import {
  configureBlockchain,
  getTransaction,
  verifyTransaction,
  getTransactionStatus,
  cacheTransaction,
  getCachedTransaction,
  clearCache,
  clearExpiredCache,
  isValidTxid,
  InvalidTransactionError,
  TransactionNotFoundError,
  NetworkError,
  RateLimitError,
  type TransactionInfo,
} from '../blockchain';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Blockchain Utilities', () => {
  beforeEach(() => {
    // Reset fetch mock
    jest.clearAllMocks();
    // Clear cache before each test
    clearCache();
    // Reset configuration
    configureBlockchain({
      testnetUrl: 'https://testnet.example.com/api',
      mainnetUrl: 'https://mainnet.example.com/api',
      cacheTTL: 1000,
      requestTimeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
    });
  });

  describe('TXID Validation', () => {
    it('should validate correct TXID format', () => {
      expect(isValidTxid('a1b2c3d4e5f6')).toBe(true);
      expect(isValidTxid('1234567890abcdef')).toBe(true);
      expect(isValidTxid('ABCDEF1234567890')).toBe(true);
    });

    it('should reject invalid TXID format', () => {
      expect(isValidTxid('')).toBe(false);
      expect(isValidTxid('abc')).toBe(false);
      expect(isValidTxid('invalid-chars-!@#')).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache and retrieve transaction data', () => {
      const txid = 'test-txid-123';
      const transaction: TransactionInfo = {
        txid,
        status: 'confirmed',
        amount: 3.1415926,
        from: 'sender-address',
        to: 'recipient-address',
        timestamp: '2026-01-22T00:00:00.000Z',
        blockNumber: 12345,
        blockHash: 'block-hash',
        confirmations: 10,
      };

      cacheTransaction(txid, transaction);
      const cached = getCachedTransaction(txid);

      expect(cached).toEqual(transaction);
    });

    it('should return null for non-existent cache entries', () => {
      const cached = getCachedTransaction('non-existent-txid');
      expect(cached).toBeNull();
    });

    it('should expire cache entries after TTL', async () => {
      const txid = 'test-txid-456';
      const transaction: TransactionInfo = {
        txid,
        status: 'confirmed',
        amount: 1.0,
        from: 'sender',
        to: 'recipient',
        timestamp: new Date().toISOString(),
      };

      // Set short TTL
      configureBlockchain({ cacheTTL: 100 });

      cacheTransaction(txid, transaction);
      expect(getCachedTransaction(txid)).toEqual(transaction);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(getCachedTransaction(txid)).toBeNull();
    });

    it('should clear all cache entries', () => {
      cacheTransaction('txid1', {
        txid: 'txid1',
        status: 'confirmed',
        amount: 1.0,
        from: 'sender',
        to: 'recipient',
        timestamp: new Date().toISOString(),
      });

      cacheTransaction('txid2', {
        txid: 'txid2',
        status: 'pending',
        amount: 2.0,
        from: 'sender',
        to: 'recipient',
        timestamp: new Date().toISOString(),
      });

      expect(getCachedTransaction('txid1')).not.toBeNull();
      expect(getCachedTransaction('txid2')).not.toBeNull();

      clearCache();

      expect(getCachedTransaction('txid1')).toBeNull();
      expect(getCachedTransaction('txid2')).toBeNull();
    });

    it('should clear only expired cache entries', async () => {
      configureBlockchain({ cacheTTL: 200 });

      cacheTransaction('txid1', {
        txid: 'txid1',
        status: 'confirmed',
        amount: 1.0,
        from: 'sender',
        to: 'recipient',
        timestamp: new Date().toISOString(),
      });

      await new Promise(resolve => setTimeout(resolve, 250));

      cacheTransaction('txid2', {
        txid: 'txid2',
        status: 'confirmed',
        amount: 2.0,
        from: 'sender',
        to: 'recipient',
        timestamp: new Date().toISOString(),
      });

      clearExpiredCache();

      expect(getCachedTransaction('txid1')).toBeNull();
      expect(getCachedTransaction('txid2')).not.toBeNull();
    });
  });

  describe('Transaction Lookup', () => {
    it('should successfully fetch a transaction', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-789',
          status: 'confirmed',
          value: '3.1415926',
          from: 'sender-address',
          to: 'recipient-address',
          timeStamp: '1705900800',
          blockNumber: '12345',
          blockHash: 'block-hash',
          confirmations: '10',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getTransaction('test-txid-789');

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.txid).toBe('test-txid-789');
      expect(result.transaction?.status).toBe('confirmed');
      expect(result.transaction?.amount).toBe(3.1415926);
      expect(result.transaction?.from).toBe('sender-address');
      expect(result.transaction?.to).toBe('recipient-address');
      expect(result.cached).toBe(false);
    });

    it('should return cached transaction on second call', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-cache',
          status: 'confirmed',
          value: '1.0',
          from: 'sender',
          to: 'recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const firstCall = await getTransaction('test-txid-cache');
      const secondCall = await getTransaction('test-txid-cache');

      expect(firstCall.cached).toBe(false);
      expect(secondCall.cached).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid TXID', async () => {
      const result = await getTransaction('invalid-txid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid TXID format');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle transaction not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await getTransaction('non-existent-txid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle network errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            result: {
              txid: 'test-txid-retry',
              status: 'confirmed',
              value: '1.0',
              from: 'sender',
              to: 'recipient',
              timeStamp: '1705900800',
            },
          }),
        });

      const result = await getTransaction('test-txid-retry');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limiting', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await getTransaction('test-txid-ratelimit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });
  });

  describe('Transaction Status', () => {
    it('should get transaction status', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-status',
          status: 'confirmed',
          value: '1.0',
          from: 'sender',
          to: 'recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getTransactionStatus('test-txid-status');

      expect(result.success).toBe(true);
      expect(result.status).toBe('confirmed');
    });
  });

  describe('Transaction Verification', () => {
    it('should verify transaction with correct amount', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-verify',
          status: 'confirmed',
          value: '3.1415926',
          from: 'sender',
          to: 'recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await verifyTransaction('test-txid-verify', 3.1415926);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.transaction?.amount).toBe(3.1415926);
    });

    it('should fail verification with incorrect amount', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-wrong-amount',
          status: 'confirmed',
          value: '1.0',
          from: 'sender',
          to: 'recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await verifyTransaction('test-txid-wrong-amount', 5.0);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Amount mismatch');
    });

    it('should verify transaction with correct recipient', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-recipient',
          status: 'confirmed',
          value: '1.0',
          from: 'sender',
          to: 'expected-recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await verifyTransaction(
        'test-txid-recipient',
        1.0,
        'expected-recipient'
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should fail verification with incorrect recipient', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-wrong-recipient',
          status: 'confirmed',
          value: '1.0',
          from: 'sender',
          to: 'actual-recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await verifyTransaction(
        'test-txid-wrong-recipient',
        1.0,
        'expected-recipient'
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Recipient mismatch');
    });

    it('should fail verification for unconfirmed transactions', async () => {
      const mockResponse = {
        success: true,
        result: {
          txid: 'test-txid-pending',
          status: 'pending',
          value: '1.0',
          from: 'sender',
          to: 'recipient',
          timeStamp: '1705900800',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await verifyTransaction('test-txid-pending', 1.0);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('not confirmed');
    });
  });
});

export {};
