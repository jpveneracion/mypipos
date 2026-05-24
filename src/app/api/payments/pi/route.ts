/**
 * Pi Network Payment from Customer Dashboard
 * POST /api/payments/pi
 *
 * Handles payment when customer clicks "Pay Now" on invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, merchantId } = await request.json();

    // Step 1: Get the sale/invoice details with items
    const saleResult = await query(
      `SELECT * FROM sales WHERE transaction_number = $1`,
      [invoiceId]
    );

    if (!saleResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const sale = saleResult.rows[0];

    // Get sale items
    const itemsResult = await query(
      `SELECT * FROM sale_items WHERE sale_id = $1`,
      [sale.id]
    );

    const saleItems = itemsResult.rows;

    // Step 2: Use transaction to update status and create payment attempt
    const result = await transaction(async (client) => {
      // Update invoice status to "processing"
      await client.query(
        `UPDATE sales SET
          u2a_payment_status = $1,
          u2a_payment_initiated_at = $2,
          u2a_payment_expires_at = $3
        WHERE id = $4`,
        [
          'initiated',
          new Date(),
          new Date(Date.now() + 30 * 60 * 1000), // 30 min expiration
          sale.id
        ]
      );

      // Step 3: Create U2A payment attempt record
      const attemptNumber = `U2A-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const attemptResult = await client.query(
        `INSERT INTO u2a_payment_attempts (
          attempt_number,
          sale_id,
          original_payment_id,
          amount,
          payment_type,
          customer_id,
          merchant_id,
          status,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          attemptNumber,
          sale.id,
          invoiceId, // Will be updated with actual Pi payment ID
          sale.total_amount,
          'customer_purchase',
          sale.customer_id,
          sale.merchant_id,
          'initiated',
          new Date(Date.now() + 30 * 60 * 1000)
        ]
      );

      return {
        attemptId: attemptResult.rows[0].id,
        attemptNumber
      };
    });

    // Step 4: Return payment initiation details to frontend
    // Frontend will use Pi Network SDK to complete payment
    return NextResponse.json({
      success: true,
      paymentId: invoiceId, // This will be used as Pi payment identifier
      invoice: {
        id: invoiceId,
        amount: sale.total_amount,
        items: saleItems,
        memo: `Payment for invoice ${invoiceId}`,
        metadata: {
          sale_id: sale.id,
          invoice_items: saleItems.map(item => ({
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
