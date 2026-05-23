/**
 * Blockchain Integration Usage Examples
 *
 * This file contains practical examples of using the blockchain integration
 * in various scenarios within the myPiPOS application.
 */

import {
  getTransaction,
  verifyTransaction,
  getTransactionStatus,
  getBatchTransactions,
  type TransactionInfo,
  type TransactionResponse,
} from '@/lib/blockchain';

// ============================================================================
// Example 1: Payment Verification
// ============================================================================

/**
 * Verify a customer payment after checkout
 */
export async function verifyCustomerPayment(
  txid: string,
  expectedAmount: number,
  merchantAddress: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    const result = await verifyTransaction(
      txid,
      expectedAmount,
      merchantAddress
    );

    if (!result.success) {
      return {
        verified: false,
        error: result.error || 'Failed to verify payment',
      };
    }

    if (!result.verified) {
      return {
        verified: false,
        error: result.error || 'Payment verification failed',
      };
    }

    return { verified: true };

  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Usage:
// const paymentStatus = await verifyCustomerPayment(
//   'abc123...',
//   3.1415926,
//   'merchant-address'
// );
//
// if (paymentStatus.verified) {
//   console.log('Payment verified! Process order.');
// } else {
//   console.error('Payment verification failed:', paymentStatus.error);
// }

// ============================================================================
// Example 2: Transaction Status Monitoring
// ============================================================================

/**
 * Monitor transaction status until confirmation
 */
export async function waitForConfirmation(
  txid: string,
  maxAttempts: number = 10,
  checkInterval: number = 30000 // 30 seconds
): Promise<{ confirmed: boolean; transaction?: TransactionInfo }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResult = await getTransactionStatus(txid);

    if (statusResult.success && statusResult.status === 'confirmed') {
      // Get full transaction details
      const txResult = await getTransaction(txid);
      return {
        confirmed: true,
        transaction: txResult.transaction,
      };
    }

    // Wait before next check
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  return { confirmed: false };
}

// Usage:
// const confirmation = await waitForConfirmation('abc123...', 20, 30000);
//
// if (confirmation.confirmed) {
//   console.log('Transaction confirmed:', confirmation.transaction);
// } else {
//   console.log('Transaction not confirmed after checking 20 times');
// }

// ============================================================================
// Example 3: Batch Transaction Processing
// ============================================================================

/**
 * Process multiple transactions for daily reconciliation
 */
export async function reconcileTransactions(
  txids: string[]
): Promise<{
  successful: TransactionInfo[];
  failed: Array<{ txid: string; error: string }>;
  totalAmount: number;
}> {
  const results = await getBatchTransactions(txids);

  const successful: TransactionInfo[] = [];
  const failed: Array<{ txid: string; error: string }> = [];
  let totalAmount = 0;

  for (const [txid, result] of results.entries()) {
    if (result.success && result.transaction) {
      successful.push(result.transaction);
      totalAmount += result.transaction.amount;
    } else {
      failed.push({
        txid,
        error: result.error || 'Unknown error',
      });
    }
  }

  return { successful, failed, totalAmount };
}

// Usage:
// const dailyTxids = ['abc123...', 'def456...', 'ghi789...'];
// const reconciliation = await reconcileTransactions(dailyTxids);
//
// console.log('Successful transactions:', reconciliation.successful.length);
// console.log('Failed transactions:', reconciliation.failed.length);
// console.log('Total amount:', reconciliation.totalAmount);

// ============================================================================
// Example 4: Frontend API Integration
// ============================================================================

/**
 * React hook for transaction lookup
 */
export async function lookupTransactionAPI(
  txid: string
): Promise<TransactionResponse> {
  const response = await fetch(`/api/blockchain/transaction/${txid}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * React hook for payment verification via API
 */
export async function verifyPaymentAPI(
  txid: string,
  amount: number,
  recipient?: string
): Promise<{
  success: boolean;
  verified?: boolean;
  transaction?: TransactionInfo;
  error?: string;
}> {
  const params = new URLSearchParams({
    amount: amount.toString(),
  });

  if (recipient) {
    params.append('recipient', recipient);
  }

  const response = await fetch(
    `/api/blockchain/transaction/${txid}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Usage in React component:
// const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
//
// useEffect(() => {
//   lookupTransactionAPI('abc123...')
//     .then(result => {
//       if (result.success && result.transaction) {
//         setTransaction(result.transaction);
//       }
//     })
//     .catch(error => {
//       console.error('Failed to lookup transaction:', error);
//     });
// }, [txid]);

// ============================================================================
// Example 5: Error Handling with Retry
// ============================================================================

/**
 * Get transaction with automatic retry on failure
 */
export async function getTransactionWithRetry(
  txid: string,
  maxRetries: number = 3
): Promise<TransactionResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await getTransaction(txid);
      if (result.success) {
        return result;
      }
      lastError = new Error(result.error || 'Unknown error');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Failed after retries',
  };
}

// Usage:
// const result = await getTransactionWithRetry('abc123...', 5);
//
// if (result.success) {
//   console.log('Transaction found:', result.transaction);
// } else {
//   console.error('Failed after 5 attempts:', result.error);
// }

// ============================================================================
// Example 6: Transaction History Analysis
// ============================================================================

/**
 * Analyze transaction history for statistics
 */
export function analyzeTransactionHistory(
  transactions: TransactionInfo[]
): {
  totalTransactions: number;
  totalVolume: number;
  averageAmount: number;
  confirmedCount: number;
  pendingCount: number;
  failedCount: number;
} {
  const confirmed = transactions.filter(tx => tx.status === 'confirmed');
  const pending = transactions.filter(tx => tx.status === 'pending');
  const failed = transactions.filter(tx => tx.status === 'failed');

  const totalVolume = confirmed.reduce((sum, tx) => sum + tx.amount, 0);
  const averageAmount = confirmed.length > 0
    ? totalVolume / confirmed.length
    : 0;

  return {
    totalTransactions: transactions.length,
    totalVolume,
    averageAmount,
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    failedCount: failed.length,
  };
}

// Usage:
// const allTransactions = [tx1, tx2, tx3, ...]; // Array of TransactionInfo
// const stats = analyzeTransactionHistory(allTransactions);
//
// console.log('Total transactions:', stats.totalTransactions);
// console.log('Total volume:', stats.totalVolume);
// console.log('Average amount:', stats.averageAmount);
// console.log('Confirmation rate:', stats.confirmedCount / stats.totalTransactions * 100, '%');

// ============================================================================
// Example 7: Real-Time Transaction Monitoring
// ============================================================================

/**
 * Monitor transactions in real-time
 */
export class TransactionMonitor {
  private txids: Set<string> = new Set();
  private interval: number | null = null;

  /**
   * Add transaction to monitor
   */
  addTransaction(txid: string): void {
    this.txids.add(txid);
  }

  /**
   * Start monitoring with callback
   */
  startMonitoring(
    callback: (txid: string, status: string) => void,
    checkInterval: number = 30000 // 30 seconds
  ): void {
    this.interval = window.setInterval(async () => {
      for (const txid of this.txids) {
        const result = await getTransactionStatus(txid);
        if (result.success && result.status) {
          callback(txid, result.status);
        }
      }
    }, checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Clear all monitored transactions
   */
  clear(): void {
    this.txids.clear();
  }
}

// Usage:
// const monitor = new TransactionMonitor();
// monitor.addTransaction('abc123...');
// monitor.addTransaction('def456...');
//
// monitor.startMonitoring((txid, status) => {
//   console.log(`Transaction ${txid} status: ${status}`);
//
//   if (status === 'confirmed') {
//     console.log('Payment received!');
//     monitor.stopMonitoring();
//   }
// }, 30000);

export {};
