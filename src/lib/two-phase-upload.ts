/**
 * Two-phase upload system for product photos
 * Simplified from myPiAtlas for POS workflow
 * Prevents orphaned IPFS uploads by tracking upload state
 */

export interface UploadReservation {
  id: string;
  merchantId: string;
  productId?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  ipfsHash?: string;
  ipfsUrl?: string;
  createdAt: Date;
  expiresAt: Date;
}

const reservations = new Map<string, UploadReservation>();

/**
 * Create upload reservation before IPFS upload
 */
export function createUploadReservation(
  merchantId: string,
  productId?: string
): UploadReservation {
  const id = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiry

  const reservation: UploadReservation = {
    id,
    merchantId,
    productId,
    status: 'pending',
    createdAt: now,
    expiresAt,
  };

  reservations.set(id, reservation);
  return reservation;
}

/**
 * Confirm upload reservation after successful database update
 */
export function confirmUploadReservation(reservationId: string): boolean {
  const reservation = reservations.get(reservationId);
  if (!reservation) {
    console.warn(`Reservation ${reservationId} not found`);
    return false;
  }

  reservation.status = 'confirmed';
  reservations.delete(reservationId);
  return true;
}

/**
 * Cancel upload reservation on failure
 */
export function cancelUploadReservation(
  reservationId: string,
  ipfsHash?: string
): boolean {
  const reservation = reservations.get(reservationId);
  if (!reservation) {
    console.warn(`Reservation ${reservationId} not found`);
    return false;
  }

  reservation.status = 'cancelled';
  reservation.ipfsHash = ipfsHash;

  // TODO: In production, you might want to delete from IPFS here
  // For now, we just log it
  if (ipfsHash) {
    console.log(`Upload cancelled for IPFS hash: ${ipfsHash}`);
  }

  reservations.delete(reservationId);
  return true;
}

/**
 * Cleanup expired reservations (call periodically)
 */
export function cleanupExpiredReservations(): void {
  const now = new Date();
  const expiredIds: string[] = [];

  reservations.forEach((reservation, id) => {
    if (reservation.expiresAt < now) {
      expiredIds.push(id);
    }
  });

  expiredIds.forEach(id => {
    cancelUploadReservation(id);
  });

  console.log(`Cleaned up ${expiredIds.length} expired reservations`);
}

/**
 * Start cleanup interval (call on app startup)
 */
export function startCleanupInterval(): NodeJS.Timeout {
  // Run cleanup every 30 minutes
  return setInterval(cleanupExpiredReservations, 30 * 60 * 1000);
}