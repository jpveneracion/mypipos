/**
 * Blockchain Integration Validation Tests
 * Quick validation tests to ensure core functionality works
 */

import {
  isValidTxid,
  cacheTransaction,
  getCachedTransaction,
  clearCache,
  parsePiAmount,
  type TransactionInfo,
} from '../blockchain';

describe('Blockchain Integration - Validation Tests', () => {
  beforeEach(() => {
    clearCache();
  });

  test('TXID validation works correctly', () => {
    // Valid TXIDs
    expect(isValidTxid('a1b2c3d4e5f6')).toBe(true);
    expect(isValidTxid('1234567890abcdef')).toBe(true);
    expect(isValidTxid('ABCDEF1234567890abcdef1234567890')).toBe(true);

    // Invalid TXIDs
    expect(isValidTxid('')).toBe(false);
    expect(isValidTxid('abc')).toBe(false);
    expect(isValidTxid('invalid-chars-!@#')).toBe(false);
    expect(isValidTxid('123')).toBe(false);
  });

  test('Cache operations work correctly', () => {
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

    // Cache transaction
    cacheTransaction(txid, transaction);

    // Retrieve from cache
    const cached = getCachedTransaction(txid);
    expect(cached).toEqual(transaction);
    expect(cached?.txid).toBe(txid);
    expect(cached?.amount).toBe(3.1415926);
    expect(cached?.status).toBe('confirmed');

    // Clear cache
    clearCache();
    const afterClear = getCachedTransaction(txid);
    expect(afterClear).toBeNull();
  });

  test('Pi amount parsing works correctly', () => {
    const testCases = [
      { input: '3.1415926', expected: 3.1415926 },
      { input: '1.0', expected: 1.0 },
      { input: '0.0000001', expected: 0.0000001 },
      { input: 123.456, expected: 123.456 },
      { input: '0', expected: 0.0 },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = parsePiAmount(input);
      expect(result).toBeCloseTo(expected, 7);
    });
  });

  test('Cache handles multiple transactions', () => {
    const transactions = [
      { txid: 'tx1', status: 'confirmed' as const, amount: 1.0, from: 'a', to: 'b', timestamp: new Date().toISOString() },
      { txid: 'tx2', status: 'pending' as const, amount: 2.0, from: 'c', to: 'd', timestamp: new Date().toISOString() },
      { txid: 'tx3', status: 'failed' as const, amount: 3.0, from: 'e', to: 'f', timestamp: new Date().toISOString() },
    ];

    transactions.forEach(tx => {
      cacheTransaction(tx.txid, tx);
    });

    transactions.forEach(tx => {
      const cached = getCachedTransaction(tx.txid);
      expect(cached).toEqual(tx);
    });

    expect(getCachedTransaction('nonexistent')).toBeNull();
  });

  test('Transaction info structure is correct', () => {
    const transaction: TransactionInfo = {
      txid: 'test-txid',
      status: 'confirmed',
      amount: 3.1415926,
      from: 'sender',
      to: 'recipient',
      timestamp: '2026-01-22T00:00:00.000Z',
      blockNumber: 12345,
      blockHash: 'block-hash',
      confirmations: 10,
      fee: 0.001,
    };

    expect(transaction.txid).toBeDefined();
    expect(transaction.status).toBeDefined();
    expect(transaction.amount).toBeDefined();
    expect(transaction.from).toBeDefined();
    expect(transaction.to).toBeDefined();
    expect(transaction.timestamp).toBeDefined();
    expect(transaction.blockNumber).toBeDefined();
    expect(transaction.blockHash).toBeDefined();
    expect(transaction.confirmations).toBeDefined();
    expect(transaction.fee).toBeDefined();
  });
});

export {};
