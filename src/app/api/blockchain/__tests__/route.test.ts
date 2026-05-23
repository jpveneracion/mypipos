/**
 * API Endpoint Integration Tests
 * Tests for blockchain API endpoints
 */

import { GET } from '../transaction/[txid]/route';
import { GET as GET_HEALTH } from '../health/route';
import { POST as POST_BATCH } from '../batch/route';

// Mock the blockchain library
jest.mock('@/lib/blockchain', () => ({
  getTransaction: jest.fn(),
  verifyTransaction: jest.fn(),
  getExplorerUrl: jest.fn(() => 'https://testnet.example.com/api'),
}));

import { getTransaction, verifyTransaction } from '@/lib/blockchain';

describe('Blockchain API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/blockchain/transaction/[txid]', () => {
    it('should return transaction details successfully', async () => {
      const mockTransaction = {
        txid: 'test-txid-123',
        status: 'confirmed',
        amount: 3.1415926,
        from: 'sender-address',
        to: 'recipient-address',
        timestamp: '2026-01-22T00:00:00.000Z',
        blockNumber: 12345,
        blockHash: 'block-hash',
        confirmations: 10,
      };

      (getTransaction as jest.Mock).mockResolvedValueOnce({
        success: true,
        transaction: mockTransaction,
        cached: false,
      });

      const request = new Request('http://localhost:3000/api/blockchain/transaction/test-txid-123');
      const response = await GET(request, { params: { txid: 'test-txid-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transaction).toEqual(mockTransaction);
      expect(data.cached).toBe(false);
    });

    it('should handle transaction not found', async () => {
      (getTransaction as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Transaction not found',
      });

      const request = new Request('http://localhost:3000/api/blockchain/transaction/nonexistent');
      const response = await GET(request, { params: { txid: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should verify transaction with amount parameter', async () => {
      const mockTransaction = {
        txid: 'test-txid-verify',
        status: 'confirmed',
        amount: 3.1415926,
        from: 'sender-address',
        to: 'recipient-address',
        timestamp: '2026-01-22T00:00:00.000Z',
      };

      (verifyTransaction as jest.Mock).mockResolvedValueOnce({
        success: true,
        verified: true,
        transaction: mockTransaction,
      });

      const request = new Request(
        'http://localhost:3000/api/blockchain/transaction/test-txid-verify?amount=3.1415926'
      );
      const response = await GET(request, { params: { txid: 'test-txid-verify' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.verified).toBe(true);
      expect(data.transaction).toEqual(mockTransaction);
      expect(verifyTransaction).toHaveBeenCalledWith(
        'test-txid-verify',
        3.1415926,
        undefined
      );
    });

    it('should verify transaction with amount and recipient parameters', async () => {
      const mockTransaction = {
        txid: 'test-txid-verify-full',
        status: 'confirmed',
        amount: 5.0,
        from: 'sender-address',
        to: 'expected-recipient',
        timestamp: '2026-01-22T00:00:00.000Z',
      };

      (verifyTransaction as jest.Mock).mockResolvedValueOnce({
        success: true,
        verified: true,
        transaction: mockTransaction,
      });

      const request = new Request(
        'http://localhost:3000/api/blockchain/transaction/test-txid-verify-full?amount=5.0&recipient=expected-recipient'
      );
      const response = await GET(request, { params: { txid: 'test-txid-verify-full' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.verified).toBe(true);
      expect(verifyTransaction).toHaveBeenCalledWith(
        'test-txid-verify-full',
        5.0,
        'expected-recipient'
      );
    });

    it('should reject invalid amount parameter', async () => {
      const request = new Request(
        'http://localhost:3000/api/blockchain/transaction/test-txid?amount=invalid'
      );
      const response = await GET(request, { params: { txid: 'test-txid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid amount');
    });

    it('should return cached transaction on second call', async () => {
      const mockTransaction = {
        txid: 'test-txid-cached',
        status: 'confirmed',
        amount: 1.0,
        from: 'sender',
        to: 'recipient',
        timestamp: '2026-01-22T00:00:00.000Z',
      };

      (getTransaction as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          transaction: mockTransaction,
          cached: false,
        })
        .mockResolvedValueOnce({
          success: true,
          transaction: mockTransaction,
          cached: true,
        });

      const request1 = new Request('http://localhost:3000/api/blockchain/transaction/test-txid-cached');
      const response1 = await GET(request1, { params: { txid: 'test-txid-cached' } });
      const data1 = await response1.json();

      const request2 = new Request('http://localhost:3000/api/blockchain/transaction/test-txid-cached');
      const response2 = await GET(request2, { params: { txid: 'test-txid-cached' } });
      const data2 = await response2.json();

      expect(data1.cached).toBe(false);
      expect(data2.cached).toBe(true);
    });
  });

  describe('GET /api/blockchain/health', () => {
    it('should return healthy status when explorer is available', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: { blockCount: 12345 } }),
      });

      const request = new Request('http://localhost:3000/api/blockchain/health');
      const response = await GET_HEALTH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.status).toBe('operational');
    });

    it('should return unhealthy status when explorer is down', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const request = new Request('http://localhost:3000/api/blockchain/health');
      const response = await GET_HEALTH(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.healthy).toBe(false);
      expect(data.status).toBe('down');
    });
  });

  describe('POST /api/blockchain/batch', () => {
    it('should process batch transaction requests', async () => {
      const mockTransactions = {
        'txid1': {
          success: true,
          transaction: {
            txid: 'txid1',
            status: 'confirmed',
            amount: 1.0,
            from: 'sender',
            to: 'recipient',
            timestamp: '2026-01-22T00:00:00.000Z',
          },
        },
        'txid2': {
          success: true,
          transaction: {
            txid: 'txid2',
            status: 'confirmed',
            amount: 2.0,
            from: 'sender',
            to: 'recipient',
            timestamp: '2026-01-22T00:00:00.000Z',
          },
        },
      };

      // Mock getBatchTransactions
      const { getBatchTransactions } = require('@/lib/blockchain');
      getBatchTransactions.mockResolvedValueOnce(new Map(Object.entries(mockTransactions)));

      const request = new Request('http://localhost:3000/api/blockchain/batch', {
        method: 'POST',
        body: JSON.stringify({ txids: ['txid1', 'txid2'] }),
      });
      const response = await POST_BATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(data.summary.total).toBe(2);
      expect(data.summary.successful).toBe(2);
      expect(data.summary.failed).toBe(0);
    });

    it('should reject batch requests with more than 50 txids', async () => {
      const request = new Request('http://localhost:3000/api/blockchain/batch', {
        method: 'POST',
        body: JSON.stringify({ txids: Array(51).fill('txid') }),
      });
      const response = await POST_BATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Maximum 50 transactions');
    });

    it('should reject invalid request body', async () => {
      const request = new Request('http://localhost:3000/api/blockchain/batch', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      });
      const response = await POST_BATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('txids array is required');
    });
  });
});

export {};
