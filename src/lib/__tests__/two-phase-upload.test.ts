/**
 * Tests for two-phase upload system
 */

import {
  createUploadReservation,
  confirmUploadReservation,
  cancelUploadReservation,
  cleanupExpiredReservations,
} from '../two-phase-upload';

describe('Two-Phase Upload System', () => {
  beforeEach(() => {
    // Clear all reservations before each test
    const reservations = (global as any).twoPhaseUploadReservations;
    if (reservations && reservations.clear) {
      reservations.clear();
    }
  });

  describe('createUploadReservation', () => {
    test('should create reservation with pending status', () => {
      const reservation = createUploadReservation('merchant-123');

      expect(reservation.status).toBe('pending');
      expect(reservation.merchantId).toBe('merchant-123');
      expect(reservation.id).toBeDefined();
      expect(reservation.createdAt).toBeInstanceOf(Date);
      expect(reservation.expiresAt).toBeInstanceOf(Date);
    });

    test('should create reservation with productId', () => {
      const reservation = createUploadReservation('merchant-123', 'product-456');

      expect(reservation.productId).toBe('product-456');
      expect(reservation.merchantId).toBe('merchant-123');
    });

    test('should create reservation without productId', () => {
      const reservation = createUploadReservation('merchant-123');

      expect(reservation.productId).toBeUndefined();
      expect(reservation.merchantId).toBe('merchant-123');
    });

    test('should set expiry to 1 hour from creation', () => {
      const now = new Date();
      const reservation = createUploadReservation('merchant-123');

      const expiryTime = reservation.expiresAt.getTime() - reservation.createdAt.getTime();
      const oneHourInMs = 60 * 60 * 1000;

      expect(expiryTime).toBeCloseTo(oneHourInMs, -1000); // Within 1 second
    });
  });

  describe('confirmUploadReservation', () => {
    test('should confirm existing reservation', () => {
      const reservation = createUploadReservation('merchant-123');
      const confirmed = confirmUploadReservation(reservation.id);

      expect(confirmed).toBe(true);
    });

    test('should return false for non-existent reservation', () => {
      const confirmed = confirmUploadReservation('non-existent-id');

      expect(confirmed).toBe(false);
    });

    test('should update reservation status to confirmed', () => {
      const reservation = createUploadReservation('merchant-123');

      confirmUploadReservation(reservation.id);

      expect(reservation.status).toBe('confirmed');
    });

    test('should remove reservation after confirmation', () => {
      const reservation = createUploadReservation('merchant-123');

      confirmUploadReservation(reservation.id);

      // Try to confirm again - should fail since reservation was removed
      const confirmedAgain = confirmUploadReservation(reservation.id);
      expect(confirmedAgain).toBe(false);
    });
  });

  describe('cancelUploadReservation', () => {
    test('should cancel existing reservation', () => {
      const reservation = createUploadReservation('merchant-123');
      const cancelled = cancelUploadReservation(reservation.id);

      expect(cancelled).toBe(true);
    });

    test('should return false for non-existent reservation', () => {
      const cancelled = cancelUploadReservation('non-existent-id');

      expect(cancelled).toBe(false);
    });

    test('should update reservation status to cancelled', () => {
      const reservation = createUploadReservation('merchant-123');

      cancelUploadReservation(reservation.id);

      expect(reservation.status).toBe('cancelled');
    });

    test('should store IPFS hash when provided', () => {
      const reservation = createUploadReservation('merchant-123');

      cancelUploadReservation(reservation.id, 'QmTest123');

      expect(reservation.ipfsHash).toBe('QmTest123');
    });

    test('should remove reservation after cancellation', () => {
      const reservation = createUploadReservation('merchant-123');

      cancelUploadReservation(reservation.id);

      // Try to cancel again - should fail since reservation was removed
      const cancelledAgain = cancelUploadReservation(reservation.id);
      expect(cancelledAgain).toBe(false);
    });
  });

  describe('cleanupExpiredReservations', () => {
    test('should remove expired reservations', () => {
      // Create a reservation and manually expire it
      const reservation = createUploadReservation('merchant-123');
      (reservation as any).expiresAt = new Date(Date.now() - 1000); // Set to past

      cleanupExpiredReservations();

      // Try to confirm the expired reservation - should fail
      const confirmed = confirmUploadReservation(reservation.id);
      expect(confirmed).toBe(false);
    });

    test('should not remove active reservations', () => {
      const reservation = createUploadReservation('merchant-123');

      cleanupExpiredReservations();

      // Should still be able to confirm the active reservation
      const confirmed = confirmUploadReservation(reservation.id);
      expect(confirmed).toBe(true);
    });

    test('should handle multiple expired reservations', () => {
      // Create multiple reservations and expire them
      const reservation1 = createUploadReservation('merchant-1');
      const reservation2 = createUploadReservation('merchant-2');
      const reservation3 = createUploadReservation('merchant-3');

      // Expire two of them
      (reservation1 as any).expiresAt = new Date(Date.now() - 1000);
      (reservation2 as any).expiresAt = new Date(Date.now() - 1000);

      cleanupExpiredReservations();

      // Expired reservations should be gone
      expect(confirmUploadReservation(reservation1.id)).toBe(false);
      expect(confirmUploadReservation(reservation2.id)).toBe(false);

      // Active reservation should still work
      expect(confirmUploadReservation(reservation3.id)).toBe(true);
    });
  });

  describe('startCleanupInterval', () => {
    test('should return interval timer', () => {
      const interval = startCleanupInterval();

      expect(interval).toBeDefined();
      expect(typeof interval).toBe('object');

      // Cleanup
      clearInterval(interval);
    });

    test('should set interval to 30 minutes', () => {
      jest.useFakeTimers();
      const cleanupSpy = jest.spyOn(global, 'setInterval');

      startCleanupInterval();

      expect(cleanupSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30 * 60 * 1000 // 30 minutes
      );

      cleanupSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
