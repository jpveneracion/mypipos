/**
 * Create Pending Invoice API
 * POST /api/invoices/create
 *
 * Creates invoice that customer pays from their dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

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

    // Use transaction to create sale and items atomically
    const result = await transaction(async (client) => {
      // Create sale with PENDING payment status
      const saleResult = await client.query(
        `INSERT INTO sales (
          transaction_number,
          merchant_id,
          customer_id,
          subtotal,
          tax_amount,
          total_amount,
          payment_method,
          payment_status,
          u2a_payment_type,
          u2a_payment_status,
          status,
          u2a_payment_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, created_at`,
        [
          invoiceNumber,
          merchantId,
          customerId,
          subtotal,
          tax,
          total,
          'pi',
          'pending',  // **KEY: Pending, not paid yet
          invoiceType,
          'pending',
          'pending',
          dueDate ? new Date(dueDate) : null
        ]
      );

      const sale = saleResult.rows[0];

      // Create invoice items using parameterized queries
      for (const item of items) {
        const itemTax = (item.unitPrice * item.quantity) * taxRate;
        const itemTotal = (item.unitPrice * item.quantity) * (1 + taxRate);

        await client.query(
          `INSERT INTO sale_items (
            sale_id,
            merchant_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            tax_amount,
            total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sale.id,
            merchantId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            itemTax,
            itemTotal
          ]
        );
      }

      return sale;
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceNumber,
        saleId: result.id,
        customerId,
        merchantId,
        items: items,
        subtotal,
        tax,
        total,
        paymentStatus: 'pending',  // **Pending - customer will pay later
        dueDate,
        createdAt: result.created_at
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
