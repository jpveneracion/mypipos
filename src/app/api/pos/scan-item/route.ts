/**
 * Scan Item & Add to Customer Invoice
 * POST /api/pos/scan-item
 *
 * Merchant scans items one by one, adding to customer's draft invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, productId, productName, quantity, price, merchantId } = await request.json();

    // Step 1: Get current invoice
    const invoiceResult = await query(
      `SELECT * FROM sales WHERE id = $1 AND status = 'draft'`,
      [invoiceId]
    );

    if (!invoiceResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Draft invoice not found or already finalized' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult.rows[0];

    // Step 2: Calculate item details
    const taxRate = 0.08; // 8% tax
    const unitPrice = parseFloat(price);
    const qty = parseInt(quantity);
    const itemTax = (unitPrice * qty) * taxRate;
    const itemTotal = (unitPrice * qty) + itemTax;

    // Step 3: Use transaction to add item and update totals atomically
    const result = await transaction(async (client) => {
      // Add item to invoice
      const itemResult = await client.query(
        `INSERT INTO sale_items (
          sale_id,
          merchant_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          tax_amount,
          total_price,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          invoiceId,
          merchantId,
          productId,
          productName,
          qty,
          unitPrice,
          itemTax,
          itemTotal,
          new Date()
        ]
      );

      const saleItem = itemResult.rows[0];

      // Recalculate invoice totals
      const itemsResult = await client.query(
        `SELECT * FROM sale_items WHERE sale_id = $1`,
        [invoiceId]
      );

      const allItems = itemsResult.rows;

      const newSubtotal = allItems.reduce((sum, item) =>
        sum + (parseFloat(item.unit_price) * item.quantity), 0
      );
      const newTax = allItems.reduce((sum, item) =>
        sum + parseFloat(item.tax_amount), 0
      );
      const newTotal = newSubtotal + newTax;

      // Update invoice with new totals
      const updateResult = await client.query(
        `UPDATE sales SET
          subtotal = $1,
          tax_amount = $2,
          total_amount = $3,
          updated_at = $4
        WHERE id = $5
        RETURNING *`,
        [newSubtotal, newTax, newTotal, new Date(), invoiceId]
      );

      return {
        saleItem,
        updatedInvoice: updateResult.rows[0],
        itemCount: allItems.length
      };
    });

    return NextResponse.json({
      success: true,
      item: {
        id: result.saleItem.id,
        productName: productName,
        quantity: qty,
        unitPrice: unitPrice,
        tax: itemTax,
        total: itemTotal
      },
      invoice: {
        id: invoiceId,
        invoiceNumber: invoice.transaction_number,
        itemCount: result.itemCount,
        subtotal: result.updatedInvoice.subtotal,
        tax: result.updatedInvoice.tax_amount,
        total: result.updatedInvoice.total_amount,
        status: 'draft'
      },
      message: `Item added! ${result.itemCount} items so far. Total: ${result.updatedInvoice.total_amount.toFixed(7)} Pi`
    });

  } catch (error) {
    console.error('Item scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add item to invoice' },
      { status: 500 }
    );
  }
}
