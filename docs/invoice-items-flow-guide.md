# 🛒 How Items Flow from Cart to Customer Invoice

**Complete guide to the U2A checkout → database → customer invoice item flow**

---

## 📋 The Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ITEM FLOW: CART → DATABASE → INVOICE            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CUSTOMER CHECKOUT                                        │
│     ├─ Cart items selected                                  │
│     ├─ Customer proceeds to payment                         │
│     └─ U2ACheckoutFlow component initiates                   │
│                                                               │
│  2. SALE CREATION (BEFORE PAYMENT)                           │
│     ├─ POST /api/sales/create                               │
│     ├─ Creates sale record in database                      │
│     └─ **CREATES SALE_ITEMS FROM CART ITEMS**               │
│                                                               │
│  3. PAYMENT PROCESSING                                       │
│     ├─ Pi Network payment                                    │
│     ├─ Payment approved & completed                         │
│     └─ Sale marked as complete                              │
│                                                               │
│  4. CUSTOMER INVOICE DISPLAY                                 │
│     ├─ GET /api/customers/[username]/invoices               │
│     ├─ Queries sales + sale_items                           │
│     └─ **FORMATS AS INVOICES FOR CUSTOMER DASHBOARD**        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Step-by-Step Implementation

### Step 1: Cart Items (Frontend)

```typescript
// Customer selects items in POS
const cartItems = [
  {
    id: 'prod-123',
    name: 'Heinz Tomato Ketchup',
    price: 3.1415926,  // Pi amount
    quantity: 2
  },
  {
    id: 'prod-456', 
    name: 'Fresh Bread',
    price: 2.0000000,
    quantity: 1
  }
];
```

### Step 2: Create Sale with Items (Backend)

**API Endpoint:** `POST /api/sales/create`

```typescript
// IMPORTANT: This happens BEFORE payment
const saleResponse = await fetch('/api/sales/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cartItems: cartItems,  // **ITEMS COME FROM HERE**
    customer: customer,
    merchantId: merchantId,
    transactionNumber: 'SALE-ABC123'
  })
});

// Backend creates:
// 1. Sale record in 'sales' table
// 2. Multiple sale_items records in 'sale_items' table
```

**Database Operations:**

```sql
-- Create sale record
INSERT INTO sales (
  transaction_number,
  merchant_id,
  customer_id,
  subtotal,
  tax_amount,
  total_amount,
  payment_status,
  u2a_payment_status
) VALUES (
  'SALE-ABC123',
  'merchant-456',
  'customer-789',
  8.2831852,  -- subtotal
  0.6626548,  -- tax
  8.9458400,  -- total
  'pending',
  'pending'
) RETURNING id;

-- **CREATE ITEMS FROM CART** (this is the key part!)
INSERT INTO sale_items (
  sale_id,
  merchant_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  tax_amount,
  total_price
) VALUES
  -- Item 1
  (
    'sale-uuid-123',
    'merchant-456',
    'prod-123',
    'Heinz Tomato Ketchup',
    2,
    3.1415926,
    0.5026548,
    6.7858400
  ),
  -- Item 2
  (
    'sale-uuid-123',
    'merchant-456',
    'prod-456',
    'Fresh Bread', 
    1,
    2.0000000,
    0.1600000,
    2.1600000
  );
```

### Step 3: Payment Processing

```typescript
// Payment happens via Pi Network SDK
const payment = await Pi.createPayment({
  amount: total,
  memo: 'Purchase at myPiPOS',
  metadata: {
    items: cartItems,  // Items included in payment metadata
    sale_id: sale.id
  }
});
```

### Step 4: Customer Views Invoice

**API Endpoint:** `GET /api/customers/[username]/invoices`

```typescript
// Customer logs in and views their dashboard
const response = await fetch(`/api/customers/${username}/invoices`);
const { invoices } = await response.json();

// Each invoice contains items from sale_items table:
invoices[0] = {
  id: 'SALE-ABC123',
  merchantName: 'Corner Store',
  items: [
    {
      id: 'item-uuid-1',
      productName: 'Heinz Tomato Ketchup',
      quantity: 2,
      unitPrice: 3.1415926,
      totalPrice: 6.7858400
    },
    {
      id: 'item-uuid-2', 
      productName: 'Fresh Bread',
      quantity: 1,
      unitPrice: 2.0000000,
      totalPrice: 2.1600000
    }
  ],
  subtotal: 8.2831852,
  tax: 0.6626548,
  total: 8.9458400,
  paymentStatus: 'paid'
}
```

**Database Query (using SECURITY DEFINER function):**

```sql
-- Get customer invoices with item counts
SELECT * FROM get_customer_invoices('customer-789', 50, NULL);

-- For each invoice, get the items
SELECT * FROM get_invoice_items('sale-uuid-123');

-- Returns:
/*
item_id    | product_name           | quantity | unit_price | total_price
-----------+------------------------+----------+------------+-------------
item-uuid-1| Heinz Tomato Ketchup    | 2        | 3.1415926  | 6.7858400
item-uuid-2| Fresh Bread             | 1        | 2.0000000  | 2.1600000
*/
```

---

## 🗄️ Database Schema

### Key Tables

**sales** table:
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  transaction_number VARCHAR(100) UNIQUE,
  customer_id UUID REFERENCES users(id),
  merchant_id UUID REFERENCES merchants(id),
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2), 
  total_amount DECIMAL(15,2),
  payment_status VARCHAR(20),
  u2a_payment_status VARCHAR(50),
  created_at TIMESTAMP
);
```

**sale_items** table (WHERE ITEMS ARE STORED):
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,  -- **ITEM NAME**
  quantity INTEGER NOT NULL,             -- **QUANTITY**
  unit_price DECIMAL(10,2) NOT NULL,     -- **UNIT PRICE**
  tax_amount DECIMAL(10,2),
  total_price DECIMAL(10,2) NOT NULL,    -- **TOTAL PRICE**
  universal_sku VARCHAR(100),
  merchant_sku VARCHAR(100),
  created_at TIMESTAMP
);
```

---

## 🔑 Security Functions

### Get Customer Invoices (with item counts)

```sql
-- SECURITY DEFINER function for efficient queries
CREATE OR REPLACE FUNCTION get_customer_invoices(
  p_customer_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_payment_status VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
  invoice_id VARCHAR(100),
  sale_id UUID,
  merchant_name VARCHAR(255),
  total_amount DECIMAL(15,2),
  payment_status VARCHAR(20),
  item_count INTEGER,  -- **Number of items in each invoice**
  created_at TIMESTAMP
)
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        s.transaction_number as invoice_id,
        s.id as sale_id,
        m.business_name as merchant_name,
        s.total_amount,
        s.payment_status,
        s.created_at,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
    FROM sales s
    JOIN merchants m ON s.merchant_id = m.id
    WHERE s.customer_id = p_customer_id
    ORDER BY s.created_at DESC
    LIMIT p_limit;
$$;
```

### Get Invoice Items (detailed items for a sale)

```sql
CREATE OR REPLACE FUNCTION get_invoice_items(p_sale_id UUID)
RETURNS TABLE (
  product_name VARCHAR(255),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  sku VARCHAR(100)
)
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        si.product_name,
        si.quantity,
        si.unit_price,
        si.total_price,
        COALESCE(si.universal_sku, si.merchant_sku) as sku
    FROM sale_items si
    WHERE si.sale_id = p_sale_id
    ORDER BY si.created_at ASC;
$$;
```

---

## 📱 Frontend Components

### Customer Invoice Display

```typescript
// src/app/customer/page.tsx
import { InvoiceCard } from './components/InvoiceCard';

export default function CustomerDashboard() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    // Fetch invoices (which include items)
    fetch(`/api/customers/${username}/invoices`)
      .then(res => res.json())
      .then(data => setInvoices(data.invoices));
  }, [username]);

  return (
    <div>
      {invoices.map(invoice => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          merchantName={invoice.merchantName}
        />
      ))}
    </div>
  );
}
```

### Invoice Card Component

```typescript
// src/app/customer/components/InvoiceCard.tsx
export function InvoiceCard({ invoice, merchantName }) {
  return (
    <div>
      <h3>{merchantName}</h3>
      <p>Total: {invoice.total} Pi</p>
      
      {/* **THIS IS WHERE ITEMS APPEAR** */}
      <div>
        <h4>Items ({invoice.items.length})</h4>
        {invoice.items.map(item => (
          <div key={item.id}>
            {item.productName} × {item.quantity}
            = {item.totalPrice} Pi
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 Implementation Checklist

- [x] **Database schema**: sale_items table exists
- [x] **Sale creation API**: Creates sale + sale_items from cart
- [x] **Security functions**: get_customer_invoices, get_invoice_items
- [x] **Customer invoice API**: Queries sales + sale_items efficiently
- [x] **Frontend components**: Display items in customer dashboard
- [ ] **Testing**: Verify item flow end-to-end
- [ ] **Error handling**: Handle missing items, calculation errors

---

## 🧪 Testing the Flow

### 1. Create Test Sale

```bash
POST /api/sales/create
{
  "cartItems": [
    {
      "id": "prod-123",
      "name": "Test Product",
      "price": 5.00,
      "quantity": 2
    }
  ],
  "customer": {
    "id": "customer-123",
    "username": "testuser"
  },
  "merchantId": "merchant-456",
  "transactionNumber": "TEST-001"
}
```

### 2. Verify Sale Items Created

```sql
-- Check sale was created
SELECT * FROM sales WHERE transaction_number = 'TEST-001';

-- Check items were created
SELECT * FROM sale_items WHERE sale_id = 'sale-uuid';
```

### 3. Fetch Customer Invoices

```bash
GET /api/customers/testuser/invoices
```

### 4. Verify Items Appear in Invoice

```json
{
  "invoices": [
    {
      "id": "TEST-001",
      "items": [
        {
          "productName": "Test Product",
          "quantity": 2,
          "unitPrice": 5.00,
          "totalPrice": 10.00
        }
      ]
    }
  ]
}
```

---

## 🎯 Key Takeaways

1. **Items stored in database**: Cart items become `sale_items` records during sale creation
2. **Sale creation happens first**: Before payment processing
3. **Efficient queries**: Use SECURITY DEFINER functions for performance
4. **Complete audit trail**: Every item is tracked from cart to invoice
5. **Customer-friendly**: Items appear in customer dashboard with full details

**The magic happens at step 2** - when cart items are converted to `sale_items` records in the database. Everything else is just querying and formatting! ✨