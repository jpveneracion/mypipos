/**
 * Enhanced Sales Action Component
 * Shows practical integration of A2U payments into existing POS workflow
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu';
import {
  MoreVertical,
  RefreshCw,
  Gift,
  DollarSign,
  Award,
  Receipt
} from 'lucide-react';
import { RefundModal } from './refund-modal';
import { LoyaltyRewardsPanel } from './loyalty-rewards-panel';
import { Dialog } from '@/components/ui/Dialog';

interface SaleActionsProps {
  sale: {
    id: string;
    transaction_number: string;
    customer_id: string;
    customer_name: string;
    customer_pi_uid: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
  };
  onActionComplete?: () => void;
}

export function SaleActions({ sale, onActionComplete }: SaleActionsProps) {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRewardsPanel, setShowRewardsPanel] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleQuickRefund = async () => {
    setProcessingAction('refund');
    try {
      // Quick full refund without confirmation (for small amounts)
      const response = await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: sale.customer_pi_uid,
          amount: sale.total_amount,
          memo: `Quick refund for sale #${sale.transaction_number}`,
          transaction_type: 'refund',
          metadata: {
            original_sale_id: sale.id,
            refund_type: 'quick_full_refund'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Quick refund processed:', result);
        onActionComplete?.();
      } else {
        console.error('Refund failed:', result.error);
      }
    } catch (error) {
      console.error('Quick refund error:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const sendThankYouReward = async () => {
    setProcessingAction('reward');
    try {
      const rewardAmount = Math.max(0.1, sale.total_amount * 0.01); // 1% or minimum 0.1 Pi

      const response = await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: sale.customer_pi_uid,
          amount: rewardAmount,
          memo: `Thank you for your purchase! Here's a small reward 🎁`,
          transaction_type: 'reward',
          metadata: {
            reward_type: 'thank_you_bonus',
            original_sale_id: sale.id
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Thank you reward sent:', result);
        onActionComplete?.();
      }
    } catch (error) {
      console.error('Reward error:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const canQuickRefund = sale.total_amount < 5; // Only allow quick refund for amounts under 5 Pi

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Refund Options */}
          <DropdownMenuItem onClick={() => setShowRefundModal(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Process Refund
          </DropdownMenuItem>

          {canQuickRefund && (
            <DropdownMenuItem
              onClick={handleQuickRefund}
              disabled={processingAction === 'refund'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {processingAction === 'refund' ? 'Processing...' : 'Quick Refund'}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Reward Options */}
          <DropdownMenuItem onClick={() => setShowRewardsPanel(true)}>
            <Gift className="h-4 w-4 mr-2" />
            Send Reward
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={sendThankYouReward}
            disabled={processingAction === 'reward'}
          >
            <Award className="h-4 w-4 mr-2" />
            {processingAction === 'reward' ? 'Sending...' : 'Send Thank You Bonus'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Other Actions */}
          <DropdownMenuItem>
            <Receipt className="h-4 w-4 mr-2" />
            View Receipt
          </DropdownMenuItem>

          <DropdownMenuItem>
            <DollarSign className="h-4 w-4 mr-2" />
            Sale Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          saleDetails={{
            id: sale.id,
            transaction_number: sale.transaction_number,
            customer_pi_uid: sale.customer_pi_uid,
            customer_name: sale.customer_name,
            total_amount: sale.total_amount,
            items: [] // You'd fetch the actual items from the sale
          }}
        />
      </Dialog>

      {/* Rewards Panel */}
      <Dialog open={showRewardsPanel} onOpenChange={setShowRewardsPanel}>
        <LoyaltyRewardsPanel
          customerId={sale.customer_id}
          customerPiUid={sale.customer_pi_uid}
          customerName={sale.customer_name}
          currentPurchaseAmount={0} // This would be for new purchases, not existing sales
        />
      </Dialog>
    </>
  );
}

// Example of how to use this in a sales table
export function SalesTable({ sales }: { sales: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Transaction #</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sales.map(sale => (
          <tr key={sale.id}>
            <td>{sale.transaction_number}</td>
            <td>{sale.customer_name}</td>
            <td>{sale.total_amount} Pi</td>
            <td>{new Date(sale.created_at).toLocaleDateString()}</td>
            <td>
              <SaleActions
                sale={sale}
                onActionComplete={() => {
                  // Refresh the sales table
                  console.log('Action completed, refreshing table...');
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}