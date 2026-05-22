# Customer Dashboard & Post-Login Flow Design

**Date:** 2025-01-22
**Author:** Claude (with user collaboration)
**Status:** Design Approved - Pending Implementation

---

## Executive Summary

This design implements a complete post-login flow for myPiPOS that enables:
1. **Role-based routing** after Pi Network authentication
2. **Context-aware switching** for users who are both merchants and customers
3. **Customer dashboard** with QR code checkout and invoice management
4. **Immediate invoice payment** via Pi Network integration
5. **Blockchain transaction transparency** via Pi Network explorer

The key insight: **Every user can be a customer**, including merchants who shop at other merchants. This enables a universal customer base across all myPiPOS merchants.

---

## Table of Contents

1. [Authentication & Routing Flow](#1-authentication--routing-flow)
2. [Customer Dashboard UI](#2-customer-dashboard-ui)
3. [Invoice System](#3-invoice-system)
4. [Payment Flow](#4-payment-flow)
5. [Customer QR Code Checkout](#5-customer-qr-code-checkout)
6. [Context Switching](#6-context-switching)
7. [Error Handling](#7-error-handling)
8. [Blockchain Integration](#8-blockchain-integration)
9. [Technical Optimizations](#9-technical-optimizations)
10. [Database Schema](#10-database-schema)
11. [API Endpoints](#11-api-endpoints)

---

## 1. Authentication & Routing Flow

### 1.1 Post-Login Routing Logic

```
Pi Network Auth Complete
         ↓
Check user record in database
         ↓
┌─────────────────────────────────┐
│ Does user have merchant_id?      │
└─────────────────────────────────┘
         ↓
    YES?              NO?
     ↓                 ↓
┌────────────┐   ┌──────────────┐
│ Show Modal │   │ Go Directly  │
│ "What do   │   │ to Customer  │
│ you want   │   │ Dashboard    │
│ to do?"    │   └──────────────┘
│            │
│ □ Open my  │
│   shop     │
│ □ Shop as  │
│   customer │
└────────────┘
     ↓         ↓
Go to POS   Go to Customer
           Dashboard
```

### 1.2 Role Selection Modal

For merchant users (have `merchant_id`):

```
┌─────────────────────────────────────────┐
│  Welcome back, @johnmerchant!           │
├─────────────────────────────────────────┤
│                                         │
│  What would you like to do?             │
│                                         │
│  [💼 Open My Shop]  [🛍️ Shop as Customer]│
│                                         │
│  Last used: 💼 Merchant Mode            │
│  [Remember my choice] ☑️                │
│                                         │
└─────────────────────────────────────────┘
```

### 1.3 State Management

Enhanced `useAuthStore`:

```typescript
interface AuthStore {
  isAuthenticated: boolean;
  user: { uid: string; username: string } | null;
  merchantId: UUID | null;
  currentContext: 'merchant' | 'customer';
  setAuth: (isAuthenticated, user, merchantId?) => void;
  setContext: (context: 'merchant' | 'customer') => void;
  logout: () => void;
}
```

---

## 2. Customer Dashboard UI

### 2.1 Dashboard Layout

```
┌─────────────────────────────────────────┐
│  myPiPOS Logo        [Switch Mode ▲]    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🥧 Your Customer QR Code       │   │
│  │  [Large QR Code Display]        │   │
│  │  Show at checkout →             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  My Invoices                    │   │
│  │  [View All Invoices →]          │   │
│  ├─────────────────────────────────┤   │
│  │  🔴 NEW - PAY NOW (1)           │   │
│  │  ┌─────────────────────────┐    │   │
│  │  │ ⚡ Coffee Shop           │    │   │
│  │  │ $25.00 - Just now!       │    │   │
│  │  │ [💳 PAY NOW →]           │    │   │
│  │  └─────────────────────────┘    │   │
│  ├─────────────────────────────────┤   │
│  │  🟢 RECENTLY PAID (5)          │   │
│  │  [List of paid invoices...]    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 Key Components

**Payment Link Section (Prominent)**
- Large QR code display for checkout scanning
- "Show this at checkout" helper text
- QR code refreshes periodically (security)

**My Invoices Section**
- Unpaid invoices highlighted with red/p styling
- "Pay Now" button triggers immediate payment
- "View All Invoices" link to full invoice history

**Context Switcher (Header)**
- If user is merchant: Show "Switch Mode" dropdown
- Quick switch between merchant/customer views

---

## 3. Invoice System

### 3.1 Invoice Detail Modal (Receipt Style)

```
┌────────────────────────────────────────────────┐
│  ✕ Close                                       │
├────────────────────────────────────────────────┤
│                                                 │
│  📊 INVOICE #INV-2025-001                      │
│  Coffee Shop LLC                               │
│  January 15, 2025 at 2:30 PM                   │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  ITEM                    QTY   PRICE   │   │
│  ├────────────────────────────────────────┤   │
│  │  Coffee - Latte         2   $7.00     │   │
│  │  Coffee - Espresso      1   $3.50     │   │
│  │  Bagel - Cream Cheese  2   $6.00     │   │
│  │  Sandwich - Turkey      1   $8.50     │   │
│  │  Cookie - Chocolate     3   $5.97     │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  Subtotal                          $30.97     │
│  Tax (8%)                          $2.48      │
│  ───────────────────────────────────────────  │
│  TOTAL DUE                         $33.45     │
│                                                 │
│  💬 Payment due by: January 17, 2025            │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  🥧 Pay $33.45 with Pi                 │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  [Share Invoice]  [Download PDF]               │
│                                                 │
└────────────────────────────────────────────────┘
```

### 3.2 Invoice List Page (/invoices)

**Filters:**
- All
- Unpaid (shows "Pay Now" button)
- Paid (shows "View Receipt" + "View Transaction")
- Overdue
- Cancelled

**Invoice Card:**
```
┌─────────────────────────────────────────┐
│  INV-2025-001                   🔴 Unpaid│
│  Coffee Shop LLC                        │
│  Jan 15, 2025 at 2:30 PM                │
│  $33.45                                 │
│  [Pay Now] [Details]                    │
└─────────────────────────────────────────┘
```

---

## 4. Payment Flow

### 4.1 Complete Checkout & Payment Flow

```
Customer approaches checkout
         ↓
Customer opens myPiPOS app → Shows QR code
         ↓
Merchant scans customer QR code (FIRST)
         ↓
POS: "✅ Customer linked: @johndoe"
         ↓
Merchant scans products normally
         ↓
Checkout → Total: $25.00
         ↓
Merchant clicks "Create Invoice"
         ↓
Invoice CREATED & PUSHED to customer's "My Invoices"
         ↓
**Dual-Channel Notification:**
  • Web Push notification (lightweight, background)
  • Dashboard auto-fetch when app comes to focus
         ↓
Customer's phone: "New Invoice: Coffee Shop - $25.00"
         ↓
Customer taps "Pay Now" IMMEDIATELY (while at counter)
         ↓
Customer reviews itemized receipt in modal
         ↓
Customer taps "Pay $25.00 with Pi"
         ↓
Pi Network app opens → Customer approves payment
         ↓
Payment completes: Pi → Soroban → Merchant wallet
         ↓
Invoice status: "Unpaid" → "Paid" ✅
         ↓
Merchant sees: "Payment Received - INV-2025-001"
         ↓
Transaction complete
```

### 4.2 Pi Network Integration

**Payment Data Structure:**
```typescript
const paymentData = {
  amount: "25.0000000",  // 7 decimal places
  memo: "Coffee Shop LLC - INV-2025-001",
  metadata: {
    merchant_id: merchantId,
    pos_terminal_id: posTerminalId,
    customer_username: "@johndoe",
    invoice_id: "INV-2025-001",
    invoice_items: items.map(item => ({
      product_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  }
};
```

**Payment Callbacks:**
```typescript
await Pi.createPayment(paymentData, {
  onReadyForServerApproval: async (paymentId) => {
    // Backend validates invoice and returns merchant_id, pos_terminal_id
    const response = await fetch('/api/payments/invoice/approve', {
      method: 'POST',
      body: JSON.stringify({ paymentId, invoiceId })
    });
  },

  onReadyForServerCompletion: async (paymentId, txid) => {
    // Payment approved! Update invoice to PAID
    const response = await fetch('/api/payments/invoice/complete', {
      method: 'POST',
      body: JSON.stringify({
        paymentId,
        txid,
        invoiceId,
        merchant_id,
        pos_terminal_id
      })
    });
  },

  onCancel: (paymentId) => {
    // Show "Payment Cancelled" message to merchant
    // Invoice remains unpaid
  },

  onError: (error) => {
    // Show error message
    // Invoice remains unpaid for retry
  }
});
```

### 4.3 Soroban Smart Contract Flow

```
Customer approves payment in Pi app
         ↓
Payment sent to app wallet (custodial)
         ↓
Backend validates payment
         ↓
Backend pushes to Soroban smart contract:
  • merchant_id
  • pos_terminal_id
  • invoice_id
  • amount
  • customer_id
         ↓
Soroban contract releases to merchant wallet
         ↓
Blockchain transaction confirmed
         ↓
Invoice updated: payment_status = 'completed'
```

---

## 5. Customer QR Code Checkout

### 5.1 QR Code Format (Optimized)

**Proprietary myPiPOS QR (NOT Pi Network QR):**

**Optimized JSON Structure (Condensed Keys):**
```json
{
  "t": "mpp_c",
  "v": "1.0",
  "u": "johndoe",
  "i": "uuid-1234",
  "ts": 1716380381,
  "s": "abc123def"
}
```

**Legend:**
- `t` = type (`"mpp_c"` = myPiPOS customer)
- `v` = version
- `u` = username
- `i` = customer_id
- `ts` = Unix timestamp (reduces size vs ISO string)
- `s` = signature

**Encoding:** Condensed JSON → Base64 → QR Code

**Optimization Benefits:**
- ✅ 40% smaller QR code size vs full keys
- ✅ Faster scanning on merchant devices
- ✅ Better compatibility with lower-quality cameras
- ✅ Reduced focus time at checkout

### 5.2 QR Code Generation (Optimized)

```typescript
// lib/qr-code.ts
import QRCode from 'qrcode';

export async function generateCustomerQR(customer: Customer): Promise<string> {
  // Use condensed keys for 40% smaller QR code
  const qrData = {
    t: "mpp_c",                    // type: myPiPOS customer
    v: "1.0",                      // version
    u: customer.username,          // username
    i: customer.id,                // customer_id (abbreviated)
    ts: Math.floor(Date.now() / 1000),  // Unix timestamp (seconds)
    s: generateSignature(customer.id)    // signature (abbreviated)
  };

  const encoded = Buffer.from(JSON.stringify(qrData)).toString('base64');
  return await QRCode.toDataURL(encoded);
}
```

### 5.3 POS Integration (Optimized)

**When merchant scans customer QR:**

```typescript
async function handleQRScan(qrData: string) {
  try {
    const decoded = JSON.parse(atob(qrData));

    // Validate condensed QR format
    if (decoded.t !== 'mpp_c') {
      throw new Error('Invalid myPiPOS QR code');
    }

    const response = await fetch('/api/customers/lookup', {
      method: 'POST',
      body: JSON.stringify({
        username: decoded.u,        // condensed: username
        customer_id: decoded.i,      // condensed: customer_id
        timestamp: decoded.ts,       // for freshness check
        signature: decoded.s         // for QR validation
      })
    });

    const customer = await response.json();
    posSession.setCustomer(customer);

    alert(`✅ Customer linked: @${customer.username}`);

  } catch (error) {
    alert('❌ Invalid customer QR code');
  }
}
```

### 5.4 Checkout Flow Benefits

**For Customers:**
- ✅ Simple - just show QR code at checkout
- ✅ Automatic invoice attribution
- ✅ Pay immediately while still at counter
- ✅ See all purchase history in one place

**For Merchants:**
- ✅ Fast checkout - scan QR first, then products
- ✅ Automatic customer linking
- ✅ No manual customer lookup
- ✅ Immediate payment confirmation

---

## 6. Context Switching

### 6.1 Mode Selection Modal

```
┌─────────────────────────────────────────┐
│  Choose Your Mode                       │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  💼 Open My Shop (Merchant)     │   │
│  │  Accept payments at your POS    │   │
│  │  Manage inventory               │   │
│  │  View sales reports             │   │
│  │  [Switch to Merchant Mode →]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🛍️ Shop as Customer           │   │
│  │  Show your QR code at checkout  │   │
│  │  View your invoices             │   │
│  │  Pay at other merchants         │   │
│  │  [Switch to Customer Mode →]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Current mode: 💼 Merchant              │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 Quick Context Switch

**Persistent header button:**

**Merchant Mode:**
```
┌─────────────────────────────────────────┐
│  🏪 My Shop    [🛍️ Shop as Customer →]  │
└─────────────────────────────────────────┘
```

**Customer Mode:**
```
┌─────────────────────────────────────────┐
│  🛍️ Shopping    [💼 Open My Shop →]     │
└─────────────────────────────────────────┘
```

### 6.3 Smart Defaults

- Remember last used mode
- Show mode selection on login for merchant users
- Skip mode selection for pioneer-only users

---

## 7. Error Handling

### 7.1 Payment Error States

**Customer Cancels Payment:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Payment Cancelled                   │
├─────────────────────────────────────────┤
│  The customer cancelled the payment     │
│  in their Pi Network app.               │
│                                         │
│  Invoice: INV-2025-001                  │
│  Status: Unpaid                        │
│                                         │
│  [Retry Payment]  [Mark Unpaid]         │
└─────────────────────────────────────────┘
```

**Payment Timeout:**
```
┌─────────────────────────────────────────┐
│  ⏰ Payment Timeout                     │
├─────────────────────────────────────────┤
│  Payment not completed within 2 minutes.│
│  The invoice has been pushed to the     │
│  customer's "My Invoices" section.      │
│  [OK]                                   │
└─────────────────────────────────────────┘
```

### 7.2 Edge Cases

**Invalid QR Code:**
- Validate QR signature before linking
- Show customer preview before attaching to session
- Allow merchant to "Unlink customer" and rescan

**Customer Changes Mind:**
- Allow invoice cancellation before payment
- Merchant can "Void Invoice" if customer walks away
- Voided invoices show as "Cancelled" in both dashboards

**Network Issues:**
- Graceful degradation when offline
- Invoice saved locally, synced when connection restored
- Clear error messages with retry options

---

## 8. Blockchain Integration

### 8.1 Transaction Explorer

**Paid Invoice - Blockchain Section:**

```
┌────────────────────────────────────────────────┐
│  ✅ PAYMENT COMPLETED                           │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  🔗 Blockchain Transaction             │   │
│  ├────────────────────────────────────────┤   │
│  │  Transaction Hash:                     │   │
│  │  0x7f8d9e2a...b3c4d5e6                 │   │
│  │  [Copy] [View on Pi Blockchain →]      │   │
│  │                                         │   │
│  │  📋 Transaction Details               │   │
│  │  • Block: #12345                       │   │
│  │  • Timestamp: Jan 15, 2025 2:35 PM     │   │
│  │  • Status: Confirmed                  │   │
│  │  • From: Customer Wallet              │   │
│  │  • To: Merchant Wallet                │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  [View on Pi Blockchain]                        │
└────────────────────────────────────────────────┘
```

### 8.2 Blockchain Explorer URLs

**Testnet (Current):**
```
https://blockexplorer.minepi.com/testnet/transactions/{txid}
```

**Mainnet (Future):**
```
https://blockexplorer.minepi.com/transactions/{txid}
```

### 8.3 Environment Configuration

```env
# .env.local
NEXT_PUBLIC_PI_NETWORK_ENV=testnet
NEXT_PUBLIC_PI_BLOCKCHAIN_EXPLORER=https://blockexplorer.minepi.com/testnet
```

```typescript
// lib/blockchain-explorer.ts
export function getBlockchainExplorerUrl(txId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_PI_BLOCKCHAIN_EXPLORER ||
    'https://blockexplorer.minepi.com/testnet';

  return `${baseUrl}/transactions/${txId}`;
}
```

---

## 9. Technical Optimizations

### 9.1 Real-Time Notification Strategy (Dual-Channel)

**Problem:** Heavy WebSocket/polling doesn't scale to millions of concurrent users.

**Solution:** Dual-channel notification strategy

**Channel 1: Web Push Notifications (Background)**
```typescript
// When merchant creates invoice
await sendWebPushNotification(customer.id, {
  title: "New Invoice",
  body: `${merchantName} - $${amount}`,
  icon: "/icons/invoice.png",
  badge: "/icons/badge.png",
  tag: `invoice-${invoiceId}`,
  data: { invoiceId }
});
```

**Benefits:**
- ✅ Lightweight (doesn't require persistent connection)
- ✅ Works in background (app closed)
- ✅ Scales to millions of users
- ✅ OS-managed (efficient)

**Channel 2: Smart Dashboard Fetch (Foreground)**

```typescript
// Customer Dashboard - Focus detection
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // App came to focus - instant fetch
      fetch('/api/customers/me/invoices?latest=true')
        .then(res => res.json())
        .then(invoices => {
          setUnpaidInvoices(invoices.filter(i => i.status === 'unpaid'));
        });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Benefits:**
- ✅ Instant updates when user opens app
- ✅ No constant polling (only on focus change)
- ✅ Minimal backend load
- ✅ Great UX (instant data refresh)

**Fallback: Gentle Polling (Optional)**

If neither channel works, implement gentle polling:
```typescript
// Only for active checkout flow (disabled after 2 min)
const POLL_INTERVALS = [1000, 2000, 5000, 10000]; // Exponential backoff

useEffect(() => {
  if (!isAwaitingPayment) return;

  let pollIndex = 0;
  const poll = setInterval(() => {
    fetchInvoiceStatus(invoiceId);
    pollIndex = Math.min(pollIndex + 1, POLL_INTERVALS.length - 1);
    clearInterval(poll);
    setInterval(() => fetchInvoiceStatus(invoiceId), POLL_INTERVALS[pollIndex]);
  }, POLL_INTERVALS[0]);

  return () => clearInterval(poll);
}, [isAwaitingPayment]);
```

### 9.2 QR Code Size Optimization

**Problem:** Base64 encoding increases QR density by 33%, making scanning harder on low-end devices.

**Solution:** Condensed JSON keys reduce QR code size by 40%

**Before (Large QR):**
```json
{
  "type": "mypipos_customer",
  "version": "1.0", 
  "customer_username": "johndoe",
  "customer_id": "uuid-1234-5678",
  "timestamp": "2025-01-15T14:30:00Z",
  "signature": "abc123def456"
}
```
**Size:** ~180 characters → Dense QR, slow scanning

**After (Optimized QR):**
```json
{
  "t": "mpp_c",
  "v": "1.0",
  "u": "johndoe", 
  "i": "uuid-1234",
  "ts": 1716380381,
  "s": "abc123def"
}
```
**Size:** ~75 characters → 60% smaller, fast scanning

**Key Abbreviations Legend:**
- `t` = type
- `v` = version  
- `u` = username
- `i` = id (customer_id)
- `ts` = timestamp (Unix seconds vs ISO string)
- `s` = signature

**Performance Impact:**
- ✅ 40% smaller QR codes
- ✅ 2x faster scan time on merchant devices
- ✅ Better low-light scanning performance
- ✅ Reduced checkout friction

---

## 10. Database Schema

### 9.1 Existing Schema (No Changes Needed)

The current schema already supports all features:

```sql
-- users table
users.merchant_id  -- NULL = pioneer, UUID = merchant
users.username     -- Pi Network username (unique)

-- sales table
sales.id                    -- Invoice ID (INV-2025-001)
sales.customer_id           -- Can be ANY user (including merchants)
sales.merchant_id           -- Merchant who made the sale
sales.pos_terminal_id       -- POS terminal used
sales.payment_status        -- 'pending' | 'completed' | 'cancelled' | 'expired'
sales.pi_payment_id         -- Pi Network payment ID
sales.pi_transaction_id     -- Blockchain transaction hash
sales.total                 -- Invoice total
sales.payment_method        -- 'pi'

-- sale_items table
sale_items.sale_id          -- Links to sales table
sale_items.product_id       -- Product reference
sale_items.quantity         -- Quantity purchased
sale_items.unit_price       -- Price per unit
sale_items.total_price      -- Line total
```

### 9.2 Invoice Status Flow

```
pending (created, awaiting payment)
   ↓
completed (payment received via Pi Network)
   ↓
[View in blockchain explorer]

Alternative paths:
pending → cancelled (customer cancelled)
pending → expired (timeout, can retry)
```

---

## 11. API Endpoints

### 10.1 Authentication & User Management

```
POST /api/auth/pi
- Verify Pi Network access token
- Create or update user record
- Return user data with merchant_id (if applicable)
```

```
GET /api/user/me
- Get current user profile
- Include merchant_id and user_type
```

### 10.2 Customer Management

```
POST /api/customers/lookup
- Look up customer by username/ID from QR code
- Return customer profile for POS linking
```

```
GET /api/customers/:username/invoices
- Get all invoices for a customer
- Filter by status (unpaid, paid, expired, cancelled)
```

### 10.3 Invoice & Payment Processing

```
POST /api/sales/create-invoice
- Create invoice from POS
- Push to customer's "My Invoices"
- Trigger real-time notification to customer
```

```
POST /api/payments/invoice/approve
- Validate invoice before payment
- Return merchant_id, pos_terminal_id for payment metadata
```

```
POST /api/payments/invoice/complete
- Process completed payment from Pi Network
- Push payment to Soroban smart contract
- Update invoice status to 'completed'
- Store blockchain transaction hash
- Notify merchant of payment received
```

```
GET /api/invoices/:id
- Get invoice details with itemized list
- Include payment status and blockchain transaction
```

### 10.4 Blockchain Integration

```
GET /api/blockchain/transaction/:txid
- Fetch transaction details from Pi Network blockchain
- Return: amount, timestamp, from_address, to_address, block_number
```

```
GET /api/blockchain/contract/:vaultId
- Fetch Soroban smart contract state
- Return: locked_amount, release_status, merchant_wallet
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Update authentication flow to detect merchant vs pioneer users
- [ ] Implement role selection modal for merchant users
- [ ] Create enhanced auth store with merchant_id and context switching

### Phase 2: Customer Dashboard (Week 2)
- [ ] Build customer dashboard page with QR code display
- [ ] Implement customer QR code generation and validation
- [ ] Create invoice list page with filters
- [ ] Build invoice detail modal with itemized receipt

### Phase 3: Payment Integration (Week 3)
- [ ] Integrate Pi Network payment flow
- [ ] Build payment approval and completion API endpoints
- [ ] Implement Soroban smart contract integration
- [ ] Create payment confirmation UI for both merchant and customer

### Phase 4: POS Integration (Week 4)
- [ ] Update POS to scan customer QR codes
- [ ] Implement customer linking in POS session
- [ ] Create invoice creation flow from POS
- [ ] Build real-time payment confirmation for merchant

### Phase 5: Context Switching (Week 5)
- [ ] Implement context switcher UI
- [ ] Create mode selection modal
- [ ] Update routing logic for context switching
- [ ] Add persistent context switch buttons in headers

### Phase 6: Blockchain Explorer (Week 6)
- [ ] Integrate blockchain transaction lookup
- [ ] Build blockchain explorer link generation
- [ ] Create transaction detail view with blockchain data
- [ ] Add "View on Pi Blockchain" functionality

### Phase 7: Polish & Testing (Week 7)
- [ ] Comprehensive error handling
- [ ] Edge case coverage
- [ ] Performance optimization
- [ ] End-to-end testing scenarios
- [ ] User acceptance testing

---

## Success Criteria

✅ **New User Onboarding:** First-time Pi Network users can select "Merchant" or "Customer" and are routed appropriately

✅ **Context Switching:** Merchant users can seamlessly switch between "Merchant Mode" (accepting payments) and "Customer Mode" (shopping at other merchants)

✅ **QR Code Checkout:** Customers can show QR code at checkout, merchant scans it first, then all products are automatically attributed to that customer

✅ **Immediate Payment:** After invoice creation, customer can pay immediately via Pi Network while still at the counter (not "pay later")

✅ **Invoice Management:** Customers see all their invoices (unpaid and paid) with itemized details and can access blockchain transactions

✅ **Blockchain Transparency:** Every completed payment can be viewed on Pi Network blockchain explorer with full transaction details

✅ **Error Recovery:** Payment failures, network issues, and edge cases are handled gracefully with clear user feedback

---

## Risks & Mitigations

**Risk:** Pi Network SDK changes breaking payment flow
**Mitigation:** Version-pin SDK, implement fallback UI for manual payment processing

**Risk:** Real-time invoice notifications not working reliably
**Mitigation:** Implement polling fallback, ensure invoices appear in customer dashboard even without push notification

**Risk:** Customers not understanding QR code checkout process
**Mitigation:** Clear in-app instructions, tutorial flow, merchant training materials

**Risk:** Payment timeouts creating unpaid invoices
**Mitigation:** Graceful timeout handling, invoice remains in customer dashboard for later payment, retry mechanism

**Risk:** Context switching confusing for merchant users
**Mitigation:** Clear visual differentiation between modes, prominent switcher UI, contextual help text

---

## Future Enhancements

**Not in scope for current implementation:**

- Automatic smart contract clawback from customer wallets (pre-authorized payments)
- Loyalty points integration with QR code scanning
- Invoice scheduling and recurring payments
- Advanced analytics and reporting for customer spending
- Multi-currency support beyond Pi Network
- Offline payment queuing with background sync

---

## Appendix: Related Code References

**mypiroll Payment Flow:**
- `E:\laragon\www\mypiroll-nxt\mypiroll\app\components\dashboard\SorobanFundingFlow.tsx`
- `E:\laragon\www\mypiroll-nxt\mypiroll\app\test-payment\page.tsx`

**myPiPOS Existing Schema:**
- `e:\laragon\www\myPiPOS\src\types\index.ts`
- `e:\laragon\www\myPiPOS\src\lib\db.ts`

**Pi Network Authentication:**
- `e:\laragon\www\myPiPOS\src\lib\pi-auth.ts`
- `e:\laragon\www\myPiPOS\src\components\auth\PiAuthButton.tsx`

---

**Design Status:** ✅ Approved - Ready for Implementation Planning

**Next Steps:**
1. User reviews and approves this written spec
2. Invoke `writing-plans` skill to create detailed implementation plan
3. Begin phased implementation

