/**
 * Pi Network Payment from Customer Dashboard
 * POST /api/payments/pi
 *
 * Handles payment when customer clicks "Pay Now" on invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, merchantId } = await request.json();

    // Step 1: Get the sale/invoice details
    const sale = await db.sales.findFirst({
      where: { transaction_number: invoiceId },
      include: {
        sale_items: true
      }
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Step 2: Update invoice status to "processing"
    await db.sales.update({
      where: { id: sale.id },
      data: {
        u2a_payment_status: 'initiated',
        u2a_payment_initiated_at: new Date(),
        u2a_payment_expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiration
      }
    });

    // Step 3: Create U2A payment attempt record
    const attemptNumber = `U2A-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await db.u2a_payment_attempts.create({
      data: {
        attempt_number: attemptNumber,
        sale_id: sale.id,
        original_payment_id: invoiceId, // Will be updated with actual Pi payment ID
        amount: sale.total_amount,
        payment_type: 'customer_purchase',
        customer_id: sale.customer_id,
        merchant_id: sale.merchant_id,
        status: 'initiated',
        expires_at: new Date(Date.now() + 30 * 60 * 1000)
      }
    });

    // Step 4: Return payment initiation details to frontend
    // Frontend will use Pi Network SDK to complete payment
    return NextResponse.json({
      success: true,
      paymentId: invoiceId, // This will be used as Pi payment identifier
      invoice: {
        id: invoiceId,
        amount: sale.total_amount,
        items: sale.sale_items,
        memo: `Payment for invoice ${invoiceId}`,
        metadata: {
          sale_id: sale.id,
          invoice_items: sale.sale_items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))
        }
      }
    });

  } catch (error) {
    console.error('Pi payment initiation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}