import { NextRequest, NextResponse } from 'next/server';

// Mock inventory data for development
const mockInventory = [
  {
    id: '123e4567-e89b-12d3-a456-426614174200',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    product_name: 'Heinz Tomato Ketchup',
    barcode: '011110021113',
    current_stock: 45,
    min_threshold: 10,
    max_stock: 100,
    reorder_point: 15,
    last_restocked: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174201',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174001',
    product_name: 'Coca-Cola 500ml',
    barcode: '054490000131',
    current_stock: 8,
    min_threshold: 12,
    max_stock: 200,
    reorder_point: 20,
    last_restocked: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174202',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    product_id: '123e4567-e89b-12d3-a456-426614174002',
    product_name: 'Lays Classic Chips',
    barcode: '028400486048',
    current_stock: 67,
    min_threshold: 15,
    max_stock: 150,
    reorder_point: 25,
    last_restocked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const lowStock = searchParams.get('low_stock') === 'true';

    let filteredInventory = [...mockInventory];

    if (merchantId) {
      filteredInventory = filteredInventory.filter(item => item.merchant_id === merchantId);
    }

    if (lowStock) {
      filteredInventory = filteredInventory.filter(item =>
        item.current_stock <= item.min_threshold
      );
    }

    return NextResponse.json({
      success: true,
      inventory: filteredInventory,
      count: filteredInventory.length,
      low_stock_count: filteredInventory.filter(item =>
        item.current_stock <= item.min_threshold
      ).length
    });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant_id, product_id, product_name, barcode, quantity, min_threshold, max_stock } = body;

    // Validate required fields
    if (!merchant_id || !product_id || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields'
        },
        { status: 400 }
      );
    }

    // Check if product already exists in inventory
    const existingIndex = mockInventory.findIndex(
      item => item.merchant_id === merchant_id && item.product_id === product_id
    );

    if (existingIndex >= 0) {
      // Update existing inventory
      mockInventory[existingIndex] = {
        ...mockInventory[existingIndex],
        current_stock: quantity,
        min_threshold: min_threshold || mockInventory[existingIndex].min_threshold,
        max_stock: max_stock || mockInventory[existingIndex].max_stock,
        last_restocked: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        inventory: mockInventory[existingIndex],
        message: 'Inventory updated successfully'
      });
    } else {
      // Add new inventory item
      const newInventory = {
        id: crypto.randomUUID(),
        merchant_id,
        product_id,
        product_name: product_name || 'Unknown Product',
        barcode: barcode || '',
        current_stock: quantity,
        min_threshold: min_threshold || 10,
        max_stock: max_stock || 100,
        reorder_point: Math.floor((max_stock || 100) * 0.15),
        last_restocked: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      mockInventory.push(newInventory);

      return NextResponse.json({
        success: true,
        inventory: newInventory,
        message: 'Inventory item created successfully'
      });
    }
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update inventory'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_id, quantity_change, reason } = body;

    // Find inventory item
    const inventoryIndex = mockInventory.findIndex(item => item.id === inventory_id);

    if (inventoryIndex < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Inventory item not found'
        },
        { status: 404 }
      );
    }

    // Update stock quantity
    const newQuantity = mockInventory[inventoryIndex].current_stock + quantity_change;
    mockInventory[inventoryIndex].current_stock = Math.max(0, newQuantity);

    // Create transaction record
    const transaction = {
      id: crypto.randomUUID(),
      inventory_id,
      quantity_change,
      previous_quantity: mockInventory[inventoryIndex].current_stock - quantity_change,
      new_quantity: mockInventory[inventoryIndex].current_stock,
      reason: reason || 'manual_adjustment',
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      inventory: mockInventory[inventoryIndex],
      transaction,
      message: 'Stock quantity updated successfully'
    });
  } catch (error) {
    console.error('Inventory PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update stock quantity'
      },
      { status: 500 }
    );
  }
}