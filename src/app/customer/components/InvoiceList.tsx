'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Invoice } from '@/types/customer';
import { formatPiAmount } from '@/types/customer';
import { Button } from '@/components/ui/Button';

interface InvoiceListProps {
  username: string;
}

interface InvoiceResponse {
  id: string;
  merchantId: string;
  merchantName?: string;
  total: number;
  status: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  dueDate?: string;
}

interface ApiResponse {
  success: boolean;
  invoices?: InvoiceResponse[];
  error?: string;
}

export default function InvoiceList({ username }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [username]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/${username}/invoices`);

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data: ApiResponse = await response.json();

      if (!data.success || !data.invoices) {
        throw new Error(data.error || 'Failed to fetch invoices');
      }

      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unpaidInvoices = invoices.filter(inv => inv.paymentStatus === 'pending');
  const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Loading skeletons */}
        <div className="animate-pulse">
          <div className="h-6 bg-oceanic-200 dark:bg-oceanic-800 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glassmorphism rounded-2xl p-6">
                <div className="h-4 bg-oceanic-200 dark:bg-oceanic-800 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-oceanic-200 dark:bg-oceanic-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-6 bg-oceanic-200 dark:bg-oceanic-800 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glassmorphism rounded-2xl p-6">
                <div className="h-4 bg-oceanic-200 dark:bg-oceanic-800 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-oceanic-200 dark:bg-oceanic-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-2xl p-8 text-center">
        <div className="text-error-600 dark:text-error-400 mb-2 text-4xl">⚠️</div>
        <p className="text-error-700 dark:text-error-300 font-semibold mb-2">Error loading invoices</p>
        <p className="text-error-600 dark:text-error-400 text-sm mb-4">{error}</p>
        <Button
          variant="destructive"
          onClick={fetchInvoices}
          className="shadow-glass"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unpaid Invoices Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-error-100 to-red-100 dark:from-error-900/30 dark:to-red-900/30 rounded-xl flex items-center justify-center text-lg">
              💳
            </div>
            <h2 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">PAY NOW</h2>
            {unpaidInvoices.length > 0 && (
              <span className="px-3 py-1 bg-linear-to-r from-error-500 to-red-600 text-white text-xs font-bold rounded-full shadow-glass">
                {unpaidInvoices.length}
              </span>
            )}
          </div>
          <Link
            href={`/customer/invoices?status=pending`}
            className="text-oceanic-600 dark:text-oceanic-400 hover:text-oceanic-900 dark:hover:text-oceanic-100 font-medium text-sm transition-colors"
          >
            View All →
          </Link>
        </div>

        {unpaidInvoices.length === 0 ? (
          <div className="glassmorphism rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">No pending invoices</h3>
            <p className="text-oceanic-600 dark:text-oceanic-400">
              You don't have any unpaid invoices at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unpaidInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                isPaid={false}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Paid Invoices Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-success-100 to-emerald-100 dark:from-success-900/30 dark:to-emerald-900/30 rounded-xl flex items-center justify-center text-lg">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">RECENTLY PAID</h2>
            {paidInvoices.length > 0 && (
              <span className="px-3 py-1 bg-linear-to-r from-success-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-glass">
                {paidInvoices.length}
              </span>
            )}
          </div>
          <Link
            href={`/customer/invoices?status=paid`}
            className="text-oceanic-600 dark:text-oceanic-400 hover:text-oceanic-900 dark:hover:text-oceanic-100 font-medium text-sm transition-colors"
          >
            View All →
          </Link>
        </div>

        {paidInvoices.length === 0 ? (
          <div className="glassmorphism rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">No paid invoices yet</h3>
            <p className="text-oceanic-600 dark:text-oceanic-400">
              Your paid invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paidInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                isPaid={true}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface InvoiceCardProps {
  invoice: InvoiceResponse;
  isPaid: boolean;
  formatDate: (date: string) => string;
}

function InvoiceCard({ invoice, isPaid, formatDate }: InvoiceCardProps) {
  return (
    <div className="glassmorphism rounded-2xl p-6 hover:shadow-glass transition-all duration-300 border-l-4 border-l-oceanic-500 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center">
              🏪
            </div>
            <div>
              <h3 className="font-bold text-oceanic-900 dark:text-oceanic-100">
                {invoice.merchantName || 'Merchant'}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-bold rounded-full ${
                  isPaid
                    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                    : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                }`}
              >
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-oceanic-600 dark:text-oceanic-400 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">{invoice.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(invoice.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
              {formatPiAmount(invoice.total)} π
            </div>

            {!isPaid && (
              <Button
                variant="primary"
                className="bg-linear-to-r from-warning-500 to-amber-600 hover:from-warning-600 hover:to-amber-700 shadow-glass hover:shadow-glass-lg transform hover:scale-105 transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Pay Now
                </span>
              </Button>
            )}
          </div>

          {invoice.dueDate && !isPaid && (
            <div className="mt-3 text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">
              Due: {formatDate(invoice.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
