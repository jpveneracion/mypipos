/**
 * A2U Payment Button Component
 * Can be used in various POS contexts for refunds, rewards, etc.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react';

interface A2UPaymentButtonProps {
  customerPiUid: string;
  amount: number;
  memo: string;
  transactionType: 'merchant_payout' | 'customer_refund' | 'customer_reward' | 'staff_payout' | 'affiliate_payout' | 'platform_payout';
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function A2UPaymentButton({
  customerPiUid,
  amount,
  memo,
  transactionType,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: A2UPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const processA2UPayment = async () => {
    setIsProcessing(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: customerPiUid,
          amount,
          memo,
          transaction_type: transactionType,
          metadata: {
            timestamp: Date.now(),
            source: 'pos_interface'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        onSuccess?.(result);

        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        onError?.(result.error || 'Payment failed');

        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      setStatus('error');
      onError?.(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing) {
      return 'Processing...';
    }

    switch (transactionType) {
      case 'customer_refund':
        return 'Process Refund';
      case 'customer_reward':
        return 'Send Reward';
      case 'merchant_payout':
        return 'Pay Merchant';
      case 'staff_payout':
        return 'Pay Staff';
      case 'affiliate_payout':
        return 'Pay Affiliate';
      case 'platform_payout':
        return 'Send Payment';
      default:
        return 'Send Payment';
    }
  };

  return (
    <Button
      onClick={processA2UPayment}
      disabled={disabled || isProcessing || amount <= 0}
      className={`${className} ${status === 'success' ? 'bg-green-600' : status === 'error' ? 'bg-red-600' : ''}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Payment Sent!
        </>
      ) : status === 'error' ? (
        <>
          <XCircle className="mr-2 h-4 w-4" />
          Failed - Try Again
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          {getButtonText()}
        </>
      )}
    </Button>
  );
}