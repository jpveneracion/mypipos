'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  QRCode,
  ShoppingCart,
  Scan,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  User,
  Package
} from 'lucide-react';

interface Customer {
  id: string;
  username: string;
  pi_uid: string;
  name: string;
}

interface InvoiceItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface DraftInvoice {
  id: string;
  invoiceNumber: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

export function QRCodeInvoiceWorkflow({ merchantId, registerId }: { merchantId: string; registerId: string }) {
  const [workflow, setWorkflow] = useState<'idle' | 'scanning_qr' | 'scanning_items' | 'finalizing' | 'completed'>('idle');
  const [currentInvoice, setCurrentInvoice] = useState<DraftInvoice | null>(null);
  const [lastScannedItem, setLastScannedItem] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Step 1: Scan customer QR code
  const handleCustomerQRScan = async (customerPiUid: string) => {
    setWorkflow('scanning_qr');
    setError('');

    try {
      const response = await fetch('/api/pos/scan-customer-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPiUid,
          merchantId,
          registerId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setCurrentInvoice({
        ...data.invoice,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
      });

      setWorkflow('scanning_items');
      setSuccessMessage(`✅ Customer linked: ${data.invoice.customer.username}`);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to link customer');
      setWorkflow('idle');
    }
  };

  // Step 2: Scan items and add to invoice
  const handleItemScan = async (productData: any) => {
    if (!currentInvoice) {
      setError('Please scan customer QR code first');
      return;
    }

    try {
      const response = await fetch('/api/pos/scan-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: currentInvoice.id,
          productId: productData.id,
          productName: productData.name,
          quantity: productData.quantity || 1,
          price: productData.price,
          merchantId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Update invoice with new item and totals
      setCurrentInvoice({
        ...currentInvoice,
        items: [...currentInvoice.items, data.item],
        itemCount: data.invoice.itemCount,
        subtotal: data.invoice.subtotal,
        tax: data.invoice.tax,
        total: data.invoice.total
      });

      setLastScannedItem(`+ ${data.item.quantity}x ${data.item.productName} (${data.item.total.toFixed(7)} Pi)`);
      setSuccessMessage(data.message);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add item');
    }
  };

  // Step 3: Finalize invoice after last item
  const handleFinalizeInvoice = async () => {
    if (!currentInvoice || currentInvoice.items.length === 0) {
      setError('No items in invoice');
      return;
    }

    setWorkflow('finalizing');
    setError('');

    try {
      const response = await fetch('/api/pos/finalize-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: currentInvoice.id,
          merchantId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // **TRIGGER IMMEDIATE PAYMENT** since customer is present
      setSuccessMessage('✅ Invoice finalized! Pushing to dashboard & initiating payment...');

      // **STEP 4: INVOICE NOW IN CUSTOMER DASHBOARD AS "PENDING"**
      // Customer can see it, but we also trigger immediate payment
      console.log('Invoice pushed to dashboard as PENDING:', data.invoice.invoiceNumber);
      console.log('Customer can see invoice with "Pay Now" button');

      // **STEP 5: TRIGGER IMMEDIATE PAYMENT** (customer is physically present)
      const Pi = (window as any).Pi;

      if (!Pi) {
        throw new Error('Pi Network SDK not available');
      }

      // Create payment - customer approves immediately on their phone
      const payment = await Pi.createPayment({
        amount: data.invoice.payment.amount.toFixed(7),
        memo: data.invoice.payment.memo,
        metadata: data.invoice.payment.metadata
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for approval:', paymentId);
          setSuccessMessage('📱 Customer: Please approve payment on your phone...');

          // Approve payment on backend
          await fetch('/api/payments/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              transactionNumber: data.invoice.invoiceNumber
            })
          });
        },

        onApproved: async (paymentId: string, txid: string) => {
          console.log('Payment approved:', paymentId, txid);
          setSuccessMessage('✅ Payment approved! Finalizing...');

          // Complete payment
          await fetch('/api/payments/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              txid,
              transactionNumber: data.invoice.invoiceNumber
            })
          });
        },

        onComplete: (paymentId: string, txid: string) => {
          console.log('Payment complete!', paymentId, txid);

          // **STEP 6: INVOICE NOW SHOWS AS "PAID" IN CUSTOMER DASHBOARD**
          setWorkflow('completed');
          setCurrentInvoice({
            ...currentInvoice,
            ...data.invoice,
            status: 'completed',
            paymentStatus: 'paid'
          });

          setSuccessMessage(`✅ ${data.invoice.message}`);
        },

        onCancelled: (paymentId: string) => {
          setError('Payment cancelled by customer');
          setSuccessMessage('Invoice is pending in customer dashboard');
          setWorkflow('completed');
        },

        onError: (error: any) => {
          console.error('Payment error:', error);
          setError(error.message || 'Payment failed');
          setSuccessMessage('Invoice is pending in customer dashboard');
          setWorkflow('completed');
        }
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to finalize invoice');
      setWorkflow('scanning_items');
    }
  };

  // Reset workflow
  const handleReset = () => {
    setWorkflow('idle');
    setCurrentInvoice(null);
    setLastScannedItem('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Invoice Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Workflow Steps */}
          <div className="flex items-center justify-between mb-6">
            {[
              { step: 'scanning_qr', icon: User, label: 'Scan Customer QR' },
              { step: 'scanning_items', icon: Package, label: 'Scan Items' },
              { step: 'finalizing', icon: CheckCircle, label: 'Finalize & Push' },
              { step: 'completed', icon: CheckCircle, label: 'Completed' }
            ].map((stepInfo, index) => {
              const isActive = workflow === stepInfo.step;
              const isCompleted = workflow === 'completed';
              const isCurrentStep = Object.values({
                scanning_qr: 0,
                scanning_items: 1,
                finalizing: 2,
                completed: 3
              })[workflow] === index;

              return (
                <div key={stepInfo.step} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                  `}>
                    <stepInfo.icon className="h-6 w-6" />
                  </div>
                  <div className="text-xs text-center mt-2 max-w-25">
                    {stepInfo.label}
                  </div>
                  {index < 3 && (
                    <div className={`
                      h-1 w-16 mt-6 -mb-6
                      ${isCurrentStep ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Invoice Info */}
          {currentInvoice && workflow !== 'idle' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-blue-800">Invoice</div>
                  <div className="font-bold text-blue-900">{currentInvoice.invoiceNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-800">Customer</div>
                  <div className="font-semibold text-blue-900">{currentInvoice.customer.username}</div>
                </div>
              </div>

              {currentInvoice.items.length > 0 && (
                <div className="text-sm text-blue-700">
                  <div className="font-semibold">Items: {currentInvoice.items.length}</div>
                  <div>Total: {currentInvoice.total.toFixed(7)} Pi</div>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          {/* Last Scanned Item */}
          {lastScannedItem && workflow === 'scanning_items' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 animate-pulse">
              <div className="flex items-center gap-2 text-yellow-800 font-medium">
                <Plus className="h-4 w-4" />
                {lastScannedItem}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {workflow === 'idle' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Start New Invoice</h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan customer's QR code to link invoice and start scanning items
            </p>

            {/* Integration with your existing QR scanner */}
            <Button
              onClick={() => {
                // This would trigger your existing QR scanner
                // When QR code is scanned, call handleCustomerQRScan(scannedData)
                console.log('Launch QR scanner...');
              }}
              className="w-full"
            >
              <QRCode className="mr-2 h-4 w-4" />
              Scan Customer QR Code
            </Button>
          </CardContent>
        </Card>
      )}

      {workflow === 'scanning_items' && currentInvoice && (
        <Card>
          <CardHeader>
            <CardTitle>Scanning Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Invoice Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Current Invoice</h4>
              <div className="space-y-1 text-sm">
                <div>Items: {currentInvoice.items.length}</div>
                <div>Subtotal: {currentInvoice.subtotal.toFixed(7)} Pi</div>
                <div>Tax: {currentInvoice.tax.toFixed(7)} Pi</div>
                <div className="font-bold text-lg">Total: {currentInvoice.total.toFixed(7)} Pi</div>
              </div>
            </div>

            {/* Items List */}
            {currentInvoice.items.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Scanned Items</h4>
                <div className="space-y-2">
                  {currentInvoice.items.map((item, index) => (
                    <div key={item.id} className="flex justify-between text-sm p-2 bg-white border rounded">
                      <span>{index + 1}. {item.productName} × {item.quantity}</span>
                      <span className="font-medium">{item.totalPrice.toFixed(7)} Pi</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalizeInvoice}
                disabled={currentInvoice.items.length === 0}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalize & Push to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {workflow === 'completed' && currentInvoice && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                Invoice Completed!
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-900 font-semibold mb-2">
                  {currentInvoice.invoiceNumber}
                </p>
                <p className="text-sm text-green-700">
                  Total: {currentInvoice.total.toFixed(7)} Pi
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                ✅ Pushed to <strong>{currentInvoice.customer.username}</strong>'s dashboard
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Customer can now pay from their dashboard
              </p>
              <Button onClick={handleReset} className="w-full">
                Start New Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}