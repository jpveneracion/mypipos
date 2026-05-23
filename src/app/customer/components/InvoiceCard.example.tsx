/**
 * InvoiceCard Component Usage Example
 *
 * This file demonstrates how to use the InvoiceCard component in your application.
 */

import InvoiceCard from './InvoiceCard';
import { Invoice } from '@/types/customer';

// Example 1: Basic usage with unpaid invoice
function ExampleUnpaidInvoice() {
  const unpaidInvoice: Invoice = {
    id: 'INV-2024-001',
    customerId: 'customer-123',
    merchantId: 'merchant-456',
    items: [
      {
        id: 'item-1',
        invoiceId: 'INV-2024-001',
        productId: 'prod-1',
        productName: 'Product A',
        quantity: 2,
        unitPrice: 3.1415926,
        totalPrice: 6.2831852
      },
      {
        id: 'item-2',
        invoiceId: 'INV-2024-001',
        productId: 'prod-2',
        productName: 'Product B',
        quantity: 1,
        unitPrice: 1.5707963,
        totalPrice: 1.5707963
      }
    ],
    subtotal: 7.8539815,
    tax: 0.5495787,
    total: 8.4035602,
    status: 'pending',
    paymentMethod: 'pi',
    paymentStatus: 'pending',
    createdAt: new Date('2024-05-15'),
    updatedAt: new Date('2024-05-15'),
    dueDate: new Date('2024-05-30')
  };

  return (
    <InvoiceCard
      invoice={unpaidInvoice}
      merchantName="My Pi Store"
      onPaymentInitiated={(invoiceId) => {
        console.log('Payment initiated for invoice:', invoiceId);
      }}
    />
  );
}

// Example 2: Paid invoice
function ExamplePaidInvoice() {
  const paidInvoice: Invoice = {
    id: 'INV-2024-002',
    customerId: 'customer-123',
    merchantId: 'merchant-456',
    items: [
      {
        id: 'item-3',
        invoiceId: 'INV-2024-002',
        productId: 'prod-3',
        productName: 'Service A',
        quantity: 1,
        unitPrice: 10.0000000,
        totalPrice: 10.0000000
      }
    ],
    subtotal: 10.0000000,
    tax: 0.7000000,
    total: 10.7000000,
    status: 'completed',
    paymentMethod: 'pi',
    paymentStatus: 'paid',
    piPaymentId: 'pi-payment-123',
    piTransactionId: '0x1234567890abcdef',
    createdAt: new Date('2024-05-10'),
    updatedAt: new Date('2024-05-10')
  };

  return (
    <InvoiceCard
      invoice={paidInvoice}
      merchantName="Another Pi Store"
    />
  );
}

// Example 3: Failed invoice
function ExampleFailedInvoice() {
  const failedInvoice: Invoice = {
    id: 'INV-2024-003',
    customerId: 'customer-123',
    merchantId: 'merchant-456',
    items: [
      {
        id: 'item-4',
        invoiceId: 'INV-2024-003',
        productId: 'prod-4',
        productName: 'Product C',
        quantity: 3,
        unitPrice: 2.5000000,
        totalPrice: 7.5000000
      }
    ],
    subtotal: 7.5000000,
    tax: 0.5250000,
    total: 8.0250000,
    status: 'pending',
    paymentMethod: 'pi',
    paymentStatus: 'failed',
    createdAt: new Date('2024-05-12'),
    updatedAt: new Date('2024-05-12'),
    dueDate: new Date('2024-05-27')
  };

  return (
    <InvoiceCard
      invoice={failedInvoice}
      merchantName="Pi Shop"
      onPaymentInitiated={(invoiceId) => {
        console.log('Retry payment for invoice:', invoiceId);
      }}
    />
  );
}

// Example 4: Integration with InvoiceList
function ExampleIntegration() {
  const invoices: Invoice[] = [
    // ... your invoices array
  ];

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          merchantName="Merchant Name"
          onPaymentInitiated={(invoiceId) => {
            // Handle payment initiation
            // You might want to:
            // 1. Update local state
            // 2. Show a success message
            // 3. Refresh the invoice list
            // 4. Track analytics events
            console.log('Payment initiated:', invoiceId);
          }}
        />
      ))}
    </div>
  );
}

export {
  ExampleUnpaidInvoice,
  ExamplePaidInvoice,
  ExampleFailedInvoice,
  ExampleIntegration
};
