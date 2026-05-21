import { NextRequest, NextResponse } from 'next/server';

// Mock merchant product pricing data
// This implements the universal product catalog with per-merchant pricing
const mockMerchantProducts = [
  {
    id: '123e4567-e89b-12d3-a456-426614174300',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    product_name: 'Heinz Tomato Ketchup',
    barcode: '011110021113',
    price: 3.99,
    currency: 'PI',
    cost_price: 2.50,
    margin_percentage: 37.3,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174301',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174001',
    product_name: 'Coca-Cola 500ml',
    barcode: '054490000131',
    price: 1.99,
    currency: 'PI',
    cost_price: 1.20,
    margin_percentage: 39.7,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174302',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174002',
    product_name: 'Lays Classic Chips',
    barcode: '028400486048',
    price: 2.49,
    currency: 'PI',
    cost_price: 1.50,
    margin_percentage: 39.8,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174303',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174003',
    product_name: 'Bottled Water 1L',
    barcode: '012345678901',
    price: 0.99,
    currency: 'PI',
    cost_price: 0.40,
    margin_percentage: 59.6,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174304',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174004',
    product_name: 'Chocolate Bar',
    barcode: '012345678902',
    price: 1.49,
    currency: 'PI',
    cost_price: 0.80,
    margin_percentage: 46.3,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const barcode = searchParams.get('barcode');
    const productId = searchParams.get('product_id');

    let filteredProducts = [...mockMerchantProducts];

    // Filter by merchant ID
    if (merchantId) {
      filteredProducts = filteredProducts.filter(mp => mp.merchant_id === merchantId);
    }

    // Filter by barcode
    if (barcode) {
      filteredProducts = filteredProducts.filter(mp => mp.barcode === barcode);
    }

    // Filter by product ID
    if (productId) {
      filteredProducts = filteredProducts.filter(mp => mp.product_id === productId);
    }

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      count: filteredProducts.length
    });
  } catch (error) {
    console.error('Merchant products GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch merchant products'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant_id, product_id, barcode, price, cost_price, is_active } = body;

    // Validate required fields
    if (!merchant_id || !product_id || !price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: merchant_id, product_id, and price are required'
        },
        { status: 400 }
      );
    }

    // Check if merchant product already exists
    const existingIndex = mockMerchantProducts.findIndex(
      mp => mp.merchant_id === merchant_id && mp.product_id === product_id
    );

    const marginPercentage = cost_price ?
      ((price - cost_price) / price) * 100 : 0;

    if (existingIndex >= 0) {
      // Update existing merchant product
      mockMerchantProducts[existingIndex] = {
        ...mockMerchantProducts[existingIndex],
        price,
        cost_price: cost_price || mockMerchantProducts[existingIndex].cost_price,
        margin_percentage: marginPercentage,
        is_active: is_active !== undefined ? is_active : mockMerchantProducts[existingIndex].is_active
      };

      return NextResponse.json({
        success: true,
        product: mockMerchantProducts[existingIndex],
        message: 'Merchant product pricing updated successfully'
      });
    } else {
      // Add new merchant product
      const newMerchantProduct = {
        id: crypto.randomUUID(),
        merchant_id,
        product_id,
        product_name: body.product_name || 'Unknown Product',
        barcode: barcode || '',
        price,
        currency: 'PI',
        cost_price: cost_price || 0,
        margin_percentage: marginPercentage,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
      };

      mockMerchantProducts.push(newMerchantProduct);

      return NextResponse.json({
        success: true,
        product: newMerchantProduct,
        message: 'Merchant product pricing created successfully'
      });
    }
  } catch (error) {
    console.error('Merchant products POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create merchant product pricing'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant_product_id, price, cost_price, is_active } = body;

    // Find merchant product
    const productIndex = mockMerchantProducts.findIndex(
      mp => mp.id === merchant_product_id
    );

    if (productIndex < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant product not found'
        },
        { status: 404 }
      );
    }

    // Update fields
    const updates: any = {};
    if (price !== undefined) updates.price = price;
    if (cost_price !== undefined) updates.cost_price = cost_price;
    if (is_active !== undefined) updates.is_active = is_active;

    // Recalculate margin if price or cost_price changed
    if (price !== undefined || cost_price !== undefined) {
      const newPrice = price !== undefined ? price : mockMerchantProducts[productIndex].price;
      const newCost = cost_price !== undefined ? cost_price : mockMerchantProducts[productIndex].cost_price;
      updates.margin_percentage = ((newPrice - newCost) / newPrice) * 100;
    }

    Object.assign(mockMerchantProducts[productIndex], updates);

    return NextResponse.json({
      success: true,
      product: mockMerchantProducts[productIndex],
      message: 'Merchant product pricing updated successfully'
    });
  } catch (error) {
    console.error('Merchant products PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update merchant product pricing'
      },
      { status: 500 }
    );
  }
}