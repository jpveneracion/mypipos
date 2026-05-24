# myPiPOS Payment Flow Guide - U2A (User-to-App) 💳

## Understanding the Two Payment Directions

### U2A (User-to-App) - Customer Purchases 🛒
**Customer pays merchant** for items - This is your standard checkout flow.

```typescript
// Customer pays for items at POS
Customer Wallet (payment) → Merchant Wallet (receives funds)
```

### A2U (App-to-User) - Refunds & Rewards 🎁  
**Merchant pays customer** - This is for refunds, rewards, payouts.

```typescript
// Merchant sends refund/reward to customer
Merchant Wallet (refund/reward) → Customer Wallet (receives funds)
```

---

## Complete U2A Checkout Flow Implementation

### 1. Customer Checkout Process

Here's how a customer pays for items at your POS:

```typescript
// Complete checkout flow in myPiPOS
async function processCheckout(cartItems: any[], customer: any) {
  
  // Step 1: Calculate totals
  const subtotal = calculateSubtotal(cartItems);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  console.log(`Processing checkout: ${total} Pi for ${cartItems.length} items`);

  // Step 2: Create payment request on Pi Network
  const paymentData = {
    amount: total,
    memo: `Purchase at ${merchantName} - ${cartItems.length} items`,
    metadata: {
      cart_items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      customer_id: customer.id,
      merchant_id: merchantId,
      checkout_timestamp: Date.now()
    }
  };

  // Step 3: Request payment from customer via Pi SDK
  const piPayment = await requestCustomerPayment(paymentData);

  // Step 4: Complete the sale after payment is confirmed
  const sale = await createSaleRecord({
    ...paymentData,
    payment_id: piPayment.paymentId,
    txid: piPayment.txid,
    customer_id: customer.id,
    payment_status: 'completed'
  });

  // Step 5: Update inventory
  await updateInventory(cartItems);

  return sale;
}
```

### 2. Frontend Payment Request

The customer uses the Pi SDK to authorize and complete the payment:

```typescript
// In your checkout/payment component
import { Pi } from 'pi-sdk';

async function initiateCheckout(cart: any[], customer: any) {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    // Step 1: Create payment via Pi SDK
    const payment = await Pi.createPayment({
      amount: total,
      memo: `Purchase at ${merchantName}`,
      metadata: {
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }
    }, {
      // Callbacks for payment lifecycle
      onReadyForServerApproval: (paymentId) => {
        console.log('Payment ready for approval:', paymentId);
        approvePaymentOnServer(paymentId);
      },
      onApproved: (paymentId, txid) => {
        console.log('Payment approved:', paymentId, txid);
        completeSale(paymentId, txid);
      },
      onComplete: (paymentId, txid) => {
        console.log('Payment complete:', paymentId, txid);
        showSuccessMessage();
      },
      onCancelled: (paymentId) => {
        console.log('Payment cancelled:', paymentId);
        showCancellationMessage();
      }
    });

    return payment;

  } catch (error) {
    console.error('Payment failed:', error);
    showErrorMessage();
  }
}
```

### 3. Backend Payment Processing

Your backend handles the payment approval and completion:

```typescript
// POST /api/payments/approve
export async function approvePaymentOnServer(paymentId: string) {
  
  // Verify payment with Pi Network
  const payment = await PiNetworkService.getPayment(paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Verify payment details
  if (payment.amount !== expectedAmount) {
    throw new Error('Amount mismatch');
  }

  // Approve the payment on Pi Network
  const approvedPayment = await PiNetworkService.approvePayment(paymentId);

  console.log('Payment approved:', approvedPayment.identifier);

  return approvedPayment;
}

// POST /api/payments/complete
export async function completeSale(paymentId: string, txid: string) {
  
  // Get payment details
  const payment = await PiNetworkService.getPayment(paymentId);

  // Verify transaction on blockchain
  const verified = await PiNetworkService.verifyTransaction(paymentId, txid);

  if (!verified) {
    throw new Error('Transaction verification failed');
  }

  // Mark payment as completed on Pi Network
  const completedPayment = await PiNetworkService.completePayment(paymentId, txid);

  // Create sale record in database
  const sale = await createSaleInDatabase({
    payment_id: paymentId,
    txid: txid,
    amount: payment.amount,
    customer_id: payment.metadata.customer_id,
    payment_status: 'completed',
    status: 'completed'
  });

  console.log('Sale completed:', sale.transaction_number);

  return sale;
}
```

### 4. Integration with Existing Payment Infrastructure

Let me show you how this integrates with your existing Pi payment setup:

```typescript
// Using your existing pi-payments.ts infrastructure
import { PiPaymentService } from '@/lib/pi-payments';
import { PiAuth } from '@/lib/pi-auth';

export class CheckoutService {
  private piPaymentService: PiPaymentService;
  private piAuth: PiAuth;

  constructor() {
    this.piAuth = new PiAuth();
    this.piPaymentService = new PiPaymentService(this.piAuth);
  }

  async processCustomerCheckout(checkoutData: {
    cartItems: any[];
    customer: any;
    merchantId: string;
  }) {
    
    const { cartItems, customer, merchantId } = checkoutData;
    
    // Step 1: Calculate totals
    const subtotal = cartItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    console.log(`Checkout total: ${total} Pi`);

    // Step 2: Create payment request
    const paymentRequest = await this.piPaymentService.createPayment({
      amount: total,
      memo: `Purchase at myPiPOS - ${cartItems.length} items`,
      metadata: {
        cart_items: cartItems,
        customer_id: customer.id,
        merchant_id: merchantId
      }
    });

    return paymentRequest;
  }

  async finalizePayment(paymentId: string, txid: string) {
    
    // Step 3: Complete the payment
    await this.piPaymentService.completePayment(paymentId, txid);

    // Step 4: Create sale record
    const sale = await this.createSaleRecord(paymentId, txid);

    return sale;
  }

  private async createSaleRecord(paymentId: string, txid: string) {
    // Get payment details
    const payment = await this.piPaymentService.getPaymentDetails(paymentId);

    // Create sale in database
    const sale = await createSale({
      transaction_number: generateTransactionNumber(),
      customer_id: payment.metadata.customer_id,
      merchant_id: payment.metadata.merchant_id,
      subtotal: payment.amount * 0.92, // Remove tax
      tax_amount: payment.amount * 0.08,
      total_amount: payment.amount,
      payment_method: 'pi',
      payment_status: 'completed',
      pi_payment_id: paymentId,
      pi_transaction_id: txid,
      status: 'completed',
      completed_at: new Date()
    });

    return sale;
  }
}
```

---

## Complete Checkout Component

Here's a React component that handles the full checkout flow:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShoppingCart, CheckCircle } from 'lucide-react';

interface CheckoutComponentProps {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  customer: {
    id: string;
    name: string;
    pi_uid: string;
  };
  onComplete: (sale: any) => void;
}

export function CheckoutComponent({ cartItems, customer, onComplete }: CheckoutComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'requesting' | 'approving' | 'completing' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);
    setCurrentStep('requesting');

    try {
      // Step 1: Create payment via Pi SDK
      const Pi = (window as any).Pi;
      
      const payment = await Pi.createPayment({
        amount: total,
        memo: `Purchase at myPiPOS`,
        metadata: {
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          customer_id: customer.id,
          timestamp: Date.now()
        }
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for approval:', paymentId);
          setCurrentStep('approving');

          // Approve payment on backend
          const response = await fetch('/api/payments/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
          });

          if (!response.ok) {
            throw new Error('Payment approval failed');
          }
        },

        onApproved: async (paymentId: string, txid: string) => {
          console.log('Payment approved:', paymentId, txid);
          setCurrentStep('completing');

          // Complete payment on backend
          const response = await fetch('/api/payments/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid })
          });

          if (!response.ok) {
            throw new Error('Payment completion failed');
          }

          const sale = await response.json();
          setCurrentStep('success');
          onComplete(sale);
        },

        onComplete: (paymentId: string, txid: string) => {
          console.log('Payment complete:', paymentId, txid);
          setCurrentStep('success');
          setIsProcessing(false);
        },

        onCancelled: (paymentId: string) => {
          console.log('Payment cancelled by user');
          setError('Payment was cancelled');
          setCurrentStep('idle');
          setIsProcessing(false);
        },

        onError: (error: any, payment?: any) => {
          console.error('Payment error:', error);
          setError(error.message || 'Payment failed');
          setCurrentStep('idle');
          setIsProcessing(false);
        }
      });

    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'Checkout failed');
      setCurrentStep('idle');
      setIsProcessing(false);
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'requesting':
        return 'Initializing payment...';
      case 'approving':
        return 'Waiting for payment approval...';
      case 'completing':
        return 'Finalizing transaction...';
      case 'success':
        return 'Payment successful!';
      default:
        return 'Complete your purchase';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Cart Summary */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Summary
            </h3>
            
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{(item.price * item.quantity).toFixed(7)} Pi</span>
                </div>
              ))}
              
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(7)} Pi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (8%)</span>
                  <span>{tax.toFixed(7)} Pi</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{total.toFixed(7)} Pi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {currentStep !== 'idle' && (
            <div className={`p-4 rounded-lg ${
              currentStep === 'success' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {currentStep === 'success' && <CheckCircle className="h-4 w-4" />}
                <span className="font-medium">{getStepMessage()}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              <p className="font-medium">Payment Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={isProcessing || cartItems.length === 0}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Pay {total.toFixed(7)} Pi
              </>
            )}
          </Button>

          {/* Customer Info */}
          <div className="text-sm text-gray-600 text-center">
            <p>Customer: {customer.name}</p>
            <p className="text-xs">Payment will be processed via Pi Network</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Key Differences: U2A vs A2U

| Aspect | U2A (Customer → Merchant) | A2U (Merchant → Customer) |
|--------|---------------------------|---------------------------|
| **Purpose** | Customer purchases items | Refunds, rewards, payouts |
| **Flow** | Customer wallet → Merchant wallet | Merchant wallet → Customer wallet |
| **Initiation** | Customer initiates payment | Merchant initiates payment |
| **Approval** | Customer must approve | Merchant decides to send |
| **Use Cases** | Normal checkout, buying items | Returns, loyalty, commissions |

---

## Integration with Your Existing Setup

Your myPiPOS already has some payment infrastructure. Here's how to use it:

### Use Existing Payment Routes:
- `POST /api/payments/approve` - Approve customer payment
- `POST /api/payments/complete` - Complete customer transaction  
- `POST /api/payments/verify` - Verify blockchain transaction

### Add New A2U Routes:
- `POST /api/payments/a2u` - Send refunds/rewards to customers

---

## Testing the Checkout Flow

### Test U2A (Customer Payment):
```bash
# Simulate customer checkout
POST /api/payments/create
{
  "amount": 25.50,
  "memo": "Purchase at myPiPOS",
  "metadata": {
    "customer_id": "customer-123",
    "items": [...]
  }
}

# Approve the payment
POST /api/payments/approve
{
  "paymentId": "payment_123"
}

# Complete the sale
POST /api/payments/complete
{
  "paymentId": "payment_123",
  "txid": "txid_456"
}
```

### Test A2U (Refund/Reward):
```bash
# Process refund
POST /api/payments/a2u
{
  "uid": "customer_pi_uid",
  "amount": 25.50,
  "memo": "Refund for returned items",
  "transaction_type": "refund"
}
```

---

## Complete Payment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MYPIPOS PAYMENT SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  U2A FLOW (Customer → Merchant)                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │ Customer │ ───> │ App      │ ───> │ Merchant │          │
│  │ Wallet   │ Pay  │ Approve  │ Sale  │ Wallet   │          │
│  └──────────┘      └──────────┘      └──────────┘          │
│                                                               │
│  A2U FLOW (Merchant → Customer)                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │ Merchant │ ───> │ App      │ ───> │ Customer │          │
│  │ Wallet   │ Refund│ Process  │ Reward│ Wallet   │          │
│  └──────────┘      └──────────┘      └──────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Implement U2A checkout** - Use your existing payment routes
2. **Add A2U for refunds** - Process returns instantly
3. **Test both flows** - Ensure smooth bidirectional payments
4. **Add analytics** - Track both incoming and outgoing payments

**The result:** A complete payment system where customers can pay for items and merchants can process refunds/rewards seamlessly! 🎉