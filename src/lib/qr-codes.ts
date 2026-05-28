// src/lib/qr-codes.ts
import QRCode from 'qrcode';
import type { CustomerQRData } from '@/types/customer';

/**
 * Generate simple myPiPOS customer QR code
 * Optimized for instant scanning on merchant devices
 */
export async function generateCustomerQR(
  customer: { id: string; username: string }
): Promise<string> {
  // Simple format: customer ID only (much shorter = faster scanning)
  const qrData = customer.id;

  return await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',  // High error correction for better scanning
    width: 512,                  // Larger size = easier to scan
    margin: 4                    // More margin = better scanner recognition
  });
}

/**
 * Decode customer QR code data
 * Now handles simple customer ID format for instant scanning
 */
export function decodeCustomerQR(qrData: string): CustomerQRData | null {
  try {
    // Simple format: just the customer ID
    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(qrData)) {
      // Return minimal structure for backwards compatibility
      return {
        t: "mpp_c",
        v: "2.0",
        u: "",
        i: qrData,
        ts: Math.floor(Date.now() / 1000),
        s: ""
      };
    }

    // Try old format for backwards compatibility
    const decoded = JSON.parse(atob(qrData));
    if (decoded.t && decoded.t === 'mpp_c') {
      return decoded as CustomerQRData;
    }

    return null;
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
