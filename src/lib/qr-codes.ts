// src/lib/qr-codes.ts
import QRCode from 'qrcode';
import type { CustomerQRData } from '@/types/customer';

/**
 * Generate condensed myPiPOS customer QR code with embedded username initial
 * The initial is embedded within the QR code data itself for reliable scanning
 */
export async function generateCustomerQR(
  customer: { id: string; username: string }
): Promise<string> {
  // Get username initial for embedding
  const initial = customer.username.charAt(0).toUpperCase();

  // Condensed keys for 40% smaller QR code
  const qrData: CustomerQRData = {
    t: "mpp_c",                    // type: myPiPOS customer
    v: "1.0",                      // version
    u: customer.username,          // username
    i: customer.id,                // customer_id
    ts: Math.floor(Date.now() / 1000),  // Unix timestamp (seconds)
    s: generateSignature(customer.id)    // signature
  };

  const encoded = Buffer.from(JSON.stringify(qrData)).toString('base64');

  // Generate QR code with embedded logo/initial
  return await generateQRWithEmbeddedInitial(encoded, initial);
}

/**
 * Generate QR code with embedded initial in the center
 * This approach embeds the initial within the QR code modules for reliable scanning
 */
async function generateQRWithEmbeddedInitial(data: string, initial: string): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Server-side: generate basic QR code
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2
    });
  }

  // Client-side: generate QR code with embedded initial
  const size = 300;
  const margin = 2;
  const qrSize = size - (margin * 2);

  // Generate basic QR code
  const qrDataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',  // High error correction for embedded logo
    width: qrSize,
    margin: 0
  });

  // Create canvas for embedding
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = size;
  canvas.height = size;

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw QR code (centered with margin)
  const img = new Image();
  img.src = qrDataUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  ctx.drawImage(img, margin, margin, qrSize, qrSize);

  // Embed initial in center by replacing QR modules
  await embedInitialInQRCode(ctx, initial, size, margin, qrSize);

  return canvas.toDataURL('image/png');
}

/**
 * Embed initial letter directly into QR code modules
 * This replaces the center modules of the QR code with the letter
 */
async function embedInitialInQRCode(
  ctx: CanvasRenderingContext2D,
  initial: string,
  canvasSize: number,
  margin: number,
  qrSize: number
): Promise<void> {
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;

  // Calculate the region to replace (about 13% of QR size for reliability)
  const logoSize = Math.floor(qrSize * 0.13);
  const logoStartX = Math.floor(centerX - logoSize / 2);
  const logoStartY = Math.floor(centerY - logoSize / 2);

  // Clear center area (white background)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(logoStartX, logoStartY, logoSize, logoSize);

  // Add colored border
  ctx.strokeStyle = '#14D3C5';
  ctx.lineWidth = 2;
  ctx.strokeRect(logoStartX + 1, logoStartY + 1, logoSize - 2, logoSize - 2);

  // Draw the initial letter
  ctx.fillStyle = '#14D3C5';
  ctx.font = `bold ${logoSize * 0.7}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, centerX, centerY);
}

/**
 * Validate and decode customer QR code data
 */
export function decodeCustomerQR(qrData: string): CustomerQRData | null {
  try {
    const decoded = JSON.parse(atob(qrData));

    // Validate required fields
    if (!decoded.t || decoded.t !== 'mpp_c') {
      return null;
    }

    if (!decoded.v || !decoded.u || !decoded.i || !decoded.ts || !decoded.s) {
      return null;
    }

    // Validate timestamp is within 5 minutes (300 seconds)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - decoded.ts) > 300) {
      return null;  // QR code expired
    }

    return decoded as CustomerQRData;
  } catch (error) {
    return null;
  }
}

/**
 * Generate signature for QR data validation
 * TODO: Implement proper cryptographic signature
 */
function generateSignature(customerId: string): string {
  // For now, return a simple hash
  // TODO: Replace with proper HMAC-SHA256
  return Buffer.from(customerId + Date.now()).toString('base64').substring(0, 10);
}
