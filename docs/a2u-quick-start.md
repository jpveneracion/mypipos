# A2U Payments in myPiPOS - Quick Start Guide 🚀

## What is A2U and Why Use It?

**A2U (App-to-User)** payments allow your myPiPOS system to send Pi from your app wallet directly to customer wallets. This is perfect for:

- 🔄 **Instant Refunds** - Process returns immediately without manual bank transfers
- 🎁 **Loyalty Rewards** - Automatically reward customers for purchases
- 💰 **Staff Commissions** - Pay sales staff instantly after each sale
- 🎉 **Promotional Bonuses** - Send cashback, birthday rewards, referral bonuses

## Setup Checklist

### 1. Environment Configuration
Add these to your `.env.local`:

```bash
# Pi Network Credentials
PI_NETWORK=testnet  # Use 'testnet' for testing, 'mainnet' for live
PI_SERVER_API_KEY=your_api_key_here
WALLET_PRIVATE_SEED=your_wallet_seed_here
PI_A2U_MOCK=true  # Set to 'true' for safe testing without real transactions

# Make sure your frontend auth includes 'wallet_address' scope
```

### 2. Database Migration
```bash
npm run migrate
```
This adds A2U support to your database tables.

### 3. Install Dependencies
```bash
npm install pi-backend
```

### 4. Test the Setup
```bash
# Start development server
npm run dev

# Test with mock mode first (no real money moves)
PI_A2U_MOCK=true npm run dev
```

## 3 Ways to Use A2U in myPiPOS

### Method 1: Quick API Call 🚀

```typescript
// Send a simple payment
const response = await fetch('/api/payments/a2u', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: 'customer_pi_uid',        // Customer's Pi UID
    amount: 1.5,                    // Amount in Pi
    memo: 'Refund for returned item', // Description
    transaction_type: 'refund',      // 'refund', 'reward', or 'payout'
    metadata: {                     // Optional additional info
      original_sale_id: 'sale-123',
      return_reason: 'damaged_item'
    }
  })
});

const result = await response.json();
console.log('Payment sent:', result.paymentId, result.txid);
```

### Method 2: Pre-built Components 🎨

I've created ready-to-use components for you:

```typescript
import { RefundModal } from '@/components/pos/refund-modal';
import { LoyaltyRewardsPanel } from '@/components/pos/loyalty-rewards-panel';
import { SaleActions } from '@/components/pos/sales-actions';

// Use the refund modal for processing returns
<RefundModal
  isOpen={showRefund}
  saleDetails={{
    id: 'sale-123',
    transaction_number: 'TXN-001',
    customer_pi_uid: 'user-uid',
    customer_name: 'John Doe',
    total_amount: 25.50,
    items: [...]
  }}
/>

// Add loyalty rewards to checkout
<LoyaltyRewardsPanel
  customerId='customer-123'
  customerPiUid='user-uid'
  customerName='John Doe'
  currentPurchaseAmount={25.50}
/>

// Add quick actions to sales table
<SaleActions sale={saleData} />
```

### Method 3: Helper Functions 🔧

```typescript
import { processRefund, sendReward, processPayout } from '@/lib/a2u-helpers';

// Process a refund
const refundResult = await processRefund('sale-id-123', 15.50);

// Send loyalty reward
const rewardResult = await sendReward('user-id-456', 2.0, 'Monthly VIP bonus');

// Process payout (e.g., commission)
const payoutResult = await processPayout('staff-id-789', 5.0, 'Sales commission');
```

## Real-World Examples

### Example 1: Customer Returns Product

```typescript
// In your returns/refunds management page
async function handleProductReturn(saleId: string, returnReason: string) {
  // Get the original sale details
  const sale = await getSaleDetails(saleId);
  
  // Process instant refund to customer's Pi wallet
  const result = await fetch('/api/payments/a2u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: sale.customer_pi_uid,
      amount: sale.total_amount,
      memo: `Refund for return: ${returnReason}`,
      transaction_type: 'refund',
      metadata: {
        original_sale_id: saleId,
        return_reason: returnReason,
        processed_by: 'cashier-123'
      }
    })
  });
  
  const refund = await result.json();
  
  if (refund.success) {
    console.log('✅ Refund processed successfully!');
    console.log('Payment ID:', refund.paymentId);
    console.log('Blockchain TXID:', refund.txid);
    
    // Update your database, show success message, etc.
    await updateSaleStatus(saleId, 'refunded');
  }
}
```

### Example 2: Loyalty Program

```typescript
// Automatically reward customers after purchase
async function processSaleWithRewards(saleData: any) {
  // 1. Complete the normal sale
  const sale = await createSale(saleData);
  
  // 2. Get customer loyalty tier
  const customer = await getCustomerDetails(sale.customer_id);
  const loyaltyTier = customer.loyalty_tier || 'bronze';
  
  // 3. Calculate reward based on tier
  const rewardRates = {
    bronze: 0.02,   // 2% back
    silver: 0.03,   // 3% back
    gold: 0.05,     // 5% back
    platinum: 0.07  // 7% back
  };
  
  const rewardAmount = sale.total_amount * rewardRates[loyaltyTier];
  
  // 4. Send the reward
  if (rewardAmount > 0.01) { // Only send if reward is meaningful
    await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: customer.pi_uid,
        amount: rewardAmount,
        memo: `${loyaltyTier} tier loyalty reward - ${rewardRates[loyaltyTier] * 1}% cashback!`,
        transaction_type: 'reward',
        metadata: {
          reward_type: 'loyalty_cashback',
          tier: loyaltyTier,
          original_sale_id: sale.id
        }
      })
    });
  }
  
  return sale;
}
```

### Example 3: Staff Commissions

```typescript
// Pay sales staff instantly after each sale
async function payStaffCommission(sale: any, staffMember: any) {
  const commissionRate = 0.03; // 3% commission
  const commissionAmount = sale.total_amount * commissionRate;
  
  await fetch('/api/payments/a2u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: staffMember.pi_uid,
      amount: commissionAmount,
      memo: `💰 Sales commission - ${commissionRate * 1}% of ${sale.transaction_number}`,
      transaction_type: 'payout',
      metadata: {
        commission_type: 'instant_sales_commission',
        sale_id: sale.id,
        sale_amount: sale.total_amount,
        commission_rate: commissionRate
      }
    })
  });
}
```

## Testing Safely

### Mock Mode Testing
```bash
# Set mock mode to test without real transactions
PI_A2U_MOCK=true npm run dev
```

### Test API Endpoint
```bash
# Test the A2U endpoint with mock data
curl -X POST http://localhost:3000/api/payments/a2u \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test_user_123",
    "amount": 1.5,
    "memo": "Test refund",
    "transaction_type": "refund"
  }'
```

## Security Tips 🔒

1. **Always validate amounts** on the server side
2. **Set transaction limits** to prevent abuse
3. **Require manager approval** for large refunds (>10 Pi)
4. **Log all A2U transactions** for audit trails
5. **Use mock mode** during development
6. **Never expose wallet credentials** in frontend code

## Common Issues & Solutions

### Issue: "User not found or invalid Pi UID"
**Solution:** Make sure the user exists in your database and has a valid `pi_uid`. Users must authenticate with `wallet_address` scope.

### Issue: "Payment permissions missing"
**Solution:** Update your frontend authentication to include `'wallet_address'` scope:
```typescript
const authResult = await piSDK.authenticate(
  ['username', 'payments', 'wallet_address'], // Add 'wallet_address'
  onIncompletePaymentFound
);
```

### Issue: "Missing Pi Network credentials"
**Solution:** Set up your environment variables:
```bash
PI_SERVER_API_KEY=your_key_here
WALLET_PRIVATE_SEED=your_seed_here
```

## Next Steps

1. **Start with refunds** - This is the most valuable use case
2. **Test thoroughly** - Use mock mode extensively before going live
3. **Monitor transactions** - Set up analytics to track A2U payment success rates
4. **Get feedback** - See how customers like instant refunds/rewards
5. **Expand gradually** - Add more automated rewards and features over time

## Support

- 📖 Full documentation: `docs/a2u-usage-guide.md`
- 🛠️ Implementation plan: `docs/superpowers/plans/2026-05-24-a2u-payment-implementation.md`
- 🎨 Ready-to-use components: Check the `src/components/pos/` folder

---

**Ready to transform your myPiPOS with instant A2U payments?** Start with the refund functionality and watch your customer satisfaction soar! 🚀