# InvoiceCard Component

A comprehensive React component for displaying individual invoices in the customer dashboard with Pi Network payment integration.

## Features

### ✨ Core Functionality
- **Invoice Display**: Shows merchant name, invoice ID, date, and total amount
- **Status Indicators**: Visual badges for payment status (Paid, Pending, Failed)
- **Expandable Details**: Toggle to view invoice items and pricing breakdown
- **Pi Network Integration**: "Pay Now" button for unpaid invoices
- **Payment Processing**: Loading states and error handling
- **7-Decimal Precision**: All amounts formatted with Pi Network's required precision

### 🎨 Design Features
- **Status Colors**:
  - Green: Paid invoices
  - Purple: Pending unpaid invoices
  - Red: Failed invoices
  - Yellow: Pending warnings
- **Responsive Layout**: Mobile-first design that works on all screen sizes
- **Hover Effects**: Shadow transitions on hover
- **Loading States**: Spinner animation during payment processing
- **Icons**: Lucide React icons for visual clarity

## API Reference

### Props

```typescript
interface InvoiceCardProps {
  invoice: Invoice;              // Required: Invoice object from @/types/customer
  merchantName?: string;         // Optional: Merchant display name
  onPaymentInitiated?: (invoiceId: string) => void;  // Optional: Payment callback
}
```

### Invoice Interface

The component expects an `Invoice` object with the following structure:

```typescript
interface Invoice {
  id: string;                    // Invoice ID (e.g., 'INV-2024-001')
  customerId: string;            // Customer ID
  merchantId: string;            // Merchant ID
  items: InvoiceItem[];          // Array of invoice items
  subtotal: number;              // Subtotal before tax (7 decimals)
  tax: number;                   // Tax amount (7 decimals)
  total: number;                 // Total amount (7 decimals)
  status: string;                // Invoice status
  paymentMethod: string;         // Payment method ('pi', 'cash', etc.)
  paymentStatus: string;         // Payment status ('paid', 'pending', 'failed')
  piPaymentId?: string;          // Optional: Pi Network payment ID
  piTransactionId?: string;      // Optional: Blockchain transaction ID
  createdAt: Date;               // Creation date
  updatedAt: Date;               // Last update date
  dueDate?: Date;                // Optional: Payment due date
}
```

## Usage Examples

### Basic Usage

```tsx
import InvoiceCard from '@/app/customer/components/InvoiceCard';

<InvoiceCard
  invoice={invoiceData}
  merchantName="My Pi Store"
/>
```

### With Payment Handler

```tsx
<InvoiceCard
  invoice={invoiceData}
  merchantName="My Pi Store"
  onPaymentInitiated={(invoiceId) => {
    console.log('Payment started for:', invoiceId);
    // Handle post-payment logic
  }}
/>
```

### Integration with Invoice List

```tsx
function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          merchantName="Merchant Name"
          onPaymentInitiated={handlePayment}
        />
      ))}
    </div>
  );
}
```

## Payment Flow

### For Unpaid Invoices
1. User clicks "Pay Now" button
2. Component sets `isProcessingPayment` state
3. API call to `/api/payments/pi` with invoice details
4. On success: `onPaymentInitiated` callback is invoked
5. On error: Error message displayed in the card

### Payment API Request

```typescript
POST /api/payments/pi
{
  invoiceId: string,
  amount: number,      // 7 decimal places
  merchantId: string
}
```

## Component States

### Paid Invoice
- Green border and status badge
- Opacity reduced to 75%
- No payment button
- Shows Pi Network transaction ID
- Expandable items still available

### Unpaid Invoice (Pending)
- Purple border and yellow status badge
- Purple "Pay Now" button
- Due date displayed if available
- Full opacity
- Expandable items

### Failed Invoice
- Red border and status badge
- Red "Retry Payment" button
- Due date displayed
- Full opacity
- Expandable items

## Styling

### Tailwind Classes Used
- **Layout**: `flex`, `grid`, `space-y-*`
- **Colors**: `purple-600`, `green-500`, `red-500`, `yellow-*`
- **Shadows**: `shadow-md`, `shadow-lg`
- **Borders**: `border-l-4`, `rounded-xl`
- **Transitions**: `transition-all`, `hover:*`

### Customization
To customize the component, you can:
1. Modify Tailwind classes directly
2. Override CSS variables
3. Extend the component with additional props

## Dependencies

- **React**: useState, useEffect hooks
- **Lucide React**: Icons (ChevronDown, ChevronUp, FileText, etc.)
- **Types**: @/types/customer (Invoice, InvoiceItem interfaces)
- **Utilities**: formatPiAmount for 7-decimal formatting

## Accessibility

- **ARIA Labels**: Expand/collapse buttons have aria-label
- **Keyboard Navigation**: All buttons are keyboard accessible
- **Screen Readers**: Status badges use semantic icons
- **Color Contrast**: Meets WCAG AA standards

## Future Enhancements

- [ ] Pi Network SDK integration for in-app payments
- [ ] Payment history timeline
- [ ] Invoice download/print functionality
- [ ] Multi-language support
- [ ] Dark mode optimization
- [ ] Partial payment support
- [ ] Payment scheduling
- [ ] Invoice notes/comments

## Error Handling

The component handles:
- Network errors during payment initiation
- API validation errors
- Missing merchant names (graceful fallback)
- Invalid invoice data (TypeScript validation)

## Testing

Recommended test cases:
1. Render paid invoice
2. Render unpaid invoice
3. Render failed invoice
4. Expand/collapse items
5. Initiate payment
6. Handle payment errors
7. Display due dates
8. Show transaction IDs

## File Location

```
src/app/customer/components/InvoiceCard.tsx
```

## Related Components

- `InvoiceList`: Parent component that uses InvoiceCard
- `CustomerPage`: Dashboard page that displays InvoiceList
- `PiAuthButton`: Pi Network authentication

## Support

For issues or questions:
1. Check the console for error messages
2. Verify invoice data structure matches Invoice interface
3. Ensure API endpoint `/api/payments/pi` exists
4. Check Pi Network payment configuration
