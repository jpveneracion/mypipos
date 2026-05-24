/**
 * Finalize Invoice & Push to Customer Dashboard
 * POST /api/pos/finalize-invoice
 *
 * After last item scanned, finalize invoice and push to customer dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, merchantId } = await request.json();

    // Step 1: Get draft invoice with items
    const invoiceResult = await query(
      `SELECT * FROM sales WHERE id = $1 AND status = 'draft'`,
      [invoiceId]
    );

    if (!invoiceResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Draft invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult.rows[0];

    // Get sale items
    const itemsResult = await query(
      `SELECT * FROM sale_items WHERE sale_id = $1`,
      [invoiceId]
    );

    const saleItems = itemsResult.rows;

    // Step 2: Verify invoice has items
    if (!saleItems || saleItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot finalize empty invoice' },
        { status: 400 }
      );
    }

    // Step 3: Calculate final totals
    const finalSubtotal = saleItems.reduce((sum, item) =>
      sum + (parseFloat(item.unit_price) * item.quantity), 0
    );
    const finalTax = saleItems.reduce((sum, item) =>
      sum + parseFloat(item.tax_amount), 0
    );
    const finalTotal = finalSubtotal + finalTax;

    // Step 4: Update invoice to "pending" - makes it visible in customer dashboard
    const updateResult = await query(
      `UPDATE sales SET
        status = $1,
        payment_status = $2,
        u2a_payment_status = $3,
        subtotal = $4,
        tax_amount = $5,
        total_amount = $6,
        completed_at = $7,
        updated_at = $8
      WHERE id = $9
      RETURNING *`,
      [
        'pending', // **PENDING - visible in dashboard with "Pay Now"**
        'pending',
        'pending',
        finalSubtotal,
        finalTax,
        finalTotal,
        new Date(), // Invoice finalized
        new Date(),
        invoiceId
      ]
    );

    const finalizedInvoice = updateResult.rows[0];

    // Step 5: Get customer details for notification
    const customerResult = await query(
      `SELECT * FROM users WHERE id = $1`,
      [invoice.customer_id]
    );

    const customer = customerResult.rows[0];

    // Step 6: Get merchant details
    const merchantResult = await query(
      `SELECT * FROM merchants WHERE id = $1`,
      [invoice.merchant_id]
    );

    const merchant = merchantResult.rows[0];

    return NextResponse.json({
      success: true,
      invoice: {
        id: finalizedInvoice.id,
        invoiceNumber: finalizedInvoice.transaction_number,
        customer: {
          id: customer.id,
          username: customer.username,
          pi_uid: customer.pi_uid,
          name: customer.username
        },
        merchant: {
          id: merchant.id,
          businessName: merchant.business_name
        },
        items: saleItems.map(item => ({
          id: item.id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        })),
        itemCount: saleItems.length,
        subtotal: finalSubtotal,
        tax: finalTax,
        total: finalTotal,
        status: 'pending', // **PENDING - visible in customer dashboard**
        paymentStatus: 'pending', // **PENDING - "Pay Now" button visible**
        finalizedAt: new Date(),
        message: `✅ Invoice finalized! ${finalTotal.toFixed(7)} Pi - Pushed to ${customer.username}'s dashboard`,
        // **PAYMENT DETAILS** - Frontend triggers immediate Pi payment
        payment: {
          amount: finalTotal,
          memo: `Purchase at ${merchant.business_name} - ${saleItems.length} items`,
          customer_pi_uid: customer.pi_uid,
          customer_id: customer.id,
          metadata: {
            invoice_id: finalizedInvoice.id,
            invoice_number: finalizedInvoice.transaction_number,
            items: saleItems.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            }))
          }
        }
      },
      nextStep: 'TRIGGER_IMMEDIATE_PAYMENT', // **KEY: Trigger payment right now**
      dashboard: {
        pushed: true,
        status: 'pending',
        customerUsername: customer.username,
        message: `New invoice ${finalizedInvoice.transaction_number}: ${finalTotal.toFixed(7)} Pi (Pay Now)`,
        actionRequired: 'customer_must_approve_payment'
      }
    });

  } catch (error) {
    console.error('Invoice finalization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to finalize invoice' },
      { status: 500 }
    );
  }
}
