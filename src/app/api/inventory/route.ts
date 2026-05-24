import { NextRequest, NextResponse } from 'next/server';
import {
  searchMerchantProducts,
  updateProductInventory,
  createProductForMerchant,
} from '@/lib/db-products';
import { query } from '@/lib/db';

/**
 * GET /api/inventory
 * Fetch inventory for a merchant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const lowStock = searchParams.get('low_stock') === 'true';

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'merchant_id is required'
        },
        { status: 400 }
      );
    }

    // Get products with inventory data
    const products = await searchMerchantProducts({
      merchantId,
      lowStock,
    });

    // Format inventory items
    const inventoryItems = products
      .filter(p => p.inventory !== null && p.merchantProduct !== null)
      .map(p => ({
        id: p.inventory!.id,
        merchant_id: p.merchantProduct!.merchant_id,
        product_id: p.product.id,
        product_name: p.product.name,
        barcode: p.product.barcode || p.merchantProduct!.merchant_barcode,
        sku: p.merchantProduct!.merchant_sku,
        current_stock: p.inventory!.current_stock,
        available_stock: p.inventory!.available_stock,
        low_stock_threshold: p.inventory!.low_stock_threshold,
        max_stock: p.inventory!.max_stock,
        reorder_quantity: p.inventory!.reorder_quantity,
        is_low_stock: p.inventory!.current_stock <= p.inventory!.low_stock_threshold,
        last_restocked: p.inventory!.last_restocked_at,
        location: p.inventory!.bin_location || p.inventory!.shelf_location,
        created_at: p.inventory!.updated_at,
      }));

    return NextResponse.json({
      success: true,
      inventory: inventoryItems,
      count: inventoryItems.length,
      low_stock_count: inventoryItems.filter(item => item.is_low_stock).length
    });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * Create or update inventory for a product
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchant_id,
      user_id,
      product_id,
      product_name,
      barcode,
      quantity,
      min_threshold,
      max_stock,
    } = body;

    // Validate required fields
    if (!merchant_id || !user_id || !product_id || quantity === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: merchant_id, user_id, product_id, quantity'
        },
        { status: 400 }
      );
    }

    // Try to update existing inventory first
    const updatedInventory = await updateProductInventory({
      merchantId: merchant_id,
      productId: product_id,
      stock: parseInt(quantity),
      lowStockThreshold: min_threshold ? parseInt(min_threshold) : undefined,
      reorderQuantity: max_stock ? Math.floor(parseInt(max_stock) * 0.15) : undefined,
    });

    if (updatedInventory) {
      // Create inventory transaction log
      await query(
        `INSERT INTO inventory_transactions (
          merchant_id, product_id, transaction_type, quantity,
          quantity_before, quantity_after, performed_by, reason
        ) VALUES ($1, $2, 'restock', $3, $4, $5, $6, $7)`,
        [
          merchant_id,
          product_id,
          parseInt(quantity) - updatedInventory.current_stock,
          updatedInventory.current_stock,
          parseInt(quantity),
          user_id,
          'Inventory adjustment'
        ]
      );

      return NextResponse.json({
        success: true,
        inventory: {
          id: updatedInventory.id,
          merchant_id: updatedInventory.merchant_id,
          product_id: updatedInventory.product_id,
          current_stock: updatedInventory.current_stock,
          available_stock: updatedInventory.available_stock,
          low_stock_threshold: updatedInventory.low_stock_threshold,
          max_stock: updatedInventory.max_stock,
          reorder_quantity: updatedInventory.reorder_quantity,
          is_low_stock: updatedInventory.current_stock <= updatedInventory.low_stock_threshold,
          last_restocked: updatedInventory.last_restocked_at,
        },
        message: 'Inventory updated successfully'
      });
    } else {
      // Inventory doesn't exist, create new product first
      const result = await createProductForMerchant({
        merchantId: merchant_id,
        userId: user_id,
        name: product_name || 'New Product',
        barcode,
        sku: barcode || 'NEW-SKU',
        price: 0,
        stock: parseInt(quantity),
        minStock: min_threshold ? parseInt(min_threshold) : 10,
      });

      if (!result.inventory) {
        throw new Error('Failed to create inventory');
      }

      return NextResponse.json({
        success: true,
        inventory: {
          id: result.inventory.id,
          merchant_id: result.inventory.merchant_id,
          product_id: result.inventory.product_id,
          current_stock: result.inventory.current_stock,
          available_stock: result.inventory.available_stock,
          low_stock_threshold: result.inventory.low_stock_threshold,
          max_stock: result.inventory.max_stock,
          reorder_quantity: result.inventory.reorder_quantity,
          is_low_stock: result.inventory.current_stock <= result.inventory.low_stock_threshold,
          last_restocked: result.inventory.last_restocked_at,
        },
        message: 'Inventory item created successfully'
      });
    }
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory
 * Adjust stock quantity
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchant_id,
      product_id,
      quantity_change,
      user_id,
      reason,
    } = body;

    // Validate required fields
    if (!merchant_id || !product_id || quantity_change === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: merchant_id, product_id, quantity_change'
        },
        { status: 400 }
      );
    }

    // Get current inventory
    const currentResult = await query(
      `SELECT * FROM merchant_inventory
       WHERE merchant_id = $1 AND product_id = $2`,
      [merchant_id, product_id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Inventory item not found'
        },
        { status: 404 }
      );
    }

    const currentInventory = currentResult.rows[0];
    const previousQuantity = currentInventory.current_stock;
    const newQuantity = Math.max(0, previousQuantity + parseInt(quantity_change));

    // Update inventory
    const updatedInventory = await updateProductInventory({
      merchantId: merchant_id,
      productId: product_id,
      stock: newQuantity,
    });

    if (!updatedInventory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update inventory'
        },
        { status: 500 }
      );
    }

    // Create transaction record
    const transactionResult = await query(
      `INSERT INTO inventory_transactions (
        merchant_id, product_id, transaction_type, quantity,
        quantity_before, quantity_after, performed_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        merchant_id,
        product_id,
        parseInt(quantity_change) >= 0 ? 'adjustment' : 'adjustment',
        parseInt(quantity_change),
        previousQuantity,
        newQuantity,
        user_id || null,
        reason || 'manual_adjustment'
      ]
    );

    return NextResponse.json({
      success: true,
      inventory: {
        id: updatedInventory.id,
        merchant_id: updatedInventory.merchant_id,
        product_id: updatedInventory.product_id,
        current_stock: updatedInventory.current_stock,
        available_stock: updatedInventory.available_stock,
        low_stock_threshold: updatedInventory.low_stock_threshold,
        is_low_stock: updatedInventory.current_stock <= updatedInventory.low_stock_threshold,
        last_restocked: updatedInventory.last_restocked_at,
      },
      transaction: transactionResult.rows[0],
      message: 'Stock quantity updated successfully'
    });
  } catch (error) {
    console.error('Inventory PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update stock quantity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}