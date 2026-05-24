# U2A Payments - Quick Start Guide (5 Minutes) ⚡

**U2A = User-to-App payments (Customer → Platform)**

This is your standard checkout flow where customers pay merchants for items.

---

## 🎯 What You Need to Know

**U2A payments are the opposite of A2A:**
- **U2A**: Customer pays Platform → Platform pays Merchant (standard purchases)
- **A2A**: Platform pays Customer (refunds, rewards, payouts)

---

## 🚀 Quick Setup (2 steps)

### Step 1: Run the migrations
```bash
# U2A payment schema
npm run migrate -- 009_add_u2a_payments.sql

# U2A security functions
npm run migrate -- 010_add_u2a_security.sql
```

### Step 2: Add the checkout component
```typescript
import { U2ACheckoutFlow } from '@/components/pos/u2a-checkout-flow';

<U2ACheckoutFlow
  cartItems={cartItems}
  customer={customer}
  merchantId={merchantId}
  onComplete={(sale) => console.log('Sale complete!', sale)}
  onError={(error) => console.error('Payment failed:', error)}
/>
```

**That's it!** You now have U2A payments working. 🎉

---

## 💰 How Money Flows

### Standard Purchase (U2A):
```
Customer Wallet → Platform (U2A payment) → Merchant (A2A payout)
```

1. **Customer** approves payment in Pi Browser
2. **Platform** receives payment (U2A)
3. **Platform** deducts platform fee
4. **Platform** pays merchant (A2A)
5. **Merchant** receives final amount

---

## 🔄 Payment States

U2A payments go through these states:

1. **pending** - Payment created, waiting for customer
2. **initiated** - Customer started payment
3. **awaiting_approval** - Waiting for merchant approval
4. **approved** - Payment approved by merchant
5. **processing** - Being processed on blockchain
6. **completed** - Payment fully completed ✅
7. **failed** - Payment failed ❌
8. **cancelled** - Payment cancelled
9. **expired** - Payment expired (not completed in time)

---

## 📊 Database Tables

### Main Tables:
- **`sales`** - Updated with U2A payment columns
- **`u2a_payment_attempts`** - Tracks individual payment attempts

### Key Columns Added:
```sql
-- In sales table
u2a_payment_type         -- Type of U2A payment
u2a_payment_status       -- Current payment status
u2a_payment_initiated_at -- When payment was initiated
u2a_payment_expires_at   -- When payment expires
u2a_blockchain_txid      -- Blockchain transaction ID
```

---

## 🎮 Basic Usage

### Frontend: Process a payment
```typescript
const handleCheckout = async () => {
  const result = await U2ACheckoutFlow({
    cartItems: [
      { id: '1', name: 'Coffee', price: 2.5, quantity: 1 }
    ],
    customer: { id: '123', name: 'Sarah', pi_uid: 'abc' },
    merchantId: 'merchant-456'
  });

  console.log('Payment complete!', result);
};
```

### Backend: Check payment status
```sql
-- Get active payments that need attention
SELECT * FROM u2a_payments_active;

-- Get payment statistics
SELECT * FROM u2a_payment_stats;

-- Get expired payments
SELECT * FROM u2a_payments_expired;
```

---

## 🛡️ Security Functions

All U2A operations use **SECURITY DEFINER** functions for security:

```sql
-- Initiate payment
SELECT initiate_u2a_payment('sale-id', 'payment-id', 30);

-- Approve payment
SELECT approve_u2a_payment('payment-id', 'user-id');

-- Complete payment
SELECT complete_u2a_payment('payment-id', 'blockchain-txid', 6);

-- Fail payment
SELECT fail_u2a_payment('payment-id', 'ERROR_CODE', 'Error message');
```

---

## 📈 Monitoring

### Track U2A payments:
```sql
-- Get payment statistics
SELECT * FROM get_u2a_payment_stats(
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Get active payments
SELECT * FROM get_active_u2a_payments(50);

-- Get expired payments
SELECT * FROM get_expired_u2a_payments(100);
```

---

## 🆚 U2A vs A2A

| Feature | U2A (User→App) | A2A (App→User) |
|---------|---------------|----------------|
| **Direction** | Customer → Platform | Platform → Customer |
| **Purpose** | Purchases | Refunds, rewards |
| **Initiation** | Customer initiates | Merchant initiates |
| **Approval** | Customer approves | Merchant decides |
| **Use Cases** | Normal checkout | Returns, loyalty |

---

## 🐛 Common Issues

### Payment expired?
```sql
-- Check for expired payments
SELECT * FROM u2a_payments_expired;

-- Retry the payment
SELECT initiate_u2a_payment('sale-id', 'new-payment-id', 30);
```

### Payment stuck in 'initiated'?
```sql
-- Check payment status
SELECT * FROM get_u2a_payment_audit_trail('payment-id');

-- Force fail if needed
SELECT fail_u2a_payment('payment-id', 'STUCK', 'Payment stuck, retrying');
```

---

## ✅ Checklist

- [ ] Run migrations 009 and 010
- [ ] Add U2ACheckoutFlow component to your POS
- [ ] Configure Pi Network API keys
- [ ] Test payment flow with small amount
- [ ] Set up monitoring for expired payments
- [ ] Configure platform fee percentage

---

## 🎉 You're Ready!

Your myPiPOS now supports **complete bidirectional payments**:
- ✅ **U2A**: Customers can pay for items
- ✅ **A2A**: Merchants can send refunds/rewards
- ✅ **Full audit trail** for all transactions
- ✅ **Secure** with RLS and SECURITY DEFINER functions

**Next steps**: Test the payment flow and customize for your needs! 🚀