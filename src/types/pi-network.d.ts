/**
 * Pi Network SDK Type Declarations
 */

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string }) => Promise<void>;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: any) => void
      ) => Promise<{
        accessToken: string;
        user: {
          uid: string;
          username: string;
        };
      }>;
      createPayment: (
        payment: any,
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onApproved: (paymentId: string) => void;
          onIncomplete: (paymentId: string, error: any) => void;
          onCancelled: (paymentId: string) => void;
          onError: (error: any) => void;
        }
      ) => void;
    };
  }
}

export {};