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

    // Step 4: **PUSH TO CUSTOMER DASHBOARD**
    // Update invoice from "draft" to "pending" - this makes it visible to customer
    const finalizedInvoice = await db.sales.update({
      where: { id: invoiceId },
      data: {
        status: 'pending', // **CHANGED FROM 'draft' TO 'pending'**
        payment_status: 'pending',
        subtotal: finalSubtotal,
        tax_amount: finalTax,
        total_amount: finalTotal,
        completed_at: new Date(), // When invoice was finalized
        updated_at: new Date(),
        // Set payment expiration (30 days from now)
        u2a_payment_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
        status: 'pending', // **NOW VISIBLE IN CUSTOMER DASHBOARD**
        paymentStatus: 'pending',
        finalizedAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        message: `✅ Invoice finalized! Pushed to ${customer.username}'s dashboard for payment`
      },
      pushNotification: {
        sent: true,
        customerUsername: customer.username,
        message: `New invoice from ${merchant.business_name}: ${finalTotal.toFixed(7)} Pi`,
        channel: 'customer_dashboard'
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