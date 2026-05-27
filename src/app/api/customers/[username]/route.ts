/**
 * Customer Lookup API Endpoint
 * GET /api/customers/[username]
 *
 * Allows merchants to look up customers by username
 * Used when scanning customer QR codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Customer } from '@/types/customer';
import { isValidUsername, sanitizeInput, createErrorResponse } from '@/lib/auth-api';

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

/**
 * GET /api/customers/[username]
 * Look up a customer by username
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;

    // Validate username format
    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        createErrorResponse('Invalid username format', 400),
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedUsername = sanitizeInput(username);

    // Query customer from database (customers are users with user_type = 'pioneer')
    const result = await query<Customer>(
      `SELECT id, pi_username as username, pi_uid as "piUid", merchant_id as "merchantId", created_at as "createdAt"
       FROM users
       WHERE user_type = 'pioneer' AND pi_username = $1
       LIMIT 1`,
      [sanitizedUsername]
    );

    // Check if customer exists
    if (result.rows.length === 0) {
      return NextResponse.json(
        createErrorResponse('Customer not found', 404),
        { status: 404 }
      );
    }

    const customer = result.rows[0];

    // Format the response
    const response = {
      success: true,
      customer: {
        id: customer.id,
        username: customer.username,
        piUid: customer.piUid,
        merchantId: customer.merchantId,
        createdAt: customer.createdAt
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Customer lookup error:', error);

    // Handle database errors
    if (error instanceof Error) {
      // Check for specific database error codes
      if (error.message.includes('connection') || error.message.includes('database')) {
        return NextResponse.json(
          createErrorResponse('Database connection error', 503),
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('Failed to lookup customer', 500),
      { status: 500 }
    );
  }
}