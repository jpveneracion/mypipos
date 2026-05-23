// src/types/customer.ts

/**
 * Pi Network amount type - ensures 7 decimal places
 * @description All monetary values must use 7 decimal places for Pi Network compatibility
 * Example: 3.1415926 π (Pi) should be stored as 3.1415926
 */
export type PiAmount = number;

/**
 * Validates that a number has exactly 7 decimal places for Pi Network compatibility
 * @param amount - The amount to validate
 * @returns true if the amount has valid Pi precision
 */
export function isValidPiAmount(amount: number): boolean {
  const decimals = amount.toString().split('.')[1]?.length || 0;
  return decimals <= 7;
}

/**
 * Formats a number to exactly 7 decimal places for Pi Network
 * @param amount - The amount to format
 * @returns String formatted with exactly 7 decimal places
 */
export function formatPiAmount(amount: number): string {
  return amount.toFixed(7);
}

/**
 * Parses a Pi amount string to number with validation
 * @param value - The string value to parse
 * @returns PiAmount number or throws if invalid
 */
export function parsePiAmount(value: string): PiAmount {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid Pi amount: ${value}`);
  }
  if (!isValidPiAmount(parsed)) {
    throw new Error(`Pi amount must have at most 7 decimal places, got: ${value}`);
  }
  return parsed;
}

export interface Customer {
  id: string;
  username: string;  // Pi Network username
  piUid: string;     // Pi Network user ID
  merchantId?: string | null;  // If this customer is also a merchant
  createdAt: Date;
}

/**
 * Represents an invoice in the system
 * @interface Invoice
 * @description Stores invoice details including customer, merchant, items, and payment information
 */
export interface Invoice {
  /** Unique invoice identifier formatted as INV-YYYY-XXX */
  id: string;
  /** Reference to the customer who made the purchase */
  customerId: string;
  /** Reference to the merchant who created the invoice */
  merchantId: string;
  /** Optional POS terminal ID where the transaction was processed */
  posTerminalId?: string;
  /** List of items included in this invoice */
  items: InvoiceItem[];
  /** Subtotal amount before tax (must use 7 decimal places for Pi) */
  subtotal: PiAmount;
  /** Tax amount applied to the invoice (must use 7 decimal places for Pi) */
  tax: PiAmount;
  /** Total amount including tax (must use 7 decimal places for Pi) */
  total: PiAmount;
  /** Current status of the invoice */
  status: 'pending' | 'completed' | 'cancelled' | 'expired' | 'refunded';
  /** Payment method used for this transaction */
  paymentMethod: 'pi' | 'cash' | 'card' | 'other';
  /** Current payment status - tracks if payment is completed/pending */
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  /** Pi Network payment ID (if applicable) */
  piPaymentId?: string;
  /** Blockchain transaction hash for Pi payments */
  piTransactionId?: string;
  /** Timestamp when the invoice was created */
  createdAt: Date;
  /** Timestamp when the invoice was last updated */
  updatedAt: Date;
  /** Optional due date for payment */
  dueDate?: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: PiAmount;
  totalPrice: PiAmount;
}

export interface InvoiceFilter {
  status?: 'all' | 'unpaid' | 'paid' | 'expired' | 'cancelled';
  dateFrom?: Date;
  dateTo?: Date;
  merchantId?: string;
}

export interface CustomerQRData {
  t: 'mpp_c';  // type: myPiPOS customer
  v: '1.0';    // version
  u: string;   // username
  i: string;   // customer_id
  ts: number;  // Unix timestamp (seconds)
  s: string;   // signature
}

export interface PaymentStatus {
  invoiceId: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  updatedAt: Date;
}
