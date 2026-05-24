/**
 * Scan Item & Add to Customer Invoice
 * POST /api/pos/scan-item
 *
 * Merchant scans items one by one, adding to customer's draft invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, productId, productName, quantity, price, merchantId } = await request.json();

    // Step 1: Get current invoice
    const invoice = await db.sales.findFirst({
      where: {
        id: invoiceId,
        status: 'draft' // Only allow adding items to draft invoices
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Draft invoice not found or already finalized' },
        { status: 404 }
      );
    }

    // Step 2: Add item to invoice (create sale_item record)
    const taxRate = 0.08; // 8% tax
    const unitPrice = parseFloat(price);
    const qty = parseInt(quantity);
    const itemTax = (unitPrice * qty) * taxRate;
    const itemTotal = (unitPrice * qty) + itemTax;

    const saleItem = await db.sale_items.create({
      data: {
        sale_id: invoiceId,
        merchant_id: merchantId,
        product_id: productId,
        product_name: productName,
        quantity: qty,
        unit_price: unitPrice,
        tax_amount: itemTax,
        total_price: itemTotal,
        created_at: new Date()
      }
    });

    // Step 3: Recalculate invoice totals
    const allItems = await db.sale_items.findMany({
      where: { sale_id: invoiceId }
    });

    const newSubtotal = allItems.reduce((sum, item) =>
      sum + (parseFloat(item.unit_price) * item.quantity), 0
    );
    const newTax = allItems.reduce((sum, item) =>
      sum + parseFloat(item.tax_amount), 0
    );
    const newTotal = newSubtotal + newTax;

    // Step 4: Update invoice with new totals
    const updatedInvoice = await db.sales.update({
      where: { id: invoiceId },
      data: {
        subtotal: newSubtotal,
        tax_amount: newTax,
        total_amount: newTotal,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      item: {
        id: saleItem.id,
        productName: productName,
        quantity: qty,
        unitPrice: unitPrice,
        tax: itemTax,
        total: itemTotal
      },
      invoice: {
        id: invoiceId,
        invoiceNumber: invoice.transaction_number,
        itemCount: allItems.length,
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        status: 'draft'
      },
      message: `Item added! ${allItems.length} items so far. Total: ${newTotal.toFixed(7)} Pi`
    });

  } catch (error) {
    console.error('Item scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add item to invoice' },
      { status: 500 }
    );
  }
}