/**
 * Customer QR Code Scanning & Invoice Linking
 * POST /api/pos/scan-customer-qr
 *
 * Merchant scans customer's QR code to link invoice to customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { customerPiUid, merchantId, registerId } = await request.json();

    // Step 1: Find customer by Pi UID
    const customer = await db.users.findFirst({
      where: { pi_uid: customerPiUid }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Step 2: Create "draft" invoice linked to this customer
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const draftInvoice = await db.sales.create({
      data: {
        transaction_number: invoiceNumber,
        merchant_id: merchantId,
        customer_id: customer.id, // **LINK TO CUSTOMER**
        cashier_id: registerId,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        payment_method: 'pi',
        payment_status: 'pending',
        u2a_payment_type: 'customer_purchase',
        u2a_payment_status: 'pending',
        status: 'draft', // **DRAFT STATUS - building invoice**
        register_id: registerId,
        created_at: new Date()
      }
    });

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