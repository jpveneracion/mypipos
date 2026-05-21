import { PiAuth } from './pi-auth';

export interface PiPaymentRequest {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
}

export interface PiPaymentResult {
  paymentId: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'failed';
  txid?: string;
}

export class PiPaymentService {
  private piAuth: PiAuth;

  constructor(piAuth: PiAuth) {
    this.piAuth = piAuth;
  }

  async createPayment(request: PiPaymentRequest): Promise<PiPaymentResult> {
    try {
      const result = await this.piAuth.createPayment(
        request.amount,
        request.memo
      );

      return {
        paymentId: result.paymentId,
        status: this.mapPaymentStatus(result.status),
      };
    } catch (error) {
      console.error('Pi payment creation error:', error);
      throw new Error('Failed to create payment');
    }
  }

  async completePayment(paymentId: string, txid: string): Promise<void> {
    try {
      const response = await fetch('/api/payments/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, txid }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete payment');
      }
    } catch (error) {
      console.error('Pi payment completion error:', error);
      throw new Error('Failed to complete payment');
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    try {
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel payment');
      }
    } catch (error) {
      console.error('Pi payment cancellation error:', error);
      throw new Error('Failed to cancel payment');
    }
  }

  private mapPaymentStatus(status: string): PiPaymentResult['status'] {
    const statusMap: Record<string, PiPaymentResult['status']> = {
      'ready_for_approval': 'pending',
      'approved': 'approved',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'failed': 'failed',
    };

    return statusMap[status] || 'pending';
  }
}

// Hook for using Pi payments in components
export function usePiPayments() {
  const initiatePayment = async (amount: number, memo: string) => {
    // Implementation for React hook
    const piAuth = new PiAuth({
      appId: process.env.NEXT_PUBLIC_PI_APP_ID || 'your-app-id',
      version: '1.0',
      authCallback: () => {},
    });

    const paymentService = new PiPaymentService(piAuth);
    return await paymentService.createPayment({ amount, memo });
  };

  return { initiatePayment };
}