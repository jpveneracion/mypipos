/**
 * Refund Modal Component
 * Provides a complete UI for processing refunds with A2U payments
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { A2UPaymentButton } from './a2u-payment-button';
import { AlertCircle, Calculator } from 'lucide-react';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleDetails: {
    id: string;
    transaction_number: string;
    customer_pi_uid: string;
    customer_name: string;
    total_amount: number;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
    }>;
  };
}

export function RefundModal({ isOpen, onClose, saleDetails }: RefundModalProps) {
  const [refundAmount, setRefundAmount] = useState(saleDetails.total_amount);
  const [refundReason, setRefundReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleRefundSuccess = (result: any) => {
    console.log('Refund successful:', result);
    // Refresh sales data, show success message, etc.
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleRefundError = (error: string) => {
    console.error('Refund failed:', error);
    // Show error notification
  };

  const isValidRefund = refundAmount > 0 && refundAmount <= saleDetails.total_amount && refundReason.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Process Refund - Sale #{saleDetails.transaction_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Customer Information</h3>
            <p className="text-sm text-gray-600">Name: {saleDetails.customer_name}</p>
            <p className="text-sm text-gray-600">Pi UID: {saleDetails.customer_pi_uid}</p>
          </div>

          {/* Sale Items */}
          <div>
            <h3 className="font-semibold mb-2">Items Being Refunded</h3>
            <div className="space-y-2">
              {saleDetails.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity} × {item.unit_price} Pi</p>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedItems.includes(item.name) ? "default" : "outline"}
                    onClick={() => {
                      if (selectedItems.includes(item.name)) {
                        setSelectedItems(selectedItems.filter(i => i !== item.name));
                      } else {
                        setSelectedItems([...selectedItems, item.name]);
                      }
                    }}
                  >
                    {selectedItems.includes(item.name) ? 'Selected' : 'Select'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Amount */}
          <div>
            <Label htmlFor="refund-amount">Refund Amount (Pi)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="refund-amount"
                type="number"
                step="0.0000001"
                min="0"
                max={saleDetails.total_amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRefundAmount(saleDetails.total_amount)}
              >
                <Calculator className="h-4 w-4 mr-1" />
                Full Refund
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Maximum refund: {saleDetails.total_amount} Pi
            </p>
          </div>

          {/* Refund Reason */}
          <div>
            <Label htmlFor="refund-reason">Refund Reason *</Label>
            <Textarea
              id="refund-reason"
              placeholder="Please explain why this refund is being processed..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
              className="min-h-[80px]"
            />
          </div>

          {/* Warning Message */}
          {refundAmount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Confirm Refund Details</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You are about to refund {refundAmount} Pi to {saleDetails.customer_name}.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <A2UPaymentButton
              customerPiUid={saleDetails.customer_pi_uid}
              amount={refundAmount}
              memo={`Refund for sale #${saleDetails.transaction_number}: ${refundReason}`}
              transactionType="refund"
              onSuccess={handleRefundSuccess}
              onError={handleRefundError}
              disabled={!isValidRefund}
              className="bg-red-600 hover:bg-red-700"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}