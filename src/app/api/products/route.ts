import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual database queries
const mockProducts = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Heinz Tomato Ketchup',
    description: 'Classic tomato ketchup 500ml bottle',
    barcode: '011110021113',
    category: 'condiments',
    image: '/products/ketchup.jpg',
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Coca-Cola 500ml',
    description: 'Refreshing cola drink 500ml bottle',
    barcode: '054490000131',
    category: 'beverages',
    image: '/products/coca-cola.jpg',
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Lays Classic Chips',
    description: 'Classic salted potato chips 150g',
    barcode: '028400486048',
    category: 'snacks',
    image: '/products/lays.jpg',
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'Bottled Water 1L',
    description: 'Spring water 1 liter bottle',
    barcode: '012345678901',
    category: 'beverages',
    image: '/products/water.jpg',
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174004',
    name: 'Chocolate Bar',
    description: 'Milk chocolate bar 100g',
    barcode: '012345678902',
    category: 'confectionery',
    image: '/products/chocolate.jpg',
    created_at: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let filteredProducts = [...mockProducts];

    // Filter by barcode
    if (barcode) {
      filteredProducts = filteredProducts.filter(p => p.barcode === barcode);
    }

    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    // Search by name or description
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      count: filteredProducts.length
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products'
      },
      { status: 500 }
    );
  }
}