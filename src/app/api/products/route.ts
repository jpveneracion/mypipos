import { NextRequest, NextResponse } from 'next/server';
import {
  getMerchantProducts,
  getProductByBarcode,
  searchMerchantProducts,
  createProductForMerchant,
  deleteProductFromMerchant,
} from '@/lib/db-products';

/**
 * GET /api/products
 * Fetch products for a merchant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const barcode = searchParams.get('barcode');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('low_stock') === 'true';

    // For barcode lookup, we don't need merchant_id
    if (barcode) {
      const merchantIdToUse = merchantId || 'default-merchant';
      const product = await getProductByBarcode(merchantIdToUse, barcode);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: 'Product not found'
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        product: formatProductForResponse(product),
        count: 1
      });
    }

    // Validate merchant_id for other queries
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'merchant_id is required'
        },
        { status: 400 }
      );
    }

    // Search products
    const products = await searchMerchantProducts({
      merchantId,
      searchQuery: search || undefined,
      category: category || undefined,
      lowStock,
    });

    return NextResponse.json({
      success: true,
      products: products.map(formatProductForResponse),
      count: products.length
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product for a merchant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchant_id,
      user_id,
      name,
      description,
      barcode,
      sku,
      price,
      cost,
      category,
      stock,
      minStock,
      image,
    } = body;

    // Validate required fields
    if (!merchant_id || !user_id || !name || !sku || price === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: merchant_id, user_id, name, sku, price'
        },
        { status: 400 }
      );
    }

    // Create product
    const result = await createProductForMerchant({
      merchantId: merchant_id,
      userId: user_id,
      name,
      description,
      barcode,
      sku,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : undefined,
      category,
      stock: stock ? parseInt(stock) : 0,
      minStock: minStock ? parseInt(minStock) : 10,
      image,
    });

    return NextResponse.json({
      success: true,
      product: formatProductForResponse(result),
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products
 * Delete a product from merchant catalog
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const productId = searchParams.get('product_id');

    if (!merchantId || !productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'merchant_id and product_id are required'
        },
        { status: 400 }
      );
    }

    const deleted = await deleteProductFromMerchant(merchantId, productId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Format product data for API response
 * Converts the complex product/merchant/inventory structure into a flat format
 */
function formatProductForResponse(data: any): any {
  const { product, merchantProduct, inventory } = data;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: merchantProduct.merchant_sku,
    barcode: product.barcode || merchantProduct.merchant_barcode,
    category: product.category_name,
    price: parseFloat(merchantProduct.price),
    cost: merchantProduct.cost ? parseFloat(merchantProduct.cost) : null,
    stock: inventory?.current_stock || 0,
    minStock: inventory?.low_stock_threshold || 10,
    image: product.main_image_url || merchantProduct.display_image_url,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    // Attribution tracking - distinguish between universal creator and merchant adder
    universal_product_creator: product.created_by,  // Who created the universal product
    merchant_catalog_adder: merchantProduct.created_by,  // Who added it to this merchant's catalog
    merchantProductId: merchantProduct.id,
    merchant_id: merchantProduct.merchant_id,
    // Inventory details
    available_stock: inventory?.available_stock || 0,
    is_low_stock: inventory ? inventory.current_stock <= inventory.low_stock_threshold : false,
  };
}