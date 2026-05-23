'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Invoice } from '@/types/customer';
import { formatPiAmount } from '@/types/customer';

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
      <div className="space-y-6">
        {/* Loading skeletons */}
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">⚠️ Error loading invoices</div>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={fetchInvoices}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unpaid Invoices Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">NEW - PAY NOW</h2>
            {unpaidInvoices.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {unpaidInvoices.length}
              </span>
            )}
          </div>
          <Link
            href={`/customer/invoices?status=pending`}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            View All →
          </Link>
        </div>

        {unpaidInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending invoices</h3>
            <p className="text-gray-600 text-sm">
              You don't have any unpaid invoices at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">RECENTLY PAID</h2>
            {paidInvoices.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {paidInvoices.length}
              </span>
            )}
          </div>
          <Link
            href={`/customer/invoices?status=paid`}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            View All →
          </Link>
        </div>

        {paidInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No paid invoices yet</h3>
            <p className="text-gray-600 text-sm">
              Your paid invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 border-l-purple-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">
              {invoice.merchantName || 'Merchant'}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                isPaid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {isPaid ? 'PAID' : 'PENDING'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{invoice.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{formatDate(invoice.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {formatPiAmount(invoice.total)} π
            </div>

            {!isPaid && (
              <button className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg">
                Pay Now
              </button>
            )}
          </div>

          {invoice.dueDate && !isPaid && (
            <div className="mt-2 text-xs text-gray-500">
              Due: {formatDate(invoice.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
