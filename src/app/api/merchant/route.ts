import { NextRequest, NextResponse } from 'next/server';

// Mock merchant data for development
const mockMerchant = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  business_name: 'Demo Store',
  owner_name: 'Demo Owner',
  email: 'demo@mypipos.com',
  phone: '+1234567890',
  address: '123 Demo Street',
  city: 'Demo City',
  country: 'Demo Country',
  currency: 'PI',
  tax_rate: 8,
  low_stock_alert: true,
  daily_sales_report: true,
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');

    if (merchantId && merchantId !== mockMerchant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      merchant: mockMerchant
    });
  } catch (error) {
    console.error('Merchant GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch merchant data'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant_id, ...updateData } = body;

    if (merchant_id && merchant_id !== mockMerchant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant not found'
        },
        { status: 404 }
      );
    }

    // Update merchant data
    Object.assign(mockMerchant, updateData, {
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      merchant: mockMerchant,
      message: 'Merchant settings updated successfully'
    });
  } catch (error) {
    console.error('Merchant PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update merchant settings'
      },
      { status: 500 }
    );
  }
}