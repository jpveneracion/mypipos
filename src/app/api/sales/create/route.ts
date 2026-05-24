/**
 * Create Sale API Endpoint
 * POST /api/sales/create
 *
 * Creates a sale record with items from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { cartItems, customer, merchantId, transactionNumber } = await request.json();

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) =>
      sum + (item.price * item.quantity), 0
    );
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Use transaction to create sale and items atomically
    const result = await transaction(async (client) => {
      // Create sale record
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
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          transactionNumber,
          merchantId,
          customer.id,
          subtotal,
          tax,
          total,
          'pi',
          'pending',
          'customer_purchase',
          'pending',
          'pending'
        ]
      );

      const sale = saleResult.rows[0];

      // **THIS IS THE KEY PART** - Create sale items from cart items
      for (const item of cartItems) {
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
            item.id,
            item.name,
            item.quantity,
            item.price,
            (item.price * item.quantity) * taxRate,
            (item.price * item.quantity) * (1 + taxRate)
          ]
        );
      }

      return {
        saleId: sale.id,
        transactionNumber
      };
    });

    return NextResponse.json({
      success: true,
      sale: {
        id: result.saleId,
        transactionNumber: result.transactionNumber,
        itemCount: cartItems.length
      }
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
