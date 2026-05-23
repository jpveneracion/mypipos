import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - In production, this would come from a database
let mockInvoices = [
  {
    id: 'INV-2025-001',
    customerId: 'customer_123',
    merchantId: 'merchant_123',
    merchantName: 'Corner Store',
    posTerminalId: 'pos_001',
    items: [
      {
        id: 'item_1',
        invoiceId: 'INV-2025-001',
        productId: 'prod_001',
        productName: 'Heinz Tomato Ketchup',
        quantity: 2,
        unitPrice: 3.1415926,
        totalPrice: 6.2831852
      }
    ],
    subtotal: 6.2831852,
    tax: 0.5026548,
    total: 6.7858400,
    status: 'pending',
    paymentMethod: 'pi',
    paymentStatus: 'pending',
    piPaymentId: null,
    piTransactionId: null,
    createdAt: '2025-01-22T10:00:00Z',
    updatedAt: '2025-01-22T10:00:00Z',
    dueDate: '2025-01-29T10:00:00Z'
  },
  {
    id: 'INV-2025-002',
    customerId: 'customer_123',
    merchantId: 'merchant_456',
    merchantName: 'Fresh Mart',
    posTerminalId: 'pos_002',
    items: [
      {
        id: 'item_2',
        invoiceId: 'INV-2025-002',
        productId: 'prod_002',
        productName: 'Fresh Bread',
        quantity: 1,
        unitPrice: 2.0000000,
        totalPrice: 2.0000000
      }
    ],
    subtotal: 2.0000000,
    tax: 0.1600000,
    total: 2.1600000,
    status: 'completed',
    paymentMethod: 'pi',
    paymentStatus: 'paid',
    piPaymentId: 'pi_payment_123',
    piTransactionId: 'tx_abc123',
    createdAt: '2025-01-20T14:30:00Z',
    updatedAt: '2025-01-20T14:35:00Z',
    dueDate: '2025-01-27T14:30:00Z'
  },
  {
    id: 'INV-2025-003',
    customerId: 'customer_123',
    merchantId: 'merchant_789',
    merchantName: 'Quick Stop',
    posTerminalId: 'pos_003',
    items: [
      {
        id: 'item_3',
        invoiceId: 'INV-2025-003',
        productId: 'prod_003',
        productName: 'Coffee',
        quantity: 3,
        unitPrice: 1.5000000,
        totalPrice: 4.5000000
      }
    ],
    subtotal: 4.5000000,
    tax: 0.3600000,
    total: 4.8600000,
    status: 'pending',
    paymentMethod: 'pi',
    paymentStatus: 'pending',
    piPaymentId: null,
    piTransactionId: null,
    createdAt: '2025-01-21T09:15:00Z',
    updatedAt: '2025-01-21T09:15:00Z',
    dueDate: '2025-01-28T09:15:00Z'
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // In production, you would fetch invoices for this specific customer from your database
    // For now, we'll return mock data filtered by a mock customer
    let customerInvoices = mockInvoices.filter(invoice =>
      invoice.customerId === 'customer_123' // Mock customer ID
    );

    // Sort by date (newest first) and limit
    customerInvoices.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    customerInvoices = customerInvoices.slice(0, limit);

    return NextResponse.json({
      success: true,
      invoices: customerInvoices,
      count: customerInvoices.length
    });
  } catch (error) {
    console.error('Customer invoices GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customer invoices'
      },
      { status: 500 }
    );
  }
}
