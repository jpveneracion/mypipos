/**
 * Finalize Invoice & Push to Customer Dashboard
 * POST /api/pos/finalize-invoice
 *
 * After last item scanned, finalize invoice and push to customer dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, merchantId } = await request.json();

    // Step 1: Get draft invoice
    const invoice = await db.sales.findFirst({
      where: {
        id: invoiceId,
        status: 'draft'
      },
      include: {
        sale_items: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Draft invoice not found' },
        { status: 404 }
      );
    }

    // Step 2: Verify invoice has items
    if (!invoice.sale_items || invoice.sale_items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot finalize empty invoice' },
        { status: 400 }
      );
    }

    // Step 3: Calculate final totals
    const finalSubtotal = invoice.sale_items.reduce((sum, item) =>
      sum + (parseFloat(item.unit_price) * item.quantity), 0
    );
    const finalTax = invoice.sale_items.reduce((sum, item) =>
      sum + parseFloat(item.tax_amount), 0
    );
    const finalTotal = finalSubtotal + finalTax;

    // Step 4: **PUSH TO DASHBOARD AS PENDING + TRIGGER IMMEDIATE PAYMENT**
    // Update invoice to "pending" - makes it visible in customer dashboard
    const finalizedInvoice = await db.sales.update({
      where: { id: invoiceId },
      data: {
        status: 'pending', // **PENDING - visible in dashboard with "Pay Now"**
        payment_status: 'pending',
        u2a_payment_status: 'pending',
        subtotal: finalSubtotal,
        tax_amount: finalTax,
        total_amount: finalTotal,
        completed_at: new Date(), // Invoice finalized
        updated_at: new Date()
      }
    });

    // Step 5: Get customer details for notification
    const customer = await db.users.findFirst({
      where: { id: invoice.customer_id }
    });

    // Step 6: Get merchant details
    const merchant = await db.merchants.findFirst({
      where: { id: invoice.merchant_id }
    });

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
        items: invoice.sale_items.map(item => ({
          id: item.id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        })),
        itemCount: invoice.sale_items.length,
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
          memo: `Purchase at ${merchant.business_name} - ${invoice.sale_items.length} items`,
          customer_pi_uid: customer.pi_uid,
          customer_id: customer.id,
          metadata: {
            invoice_id: finalizedInvoice.id,
            invoice_number: finalizedInvoice.transaction_number,
            items: invoice.sale_items.map(item => ({
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