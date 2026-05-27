// src/lib/qr-codes.ts
import QRCode from 'qrcode';
import type { CustomerQRData } from '@/types/customer';

/**
 * Generate condensed myPiPOS customer QR code with username initial in center
 * Optimized for fast scanning on merchant devices
 */
export async function generateCustomerQR(
  customer: { id: string; username: string }
): Promise<string> {
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

  // Generate QR code with higher error correction for logo overlay
  const qrDataUrl = await QRCode.toDataURL(encoded, {
    errorCorrectionLevel: 'H',  // High error correction for center overlay
    width: 300,
    margin: 2
  });

  // Add username initial to center of QR code
  return await addInitialToQR(qrDataUrl, customer.username);
}

/**
 * Add username initial to the center of QR code
 */
async function addInitialToQR(qrDataUrl: string, username: string): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Server-side fallback: return QR code without initial
    console.warn('Cannot add initial to QR code on server side');
    return qrDataUrl;
  }

  // Get the first letter of username (capitalize)
  const initial = username.charAt(0).toUpperCase();

  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load the QR code image
  const img = new Image();
  img.src = qrDataUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // Set canvas size to match QR code
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw the QR code
  ctx.drawImage(img, 0, 0);

  // Calculate center circle dimensions
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const circleRadius = Math.min(canvas.width, canvas.height) * 0.15; // 15% of QR size

  // Draw white background circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Draw border around circle
  ctx.strokeStyle = '#14D3C5'; // Brand cyan color
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw the initial text
  ctx.fillStyle = '#14D3C5'; // Brand cyan color
  ctx.font = `bold ${circleRadius * 1.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, centerX, centerY);

  // Convert canvas back to data URL
  return canvas.toDataURL('image/png');
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
