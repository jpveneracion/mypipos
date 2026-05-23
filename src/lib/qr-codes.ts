// src/lib/qr-codes.ts
import QRCode from 'qrcode';
import type { CustomerQRData } from '@/types/customer';

/**
 * Generate condensed myPiPOS customer QR code
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
  return await QRCode.toDataURL(encoded, {
    errorCorrectionLevel: 'M',  // Medium error correction
    width: 256,
    margin: 2
  });
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
