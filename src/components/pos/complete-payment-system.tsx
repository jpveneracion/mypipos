/**
 * Complete myPiPOS Payment System
 * Shows both U2A (customer checkout) and A2U (merchant refunds) in action
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowRightLeft,
  ShoppingCart,
  RefreshCw,
  Gift,
  TrendingUp,
  Wallet,
  Store,
  User
} from 'lucide-react';

interface PaymentFlowDemoProps {
  merchantBalance: number;
  customerBalance: number;
}

export function PaymentFlowDemo({ merchantBalance, customerBalance }: PaymentFlowDemoProps) {
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    type: 'U2A' | 'A2U';
    from: string;
    to: string;
    amount: number;
    description: string;
    timestamp: Date;
  }>>([]);

  const [currentMerchantBalance, setCurrentMerchantBalance] = useState(merchantBalance);
  const [currentCustomerBalance, setCurrentCustomerBalance] = useState(customerBalance);

  const simulateU2APayment = async () => {
    // Simulate customer purchasing items
    const purchaseAmount = Math.random() * 10 + 5; // Random purchase 5-15 Pi

    const transaction = {
      id: `txn-${Date.now()}-u2a`,
      type: 'U2A' as const,
      from: 'Customer Wallet',
      to: 'Merchant Wallet',
      amount: purchaseAmount,
      description: 'Purchase at myPiPOS - 3 items',
      timestamp: new Date()
    };

    // Update balances
    setCurrentCustomerBalance(prev => prev - purchaseAmount);
    setCurrentMerchantBalance(prev => prev + purchaseAmount);

    setTransactions(prev => [transaction, ...prev]);
  };

  const simulateA2UPayment = async () => {
    // Simulate merchant sending refund/reward
    const refundAmount = Math.random() * 3 + 1; // Random refund 1-4 Pi

    const transaction = {
      id: `txn-${Date.now()}-a2u`,
      type: 'A2U' as const,
      from: 'Merchant Wallet',
      to: 'Customer Wallet',
      amount: refundAmount,
      description: 'Refund for returned item',
      timestamp: new Date()
    };

    // Update balances
    setCurrentMerchantBalance(prev => prev - refundAmount);
    setCurrentCustomerBalance(prev => prev + refundAmount);

    setTransactions(prev => [transaction, ...prev]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Wallet Balances */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Real-Time Wallet Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Customer Wallet */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-blue-600" />
                Customer Wallet
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {currentCustomerBalance.toFixed(7)} Pi
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  {currentCustomerBalance < customerBalance ? (
                    <span className="text-red-600">
                      ↓ {(customerBalance - currentCustomerBalance).toFixed(7)} Pi spent
                    </span>
                  ) : (
                    <span className="text-green-600">
                      ↑ {(currentCustomerBalance - customerBalance).toFixed(7)} Pi received
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Merchant Wallet */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Store className="h-5 w-5 text-green-600" />
                Merchant Wallet
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {currentMerchantBalance.toFixed(7)} Pi
                </p>
                <p className="text-sm text-green-800 mt-1">
                  {currentMerchantBalance > merchantBalance ? (
                    <span className="text-green-600">
                      ↑ {(currentMerchantBalance - merchantBalance).toFixed(7)} Pi received
                    </span>
                  ) : (
                    <span className="text-red-600">
                      ↓ {(merchantBalance - currentMerchantBalance).toFixed(7)} Pi sent
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* U2A Payment Flow - Customer Checkout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            U2A Checkout
          </CardTitle>
          <p className="text-sm text-gray-600">Customer pays for items</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Flow Diagram */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-blue-600" />
              <span>Customer</span>
            </div>
            <ArrowRightLeft className="h-4 w-4 text-green-600" />
            <div className="flex items-center gap-1">
              <Store className="h-4 w-4 text-green-600" />
              <span>Merchant</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="font-medium text-blue-800 mb-1">How it works:</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>1. Customer selects items</li>
              <li>2. Customer approves payment</li>
              <li>3. Payment goes to merchant</li>
              <li>4. Merchant receives funds</li>
            </ul>
          </div>

          <Button
            onClick={simulateU2APayment}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Simulate Purchase
          </Button>

          <div className="text-xs text-gray-600">
            <p><strong>Use Cases:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• Customer purchases items</li>
              <li>• Normal checkout flow</li>
              <li>• Customer → Merchant</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No transactions yet.<br />
              Simulate a payment to see the flow!
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded-lg border-2 ${
                    tx.type === 'U2A'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={tx.type === 'U2A' ? 'default' : 'secondary'}
                      className={tx.type === 'U2A' ? 'bg-blue-600' : 'bg-green-600'}
                    >
                      {tx.type}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {tx.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{tx.from}</span>
                    <ArrowRightLeft className="h-3 w-3" />
                    <span className="font-medium">{tx.to}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600">{tx.description}</span>
                    <span className={`font-bold ${
                      tx.type === 'U2A' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {tx.amount.toFixed(7)} Pi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* A2U Payment Flow - Refunds/Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            A2U Refunds/Rewards
          </CardTitle>
          <p className="text-sm text-gray-600">Merchant sends to customer</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Flow Diagram */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Store className="h-4 w-4 text-green-600" />
              <span>Merchant</span>
            </div>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-blue-600" />
              <span>Customer</span>
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded text-sm">
            <p className="font-medium text-green-800 mb-1">How it works:</p>
            <ul className="text-green-700 space-y-1 text-xs">
              <li>1. Customer returns item</li>
              <li>2. Merchant processes refund</li>
              <li>3. Payment sent to customer</li>
              <li>4. Customer receives funds</li>
            </ul>
          </div>

          <Button
            onClick={simulateA2UPayment}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Simulate Refund
          </Button>

          <div className="text-xs text-gray-600">
            <p><strong>Use Cases:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• Process refunds</li>
              <li>• Send loyalty rewards</li>
              <li>• Merchant → Customer</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Payment Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-800 mb-1">Total Purchases</div>
              <div className="text-2xl font-bold text-blue-600">
                {transactions.filter(tx => tx.type === 'U2A').length}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {transactions
                  .filter(tx => tx.type === 'U2A')
                  .reduce((sum, tx) => sum + tx.amount, 0)
                  .toFixed(7)} Pi received
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-800 mb-1">Total Refunds</div>
              <div className="text-2xl font-bold text-green-600">
                {transactions.filter(tx => tx.type === 'A2U').length}
              </div>
              <div className="text-xs text-green-700 mt-1">
                {transactions
                  .filter(tx => tx.type === 'A2U')
                  .reduce((sum, tx) => sum + tx.amount, 0)
                  .toFixed(7)} Pi sent
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-800 mb-1">Net Revenue</div>
              <div className="text-2xl font-bold text-purple-600">
                {(
                  transactions.filter(tx => tx.type === 'U2A').reduce((sum, tx) => sum + tx.amount, 0) -
                  transactions.filter(tx => tx.type === 'A2U').reduce((sum, tx) => sum + tx.amount, 0)
                ).toFixed(7)} Pi
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Total earned after refunds
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-800 mb-1">Total Volume</div>
              <div className="text-2xl font-bold text-orange-600">
                {transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(7)} Pi
              </div>
              <div className="text-xs text-orange-700 mt-1">
                All transactions combined
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}