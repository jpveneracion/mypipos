// src/types/customer.ts

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
  /** Subtotal amount before tax */
  subtotal: number;
  /** Tax amount applied to the invoice */
  tax: number;
  /** Total amount including tax */
  total: number;
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
  unitPrice: number;
  totalPrice: number;
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
