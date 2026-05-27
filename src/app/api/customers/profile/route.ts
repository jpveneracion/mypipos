/**
 * Customer Profile API Endpoint
 * GET /api/customers/profile
 *
 * Returns the authenticated customer's profile information
 * Requires valid authentication token
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Customer } from '@/types/customer';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth-api';

/**
 * GET /api/customers/profile
 * Get current authenticated customer's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Query customer profile from database using the authenticated user's ID
    const result = await query<Customer>(
      `SELECT id, pi_username as username, pi_uid as "piUid", merchant_id as "merchantId", created_at as "createdAt"
       FROM users
       WHERE (id = $1 OR pi_uid = $2) AND user_type = 'pioneer'
       LIMIT 1`,
      [user.id, user.piUid]
    );

    // Check if customer exists
    if (result.rows.length === 0) {
      return NextResponse.json(
        createErrorResponse('Customer profile not found', 404),
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
    console.error('Customer profile error:', error);

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
      createErrorResponse('Failed to fetch customer profile', 500),
      { status: 500 }
    );
  }
}