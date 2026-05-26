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
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PAID
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          FAILED
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full text-xs font-semibold">
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
      glass-card rounded-xl hover:shadow-glass-lg transition-all duration-200
      border-l-4
      ${isPaid ? 'border-l-green-500' : isFailed ? 'border-l-red-500' : 'border-l-[#14D3C5]'}
      ${isPaid ? 'opacity-75' : ''}
    `}>
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header: Merchant Name & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#14D3C5]/20 rounded-lg border border-[#14D3C5]/30">
              <Store className="w-5 h-5 text-[#14D3C5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                {merchantName || 'Merchant'}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-brand-indigo-400">
                <FileText className="w-3.5 h-3.5" />
                {invoice.id}
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Date Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-brand-indigo-300">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Created: {formatDate(invoice.createdAt)}</span>
          </div>
          {invoice.dueDate && isPending && (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Clock className="w-4 h-4" />
              <span>Due: {formatDate(invoice.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Amount & Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-indigo-400 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-white">
              {formatPiAmount(invoice.total)} π
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Expand/Collapse Button */}
            <button
              onClick={toggleExpanded}
              className="p-2 hover:bg-[#14D3C5]/20 rounded-lg transition-colors"
              aria-label={isExpanded ? 'Collapse items' : 'Expand items'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-brand-indigo-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-brand-indigo-300" />
              )}
            </button>

            {/* Pay Now Button (for unpaid invoices) */}
            {!isPaid && !isFailed && (
              <button
                onClick={handlePayment}
                disabled={isProcessingPayment}
                className={`
                  px-6 py-3 font-semibold rounded-lg shadow-glow hover:shadow-glass-lg
                  transition-all duration-200 flex items-center gap-2
                  ${isProcessingPayment
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'btn-cyan text-white'
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
                  px-6 py-3 font-semibold rounded-lg shadow-glow hover:shadow-glass-lg
                  transition-all duration-200 flex items-center gap-2
                  ${isProcessingPayment
                    ? 'bg-gray-600 cursor-not-allowed'
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
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">{paymentError}</p>
          </div>
        )}

        {/* Expandable Items Section */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-brand-indigo-700/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">
                Invoice Items ({invoice.items.length})
              </h4>
              <div className="text-sm text-brand-indigo-300">
                Subtotal: {formatPiAmount(invoice.subtotal)} π
              </div>
            </div>

            <div className="space-y-2">
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-brand-indigo-900/30 rounded-lg border border-brand-indigo-800/30"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {item.productName}
                    </div>
                    <div className="text-sm text-brand-indigo-400">
                      Qty: {item.quantity} × {formatPiAmount(item.unitPrice)} π
                    </div>
                  </div>
                  <div className="font-semibold text-white">
                    {formatPiAmount(item.totalPrice)} π
                  </div>
                </div>
              ))}
            </div>

            {/* Tax & Total Breakdown */}
            <div className="mt-4 space-y-2 pt-4 border-t border-brand-indigo-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-brand-indigo-400">Subtotal</span>
                <span className="font-medium text-brand-indigo-200">{formatPiAmount(invoice.subtotal)} π</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-indigo-400">Tax</span>
                <span className="font-medium text-brand-indigo-200">{formatPiAmount(invoice.tax)} π</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-white">Total</span>
                <span className="text-[#14D3C5]">{formatPiAmount(invoice.total)} π</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Info (for paid invoices) */}
      {isPaid && invoice.piTransactionId && (
        <div className="px-5 pb-5">
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-300 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Paid with Pi Network</span>
            </div>
            <div className="text-xs text-green-400">
              Transaction: {invoice.piTransactionId.slice(0, 16)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
