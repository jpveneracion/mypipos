/**
 * Product database operations
 * Handles CRUD operations for universal products and merchant-specific settings
 */

import { query, transaction } from './db';

export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  universal_sku: string | null;
  barcode: string | null;
  category_id: string | null;
  universal_category_id: string | null;
  category_name: string | null;
  main_image_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  metadata: any;
}

export interface DbMerchantProduct {
  id: string;
  merchant_id: string;
  product_id: string;
  merchant_sku: string;
  merchant_barcode: string | null;
  price: number;
  cost: number | null;
  display_name: string | null;
  display_description: string | null;
  display_image_url: string | null;
  is_visible: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface DbMerchantInventory {
  id: string;
  merchant_id: string;
  product_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  reorder_quantity: number;
  max_stock: number | null;
  average_cost: number | null;
  total_value: number;
  location_id: string | null;
  bin_location: string | null;
  shelf_location: string | null;
  last_restocked_at: Date | null;
  last_counted_at: Date | null;
  updated_at: Date;
}

export interface ProductWithMerchantData {
  product: DbProduct;
  merchantProduct: DbMerchantProduct | null;
  inventory: DbMerchantInventory | null;
}

/**
 * Create a new universal product and add it to merchant's catalog
 * This handles the complete flow: create universal product + merchant product + inventory
 */
export async function createProductForMerchant(params: {
  merchantId: string;
  userId: string;
  name: string;
  description?: string;
  barcode?: string;
  sku: string;
  price: number;
  cost?: number;
  category?: string;
  stock?: number;
  minStock?: number;
  image?: string;
}): Promise<ProductWithMerchantData> {
  const {
    merchantId,
    userId,
    name,
    description = null,
    barcode = null,
    sku,
    price,
    cost = null,
    category = null,
    stock = 0,
    minStock = 10,
    image = null,
  } = params;

  return transaction(async (client) => {
    // 1. Create or find universal product
    let productResult;

    // Look up category by name if provided
    let categoryId = null;
    if (category) {
      const slug = category.toLowerCase().replace(/\s+/g, '-');
      const categoryResult = await client.query(
        'SELECT create_category_if_not_exists($1, $2, $3) as category_id',
        [category, slug, `Products in ${category} category`]
      );
      categoryId = categoryResult.rows[0].category_id;
    }

    // Check if product with this barcode already exists
    if (barcode) {
      const existingProduct = await client.query(
        'SELECT id FROM products WHERE barcode = $1 AND deleted_at IS NULL',
        [barcode]
      );

      if (existingProduct.rows.length > 0) {
        // Use existing universal product
        productResult = existingProduct;
      } else {
        // Create new universal product with attribution and category
        productResult = await client.query(
          `INSERT INTO products (
            name, description, barcode, universal_sku,
            universal_category_id, main_image_url, status, created_by, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, '{}')
          RETURNING *`,
          [name, description, barcode, sku, categoryId, image, userId]
        );
      }
    } else {
      // No barcode, create new universal product with attribution and category
      productResult = await client.query(
        `INSERT INTO products (
          name, description, universal_sku,
          universal_category_id, main_image_url, status, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, '{}')
        RETURNING *`,
        [name, description, sku, categoryId, image, userId]
      );
    }

    const productId = productResult.rows[0].id;

    // 2. Create merchant product (merchant's specific pricing/settings)
    const merchantProductResult = await client.query(
      `INSERT INTO merchant_products (
        merchant_id, product_id, merchant_sku, merchant_barcode,
        price, cost, is_visible, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, true, 'active', $7)
      RETURNING *`,
      [merchantId, productId, sku, barcode, price, cost, userId]
    );

    // 3. Initialize inventory
    const inventoryResult = await client.query(
      `INSERT INTO merchant_inventory (
        merchant_id, product_id, current_stock, low_stock_threshold, reorder_quantity
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [merchantId, productId, stock, minStock, Math.floor(minStock * 2)]
    );

    return {
      product: productResult.rows[0],
      merchantProduct: merchantProductResult.rows[0],
      inventory: inventoryResult.rows[0],
    };
  });
}

/**
 * Get all products for a merchant with their inventory data
 */
export async function getMerchantProducts(merchantId: string): Promise<ProductWithMerchantData[]> {
  const result = await query(
    `SELECT
      p.*,
      uc.name as category_name,
      mp.id as merchant_product_id,
      mp.merchant_id,
      mp.product_id,
      mp.merchant_sku,
      mp.merchant_barcode,
      mp.price,
      mp.cost,
      mp.display_name,
      mp.display_description,
      mp.display_image_url,
      mp.is_visible,
      mp.status as merchant_status,
      mp.created_at as merchant_created_at,
      mp.updated_at as merchant_updated_at,
      mp.created_by,
      mi.id as inventory_id,
      mi.current_stock,
      mi.reserved_stock,
      mi.available_stock,
      mi.low_stock_threshold,
      mi.reorder_quantity,
      mi.max_stock,
      mi.average_cost,
      mi.total_value,
      mi.location_id,
      mi.bin_location,
      mi.shelf_location,
      mi.last_restocked_at,
      mi.last_counted_at,
      mi.updated_at as inventory_updated_at
    FROM merchant_products mp
    INNER JOIN products p ON mp.product_id = p.id
    LEFT JOIN universal_categories uc ON p.universal_category_id = uc.id
    LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
    WHERE mp.merchant_id = $1
      AND mp.deleted_at IS NULL
      AND p.deleted_at IS NULL
    ORDER BY mp.created_at DESC`,
    [merchantId]
  );

  return result.rows.map((row: any) => ({
    product: {
      id: row.id,
      name: row.name,
      description: row.description,
      universal_sku: row.universal_sku,
      barcode: row.barcode,
      category_id: row.category_id,
      universal_category_id: row.universal_category_id,
      category_name: row.category_name,
      main_image_url: row.main_image_url,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      metadata: row.metadata,
    },
    merchantProduct: {
      id: row.merchant_product_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      merchant_sku: row.merchant_sku,
      merchant_barcode: row.merchant_barcode,
      price: row.price,
      cost: row.cost,
      display_name: row.display_name,
      display_description: row.display_description,
      display_image_url: row.display_image_url,
      is_visible: row.is_visible,
      status: row.merchant_status,
      created_at: row.merchant_created_at,
      updated_at: row.merchant_updated_at,
      created_by: row.created_by,
    },
    inventory: row.inventory_id ? {
      id: row.inventory_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      current_stock: row.current_stock,
      reserved_stock: row.reserved_stock,
      available_stock: row.available_stock,
      low_stock_threshold: row.low_stock_threshold,
      reorder_quantity: row.reorder_quantity,
      max_stock: row.max_stock,
      average_cost: row.average_cost,
      total_value: row.total_value,
      location_id: row.location_id,
      bin_location: row.bin_location,
      shelf_location: row.shelf_location,
      last_restocked_at: row.last_restocked_at,
      last_counted_at: row.last_counted_at,
      updated_at: row.inventory_updated_at,
    } : null,
  }));
}

/**
 * Get a single product by barcode for a merchant
 */
export async function getProductByBarcode(merchantId: string, barcode: string): Promise<ProductWithMerchantData | null> {
  const result = await query(
    `SELECT
      p.*,
      mp.id as merchant_product_id,
      mp.merchant_id,
      mp.product_id,
      mp.merchant_sku,
      mp.merchant_barcode,
      mp.price,
      mp.cost,
      mp.display_name,
      mp.display_description,
      mp.display_image_url,
      mp.is_visible,
      mp.status as merchant_status,
      mp.created_at as merchant_created_at,
      mp.updated_at as merchant_updated_at,
      mp.created_by,
      mi.id as inventory_id,
      mi.current_stock,
      mi.reserved_stock,
      mi.available_stock,
      mi.low_stock_threshold,
      mi.reorder_quantity,
      mi.max_stock,
      mi.average_cost,
      mi.total_value,
      mi.location_id,
      mi.bin_location,
      mi.shelf_location,
      mi.last_restocked_at,
      mi.last_counted_at,
      mi.updated_at as inventory_updated_at
    FROM products p
    INNER JOIN merchant_products mp ON p.id = mp.product_id
    LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
    WHERE mp.merchant_id = $1
      AND p.barcode = $2
      AND mp.deleted_at IS NULL
      AND p.deleted_at IS NULL
    LIMIT 1`,
    [merchantId, barcode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    product: {
      id: row.id,
      name: row.name,
      description: row.description,
      universal_sku: row.universal_sku,
      barcode: row.barcode,
      category_id: row.category_id,
      universal_category_id: row.universal_category_id,
      category_name: row.category_name,
      main_image_url: row.main_image_url,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      metadata: row.metadata,
    },
    merchantProduct: {
      id: row.merchant_product_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      merchant_sku: row.merchant_sku,
      merchant_barcode: row.merchant_barcode,
      price: row.price,
      cost: row.cost,
      display_name: row.display_name,
      display_description: row.display_description,
      display_image_url: row.display_image_url,
      is_visible: row.is_visible,
      status: row.merchant_status,
      created_at: row.merchant_created_at,
      updated_at: row.merchant_updated_at,
      created_by: row.created_by,
    },
    inventory: row.inventory_id ? {
      id: row.inventory_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      current_stock: row.current_stock,
      reserved_stock: row.reserved_stock,
      available_stock: row.available_stock,
      low_stock_threshold: row.low_stock_threshold,
      reorder_quantity: row.reorder_quantity,
      max_stock: row.max_stock,
      average_cost: row.average_cost,
      total_value: row.total_value,
      location_id: row.location_id,
      bin_location: row.bin_location,
      shelf_location: row.shelf_location,
      last_restocked_at: row.last_restocked_at,
      last_counted_at: row.last_counted_at,
      updated_at: row.inventory_updated_at,
    } : null,
  };
}

/**
 * Update product inventory
 */
export async function updateProductInventory(params: {
  merchantId: string;
  productId: string;
  stock?: number;
  lowStockThreshold?: number;
  reorderQuantity?: number;
}): Promise<DbMerchantInventory | null> {
  const { merchantId, productId, stock, lowStockThreshold, reorderQuantity } = params;

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (stock !== undefined) {
    updates.push(`current_stock = $${paramIndex++}`);
    values.push(stock);
  }
  if (lowStockThreshold !== undefined) {
    updates.push(`low_stock_threshold = $${paramIndex++}`);
    values.push(lowStockThreshold);
  }
  if (reorderQuantity !== undefined) {
    updates.push(`reorder_quantity = $${paramIndex++}`);
    values.push(reorderQuantity);
  }

  if (updates.length === 0) {
    throw new Error('No updates provided');
  }

  values.push(merchantId, productId);

  const result = await query(
    `UPDATE merchant_inventory
     SET ${updates.join(', ')}
     WHERE merchant_id = $${paramIndex++} AND product_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Update a product for a merchant
 * Handles updates to universal product, merchant product, and inventory
 */
export async function updateProductForMerchant(params: {
  merchantId: string;
  productId: string;
  userId: string;
  name?: string;
  description?: string;
  barcode?: string;
  sku?: string;
  price?: number;
  cost?: number;
  category?: string;
  stock?: number;
  minStock?: number;
  image?: string;
}): Promise<ProductWithMerchantData | null> {
  const {
    merchantId,
    productId,
    userId,
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
  } = params;

  return transaction(async (client) => {
    // 1. Look up category by name if provided
    let categoryId = null;
    if (category) {
      const slug = category.toLowerCase().replace(/\s+/g, '-');
      const categoryResult = await client.query(
        'SELECT create_category_if_not_exists($1, $2, $3) as category_id',
        [category, slug, `Products in ${category} category`]
      );
      categoryId = categoryResult.rows[0].category_id;
    }

    // 2. Update universal product fields
    const productUpdates: string[] = [];
    const productValues: any[] = [];
    let productParamIndex = 1;

    if (name !== undefined) {
      productUpdates.push(`name = $${productParamIndex++}`);
      productValues.push(name);
    }
    if (description !== undefined) {
      productUpdates.push(`description = $${productParamIndex++}`);
      productValues.push(description);
    }
    if (barcode !== undefined) {
      productUpdates.push(`barcode = $${productParamIndex++}`);
      productValues.push(barcode);
    }
    if (categoryId !== null) {
      productUpdates.push(`universal_category_id = $${productParamIndex++}`);
      productValues.push(categoryId);
    }
    if (image !== undefined) {
      productUpdates.push(`main_image_url = $${productParamIndex++}`);
      productValues.push(image);
    }

    if (productUpdates.length > 0) {
      productUpdates.push(`updated_at = NOW()`);
      productValues.push(productId);
      const productResult = await client.query(
        `UPDATE products
         SET ${productUpdates.join(', ')}
         WHERE id = $${productParamIndex++} AND deleted_at IS NULL
         RETURNING *`,
        productValues
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }
    }

    // 3. Update merchant product fields
    const merchantUpdates: string[] = [];
    const merchantValues: any[] = [];
    let merchantParamIndex = 1;

    if (sku !== undefined) {
      merchantUpdates.push(`merchant_sku = $${merchantParamIndex++}`);
      merchantValues.push(sku);
    }
    if (barcode !== undefined) {
      merchantUpdates.push(`merchant_barcode = $${merchantParamIndex++}`);
      merchantValues.push(barcode);
    }
    if (price !== undefined) {
      merchantUpdates.push(`price = $${merchantParamIndex++}`);
      merchantValues.push(price);
    }
    if (cost !== undefined) {
      merchantUpdates.push(`cost = $${merchantParamIndex++}`);
      merchantValues.push(cost);
    }

    if (merchantUpdates.length > 0) {
      merchantUpdates.push(`updated_at = NOW()`);
      merchantValues.push(merchantId, productId);
      const merchantResult = await client.query(
        `UPDATE merchant_products
         SET ${merchantUpdates.join(', ')}
         WHERE merchant_id = $${merchantParamIndex++} AND product_id = $${merchantParamIndex++}
         AND deleted_at IS NULL
         RETURNING *`,
        merchantValues
      );

      if (merchantResult.rows.length === 0) {
        throw new Error('Merchant product not found');
      }
    }

    // 4. Update inventory if stock or minStock is provided
    if (stock !== undefined || minStock !== undefined) {
      const inventoryUpdates: string[] = [];
      const inventoryValues: any[] = [];
      let inventoryParamIndex = 1;

      if (stock !== undefined) {
        inventoryUpdates.push(`current_stock = $${inventoryParamIndex++}`);
        inventoryValues.push(stock);
      }
      if (minStock !== undefined) {
        inventoryUpdates.push(`low_stock_threshold = $${inventoryParamIndex++}`);
        inventoryValues.push(minStock);
      }

      if (inventoryUpdates.length > 0) {
        inventoryUpdates.push(`updated_at = NOW()`);
        inventoryValues.push(merchantId, productId);
        await client.query(
          `UPDATE merchant_inventory
           SET ${inventoryUpdates.join(', ')}
           WHERE merchant_id = $${inventoryParamIndex++} AND product_id = $${inventoryParamIndex++}`,
          inventoryValues
        );
      }
    }

    // 5. Fetch and return the updated product data
    const result = await client.query(
      `SELECT
        p.*,
        uc.name as category_name,
        mp.id as merchant_product_id,
        mp.merchant_id,
        mp.product_id,
        mp.merchant_sku,
        mp.merchant_barcode,
        mp.price,
        mp.cost,
        mp.display_name,
        mp.display_description,
        mp.display_image_url,
        mp.is_visible,
        mp.status as merchant_status,
        mp.created_at as merchant_created_at,
        mp.updated_at as merchant_updated_at,
        mp.created_by,
        mi.id as inventory_id,
        mi.current_stock,
        mi.reserved_stock,
        mi.available_stock,
        mi.low_stock_threshold,
        mi.reorder_quantity,
        mi.max_stock,
        mi.average_cost,
        mi.total_value,
        mi.location_id,
        mi.bin_location,
        mi.shelf_location,
        mi.last_restocked_at,
        mi.last_counted_at,
        mi.updated_at as inventory_updated_at
      FROM products p
      INNER JOIN merchant_products mp ON p.id = mp.product_id
      LEFT JOIN universal_categories uc ON p.universal_category_id = uc.id
      LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
      WHERE mp.merchant_id = $1 AND mp.product_id = $2
        AND mp.deleted_at IS NULL
        AND p.deleted_at IS NULL`,
      [merchantId, productId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to fetch updated product');
    }

    const row = result.rows[0];
    return {
      product: {
        id: row.id,
        name: row.name,
        description: row.description,
        universal_sku: row.universal_sku,
        barcode: row.barcode,
        category_id: row.category_id,
        universal_category_id: row.universal_category_id,
        category_name: row.category_name,
        main_image_url: row.main_image_url,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        metadata: row.metadata,
      },
      merchantProduct: {
        id: row.merchant_product_id,
        merchant_id: row.merchant_id,
        product_id: row.product_id,
        merchant_sku: row.merchant_sku,
        merchant_barcode: row.merchant_barcode,
        price: row.price,
        cost: row.cost,
        display_name: row.display_name,
        display_description: row.display_description,
        display_image_url: row.display_image_url,
        is_visible: row.is_visible,
        status: row.merchant_status,
        created_at: row.merchant_created_at,
        updated_at: row.merchant_updated_at,
        created_by: row.created_by,
      },
      inventory: row.inventory_id ? {
        id: row.inventory_id,
        merchant_id: row.merchant_id,
        product_id: row.product_id,
        current_stock: row.current_stock,
        reserved_stock: row.reserved_stock,
        available_stock: row.available_stock,
        low_stock_threshold: row.low_stock_threshold,
        reorder_quantity: row.reorder_quantity,
        max_stock: row.max_stock,
        average_cost: row.average_cost,
        total_value: row.total_value,
        location_id: row.location_id,
        bin_location: row.bin_location,
        shelf_location: row.shelf_location,
        last_restocked_at: row.last_restocked_at,
        last_counted_at: row.last_counted_at,
        updated_at: row.inventory_updated_at,
      } : null,
    };
  });
}

/**
 * Delete product from merchant catalog (soft delete)
 */
export async function deleteProductFromMerchant(merchantId: string, productId: string): Promise<boolean> {
  const result = await query(
    `UPDATE merchant_products
     SET deleted_at = NOW()
     WHERE merchant_id = $1 AND product_id = $2
     RETURNING id`,
    [merchantId, productId]
  );

  return result.rows.length > 0;
}

/**
 * Search products for a merchant
 */
export async function searchMerchantProducts(params: {
  merchantId: string;
  searchQuery?: string;
  category?: string;
  lowStock?: boolean;
}): Promise<ProductWithMerchantData[]> {
  const { merchantId, searchQuery, category, lowStock } = params;

  const conditions: string[] = ['mp.merchant_id = $1', 'mp.deleted_at IS NULL', 'p.deleted_at IS NULL'];
  const values: any[] = [merchantId];
  let paramIndex = 2;

  if (searchQuery) {
    conditions.push(`(
      p.name ILIKE $${paramIndex++} OR
      p.description ILIKE $${paramIndex++} OR
      mp.merchant_sku ILIKE $${paramIndex++} OR
      p.barcode ILIKE $${paramIndex++}
    )`);
    const searchTerm = `%${searchQuery}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category && category !== 'All') {
    conditions.push(`uc.name = $${paramIndex++}`);
    values.push(category);
  }

  if (lowStock) {
    conditions.push(`mi.current_stock <= mi.low_stock_threshold`);
  }

  const result = await query(
    `SELECT
      p.*,
      uc.name as category_name,
      mp.id as merchant_product_id,
      mp.merchant_id,
      mp.product_id,
      mp.merchant_sku,
      mp.merchant_barcode,
      mp.price,
      mp.cost,
      mp.display_name,
      mp.display_description,
      mp.display_image_url,
      mp.is_visible,
      mp.status as merchant_status,
      mp.created_at as merchant_created_at,
      mp.updated_at as merchant_updated_at,
      mp.created_by,
      mi.id as inventory_id,
      mi.current_stock,
      mi.reserved_stock,
      mi.available_stock,
      mi.low_stock_threshold,
      mi.reorder_quantity,
      mi.max_stock,
      mi.average_cost,
      mi.total_value,
      mi.location_id,
      mi.bin_location,
      mi.shelf_location,
      mi.last_restocked_at,
      mi.last_counted_at,
      mi.updated_at as inventory_updated_at
    FROM merchant_products mp
    INNER JOIN products p ON mp.product_id = p.id
    LEFT JOIN universal_categories uc ON p.universal_category_id = uc.id
    LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY mp.created_at DESC`,
    values
  );

  return result.rows.map((row: any) => ({
    product: {
      id: row.id,
      name: row.name,
      description: row.description,
      universal_sku: row.universal_sku,
      barcode: row.barcode,
      category_id: row.category_id,
      universal_category_id: row.universal_category_id,
      category_name: row.category_name,
      main_image_url: row.main_image_url,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      metadata: row.metadata,
    },
    merchantProduct: {
      id: row.merchant_product_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      merchant_sku: row.merchant_sku,
      merchant_barcode: row.merchant_barcode,
      price: row.price,
      cost: row.cost,
      display_name: row.display_name,
      display_description: row.display_description,
      display_image_url: row.display_image_url,
      is_visible: row.is_visible,
      status: row.merchant_status,
      created_at: row.merchant_created_at,
      updated_at: row.merchant_updated_at,
      created_by: row.created_by,
    },
    inventory: row.inventory_id ? {
      id: row.inventory_id,
      merchant_id: row.merchant_id,
      product_id: row.product_id,
      current_stock: row.current_stock,
      reserved_stock: row.reserved_stock,
      available_stock: row.available_stock,
      low_stock_threshold: row.low_stock_threshold,
      reorder_quantity: row.reorder_quantity,
      max_stock: row.max_stock,
      average_cost: row.average_cost,
      total_value: row.total_value,
      location_id: row.location_id,
      bin_location: row.bin_location,
      shelf_location: row.shelf_location,
      last_restocked_at: row.last_restocked_at,
      last_counted_at: row.last_counted_at,
      updated_at: row.inventory_updated_at,
    } : null,
  }));
}
