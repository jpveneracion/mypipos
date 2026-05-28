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
  // Simple format: just the username (easiest to scan and remember)
  const qrData = customer.username;

  return await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',  // High error correction for better scanning
    width: 512,                  // Larger size = easier to scan
    margin: 4                    // More margin = better scanner recognition
  });
}

/**
 * Decode customer QR code data
 * Now handles simple username format for instant scanning
 */
export function decodeCustomerQR(qrData: string): CustomerQRData | null {
  try {
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
