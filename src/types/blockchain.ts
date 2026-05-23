/**
 * Blockchain Type Definitions
 *
 * Central export point for all blockchain-related TypeScript types
 */

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction status values
 */
export type TransactionStatus = 'confirmed' | 'pending' | 'failed' | 'unknown';

/**
 * Pi amount with 7 decimal places (e.g., 3.1415926)
 */
export type PiAmount = number;

/**
 * Complete transaction information from blockchain
 */
export interface TransactionInfo {
  txid: string;
  status: TransactionStatus;
  amount: PiAmount;
  from: string;
  to: string;
  timestamp: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations?: number;
  fee?: PiAmount;
}

/**
 * Standard API response wrapper for transaction queries
 */
export interface TransactionResponse {
  success: boolean;
  transaction?: TransactionInfo;
  error?: string;
  cached?: boolean;
}

/**
 * Response for transaction verification
 */
export interface VerificationResponse {
  success: boolean;
  verified?: boolean;
  transaction?: TransactionInfo;
  error?: string;
}

/**
 * Response for transaction status queries
 */
export interface StatusResponse {
  success: boolean;
  status?: TransactionStatus;
  error?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Blockchain explorer configuration
 */
export interface BlockchainConfig {
  testnetUrl: string;
  mainnetUrl: string;
  cacheTTL: number; // Time to live in milliseconds
  requestTimeout: number; // Request timeout in milliseconds
  maxRetries: number;
  retryDelay: number; // Delay between retries in milliseconds
}

/**
 * Cache entry with timestamp for TTL management
 */
export interface CacheEntry {
  data: TransactionInfo;
  timestamp: number;
}

// ============================================================================
// Soroban Types (Future Support)
// ============================================================================

/**
 * Soroban smart contract transaction
 */
export interface SorobanTransaction {
  txid: string;
  status: TransactionStatus;
  contractId?: string;
  functionName?: string;
  parameters?: any[];
  result?: any;
  timestamp: string;
}

/**
 * Soroban execution response
 */
export interface SorobanExecutionResponse {
  success: boolean;
  txid?: string;
  result?: any;
  error?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Batch transaction request body
 */
export interface BatchTransactionRequest {
  txids: string[];
}

/**
 * Batch transaction response
 */
export interface BatchTransactionResponse {
  success: boolean;
  results: Record<string, TransactionResponse>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  success: boolean;
  healthy: boolean;
  explorer: string;
  timestamp: string;
  status: 'operational' | 'degraded' | 'down';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base blockchain error class
 */
export class BlockchainError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends BlockchainError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Rate limit error (HTTP 429)
 */
export class RateLimitError extends BlockchainError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Transaction not found error (HTTP 404)
 */
export class TransactionNotFoundError extends BlockchainError {
  constructor(txid: string) {
    super(`Transaction ${txid} not found`, 'TRANSACTION_NOT_FOUND', 404);
    this.name = 'TransactionNotFoundError';
  }
}

/**
 * Invalid transaction error (HTTP 400)
 */
export class InvalidTransactionError extends BlockchainError {
  constructor(message: string) {
    super(message, 'INVALID_TRANSACTION', 400);
    this.name = 'InvalidTransactionError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Transaction filter options for queries
 */
export interface TransactionFilter {
  status?: TransactionStatus;
  fromDate?: string;
  toDate?: string;
  minAmount?: PiAmount;
  maxAmount?: PiAmount;
  from?: string;
  to?: string;
}

/**
 * Transaction sort options
 */
export type TransactionSortField = 'timestamp' | 'amount' | 'blockNumber';
export type SortOrder = 'asc' | 'desc';

export interface TransactionSort {
  field: TransactionSortField;
  order: SortOrder;
}

/**
 * Paginated transaction list
 */
export interface PaginatedTransactions {
  transactions: TransactionInfo[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
