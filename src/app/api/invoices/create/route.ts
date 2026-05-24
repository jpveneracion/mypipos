/**
 * Create Pending Invoice API
 * POST /api/invoices/create
 *
 * Creates invoice that customer pays from their dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      merchantId,
      items,
      dueDate,
      invoiceType = 'standard' // 'standard', 'online_order', 'subscription'
    } = await request.json();

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.unitPrice * item.quantity), 0
    );
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    // **Create sale with PENDING payment status**
    const sale = await db.sales.create({
      data: {
        transaction_number: invoiceNumber,
        merchant_id: merchantId,
        customer_id: customerId,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        payment_method: 'pi',
        payment_status: 'pending',  // **KEY: Pending, not paid yet**
        u2a_payment_type: invoiceType,
        u2a_payment_status: 'pending',
        status: 'pending',
        u2a_payment_expires_at: dueDate ? new Date(dueDate) : null
      }
    });

    // Create invoice items
    for (const item of items) {
      await db.sale_items.create({
        data: {
          sale_id: sale.id,
          merchant_id: merchantId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_amount: (item.unitPrice * item.quantity) * taxRate,
          total_price: (item.unitPrice * item.quantity) * (1 + taxRate)
        }
      });
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceNumber,
        saleId: sale.id,
        customerId,
        merchantId,
        items: items,
        subtotal,
        tax,
        total,
        paymentStatus: 'pending',  // **Pending - customer will pay later**
        dueDate,
        createdAt: sale.created_at
      }
    });

  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}