// Pi Network Authentication utilities
// Reference: E:\laragon\www\mypiroll-nxt\mypiroll

export interface PiAuthConfig {
  appId: string;
  version: string;
  authCallback: (accessToken: string, user: PiUser) => void;
}

export interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

export class PiAuth {
  private sdk: any;
  private config: PiAuthConfig;

  constructor(config: PiAuthConfig) {
    this.config = config;
    this.initializeSDK();
  }

  private initializeSDK() {
    // Initialize Pi Network SDK
    // This will be loaded from the Pi Network SDK
    if (typeof window !== 'undefined') {
      // @ts-ignore - Pi SDK is loaded externally
      this.sdk = window.Pi;
    }
  }

  async authenticate(): Promise<PiUser> {
    return new Promise((resolve, reject) => {
      if (!this.sdk) {
        reject(new Error('Pi SDK not available'));
        return;
      }

      this.sdk.authenticate(
        [
          'username',
          'payments'
        ],
        {
          onComplete: (authResult: any) => {
            const user: PiUser = {
              uid: authResult.user.uid,
              username: authResult.user.username,
              accessToken: authResult.accessToken
            };
            this.config.authCallback(user.accessToken, user);
            resolve(user);
          },
          onFailure: (error: any) => {
            reject(new Error(`Pi Authentication failed: ${error}`));
          }
        }
      );
    });
  }

  async createPayment(amount: number, memo: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sdk) {
        reject(new Error('Pi SDK not available'));
        return;
      }

      const payment = {
        amount: amount.toFixed(2),
        memo: memo,
        metadata: {
          appId: this.config.appId
        }
      };

      this.sdk.createPayment(
        payment,
        {
          onReadyForServerApproval: (paymentId: string) => {
            resolve({ paymentId, status: 'ready_for_approval' });
          },
          onApproved: (paymentId: string) => {
            resolve({ paymentId, status: 'approved' });
          },
          onIncomplete: (paymentId: string, error: any) => {
            reject(new Error(`Payment incomplete: ${error}`));
          },
          onCancelled: (paymentId: string) => {
            resolve({ paymentId, status: 'cancelled' });
          },
          onError: (error: any) => {
            reject(new Error(`Payment error: ${error}`));
          }
        }
      );
    });
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    // @ts-ignore
    return !!window?.Pi?.auth?.accessToken;
  }

  async getAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    // @ts-ignore
    return window?.Pi?.auth?.accessToken || null;
  }
}

// Server-side utilities for Pi API calls
export const piApiUtils = {
  async verifyPayment(paymentId: string, accessToken: string) {
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentId, accessToken })
    });
    return response.json();
  },

  async submitPayment(paymentId: string, txid: string, accessToken: string) {
    const response = await fetch('/api/payments/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentId, txid, accessToken })
    });
    return response.json();
  }
};