/**
 * Customer QR Code Scanning & Invoice Linking
 * POST /api/pos/scan-customer-qr
 *
 * Merchant scans customer's QR code to link invoice to customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decodeCustomerQR } from '@/lib/qr-codes';

export async function POST(request: NextRequest) {
  try {
    const { customerPiUid, merchantId, cashierId, registerId } = await request.json();

    console.log('=== CUSTOMER QR SCAN API ===');
    console.log('Raw QR data:', customerPiUid);
    console.log('Cashier ID:', cashierId);

    let customerId: string;

    // Try to decode as base64-encoded QR data first
    const decodedQR = decodeCustomerQR(customerPiUid);
    if (decodedQR) {
      console.log('✅ Valid QR code decoded:', decodedQR);
      customerId = decodedQR.i; // Use customer ID from decoded QR data
    } else {
      // Fallback: treat as raw customer ID (for backward compatibility)
      console.log('⚠️ QR decode failed, treating as raw customer ID');
      customerId = customerPiUid;
    }

    console.log('Looking up customer ID:', customerId);

    // Step 1: Find customer by ID
    const customerResult = await query(
      `SELECT * FROM users WHERE id = $1`,
      [customerId]
    );

    if (!customerResult.rows[0]) {
      console.log('❌ Customer not found in database');
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];
    console.log('✅ Customer found:', customer.username);

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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        invoiceNumber,
        merchantId,
        customer.id, // **LINK TO CUSTOMER**
        cashierId,  // **CASHIER (authenticated user)**
        0,
        0,
        0,
        'pi',
        'pending',
        'customer_purchase', // **U2A PAYMENT TYPE**
        'pending',            // **U2A PAYMENT STATUS**
        'draft',              // **DRAFT STATUS - building invoice**
        registerId,
        new Date()
      ]
    );

    const draftInvoice = draftResult.rows[0];
    console.log('✅ Draft invoice created:', draftInvoice.id);

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
    console.error('❌ Customer QR scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link customer' },
      { status: 500 }
    );
  }
}
