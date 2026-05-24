# myPiPOS Platform Payment Architecture (Corrected) 🏪

## The Correct Model

**myPiPOS is a platform** that connects customers and merchants. Both are "users" in the system, and the app acts as the payment processor/middleman.

## User Types in myPiPOS

```typescript
enum UserType {
  CUSTOMER = 'customer',        // People who buy items
  MERCHANT = 'merchant',        // Store owners who sell items
  ADMIN = 'admin'               // Platform administrators
}

interface User {
  id: string;
  user_type: UserType;
  username: string;
  pi_uid: string;
  pi_wallet_address: string;
  
  // Merchant-specific fields
  store_name?: string;
  store_id?: string;
  
  // Customer-specific fields
  loyalty_points?: number;
  total_purchases?: number;
}
```

## Complete Payment Flow

### **Scenario 1: Customer Purchase (Customer → Platform → Merchant)**

```typescript
async function processCustomerPurchase(purchaseData: {
  customer_id: string;        // Customer user ID
  merchant_id: string;        // Merchant user ID  
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}) {
  
  const { customer_id, merchant_id, items } = purchaseData;
  
  // Step 1: Get user details
  const customer = await getUser(customer_id);
  const merchant = await getUser(merchant_id);
  
  // Step 2: Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const platform_fee = subtotal * 0.02; // 2% platform fee
  const merchant_payout = subtotal - platform_fee;
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  console.log(`Processing purchase: ${total} Pi`);
  console.log(`Platform fee: ${platform_fee} Pi`);
  console.log(`Merchant receives: ${merchant_payout} Pi`);

  // Step 3: Create payment from customer to platform
  const paymentRequest = await createPaymentRequest({
    from_user: customer_id,
    to_user: 'platform', // myPiPOS platform
    amount: total,
    memo: `Purchase at ${merchant.store_name}`,
    metadata: {
      type: 'customer_purchase',
      customer_id,
      merchant_id,
      items,
      platform_fee,
      merchant_payout
    }
  });

  // Step 4: Customer approves payment via Pi SDK
  const payment = await requestCustomerPayment(paymentRequest);
  
  // Step 5: After payment confirmed, distribute funds
  const result = await distributeFunds({
    payment_id: payment.paymentId,
    txid: payment.txid,
    total_amount: total,
    platform_fee,
    merchant_payout,
    merchant_id,
    customer_id
  });

  return result;
}

// Distribute funds from platform to merchant
async function distributeFunds(distribution: {
  payment_id: string;
  txid: string;
  total_amount: number;
  platform_fee: number;
  merchant_payout: number;
  merchant_id: string;
  customer_id: string;
}) {
  
  const { payment_id, txid, total_amount, platform_fee, merchant_payout, merchant_id, customer_id } = distribution;

  // Step 1: Create sale record
  const sale = await createSaleRecord({
    transaction_number: generateTransactionNumber(),
    customer_id,
    merchant_id,
    subtotal: total_amount - (total_amount * 0.08), // Remove tax
    tax_amount: total_amount * 0.08,
    platform_fee,
    merchant_payout,
    total_amount,
    payment_method: 'pi',
    payment_status: 'completed',
    pi_payment_id: payment_id,
    pi_transaction_id: txid,
    status: 'completed',
    direction: 'customer_to_platform'
  });

  // Step 2: Pay merchant (A2U from platform to merchant user)
  const merchant = await getUser(merchant_id);
  
  const merchantPayout = await sendA2UPayment({
    to_user: merchant_id,
    amount: merchant_payout,
    memo: `Payout for sale #${sale.transaction_number}`,
    transaction_type: 'payout',
    metadata: {
      type: 'merchant_payout',
      sale_id: sale.id,
      platform_fee,
      net_amount: merchant_payout
    }
  });

  // Step 3: Update merchant's balance in database
  await updateMerchantBalance(merchant_id, merchant_payout);

  console.log(`✅ Sale complete: ${total_amount} Pi total`);
  console.log(`   Platform fee: ${platform_fee} Pi`);
  console.log(`   Merchant payout: ${merchant_payout} Pi → ${merchant.username}`);

  return {
    sale,
    merchant_payout: merchantPayout,
    net_amount: merchant_payout
  };
}
```

### **Scenario 2: Customer Refund (Merchant → Platform → Customer)**

```typescript
async function processCustomerRefund(refundData: {
  sale_id: string;
  refund_amount: number;
  reason: string;
  initiated_by: string; // merchant user ID
}) {
  
  const { sale_id, refund_amount, reason, initiated_by } = refundData;

  // Step 1: Get original sale details
  const sale = await getSaleDetails(sale_id);
  const merchant = await getUser(sale.merchant_id);
  const customer = await getUser(sale.customer_id);

  console.log(`Processing refund: ${refund_amount} Pi`);
  console.log(`From: ${merchant.store_name} (merchant user)`);
  console.log(`To: ${customer.username} (customer user)`);

  // Step 2: Validate refund (merchant can only refund their own sales)
  if (sale.merchant_id !== initiated_by) {
    throw new Error('You can only refund your own sales');
  }

  if (refund_amount > sale.merchant_payout) {
    throw new Error('Refund amount cannot exceed merchant payout');
  }

  // Step 3: Process refund from merchant user to platform
  // This is an A2U payment from merchant user to platform
  const merchantRefund = await sendA2UPayment({
    from_user: initiated_by, // merchant user
    to_user: 'platform',
    amount: refund_amount,
    memo: `Refund for sale #${sale.transaction_number}`,
    transaction_type: 'refund',
    metadata: {
      type: 'merchant_refund_to_platform',
      sale_id,
      original_sale_amount: sale.total_amount,
      refund_reason: reason
    }
  });

  // Step 4: Platform sends refund to customer user
  const customerRefund = await sendA2UPayment({
    from_user: 'platform',
    to_user: sale.customer_id,
    amount: refund_amount,
    memo: `Refund from ${merchant.store_name}: ${reason}`,
    transaction_type: 'refund',
    metadata: {
      type: 'platform_refund_to_customer',
      sale_id,
      merchant_id: sale.merchant_id,
      refund_reason: reason
    }
  });

  // Step 5: Create refund record
  const refund = await createRefundRecord({
    sale_id,
    merchant_id: sale.merchant_id,
    customer_id: sale.customer_id,
    refund_amount,
    reason,
    platform_refund_id: customerRefund.paymentId,
    txid: customerRefund.txid,
    status: 'completed'
  });

  // Step 6: Update merchant's balance
  await updateMerchantBalance(sale.merchant_id, -refund_amount);

  console.log(`✅ Refund complete: ${refund_amount} Pi`);
  console.log(`   From merchant: ${merchant.username}`);
  console.log(`   To customer: ${customer.username}`);

  return refund;
}
```

---

## Updated Database Schema

### **Users Table (Both Merchants and Customers)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type VARCHAR(20) NOT NULL, -- 'customer', 'merchant', 'admin'
  username VARCHAR(100) UNIQUE NOT NULL,
  pi_uid VARCHAR(255) UNIQUE NOT NULL,
  pi_wallet_address VARCHAR(255) NOT NULL,
  
  -- Merchant-specific fields
  store_name VARCHAR(255),
  store_description TEXT,
  store_settings JSONB DEFAULT '{}',
  
  -- Customer-specific fields  
  loyalty_points INTEGER DEFAULT 0,
  total_purchases DECIMAL(15,2) DEFAULT 0.00,
  customer_preferences JSONB DEFAULT '{}',
  
  -- Common fields
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_merchants ON users(id) WHERE user_type = 'merchant';
CREATE INDEX idx_users_customers ON users(id) WHERE user_type = 'customer';
```

### **Sales Table (Platform as Middleman)**
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(100) UNIQUE NOT NULL,
  
  -- User relationships
  customer_id UUID NOT NULL REFERENCES users(id),
  merchant_id UUID NOT NULL REFERENCES users(id),
  
  -- Payment breakdown
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  platform_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  merchant_payout DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  
  -- Payment processing
  payment_method VARCHAR(50) NOT NULL DEFAULT 'pi',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  pi_payment_id VARCHAR(255),
  pi_transaction_id VARCHAR(255),
  
  -- A2U payout to merchant
  merchant_payout_id VARCHAR(255),
  merchant_payout_txid VARCHAR(255),
  merchant_payout_status VARCHAR(20) DEFAULT 'pending',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  direction VARCHAR(20) NOT NULL, -- 'customer_to_platform', 'platform_to_merchant'
  
  -- Timestamps
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT
);

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_merchant ON sales(merchant_id);
CREATE INDEX idx_sales_merchant_payout_status ON sales(merchant_payout_status);
```

### **Platform Fees Table**
```sql
CREATE TABLE platform_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  merchant_id UUID NOT NULL REFERENCES users(id),
  
  fee_amount DECIMAL(15,2) NOT NULL,
  fee_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.0200 for 2%
  sale_amount DECIMAL(15,2) NOT NULL,
  
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'collected'
);

CREATE INDEX idx_platform_fees_merchant ON platform_fees(merchant_id);
CREATE INDEX idx_platform_fees_collected ON platform_fees(collected_at);
```

---

## API Endpoints for Platform Architecture

### **Customer Purchase Endpoints**
```bash
# Create payment request
POST /api/payments/create
{
  "merchant_id": "merchant-user-id",
  "items": [...],
  "total": 25.50
}

# Process payment (customer → platform → merchant)
POST /api/payments/process-purchase
{
  "payment_id": "payment_123",
  "txid": "txid_456"
}

# Get merchant payout status
GET /api/merchants/{merchant_id}/payouts
```

### **Refund Endpoints**
```bash
# Merchant initiates refund
POST /api/refunds/create
{
  "sale_id": "sale-123",
  "refund_amount": 15.00,
  "reason": "Product returned"
}

# Platform processes refund
POST /api/refunds/process
{
  "refund_id": "refund-456"
}

# Get refund status
GET /api/refunds/{refund_id}/status
```

### **Merchant Balance Endpoints**
```bash
# Get merchant balance and pending payouts
GET /api/merchants/{merchant_id}/balance

# Request payout withdrawal
POST /api/merchants/{merchant_id}/withdraw
{
  "amount": 100.00,
  "destination": "merchant-wallet-address"
}
```

---

## Frontend Components

### **Merchant Dashboard**
```typescript
export function MerchantDashboard() {
  const merchant = useCurrentUser(); // Merchant user
  
  return (
    <div>
      {/* Merchant stats */}
      <BalanceCard 
        currentBalance={merchant.balance}
        pendingPayouts={merchant.pending_payouts}
        todayRevenue={merchant.today_revenue}
      />
      
      {/* Sales list */}
      <SalesList merchantId={merchant.id} />
      
      {/* Payout history */}
      <PayoutHistory merchantId={merchant.id} />
    </div>
  );
}
```

### **Customer Checkout**
```typescript
export function CustomerCheckout({ merchantId, items }: CheckoutProps) {
  const customer = useCurrentUser(); // Customer user
  
  const handlePayment = async () => {
    // Create payment request
    const payment = await createPaymentRequest({
      merchant_id: merchantId,
      items,
      customer_id: customer.id
    });
    
    // Customer approves via Pi SDK
    const result = await Pi.createPayment(payment);
    
    // Platform processes and pays merchant
    const sale = await processPurchase(result);
  };
  
  return (
    <CheckoutForm 
      items={items}
      merchantId={merchantId}
      onPaymentComplete={handlePayment}
    />
  );
}
```

---

## Key Benefits of Platform Architecture

1. **myPiPOS as middleman**: Control payment flow and take platform fees
2. **Both are users**: Simplified user management, unified authentication
3. **Automated payouts**: Merchants get paid automatically after sales
4. **Centralized refunds**: Platform handles all refund processing
5. **Transaction history**: Complete audit trail of all payments
6. **Fee revenue**: Platform earns fees on each transaction
7. **Risk management**: Platform can handle disputes and chargebacks

---

## Complete Payment Flow Diagram

```
Customer User                    myPiPOS Platform                  Merchant User
      │                                  │                                  │
      │  1. Selects items                │                                  │
      │  at merchant store               │                                  │
      │                                  │                                  │
      │  2. Initiates payment ────────>│                                  │
      │     (25.50 Pi)                   │                                  │
      │                                  │                                  │
      │  3. Approves via Pi SDK ──────>│                                  │
      │                                  │                                  │
      │  4. Payment confirmed          │                                  │
      │  <─────────────────────────────│                                  │
      │                                  │                                  │
      │                                  │  5. Deducts platform fee       │
      │                                  │     (0.51 Pi = 2%)             │
      │                                  │                                  │
      │                                  │  6. Sends payout ───────────────────────>│
      │                                  │     (24.99 Pi)                  │
      │                                  │                                  │
      │                                  │                                  │
      │                                  │                                  │

LATER: Customer returns item
      │                                  │                                  │
      │  7. Requests refund ──────────>│                                  │
      │                                  │                                  │
      │  8. Merchant approves ────────────────────────────────────────────>│
      │                                  │                                  │
      │  9. Merchant sends refund ────>│                                  │
      │     (to platform)                │                                  │
      │                                  │                                  │
      │                                  │  10. Processes refund           │
      │                                  │                                  │
      │  11. Refund received           │                                  │
      │  <─────────────────────────────│                                  │
      │     (back to customer)           │                                  │
```

---

This is the correct architecture where myPiPOS acts as the platform/middleman between customers and merchants, who are both users in the system! 🎯