# U2A Payments - Comprehensive Usage Guide 📘

**Complete guide to implementing and using U2A (User-to-App) payments in myPiPOS**

---

## 📋 Table of Contents

1. [Understanding U2A Architecture](#understanding-u2a-architecture)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Integration](#backend-integration)
6. [Security Functions](#security-functions)
7. [Error Handling](#error-handling)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Testing U2A Payments](#testing-u2a-payments)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Understanding U2A Architecture

### What is U2A?

**U2A (User-to-App)** payments are the standard checkout flow where customers pay merchants for items.

```
┌─────────────────────────────────────────────────────────────┐
│                    U2A PAYMENT FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Customer selects items in POS                           │
│  2. Customer proceeds to checkout                           │
│  3. Platform creates payment request (Pi Network)            │
│  4. Customer approves payment in Pi Browser                  │
│  5. Platform receives payment (U2A complete)                │
│  6. Platform deducts platform fee                           │
│  7. Platform pays merchant via A2A payout                   │
│                                                               │
│  Customer Wallet → Platform → Merchant Wallet               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Database Layer:**
- `sales` table (enhanced with U2A columns)
- `u2a_payment_attempts` table (retry logic & analytics)
- Views for active payments, statistics, expired payments

**Security Layer:**
- RLS policies on `u2a_payment_attempts`
- SECURITY DEFINER functions for all U2A operations
- Audit trail for payment status changes

**Application Layer:**
- Frontend: `U2ACheckoutFlow` component
- Backend: API endpoints for payment processing
- Pi Network SDK integration

---

## 🗄️ Database Schema

### Enhanced Sales Table

```sql
-- U2A-specific columns added to sales table
ALTER TABLE sales ADD COLUMN u2a_payment_type VARCHAR(50);
ALTER TABLE sales ADD COLUMN u2a_payment_status VARCHAR(50);
ALTER TABLE sales ADD COLUMN u2a_payment_initiated_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN u2a_payment_approved_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN u2a_payment_completed_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN u2a_payment_expires_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN u2a_blockchain_txid VARCHAR(255);
ALTER TABLE sales ADD COLUMN u2a_blockchain_confirmed_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN u2a_payment_metadata JSONB;
```

### U2A Payment Attempts Table

```sql
CREATE TABLE u2a_payment_attempts (
    id UUID PRIMARY KEY,
    attempt_number VARCHAR(100) UNIQUE NOT NULL,
    sale_id UUID NOT NULL REFERENCES sales(id),
    original_payment_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,7) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    blockchain_txid VARCHAR(255),
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

### Useful Views

```sql
-- Active payments needing attention
CREATE VIEW u2a_payments_active AS
SELECT * FROM sales
WHERE u2a_payment_status IN ('pending', 'initiated', 'approved')
  AND (u2a_payment_expires_at IS NULL OR u2a_payment_expires_at > NOW());

-- Payment statistics
CREATE VIEW u2a_payment_stats AS
SELECT
    u2a_payment_type,
    u2a_payment_status,
    COUNT(*) as payment_count,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as average_amount
FROM sales
GROUP BY u2a_payment_type, u2a_payment_status;

-- Expired payments
CREATE VIEW u2a_payments_expired AS
SELECT * FROM sales
WHERE u2a_payment_expires_at < NOW()
  AND u2a_payment_status NOT IN ('completed', 'cancelled', 'failed');
```

---

## 🔌 API Endpoints

### 1. Initiate U2A Payment

**POST** `/api/payments/u2a/initiate`

```json
{
  "saleId": "uuid-of-sale",
  "customerId": "uuid-of-customer",
  "amount": 25.50,
  "paymentType": "customer_purchase",
  "expiresInMinutes": 30
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pi-payment-123",
  "transactionNumber": "SALE-ABC123",
  "expiresAt": "2026-05-24T15:30:00Z",
  "status": "initiated"
}
```

### 2. Approve U2A Payment

**POST** `/api/payments/approve`

```json
{
  "paymentId": "pi-payment-123",
  "transactionNumber": "SALE-ABC123"
}
```

### 3. Complete U2A Payment

**POST** `/api/payments/complete`

```json
{
  "paymentId": "pi-payment-123",
  "txid": "blockchain-txid-456",
  "transactionNumber": "SALE-ABC123"
}
```

### 4. Get Payment Status

**GET** `/api/payments/status/:paymentId`

**Response:**
```json
{
  "paymentId": "pi-payment-123",
  "status": "completed",
  "txid": "blockchain-txid-456",
  "amount": 25.50,
  "initiatedAt": "2026-05-24T15:00:00Z",
  "completedAt": "2026-05-24T15:05:00Z"
}
```

---

## 🎨 Frontend Implementation

### Basic Usage

```typescript
'use client';

import { U2ACheckoutFlow } from '@/components/pos/u2a-checkout-flow';

export default function CheckoutPage() {
  const cartItems = [
    { id: '1', name: 'Coffee', price: 2.5, quantity: 1 },
    { id: '2', name: 'Sandwich', price: 5.0, quantity: 2 }
  ];

  const customer = {
    id: 'customer-123',
    name: 'Sarah Johnson',
    pi_uid: 'abc123',
    username: 'sarahj'
  };

  const merchantId = 'merchant-456';

  return (
    <U2ACheckoutFlow
      cartItems={cartItems}
      customer={customer}
      merchantId={merchantId}
      onComplete={(sale) => {
        console.log('Payment successful!', sale);
        // Redirect to success page or show receipt
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
        // Show error message to user
      }}
    />
  );
}
```

### Advanced Usage with Custom Styling

```typescript
import { U2ACheckoutFlow } from '@/components/pos/u2a-checkout-flow';
import { Card } from '@/components/ui/Card';

export function CustomCheckout() {
  // ... cart items and customer setup

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Complete Your Purchase</h1>

      <U2ACheckoutFlow
        cartItems={cartItems}
        customer={customer}
        merchantId={merchantId}
        onComplete={(sale) => {
          // Custom success handling
          window.location.href = `/receipts/${sale.id}`;
        }}
        onError={(error) => {
          // Custom error handling
          setShowErrorModal(true);
          setErrorMessage(error);
        }}
      />

      {/* Additional checkout info */}
      <Card className="mt-4">
        <p className="text-sm text-gray-600">
          By completing this purchase, you agree to our terms and conditions.
        </p>
      </Card>
    </div>
  );
}
```

---

## ⚙️ Backend Integration

### Create Sale Record

```typescript
// POST /api/sales/create
export async function createSaleRecord(request: Request) {
  const { cartItems, customer, merchant } = await request.json();

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );
  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;

  // Generate transaction number
  const transactionNumber = `SALE-${Date.now().toString(36).toUpperCase()}`;

  // Create sale record
  const sale = await db.sales.create({
    data: {
      transaction_number: transactionNumber,
      merchant_id: merchant.id,
      customer_id: customer.id,
      subtotal,
      tax_amount: tax,
      total_amount: total,
      payment_method: 'pi',
      payment_status: 'pending',
      u2a_payment_type: 'customer_purchase',
      u2a_payment_status: 'pending',
      status: 'pending'
    }
  });

  // Create sale items
  for (const item of cartItems) {
    await db.sale_items.create({
      data: {
        sale_id: sale.id,
        merchant_id: merchant.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price
      }
    });
  }

  return Response.json({ sale, transactionNumber });
}
```

### Initiate U2A Payment

```typescript
// POST /api/payments/u2a/initiate
export async function initiateU2APayment(request: Request) {
  const { saleId, paymentId, expiresInMinutes } = await request.json();

  // Use security function to initiate payment
  const result = await db.query(
    'SELECT initiate_u2a_payment($1, $2, $3)',
    [saleId, paymentId, expiresInMinutes || 30]
  );

  return Response.json({
    success: true,
    paymentId: paymentId,
    saleId: saleId,
    status: 'initiated',
    expiresAt: result.u2a_payment_expires_at
  });
}
```

---

## 🔒 Security Functions

### All-in-One Payment Functions

```sql
-- Initiate payment
SELECT initiate_u2a_payment(
    'sale-uuid'::UUID,           -- sale_id
    'pi-payment-123',            -- payment_id
    30                           -- expires_in_minutes
);

-- Approve payment
SELECT approve_u2a_payment(
    'pi-payment-123',            -- payment_id
    'user-uuid'::UUID            -- approved_by (optional)
);

-- Complete payment
SELECT complete_u2a_payment(
    'pi-payment-123',            -- payment_id
    'blockchain-txid-456',       -- txid
    6                            -- confirmation_count (optional)
);

-- Fail payment
SELECT fail_u2a_payment(
    'pi-payment-123',            -- payment_id
    'INSUFFICIENT_FUNDS',        -- error_code
    'Customer has insufficient Pi balance' -- error_message
);
```

### Query Functions

```sql
-- Get payment by sale ID
SELECT * FROM get_u2a_payment_by_sale('sale-uuid'::UUID);

-- Get payment by Pi Network payment ID
SELECT * FROM get_u2a_payment_by_payment_id('pi-payment-123');

-- Get payments by customer
SELECT * FROM get_u2a_payments_by_customer('customer-uuid'::UUID, 100);

-- Get payments by merchant
SELECT * FROM get_u2a_payments_by_merchant('merchant-uuid'::UUID, 100);

-- Get active payments
SELECT * FROM get_active_u2a_payments(50);

-- Get expired payments
SELECT * FROM get_expired_u2a_payments(100);
```

---

## ⚠️ Error Handling

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `PAYMENT_EXPIRED` | Payment not completed in time | Re-initiate payment |
| `INSUFFICIENT_FUNDS` | Customer lacks Pi balance | Ask customer to top up |
| `NETWORK_ERROR` | Pi Network API error | Retry payment |
| `INVALID_AMOUNT` | Amount validation failed | Check cart calculations |
| `CUSTOMER_NOT_FOUND` | Customer record missing | Verify customer data |
| `PAYMENT_STUCK` | Payment stuck in status | Force fail and retry |

### Error Handling Pattern

```typescript
async function handlePaymentWithRetry(saleId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const payment = await initiateU2APayment(saleId);

      // Wait for payment completion
      const completed = await waitForCompletion(payment.paymentId);

      if (completed.status === 'completed') {
        return completed;
      }

      // If failed and not last attempt, retry
      if (completed.status === 'failed' && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        continue;
      }

      return completed;

    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Payment failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
}
```

---

## 📊 Monitoring & Analytics

### Payment Statistics

```sql
-- Get statistics for last 7 days
SELECT * FROM get_u2a_payment_stats(
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Sample output:
/*
u2a_payment_type     | u2a_payment_status | payment_count | total_amount | success_rate
--------------------+--------------------+---------------+--------------+-------------
customer_purchase   | completed          | 150           | 3750.00      | 95.00
customer_purchase   | failed             | 8             | 200.00       | 0.00
online_order        | completed          | 45            | 1125.00      | 92.00
*/
```

### Payment Audit Trail

```sql
-- Get full payment history
SELECT * FROM get_u2a_payment_audit_trail('pi-payment-123');

-- Sample output:
/*
action              | sale_id           | old_status | new_status | changed_at
--------------------+-------------------+------------+------------+-------------------
PAYMENT_INITIATED   | sale-abc          | NULL       | initiated  | 2026-05-24 15:00
STATUS_UPDATE       | sale-abc          | initiated  | approved   | 2026-05-24 15:02
STATUS_UPDATE       | sale-abc          | approved   | completed  | 2026-05-24 15:05
*/
```

### Monitoring Queries

```sql
-- Payments needing attention
SELECT * FROM u2a_payments_active
WHERE action_needed IN ('expired', 'awaiting_initiation');

-- High-value transactions
SELECT * FROM sales
WHERE u2a_payment_status = 'completed'
  AND total_amount > 100
ORDER BY total_amount DESC
LIMIT 10;

-- Failed payment analysis
SELECT
    error_code,
    COUNT(*) as error_count,
    AVG(total_amount) as avg_amount
FROM u2a_payment_attempts
WHERE status = 'failed'
GROUP BY error_code
ORDER BY error_count DESC;
```

---

## 🧪 Testing U2A Payments

### Test Data Setup

```sql
-- Create test customer
INSERT INTO users (id, username, pi_uid, email)
VALUES (
    'test-customer-uuid'::UUID,
    'testcustomer',
    'TEST_PI_UID_123',
    'test@example.com'
);

-- Create test merchant
INSERT INTO merchants (id, business_name, pi_app_id)
VALUES (
    'test-merchant-uuid'::UUID,
    'Test Store',
    'test-app-id'
);
```

### Test Scenarios

```typescript
// Test 1: Successful payment
test('U2A payment completes successfully', async () => {
  const sale = await createTestSale({
    total_amount: 25.50
  });

  const payment = await initiateU2APayment(sale.id);
  expect(payment.status).toBe('initiated');

  const approved = await approveU2APayment(payment.payment_id);
  expect(approved.u2a_payment_status).toBe('approved');

  const completed = await completeU2APayment(payment.payment_id, 'test-txid');
  expect(completed.u2a_payment_status).toBe('completed');
});

// Test 2: Payment expiration
test('U2A payment expires after timeout', async () => {
  const sale = await createTestSale({
    total_amount: 25.50
  });

  const payment = await initiateU2APayment(sale.id, 1); // 1 minute expiration

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 60000));

  const expired = await getU2APayment(payment.payment_id);
  expect(expired.u2a_payment_status).toBe('expired');
});
```

---

## 🛠️ Troubleshooting

### Issue: Payment stuck in 'initiated' status

**Solution:**
```sql
-- Check payment attempt record
SELECT * FROM u2a_payment_attempts
WHERE original_payment_id = 'stuck-payment-id';

-- Force fail the payment
SELECT fail_u2a_payment(
    'stuck-payment-id',
    'STUCK_IN_INITIATED',
    'Payment stuck in initiated status, forcing failure'
);

-- Retry with new payment
SELECT initiate_u2a_payment('sale-id', 'new-payment-id', 30);
```

### Issue: High failure rate

**Diagnosis:**
```sql
-- Analyze failure patterns
SELECT
    error_code,
    error_message,
    COUNT(*) as count,
    AVG(total_amount) as avg_amount
FROM u2a_payment_attempts
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_code, error_message
ORDER BY count DESC;
```

### Issue: Slow payment processing

**Solution:**
```sql
-- Check for long-running payments
SELECT
    s.transaction_number,
    s.u2a_payment_initiated_at,
    s.u2a_payment_completed_at,
    EXTRACT(EPOCH FROM (s.u2a_payment_completed_at - s.u2a_payment_initiated_at))/60 as minutes_to_complete
FROM sales s
WHERE s.u2a_payment_status = 'completed'
  AND s.u2a_payment_initiated_at > NOW() - INTERVAL '1 day'
ORDER BY minutes_to_complete DESC
LIMIT 10;
```

---

## 🎉 Best Practices

1. **Always set expiration times** - Don't let payments hang forever
2. **Implement retry logic** - Handle transient failures gracefully
3. **Monitor payment status** - Use views and security functions
4. **Log all payment attempts** - Essential for debugging
5. **Set up alerts** - Get notified of failures and expirations
6. **Regular cleanup** - Archive old payment attempts
7. **Test thoroughly** - Use Pi Testnet before mainnet

---

**You now have comprehensive U2A payment integration!** 🚀

The U2A system provides a complete, secure, and scalable solution for processing customer payments in your myPiPOS system.