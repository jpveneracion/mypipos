/**
 * Loyalty Rewards Panel
 * Shows customer loyalty info and allows sending reward payments
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { A2UPaymentButton } from './a2u-payment-button';
import { Gift, TrendingUp, Award, Star } from 'lucide-react';

interface LoyaltyRewardsPanelProps {
  customerId: string;
  customerPiUid: string;
  customerName: string;
  currentPurchaseAmount: number;
}

interface LoyaltyData {
  loyaltyPoints: number;
  totalPurchases: number;
  rewardTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  availableRewards: number;
}

export function LoyaltyRewardsPanel({
  customerId,
  customerPiUid,
  customerName,
  currentPurchaseAmount
}: LoyaltyRewardsPanelProps) {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [customRewardAmount, setCustomRewardAmount] = useState(0);
  const [rewardReason, setRewardReason] = useState('');

  useEffect(() => {
    // Fetch customer loyalty data
    const fetchLoyaltyData = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}/loyalty`);
        const data = await response.json();
        setLoyaltyData(data);
      } catch (error) {
        console.error('Failed to fetch loyalty data:', error);
      }
    };

    fetchLoyaltyData();
  }, [customerId]);

  const calculateLoyaltyReward = () => {
    if (!loyaltyData) return 0;

    // Base reward rate increases with tier
    const baseRates = {
      bronze: 0.02,  // 2%
      silver: 0.03,  // 3%
      gold: 0.05,    // 5%
      platinum: 0.07 // 7%
    };

    const baseRate = baseRates[loyaltyData.rewardTier];
    return currentPurchaseAmount * baseRate;
  };

  const loyaltyRewardAmount = calculateLoyaltyReward();

  const handleRewardSuccess = (result: any) => {
    console.log('Reward sent successfully:', result);
    // Refresh loyalty data
    setRewardReason('');
    setCustomRewardAmount(0);
  };

  const getRewardTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-orange-600';
      case 'silver': return 'text-gray-600';
      case 'gold': return 'text-yellow-600';
      case 'platinum': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getRewardTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      default: return '⭐';
    }
  };

  if (!loyaltyData) {
    return <div>Loading loyalty data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Loyalty Rewards - {customerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Current Tier</p>
            <p className={`text-2xl font-bold ${getRewardTierColor(loyaltyData.rewardTier)}`}>
              {getRewardTierIcon(loyaltyData.rewardTier)} {loyaltyData.rewardTier.charAt(0).toUpperCase() + loyaltyData.rewardTier.slice(1)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Points</p>
            <p className="text-xl font-semibold">{loyaltyData.loyaltyPoints.toLocaleString()}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Total Purchases</p>
              <p className="font-semibold">{loyaltyData.totalPurchases.toFixed(2)} Pi</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Gift className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Available Rewards</p>
              <p className="font-semibold">{loyaltyData.availableRewards.toFixed(2)} Pi</p>
            </div>
          </div>
        </div>

        {/* Automatic Loyalty Reward */}
        {currentPurchaseAmount > 0 && loyaltyRewardAmount > 0 && (
          <div className="border-2 border-dashed border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              Automatic Loyalty Reward
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Based on {loyaltyData.rewardTier} tier, customer qualifies for a <strong>{loyaltyRewardAmount.toFixed(7)} Pi</strong> reward ({(loyaltyRewardAmount / currentPurchaseAmount * 100).toFixed(1)}% cashback)
            </p>
            <A2UPaymentButton
              customerPiUid={customerPiUid}
              amount={loyaltyRewardAmount}
              memo={`Loyalty reward - ${loyaltyData.rewardTier} tier cashback`}
              transactionType="reward"
              onSuccess={handleRewardSuccess}
              onError={(error) => console.error('Reward failed:', error)}
            />
          </div>
        )}

        {/* Custom Reward */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Send Custom Reward</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="custom-amount">Reward Amount (Pi)</Label>
              <Input
                id="custom-amount"
                type="number"
                step="0.0000001"
                min="0.0000001"
                placeholder="0.00"
                value={customRewardAmount || ''}
                onChange={(e) => setCustomRewardAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="reward-reason">Reason</Label>
              <Input
                id="reward-reason"
                placeholder="e.g., Birthday bonus, Thank you for being loyal..."
                value={rewardReason}
                onChange={(e) => setRewardReason(e.target.value)}
              />
            </div>
            <A2UPaymentButton
              customerPiUid={customerPiUid}
              amount={customRewardAmount}
              memo={rewardReason || 'Custom reward from myPiPOS'}
              transactionType="reward"
              onSuccess={handleRewardSuccess}
              onError={(error) => console.error('Custom reward failed:', error)}
              disabled={!customRewardAmount || !rewardReason}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}