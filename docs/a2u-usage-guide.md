# A2U Payment Usage Guide for myPiPOS

## Quick Start: Common POS Scenarios

### 1. Processing Customer Refunds

The most common A2U use case in a POS system is processing refunds when customers return products.

**Implementation:**

```typescript
// In your refund/sales management component
import { RefundModal } from '@/components/pos/refund-modal';
import { useState } from 'react';

export function SalesManagement() {
  const [selectedSale, setSelectedSale] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const handleRefundClick = (sale) => {
    setSelectedSale(sale);
    setShowRefundModal(true);
  };

  return (
    <div>
      {/* Your sales list/table */}
      {sales.map(sale => (
        <div key={sale.id}>
          <button onClick={() => handleRefundClick(sale)}>
            Process Refund
          </button>
        </div>
      ))}

      {/* Refund Modal */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        saleDetails={selectedSale}
      />
    </div>
  );
}
```

**Benefits:**
- Instant refund to customer's Pi wallet
- Automatic record keeping in your sales table
- Full audit trail with blockchain transaction IDs

### 2. Customer Loyalty Rewards

Automatically reward customers based on their purchase amount and loyalty tier.

**Implementation:**

```typescript
// In your checkout/customer view
import { LoyaltyRewardsPanel } from '@/components/pos/loyalty-rewards-panel';

export function CheckoutPage() {
  const customer = {
    id: 'customer-123',
    pi_uid: 'user-pi-uid',
    name: 'John Doe',
    loyalty_tier: 'gold'
  };

  const cartTotal = 25.50; // Current purchase amount

  return (
    <div>
      {/* Your checkout interface */}
      
      {/* Loyalty rewards panel */}
      <LoyaltyRewardsPanel
        customerId={customer.id}
        customerPiUid={customer.pi_uid}
        customerName={customer.name}
        currentPurchaseAmount={cartTotal}
      />
    </div>
  );
}
```

**Reward Tiers Example:**
- **Bronze** (0-100 Pi purchases): 2% cashback
- **Silver** (100-500 Pi purchases): 3% cashback  
- **Gold** (500-1000 Pi purchases): 5% cashback
- **Platinum** (1000+ Pi purchases): 7% cashback

### 3. Special Promotions and Bonuses

Send Pi for special occasions, referrals, or promotional campaigns.

**Example: Birthday Bonus**

```typescript
async function sendBirthdayBonus(customerPiUid: string, customerName: string) {
  const bonusAmount = 1.0; // 1 Pi birthday bonus
  
  await fetch('/api/payments/a2u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: customerPiUid,
      amount: bonusAmount,
      memo: `🎂 Happy Birthday ${customerName}! Enjoy your bonus Pi!`,
      transaction_type: 'customer_reward',
      metadata: {
        reward_type: 'birthday_bonus',
        customer_name: customerName
      }
    })
  });
}
```

**Example: Referral Program**

```typescript
async function processReferralBonus(referrerId: string, newCustomerName: string) {
  const referrer = await getCustomerDetails(referrerId);
  const bonusAmount = 0.5; // 0.5 Pi per successful referral
  
  await fetch('/api/payments/a2u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: referrer.pi_uid,
      amount: bonusAmount,
      memo: `Referral bonus - you referred ${newCustomerName}! 🎉`,
      transaction_type: 'customer_reward',
      metadata: {
        reward_type: 'referral_bonus',
        referred_customer: newCustomerName
      }
    })
  });
}
```

### 4. Staff Commission Payouts

Automatically pay sales staff their commissions after each sale.

**Implementation:**

```typescript
// In your sales completion logic
async function completeSaleWithCommission(saleData: any) {
  // Process the sale
  const sale = await createSale(saleData);
  
  // Calculate and pay commission to cashier
  if (sale.cashier_id) {
    const commissionRate = 0.03; // 3% commission
    const commissionAmount = sale.total_amount * commissionRate;
    
    if (commissionAmount > 0) {
      const cashier = await getStaffDetails(sale.cashier_id);
      
      await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: cashier.pi_uid,
          amount: commissionAmount,
          memo: `Sales commission - ${commissionRate * 100}% of sale #${sale.transaction_number}`,
          transaction_type: 'staff_payout',
          metadata: {
            commission_type: 'sales_commission',
            sale_id: sale.id,
            sale_amount: sale.total_amount,
            commission_rate: commissionRate
          }
        })
      });
    }
  }
  
  return sale;
}
```

### 5. Cashback Promotions

Offer instant cashback on purchases during promotional periods.

**Example: Weekend Cashback Event**

```typescript
async function processSaleWithCashback(sale: any, currentPromotion: any) {
  // Check if cashback promotion is active
  const isWeekend = new Date().getDay() >= 5; // Friday-Sunday
  
  if (isWeekend && currentPromotion.cashback_enabled) {
    const cashbackRate = 0.05; // 5% weekend cashback
    const cashbackAmount = sale.total_amount * cashbackRate;
    
    // Send cashback to customer
    await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: sale.customer_pi_uid,
        amount: cashbackAmount,
        memo: 'Weekend Cashback Event - 5% back on your purchase!',
        transaction_type: 'customer_reward',
        metadata: {
          promotion_type: 'weekend_cashback',
          promotion_id: currentPromotion.id,
          cashback_rate: cashbackRate,
          original_sale_id: sale.id
        }
      })
    });
  }
}
```

## Advanced Use Cases

### Automated Batch Payouts

Process multiple A2U payments at once (e.g., monthly rewards, bulk refunds).

```typescript
async function processBatchA2UPayments(payments: Array<{
  customerPiUid: string;
  amount: number;
  memo: string;
  transactionType: 'refund' | 'reward' | 'payout';
}>) {
  const results = [];
  
  for (const payment of payments) {
    try {
      const response = await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: payment.customerPiUid,
          amount: payment.amount,
          memo: payment.memo,
          transaction_type: payment.transactionType
        })
      });
      
      const result = await response.json();
      results.push({ payment, result, status: 'success' });
    } catch (error) {
      results.push({ payment, error, status: 'failed' });
    }
  }
  
  return results;
}
```

### Conditional Rewards

Reward customers based on specific purchase patterns.

```typescript
async function checkAndRewardCustomer(customerId: string, newPurchase: any) {
  // Get customer purchase history
  const history = await getCustomerPurchaseHistory(customerId);
  
  // First purchase reward
  if (history.purchases.length === 1) {
    await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: newPurchase.customer_pi_uid,
        amount: 0.5,
        memo: 'Welcome bonus! Thank you for your first purchase! 🎉',
        transaction_type: 'customer_reward',
        metadata: { reward_type: 'first_purchase_bonus' }
      })
    });
  }
  
  // Every 10th purchase reward
  if (history.purchases.length % 10 === 0) {
    await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: newPurchase.customer_pi_uid,
        amount: 1.0,
        memo: `Congratulations! This is your ${history.purchases.length}th purchase! 🎊`,
        transaction_type: 'customer_reward',
        metadata: { reward_type: 'milestone_reward', milestone: history.purchases.length }
      })
    });
  }
  
  // High-value customer reward
  const totalSpent = history.total_amount + newPurchase.amount;
  if (totalSpent >= 100 && totalSpent - newPurchase.amount < 100) {
    await fetch('/api/payments/a2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: newPurchase.customer_pi_uid,
        amount: 2.0,
        memo: 'VIP Customer! You\'ve spent 100+ Pi with us! 👑',
        transaction_type: 'customer_reward',
        metadata: { reward_type: 'vip_milestone', total_spent: totalSpent }
      })
    });
  }
}
```

## Integration Examples

### With Existing Sales Flow

```typescript
// In your main sales/checkout component
export function SalesCheckout() {
  const [saleComplete, setSaleComplete] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);

  const handleSaleComplete = async (saleData: any) => {
    // 1. Process the normal sale
    const sale = await createSale(saleData);
    
    // 2. Check for loyalty rewards
    const customerLoyalty = await getLoyaltyStatus(sale.customer_id);
    const loyaltyReward = calculateLoyaltyReward(sale.total_amount, customerLoyalty.tier);
    
    if (loyaltyReward > 0) {
      await sendA2UReward(sale.customer_pi_uid, loyaltyReward, 'Loyalty reward');
    }
    
    // 3. Check for staff commission
    if (sale.cashier_id) {
      const commission = calculateCommission(sale.total_amount);
      await sendA2UCommission(sale.cashier_pi_uid, commission, sale.id);
    }
    
    // 4. Check for promotional cashback
    const promo = await getActivePromotions();
    if (promo.cashback_active) {
      const cashback = sale.total_amount * promo.cashback_rate;
      await sendA2UReward(sale.customer_pi_uid, cashback, promo.name);
    }
    
    setCurrentSale(sale);
    setSaleComplete(true);
  };

  return (
    <CheckoutForm 
      onComplete={handleSaleComplete}
    />
  );
}
```

## Security Best Practices

1. **Always validate A2U requests** on the server side
2. **Implement rate limiting** to prevent abuse
3. **Set minimum/maximum transaction limits**
4. **Require manager approval** for large refunds
5. **Log all A2U transactions** for audit purposes
6. **Use mock mode** during development and testing

```typescript
// Example: Add validation and approval workflow
async function processLargeRefund(refundData: any) {
  const REFUND_THRESHOLD = 10; // Pi
  
  if (refundData.amount > REFUND_THRESHOLD) {
    // Require manager approval
    const managerApproved = await requestManagerApproval(refundData);
    
    if (!managerApproved) {
      throw new Error('Manager approval required for large refunds');
    }
  }
  
  // Process refund with additional logging
  await logA2URequest(refundData, 'large_refund');
  return await processA2URefund(refundData);
}
```

## Monitoring and Analytics

Track A2U payment performance and customer engagement:

```typescript
// Example: A2U analytics dashboard
async function getA2UAnalytics() {
  const stats = await fetch('/api/analytics/a2u').then(r => r.json());
  
  return {
    totalA2UPayments: stats.count,
    totalVolume: stats.volume,
    averageAmount: stats.avg_amount,
    successRate: stats.success_rate,
    breakdown: {
      refunds: stats.refunds,
      rewards: stats.rewards,
      payouts: stats.payouts
    },
    topCustomers: stats.top_customers,
    monthlyTrend: stats.trend
  };
}
```

## Conclusion

A2U payments in myPiPOS enable:
- ✅ Instant customer refunds
- ✅ Automated loyalty programs
- ✅ Staff commission payouts
- ✅ Promotional rewards
- ✅ Enhanced customer experience
- ✅ Competitive differentiation

Start with the refund functionality, then gradually add rewards and other features as you see what works best for your business!