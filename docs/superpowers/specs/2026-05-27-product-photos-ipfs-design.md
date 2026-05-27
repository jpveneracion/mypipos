# Product Photos IPFS Storage Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design

**Goal:** Enable merchants to upload product photos to IPFS via Pinata, storing only IPFS hashes in the merchant_products table, with optimized compression for fast POS workflow.

**Architecture:** Client-side compression → Server-side Pinata upload → IPFS hash storage in merchant_products table → Dynamic gateway URL generation

**Tech Stack:** Pinata IPFS, Next.js API routes, React components, PostgreSQL migration, Image compression library

---

## Database Schema Changes (Migration 022)

### Add IPFS Hash Column

```sql
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
```

### Schema Decisions

- **Single Image Field:** Consolidate to one `ipfs_hash` per merchant product
- **Merchant Isolation:** Photos stored in `merchant_products`, NOT universal `products` table
- **Backward Compatible:** Keep `display_image_url` for existing data
- **Clean Separation:** Store only hash, generate gateway URLs dynamically

---

## API Design

### 1. Image Upload Endpoint

**`POST /api/products/upload`**

```typescript
// Request: multipart/form-data
{
  file: File  // JPG or PNG, max 10MB
}

// Response: Success
{
  success: true,
  ipfsHash: "QmXxx...",  // IPFS CID
  url: "https://gateway.pinata.cloud/ipfs/QmXxx..."
}

// Response: Error
{
  success: false,
  error: "Upload failed"
}
```

**Validation:**
- File types: `image/jpeg`, `image/jpg`, `image/png`
- Max size: 10MB (before compression)
- Server-side validation

### 2. Updated Products API

**`POST /api/products`** (Create Product)
- Accepts `ipfs_hash` instead of `image` field
- Stores hash in `merchant_products.ipfs_hash`
- Returns generated gateway URL in response

**`PUT /api/products`** (Update Product)
- Accepts `ipfs_hash` updates
- Allows photo replacement
- Maintains two-phase commit safety

### 3. Two-Phase Upload System

**Phase 1: Upload Reservation**
```typescript
// Create reservation before Pinata upload
{
  id: "reservation_id",
  merchantId: "uuid",
  productId: "uuid", 
  status: "pending",
  createdAt: timestamp
}
```

**Phase 2: Confirmation**
```typescript
// Confirm after successful database update
{
  reservationId: "reservation_id",
  ipfsHash: "QmXxx...",
  confirmedAt: timestamp
}
```

**Cleanup:** Auto-cancel failed uploads after 1 hour

---

## Frontend Components

### 1. Image Upload Component

**File:** `src/components/products/ProductPhotoUpload.tsx`

**Features:**
- Drag & drop + click to upload
- Real-time preview
- Progress tracking (compressing → uploading → saving)
- File validation (type, size)
- Error handling
- Two-phase commit progress UI

**Props:**
```typescript
interface ProductPhotoUploadProps {
  merchantId: string;
  productId?: string;  // Optional for edits
  onUploadSuccess: (ipfsHash: string) => void;
  currentPhoto?: string;  // Existing IPFS hash
}
```

### 2. Integration Points

**Product Creation Form**
- Add photo upload step before product submission
- Show "Add your product photo" prompt
- Required or optional based on merchant preference

**Product Edit Form**  
- Allow photo replacement
- Show current photo with "Replace" option
- Maintain two-phase commit for updates

**Product Display**
- Generate gateway URL: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
- Fallback to placeholder if no photo
- Lazy loading for performance

### 3. Barcode Scanner Enhancement

**Existing Flow:**
1. Merchant scans barcode
2. System finds universal product
3. Form fields auto-populated

**Enhanced Flow:**
1. Merchant scans barcode
2. System finds universal product
3. Form fields auto-populated
4. **"Add your product photo" prompt**
5. Merchant uploads their own photo
6. Photo stored in `merchant_products.ipfs_hash`

**Key Point:** Universal products remain photo-free. Each merchant adds their own photos.

---

## Implementation Details

### Environment Variables

```bash
# Add to .env
PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
```

### Image Compression

**Library:** Reuse simplified version from myPiAtlas

**Settings:**
- **Input limit:** 10MB
- **Target output:** 5MB
- **Quality:** JPEG 85%
- **Format:** JPEG only (no WebP for simplicity)
- **Smart resize:** Enabled

**Process:**
```typescript
// 1. Client-side compression
const compressed = await compressImage(file, {
  maxSizeMB: 10,
  targetQuality: 0.85,
  outputFormat: 'jpeg'
});

// 2. Validate compressed size
if (compressed.size > 5 * 1024 * 1024) {
  throw new Error('Compressed image too large');
}

// 3. Upload to Pinata
const result = await uploadToPinata(compressed);
```

### Security Considerations

**JWT Protection:**
- Server-side upload only (JWT never exposed to client)
- Environment variable storage
- Rotation capability

**File Validation:**
- Client-side: Type and size check
- Server-side: Double validation
- Magic bytes verification

**IPFS Hash Validation:**
- Validate CID format before storing
- Check hash length and characters
- Prevent injection attacks

### Error Handling

**Upload Failures:**
- Network timeout (30s)
- Pinata API errors
- Insufficient Pinata credits
- Automatic retry (3x with exponential backoff)

**Validation Errors:**
- File type rejected
- File size exceeded
- Compression failed
- Clear user error messages

**Database Errors:**
- Transaction rollback on failures
- Two-phase commit cancellation
- Cleanup of orphaned uploads

---

## Data Flow

### Complete Upload Flow

```
1. Merchant selects photo
   ↓
2. Client validation (type, size)
   ↓
3. Compression (JPEG 85%, 10MB → 5MB target)
   ↓
4. Preview + confirmation
   ↓
5. Create upload reservation
   ↓
6. POST /api/products/upload
   → Server validation
   → Pinata upload
   → Return IPFS hash
   ↓
7. Save ipfs_hash to merchant_products
   ↓
8. Confirm upload reservation
   ↓
9. Update product display with gateway URL
```

### Barcode Scanner Flow with Photos

```
1. Merchant scans barcode
   ↓
2. Query universal products table
   ↓
3. Populate form with universal data
   ↓
4. "Add your product photo" prompt
   ↓
5. Merchant uploads photo
   ↓
6. Photo stored in merchant_products.ipfs_hash
   ↓
7. Product created with merchant-specific photo
```

---

## Success Criteria

### Functional Requirements
✅ Merchants can upload product photos (JPG/PNG, max 10MB)
✅ Photos compressed client-side (JPEG 85%, target 5MB)
✅ Upload to Pinata with two-phase commit safety
✅ IPFS hash stored in merchant_products table
✅ Gateway URLs generated dynamically
✅ Photos work in product creation and editing
✅ Barcode scanner integration supports photo uploads
✅ Error handling and user feedback

### Non-Functional Requirements
✅ Fast uploads (compression + Pinata CDN)
✅ Secure (JWT server-side, file validation)
✅ Reliable (two-phase commit, cleanup)
✅ Scalable (IPFS decentralized storage)
✅ Merchant isolation (photos in merchant_products)

---

## Migration Strategy

### Phase 1: Database Schema
- Run Migration 022
- Test with sample data
- Verify indexes and constraints

### Phase 2: API Development
- Implement upload endpoint
- Add compression utility
- Create two-phase commit system
- Test with Pinata sandbox

### Phase 3: Frontend Components
- Build upload component
- Integrate with product forms
- Add barcode scanner support
- Test user flows

### Phase 4: Testing & Deployment
- Unit tests for compression
- Integration tests for upload flow
- E2E tests for product creation
- Deploy to dev environment
- Monitor Pinata usage and costs

---

## Future Enhancements

### Optional Features (Out of Scope)
- Multiple photos per product
- Image gallery view
- Photo editing/cropping
- Bulk photo upload
- Photo moderation
- Alternative IPFS gateways
- Photo CDN caching

### Scalability Considerations
- Pinata cost monitoring
- Upload rate limiting
- Storage quotas per merchant
- Image optimization for different devices
- Fallback gateways if Pinata is down

---

## Appendix

### Dependencies

```json
{
  "dependencies": {
    "@pinata/sdk": "^2.2.0",  // Pinata API client
    "browser-image-compression": "^2.0.2"  // Client compression
  }
}
```

### References

- myPiAtlas IPFS implementation: `E:\laragon\www\myPiAtlas\my-pi-atlas\app\api\upload\route.ts`
- myPiAtlas compression: `E:\laragon\www\myPiAtlas\my-pi-atlas\lib\image-compress.ts`
- Pinata Documentation: https://docs.pinata.cloud/
- IPFS Gateway: https://gateway.pinata.cloud/

### Notes

- This design reuses proven patterns from myPiAtlas
- Simplified for POS workflow (faster, no EXIF)
- Merchant isolation by design
- Backward compatible with existing data
- Production-ready with error handling and security
