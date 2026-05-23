'use client';

import { useState } from 'react';
import { Invoice, InvoiceItem } from '@/types/customer';
import { formatPiAmount } from '@/types/customer';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Store,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface InvoiceCardProps {
  invoice: Invoice;
  merchantName?: string;
  onPaymentInitiated?: (invoiceId: string) => void;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export default function InvoiceCard({ invoice, merchantName, onPaymentInitiated }: InvoiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const isPaid = invoice.paymentStatus === 'paid';
  const isPending = invoice.paymentStatus === 'pending';
  const isFailed = invoice.paymentStatus === 'failed';

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PAID
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          FAILED
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" />
        PENDING
      </div>
    );
  };

  const handlePayment = async () => {
    if (isPaid || isProcessingPayment) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // TODO: Replace with actual payment API endpoint
      const response = await fetch('/api/payments/pi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          merchantId: invoice.merchantId,
        }),
      });

      const data: PaymentResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Notify parent component of successful payment initiation
      if (onPaymentInitiated) {
        onPaymentInitiated(invoice.id);
      }

      // TODO: Handle Pi Network payment flow
      // This would typically open Pi Network SDK or redirect
      console.log('Payment initiated:', data.paymentId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
      setPaymentError(errorMessage);
      console.error('Payment error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`
      bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200
      border-l-4
      ${isPaid ? 'border-l-green-500' : isFailed ? 'border-l-red-500' : 'border-l-purple-500'}
      ${isPaid ? 'opacity-75' : ''}
    `}>
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header: Merchant Name & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {merchantName || 'Merchant'}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <FileText className="w-3.5 h-3.5" />
                {invoice.id}
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Date Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Created: {formatDate(invoice.createdAt)}</span>
          </div>
          {invoice.dueDate && isPending && (
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Clock className="w-4 h-4" />
              <span>Due: {formatDate(invoice.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Amount & Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatPiAmount(invoice.total)} π
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Expand/Collapse Button */}
            <button
              onClick={toggleExpanded}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isExpanded ? 'Collapse items' : 'Expand items'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Pay Now Button (for unpaid invoices) */}
            {!isPaid && !isFailed && (
              <button
                onClick={handlePayment}
                disabled={isProcessingPayment}
                className={`
                  px-6 py-3 font-semibold rounded-lg shadow-md hover:shadow-lg
                  transition-all duration-200 flex items-center gap-2
                  ${isProcessingPayment
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                `}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            )}

            {/* Retry Button (for failed invoices) */}
            {isFailed && (
              <button
                onClick={handlePayment}
                disabled={isProcessingPayment}
                className={`
                  px-6 py-3 font-semibold rounded-lg shadow-md hover:shadow-lg
                  transition-all duration-200 flex items-center gap-2
                  ${isProcessingPayment
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  }
                `}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Retry Payment'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Payment Error Message */}
        {paymentError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{paymentError}</p>
          </div>
        )}

        {/* Expandable Items Section */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">
                Invoice Items ({invoice.items.length})
              </h4>
              <div className="text-sm text-gray-600">
                Subtotal: {formatPiAmount(invoice.subtotal)} π
              </div>
            </div>

            <div className="space-y-2">
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Qty: {item.quantity} × {formatPiAmount(item.unitPrice)} π
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatPiAmount(item.totalPrice)} π
                  </div>
                </div>
              ))}
            </div>

            {/* Tax & Total Breakdown */}
            <div className="mt-4 space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPiAmount(invoice.subtotal)} π</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatPiAmount(invoice.tax)} π</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-purple-600">{formatPiAmount(invoice.total)} π</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Info (for paid invoices) */}
      {isPaid && invoice.piTransactionId && (
        <div className="px-5 pb-5">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Paid with Pi Network</span>
            </div>
            <div className="text-xs text-green-600">
              Transaction: {invoice.piTransactionId.slice(0, 16)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
