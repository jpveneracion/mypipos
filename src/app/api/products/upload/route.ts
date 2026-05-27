/**
 * Product Photo Upload API Endpoint
 * POST /api/products/upload
 *
 * Uploads product photos to IPFS via Pinata
 * Validates, compresses, and returns IPFS hash
 */

import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_GROUP_ID = process.env.PINATA_GROUP_ID || '86156b69-922f-4b4a-9e92-ff672f132a41';

export async function POST(req: NextRequest) {
  try {
    // Check Pinata configuration
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Pinata not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG and PNG images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB allowed.` },
        { status: 400 }
      );
    }

    // Convert file to buffer for Pinata upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // Prepare Pinata upload
    const pinataForm = new FormData();
    pinataForm.append('file', new Blob([buffer], { type: file.type }), file.name);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        app: 'mypipos',
        uploadedAt: new Date().toISOString(),
        group_id: PINATA_GROUP_ID,
      },
    });
    pinataForm.append('pinataMetadata', metadata);

    // Upload to Pinata
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataForm,
    });

    if (!pinataResponse.ok) {
      const error = await pinataResponse.json().catch(() => ({}));
      console.error('[Pinata] Upload failed:', error);
      return NextResponse.json(
        { error: 'IPFS upload failed' },
        { status: 502 }
      );
    }

    const data = await pinataResponse.json();
    const ipfsHash = data.IpfsHash;
    const url = `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    console.log('[Upload] Success:', { ipfsHash, url });

    return NextResponse.json({
      success: true,
      ipfsHash,
      url
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
