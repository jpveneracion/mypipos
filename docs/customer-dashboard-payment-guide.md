# 🛒 Customer Dashboard Payment Workflows

**Complete guide to the two payment flows in myPiPOS**

---

## 📋 Two Distinct Payment Workflows

### **Workflow 1: Immediate U2A Payment (at POS)**

```
┌─────────────────────────────────────────────────────────────┐
│           IMMEDIATE PAYMENT (Standard POS Flow)              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Customer adds items to cart                             │
│  2. Customer clicks "Checkout" in POS                       │
│  3. U2ACheckoutFlow component:                              │
│     ├─ Creates sale record (with items)                     │
│     ├─ Initiates Pi Network payment immediately              │
│     └─ Customer approves in Pi Browser                      │
│  4. Payment processed → Sale marked "paid"                 │
│  5. Invoice appears in customer dashboard as "PAID"         │
│     └─ Green checkmark, no action needed                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Customer Experience:**
- ✅ Payment happens at checkout
- ✅ Invoice shows as "PAID" in dashboard
- ✅ No additional action required
- ✅ Best for: In-person POS transactions

---

### **Workflow 2: Dashboard Payment (pending → paid)**

```
┌─────────────────────────────────────────────────────────────┐
│         DASHBOARD PAYMENT (Invoice-Based Flow)               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Merchant creates invoice (payment_status: "pending")    │
│  2. Invoice pushed to customer dashboard                     │
│  3. Customer logs in → Sees "PENDING" invoice               │
│     └─ Yellow clock icon, "Pay Now" button                 │
│  4. Customer clicks "Pay Now" button                        │
│  5. Pi Network payment flow initiated                       │
│  6. Customer approves in Pi Browser                          │
│  7. Payment processed → Invoice updated to "PAID"           │
│  8. Dashboard refreshes → Green checkmark appears           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Customer Experience:**
- 🕐 Invoice created as "pending"
- 🕐 Customer sees invoice in dashboard
- 🕐 Customer clicks "Pay Now" when ready
- 🕐 Invoice updates to "PAID" after payment
- ✅ Best for: Online orders, invoices, delayed payments

---

## 🎯 Implementation Details

### **Creating Pending Invoices**

**API Endpoint:** `POST /api/invoices/create`

```typescript
// Merchant creates unpaid invoice
const response = await fetch('/api/invoices/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-123',
    merchantId: 'merchant-456',
    items: [
      {
        productId: 'prod-123',
        productName: 'Monthly Subscription',
        unitPrice: 25.00,
        quantity: 1
      }
    ],
    dueDate: '2026-05-31T23:59:59Z',
    invoiceType: 'subscription'
  })
});

// Result: Invoice created as "pending"
const { invoice } = await response.json();
// invoice.paymentStatus === 'pending'
```

**Database Status:**
```sql
-- Invoice in database with pending status
SELECT * FROM sales WHERE transaction_number = 'INV-ABC123';

/*
payment_status: 'pending'
u2a_payment_status: 'pending'
u2a_payment_expires_at: '2026-05-31 23:59:59'
*/
```

---

### **Customer Dashboard Experience**

**1. Customer logs in and sees pending invoice:**

```typescript
// GET /api/customers/[username]/invoices
const { invoices } = await fetch(`/api/customers/sarah/invoices`)
  .then(res => res.json());

// Customer sees:
invoices[0] = {
  id: 'INV-ABC123',
  merchantName: 'Corner Store',
  items: [
    { productName: 'Monthly Subscription', quantity: 1, totalPrice: 25.00 }
  ],
  total: 27.00,  // including tax
  paymentStatus: 'pending',  // ⚠️ Pending payment
  dueDate: '2026-05-31T23:59:59Z'
}
```

**2. Customer clicks "Pay Now" button:**

```typescript
// InvoiceCard.tsx component
<button onClick={handlePayment}>
  Pay Now  // Customer clicks this
</button>

const handlePayment = async () => {
  // Initiate payment from dashboard
  const response = await fetch('/api/payments/pi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId: 'INV-ABC123',
      amount: 27.00,
      merchantId: 'merchant-456'
    })
  });

  const { paymentId, invoice } = await response.json();

  // Use Pi Network SDK to complete payment
  const Pi = (window as any).Pi;
  await Pi.createPayment({
    amount: invoice.amount.toFixed(7),
    memo: invoice.memo,
    metadata: invoice.metadata
  }, {
    onApproved: (paymentId, txid) => {
      // Update invoice to "paid"
      completeInvoicePayment(paymentId, txid);
    }
  });
};
```

---

## 🔑 API Endpoints

### **Create Pending Invoice**
```
POST /api/invoices/create
```
Creates invoice that customer pays from dashboard

**Request:**
```json
{
  "customerId": "customer-123",
  "merchantId": "merchant-456",
  "items": [
    {
      "productId": "prod-123",
      "productName": "Service Fee",
      "unitPrice": 50.00,
      "quantity": 1
    }
  ],
  "dueDate": "2026-05-31T23:59:59Z",
  "invoiceType": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "INV-ABC123",
    "paymentStatus": "pending",
    "total": 54.00
  }
}
```

### **Initiate Payment from Dashboard**
```
POST /api/payments/pi
```
Initiates Pi Network payment for pending invoice

**Request:**
```json
{
  "invoiceId": "INV-ABC123",
  "amount": 27.00,
  "merchantId": "merchant-456"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "INV-ABC123",
  "invoice": {
    "amount": 27.00,
    "memo": "Payment for invoice INV-ABC123",
    "items": [...]
  }
}
```

### **Complete Invoice Payment**
```
POST /api/payments/complete
```
Updates invoice to "paid" after blockchain confirmation

**Request:**
```json
{
  "paymentId": "INV-ABC123",
  "txid": "blockchain-txid-789",
  "transactionNumber": "INV-ABC123"
}
```

---

## 🎨 Customer Dashboard UI

### **Invoice Status Display**

```typescript
// Different invoice statuses shown to customer

if (invoice.paymentStatus === 'paid') {
  return (
    <div className="bg-green-50 border-l-green-500">
      <CheckCircle className="text-green-600" />
      PAID
    </div>
  );
}

if (invoice.paymentStatus === 'pending') {
  return (
    <div className="bg-yellow-50 border-l-yellow-500">
      <Clock className="text-yellow-600" />
      PENDING
      <button>Pay Now</button>  // Action button
    </div>
  );
}

if (invoice.paymentStatus === 'failed') {
  return (
    <div className="bg-red-50 border-l-red-500">
      <AlertCircle className="text-red-600" />
      FAILED
      <button>Retry Payment</button>  // Action button
    </div>
  );
}
```

---

## 📊 Invoice Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   INVOICE STATUS FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  created (initial)                                           │
│     ↓                                                        │
│  pending → Customer sees "Pay Now" button                  │
│     ↓                                                        │
│  processing → Payment in progress                           │
│     ↓                                                        │
│  completed → Payment successful                             │
│     ↓                                                        │
│  paid → Final status (green checkmark)                      │
│                                                               │
│  Alternative paths:                                          │
│  pending → failed → Customer can retry                      │
│  pending → expired → Invoice expires                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases for Each Flow

### **Immediate Payment (Workflow 1)**
- ✅ **In-person POS transactions**
- ✅ **Customers at checkout counter**
- ✅ **Immediate payment required**
- ✅ **Standard retail transactions**

### **Dashboard Payment (Workflow 2)**
- ✅ **Online orders** (customer pays when ready)
- ✅ **Recurring invoices** (monthly subscriptions)
- ✅ **Service invoices** (pay after service)
- ✅ **Delayed payments** (pay later)
- ✅ **B2B transactions** (invoice-based)

---

## 🚀 Implementation Status

✅ **Implemented:**
- Invoice creation with pending status
- Customer dashboard invoice display
- "Pay Now" button functionality
- Payment initiation from dashboard
- Status updates after payment

⚠️ **To be completed:**
- Real-time invoice status updates (websockets)
- Payment retry logic for failed invoices
- Invoice expiration handling
- Email notifications for pending invoices

---

## 💡 Best Practices

1. **Clear Status Indicators**: Use colors and icons for payment status
2. **Due Date Display**: Show when pending invoices expire
3. **Easy Payment Flow**: One-click "Pay Now" functionality
4. **Real-time Updates**: Refresh invoice status after payment
5. **Mobile Friendly**: Ensure "Pay Now" works on mobile devices
6. **Error Handling**: Clear messages for payment failures

---

## 🎉 Summary

**Yes! You're absolutely correct!**

**The flow is:**
1. **Invoice created** → Pushed to customer dashboard as "pending"
2. **Customer logs in** → Sees invoice with "Pay Now" button
3. **Customer pays** → Pi Network payment processed
4. **Invoice updated** → Status changes to "paid"

**Two workflows available:**
- **Immediate**: Pay at POS → Invoice shows as "paid"
- **Dashboard**: Invoice as "pending" → Customer pays later

Both workflows are fully supported in myPiPOS! 🚀