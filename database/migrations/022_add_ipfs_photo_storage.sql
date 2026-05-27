-- ============================================================================
-- Migration 022: Add IPFS Photo Storage to Merchant Products
-- ============================================================================
-- This migration adds IPFS hash storage for product photos, enabling
-- decentralized image storage via Pinata while maintaining merchant isolation.
-- ============================================================================

BEGIN;

-- Add ipfs_hash column to merchant_products table
ALTER TABLE merchant_products
ADD COLUMN ipfs_hash VARCHAR(100);

-- Create index for faster queries
CREATE INDEX idx_merchant_products_ipfs_hash
ON merchant_products(ipfs_hash) WHERE ipfs_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN merchant_products.ipfs_hash IS
'IPFS hash for product photo stored on Pinata. Gateway URL: https://gateway.pinata.cloud/ipfs/{hash}';

-- Keep existing display_image_url for backward compatibility
-- New uploads will use ipfs_hash, old data remains accessible

COMMIT;