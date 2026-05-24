'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, ShoppingCart, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';

// Types for U2A checkout
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  pi_uid: string;
  username: string;
}

interface U2ACheckoutComponentProps {
  cartItems: CartItem[];
  customer: Customer;
  merchantId: string;
  onComplete?: (sale: any) => void;
  onError?: (error: string) => void;
}

type CheckoutStep = 'idle' | 'requesting' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function U2ACheckoutFlow({ cartItems, customer, merchantId, onComplete, onError }: U2ACheckoutComponentProps) {
  const [currentStep, setStep] = useState<CheckoutStep>('idle');
  const [paymentId, setPaymentId] = useState<string>('');
  const [txid, setTxid] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [transactionNumber, setTransactionNumber] = useState<string>('');

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Timer for payment expiration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 'pending_approval' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setStep('failed');
            setError('Payment expired. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, timeRemaining]);

  // Generate transaction number
  const generateTransactionNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SALE-${timestamp}-${random}`;
  };

  // Main checkout handler
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty');
      return;
    }

    setStep('requesting');
    setError('');

    try {
      // Step 0: Create transaction number first
      const txnNumber = generateTransactionNumber();
      setTransactionNumber(txnNumber);

      // Step 1: Create sale record with items in database FIRST
      // **THIS IS WHERE ITEMS GET STORED IN DATABASE**
      const saleResponse = await fetch('/api/sales/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cartItems,
          customer: customer,
          merchantId: merchantId,
          transactionNumber: txnNumber
        })
      });

      if (!saleResponse.ok) {
        const errorData = await saleResponse.json();
        throw new Error(errorData.error || 'Failed to create sale record');
      }

      const saleResult = await saleResponse.json();
      console.log('Sale created with items:', saleResult.sale.id);

      const Pi = (window as any).Pi;

      if (!Pi) {
        throw new Error('Pi Network SDK not available. Please ensure you are using the Pi Browser.');
      }

      // Prepare payment metadata
      const paymentMetadata = {
        transaction_number: txnNumber,
        items: cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customer_id: customer.id,
        customer_name: customer.name,
        merchant_id: merchantId,
        checkout_timestamp: Date.now(),
        subtotal,
        tax,
        total
      };

      // Step 1: Create payment via Pi SDK
      const payment = await Pi.createPayment({
        amount: total.toFixed(7),
        memo: `Purchase at myPiPOS - ${cartItems.length} items`,
        metadata: paymentMetadata
      }, {
        // Step 2: Payment ready for server approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for approval:', paymentId);
          setPaymentId(paymentId);
          setStep('pending_approval');
          setTimeRemaining(1800); // 30 minutes

          try {
            // Approve payment on backend
            const response = await fetch('/api/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId,
                transactionNumber: txnNumber
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Payment approval failed');
            }

            const result = await response.json();
            console.log('Payment approved:', result);
          } catch (error) {
            console.error('Approval error:', error);
            setStep('failed');
            setError(error instanceof Error ? error.message : 'Payment approval failed');
          }
        },

        // Step 3: Payment approved by blockchain
        onApproved: async (approvedPaymentId: string, approvedTxid: string) => {
          console.log('Payment approved:', approvedPaymentId, approvedTxid);
          setStep('approved');
          setTxid(approvedTxid);

          try {
            // Complete payment on backend
            const response = await fetch('/api/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: approvedPaymentId,
                txid: approvedTxid,
                transactionNumber: txnNumber
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Payment completion failed');
            }

            const result = await response.json();
            console.log('Payment completed:', result);
            setStep('completed');

            if (onComplete) {
              onComplete(result.sale);
            }
          } catch (error) {
            console.error('Completion error:', error);
            setStep('failed');
            setError(error instanceof Error ? error.message : 'Payment completion failed');
          }
        },

        // Step 4: Payment fully completed
        onComplete: (completedPaymentId: string, completedTxid: string) => {
          console.log('Payment complete:', completedPaymentId, completedTxid);
          setStep('completed');
          setTxid(completedTxid);
        },

        // Payment cancelled
        onCancelled: (cancelledPaymentId: string) => {
          console.log('Payment cancelled:', cancelledPaymentId);
          setStep('cancelled');
          setError('Payment was cancelled by user');
        },

        // Payment error
        onError: (error: any, payment?: any) => {
          console.error('Payment error:', error, payment);
          setStep('failed');
          setError(error.message || 'Payment failed');
        }
      });

    } catch (error) {
      console.error('Checkout error:', error);
      setStep('failed');
      setError(error instanceof Error ? error.message : 'Checkout failed');
      if (onError) {
        onError(error instanceof Error ? error.message : 'Checkout failed');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepInfo = () => {
    switch (currentStep) {
      case 'requesting':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin text-blue-600" />,
          title: 'Initializing Payment...',
          description: 'Creating payment request via Pi Network',
          color: 'bg-blue-50 text-blue-800 border-blue-200'
        };
      case 'pending_approval':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-600" />,
          title: 'Awaiting Payment Approval',
          description: `Please approve the payment in Pi Browser. Time remaining: ${formatTime(timeRemaining)}`,
          color: 'bg-yellow-50 text-yellow-800 border-yellow-200'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: 'Payment Approved',
          description: 'Payment approved! Completing transaction...',
          color: 'bg-green-50 text-green-800 border-green-200'
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin text-purple-600" />,
          title: 'Processing Payment',
          description: 'Finalizing blockchain transaction...',
          color: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: 'Payment Successful!',
          description: `Transaction ${transactionNumber} completed successfully`,
          color: 'bg-green-50 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-6 w-6 text-red-600" />,
          title: 'Payment Failed',
          description: error || 'An error occurred during payment processing',
          color: 'bg-red-50 text-red-800 border-red-200'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="h-6 w-6 text-gray-600" />,
          title: 'Payment Cancelled',
          description: 'Payment was cancelled by user',
          color: 'bg-gray-50 text-gray-800 border-gray-200'
        };
      default:
        return null;
    }
  };

  const stepInfo = getStepInfo();
  const isProcessing = ['requesting', 'pending_approval', 'approved', 'processing'].includes(currentStep);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          U2A Checkout Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium">Customer: {customer.name}</p>
          <p className="text-sm text-gray-600">@{customer.username}</p>
        </div>

        {/* Order Summary */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Order Summary
          </h3>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.price * item.quantity).toFixed(7)} Pi</span>
              </div>
            ))}

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(7)} Pi</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (8%)</span>
                <span>{tax.toFixed(7)} Pi</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{total.toFixed(7)} Pi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {stepInfo && currentStep !== 'idle' && (
          <div className={`p-4 rounded-lg border ${stepInfo.color}`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{stepInfo.icon}</div>
              <div className="flex-1">
                <p className="font-medium">{stepInfo.title}</p>
                <p className="text-sm mt-1">{stepInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Number (shown after completion) */}
        {currentStep === 'completed' && transactionNumber && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-medium text-green-800">Transaction Number</p>
            <p className="text-lg font-mono text-green-900">{transactionNumber}</p>
          </div>
        )}

        {/* Checkout Button */}
        <Button
          onClick={handleCheckout}
          disabled={isProcessing || cartItems.length === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {currentStep === 'requesting' && 'Initializing...'}
              {currentStep === 'pending_approval' && 'Awaiting Approval...'}
              {currentStep === 'approved' && 'Completing...'}
              {currentStep === 'processing' && 'Processing...'}
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Pay {total.toFixed(7)} Pi
            </>
          )}
        </Button>

        {/* Retry Button (on failure) */}
        {(currentStep === 'failed' || currentStep === 'cancelled') && (
          <Button
            onClick={() => {
              setStep('idle');
              setError('');
              setPaymentId('');
              setTxid('');
            }}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        )}

        {/* Info Text */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>U2A = User-to-App (Customer → Platform payment)</p>
          <p>Payment will be processed via Pi Network</p>
        </div>
      </CardContent>
    </Card>
  );
}