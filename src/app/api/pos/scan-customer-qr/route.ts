/**
 * Customer QR Code Scanning & Invoice Linking
 * POST /api/pos/scan-customer-qr
 *
 * Merchant scans customer's QR code to link invoice to customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { customerPiUid, merchantId, registerId } = await request.json();

    // Step 1: Find customer by Pi UID
    const customerResult = await query(
      `SELECT * FROM users WHERE pi_uid = $1`,
      [customerPiUid]
    );

    if (!customerResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];

    // Step 2: Create "draft" invoice linked to this customer
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const draftResult = await query(
      `INSERT INTO sales (
        transaction_number,
        merchant_id,
        customer_id,
        cashier_id,
        subtotal,
        tax_amount,
        total_amount,
        payment_method,
        payment_status,
        u2a_payment_type,
        u2a_payment_status,
        status,
        register_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        invoiceNumber,
        merchantId,
        customer.id, // **LINK TO CUSTOMER**
        registerId,
        0,
        0,
        0,
        'pi',
        'pending',
        'customer_purchase',
        'pending',
        'draft', // **DRAFT STATUS - building invoice**
        registerId,
        new Date()
      ]
    );

    const draftInvoice = draftResult.rows[0];

    return NextResponse.json({
      success: true,
      invoice: {
        id: draftInvoice.id,
        invoiceNumber: invoiceNumber,
        customer: {
          id: customer.id,
          username: customer.username,
          pi_uid: customer.pi_uid,
          name: customer.username
        },
        status: 'draft',
        items: [],
        subtotal: 0,
        total: 0,
        message: 'Customer linked! Start scanning items...'
      }
    });

  } catch (error) {
    console.error('Customer QR scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link customer' },
      { status: 500 }
    );
  }
}
