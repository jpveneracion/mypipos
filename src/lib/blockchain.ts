/**
 * Blockchain Integration Utilities for Pi Network
 * Provides transaction lookup, verification, and caching functionality
 */

// ============================================================================
// Types
// ============================================================================

export type TransactionStatus = 'confirmed' | 'pending' | 'failed' | 'unknown';

export type PiAmount = number; // Pi amount with 7 decimal places (e.g., 3.1415926)

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

export interface TransactionResponse {
  success: boolean;
  transaction?: TransactionInfo;
  error?: string;
  cached?: boolean;
}

export interface BlockchainConfig {
  testnetUrl: string;
  mainnetUrl: string;
  cacheTTL: number; // Time to live in milliseconds
  requestTimeout: number; // Request timeout in milliseconds
  maxRetries: number;
  retryDelay: number; // Delay between retries in milliseconds
}

export interface CacheEntry {
  data: TransactionInfo;
  timestamp: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: BlockchainConfig = {
  testnetUrl: 'https://blockexplorer.minepi.com/testnet/api',
  mainnetUrl: 'https://blockexplorer.minepi.com/api',
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  requestTimeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

let config: BlockchainConfig = { ...DEFAULT_CONFIG };

// ============================================================================
// In-Memory Cache
// ============================================================================

const transactionCache = new Map<string, CacheEntry>();

/**
 * Configure blockchain settings
 */
export function configureBlockchain(customConfig: Partial<BlockchainConfig>): void {
  config = { ...config, ...customConfig };
}

/**
 * Get blockchain explorer URL based on environment
 */
function getExplorerUrl(): string {
  const isTestnet = process.env.NEXT_PUBLIC_PI_NETWORK === 'testnet' ||
                    process.env.NODE_ENV === 'development';
  return isTestnet ? config.testnetUrl : config.mainnetUrl;
}

/**
 * Cache transaction data with timestamp
 */
export function cacheTransaction(txid: string, data: TransactionInfo): void {
  transactionCache.set(txid, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Retrieve cached transaction if still valid
 */
export function getCachedTransaction(txid: string): TransactionInfo | null {
  const entry = transactionCache.get(txid);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > config.cacheTTL) {
    transactionCache.delete(txid);
    return null;
  }

  return entry.data;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();

  for (const [txid, entry] of transactionCache.entries()) {
    if (now - entry.timestamp > config.cacheTTL) {
      transactionCache.delete(txid);
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  transactionCache.clear();
}

// ============================================================================
// Error Handling
// ============================================================================

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

export class NetworkError extends BlockchainError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends BlockchainError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class TransactionNotFoundError extends BlockchainError {
  constructor(txid: string) {
    super(`Transaction ${txid} not found`, 'TRANSACTION_NOT_FOUND', 404);
    this.name = 'TransactionNotFoundError';
  }
}

export class InvalidTransactionError extends BlockchainError {
  constructor(message: string) {
    super(message, 'INVALID_TRANSACTION', 400);
    this.name = 'InvalidTransactionError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate TXID format
 */
export function isValidTxid(txid: string): boolean {
  // TXID should be a hex string of reasonable length (typically 64 chars for hash)
  const txidRegex = /^[a-fA-F0-9]{32,128}$/;
  return txidRegex.test(txid);
}

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse Pi amount from blockchain format
 */
function parsePiAmount(amount: string | number): PiAmount {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    throw new InvalidTransactionError(`Invalid amount: ${amount}`);
  }
  // Pi Network uses 7 decimal places
  return Math.round(num * 10_000_000) / 10_000_000;
}

/**
 * Convert timestamp to ISO string
 */
function parseTimestamp(timestamp: string | number): string {
  if (typeof timestamp === 'number') {
    return new Date(timestamp * 1000).toISOString();
  }
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new InvalidTransactionError(`Invalid timestamp: ${timestamp}`);
  }
  return date.toISOString();
}

/**
 * Parse transaction status from API response
 */
function parseTransactionStatus(status: string): TransactionStatus {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'confirmed' || normalizedStatus === 'success') {
    return 'confirmed';
  } else if (normalizedStatus === 'pending') {
    return 'pending';
  } else if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
    return 'failed';
  }

  return 'unknown';
}

// ============================================================================
// API Integration
// ============================================================================

/**
 * Fetch transaction from blockchain explorer with retry logic
 */
async function fetchTransactionFromExplorer(
  txid: string,
  retryCount: number = 0
): Promise<any> {
  const explorerUrl = getExplorerUrl();
  const url = `${explorerUrl}?module=transaction&action=gettxinfo&txid=${txid}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    // Handle rate limiting
    if (response.status === 429) {
      if (retryCount < config.maxRetries) {
        await sleep(config.retryDelay * (retryCount + 1));
        return fetchTransactionFromExplorer(txid, retryCount + 1);
      }
      throw new RateLimitError();
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new TransactionNotFoundError(txid);
      }
      throw new NetworkError(
        `Blockchain explorer returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Check for API-level errors
    if (data.success === false) {
      throw new BlockchainError(data.message || 'Transaction lookup failed', data.code);
    }

    return data;

  } catch (error) {
    // Handle network errors
    if (error instanceof BlockchainError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      if (retryCount < config.maxRetries) {
        await sleep(config.retryDelay * (retryCount + 1));
        return fetchTransactionFromExplorer(txid, retryCount + 1);
      }
      throw new NetworkError('Request timeout - blockchain explorer not responding');
    }

    // Retry on network errors
    if (retryCount < config.maxRetries) {
      await sleep(config.retryDelay * (retryCount + 1));
      return fetchTransactionFromExplorer(txid, retryCount + 1);
    }

    throw new NetworkError(
      `Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Transform API response to TransactionInfo format
 */
function transformTransactionData(apiResponse: any, txid: string): TransactionInfo {
  const result = apiResponse.result || apiResponse;

  return {
    txid,
    status: parseTransactionStatus(result.status || result.result || 'unknown'),
    amount: parsePiAmount(result.value || result.amount || 0),
    from: result.from || result.sender || '',
    to: result.to || result.receiver || '',
    timestamp: parseTimestamp(result.timeStamp || result.timestamp || Date.now()),
    blockNumber: result.blockNumber ? parseInt(result.blockNumber) : undefined,
    blockHash: result.blockHash || undefined,
    confirmations: result.confirmations ? parseInt(result.confirmations) : undefined,
    fee: result.gasUsed || result.fee ? parsePiAmount(result.gasUsed || result.fee) : undefined,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get transaction details by TXID
 * Uses cache to reduce API calls
 */
export async function getTransaction(txid: string): Promise<TransactionResponse> {
  try {
    // Validate TXID format
    if (!txid || typeof txid !== 'string') {
      throw new InvalidTransactionError('TXID is required and must be a string');
    }

    const trimmedTxid = txid.trim();
    if (!isValidTxid(trimmedTxid)) {
      throw new InvalidTransactionError(`Invalid TXID format: ${trimmedTxid}`);
    }

    // Check cache first
    const cached = getCachedTransaction(trimmedTxid);
    if (cached) {
      return {
        success: true,
        transaction: cached,
        cached: true,
      };
    }

    // Fetch from blockchain explorer
    const apiResponse = await fetchTransactionFromExplorer(trimmedTxid);
    const transaction = transformTransactionData(apiResponse, trimmedTxid);

    // Cache the result
    cacheTransaction(trimmedTxid, transaction);

    return {
      success: true,
      transaction,
      cached: false,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get transaction status only
 */
export async function getTransactionStatus(txid: string): Promise<{
  success: boolean;
  status?: TransactionStatus;
  error?: string;
}> {
  try {
    const response = await getTransaction(txid);

    if (!response.success || !response.transaction) {
      return {
        success: false,
        error: response.error || 'Failed to get transaction',
      };
    }

    return {
      success: true,
      status: response.transaction.status,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Verify transaction against expected amount
 * Useful for payment verification
 */
export async function verifyTransaction(
  txid: string,
  expectedAmount: PiAmount,
  recipientAddress?: string
): Promise<{
  success: boolean;
  verified?: boolean;
  transaction?: TransactionInfo;
  error?: string;
}> {
  try {
    const response = await getTransaction(txid);

    if (!response.success || !response.transaction) {
      return {
        success: false,
        error: response.error || 'Failed to get transaction',
      };
    }

    const transaction = response.transaction;

    // Check if transaction is confirmed
    if (transaction.status !== 'confirmed') {
      return {
        success: true,
        verified: false,
        transaction,
        error: `Transaction not confirmed (status: ${transaction.status})`,
      };
    }

    // Verify amount (allow for small floating point differences)
    const amountDiff = Math.abs(transaction.amount - expectedAmount);
    const tolerance = 0.0000001; // 0.01% tolerance for Pi amounts

    if (amountDiff > tolerance) {
      return {
        success: true,
        verified: false,
        transaction,
        error: `Amount mismatch: expected ${expectedAmount}, got ${transaction.amount}`,
      };
    }

    // Verify recipient address if provided
    if (recipientAddress && transaction.to !== recipientAddress) {
      return {
        success: true,
        verified: false,
        transaction,
        error: `Recipient mismatch: expected ${recipientAddress}, got ${transaction.to}`,
      };
    }

    return {
      success: true,
      verified: true,
      transaction,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Batch lookup multiple transactions
 */
export async function getBatchTransactions(
  txids: string[]
): Promise<Map<string, TransactionResponse>> {
  const results = new Map<string, TransactionResponse>();

  // Process in parallel with concurrency limit
  const concurrencyLimit = 5;
  const chunks: string[][] = [];

  for (let i = 0; i < txids.length; i += concurrencyLimit) {
    chunks.push(txids.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (txid) => {
      const result = await getTransaction(txid);
      return [txid, result] as [string, TransactionResponse];
    });

    const chunkResults = await Promise.all(promises);
    chunkResults.forEach(([txid, result]) => {
      results.set(txid, result);
    });
  }

  return results;
}

// ============================================================================
// Soroban Smart Contract Support (Non-Custodial)
// ============================================================================

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
 * Parse Soroban smart contract transaction
 */
export function parseSorobanTransaction(tx: TransactionInfo): SorobanTransaction | null {
  // Check if this looks like a Soroban transaction
  // Soroban transactions typically have specific patterns in their data field

  // This is a placeholder - actual implementation would depend on
  // how Soroban transactions are represented in the Pi Network

  return {
    txid: tx.txid,
    status: tx.status,
    timestamp: tx.timestamp,
  };
}

/**
 * Execute Soroban smart contract call (non-custodial)
 * This would be implemented when Soroban support is added to Pi Network
 */
export async function executeSorobanCall(
  contractId: string,
  functionName: string,
  parameters: any[] = []
): Promise<{
  success: boolean;
  txid?: string;
  result?: any;
  error?: string;
}> {
  // Placeholder for Soroban integration
  // When Pi Network adds Soroban support, this would:
  // 1. Build the smart contract transaction
  // 2. Sign it with the user's key (non-custodial)
  // 3. Submit to the network
  // 4. Return the transaction ID and result

  return {
    success: false,
    error: 'Soroban support not yet implemented for Pi Network',
  };
}
