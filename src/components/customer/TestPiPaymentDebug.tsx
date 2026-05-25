/**
 * Pi Network Payment Debug Component
 * Helps identify payment creation issues
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function TestPiPaymentDebug({ userId }: { userId: string }) {
  const [piSdkStatus, setPiSdkStatus] = useState<any>({});
  const [paymentTestResult, setPaymentTestResult] = useState<any>(null);

  const checkPiSdk = () => {
    const Pi = (window as any).Pi;
    const status = {
      available: !!Pi,
      methods: Pi ? Object.keys(Pi).filter(key => typeof Pi[key] === 'function') : [],
      createPaymentAvailable: Pi ? typeof Pi.createPayment : 'not available',
      version: Pi?.version || 'unknown'
    };
    setPiSdkStatus(status);
  };

  const testPaymentCreation = async () => {
    try {
      const Pi = (window as any).Pi;

      // Test 1: Minimal payment data
      const minimalPayment = {
        amount: '1.00',
        memo: 'Test payment'
      };

      console.log('Testing minimal payment:', minimalPayment);

      const test1 = await Pi.createPayment(minimalPayment, {
        onReadyForServerApproval: (paymentId: string) => {
          console.log('Test 1 passed - payment ID:', paymentId);
          setPaymentTestResult({
            success: true,
            test: 'minimal_payment',
            paymentId,
            message: 'Minimal payment creation successful!'
          });
        },
        onError: (error: any) => {
          console.error('Test 1 failed:', error);
          setPaymentTestResult({
            success: false,
            test: 'minimal_payment',
            error: error?.message || String(error)
          });
        }
      });

    } catch (error) {
      console.error('Payment test error:', error);
      setPaymentTestResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  useEffect(() => {
    checkPiSdk();
  }, []);

  return (
    <Card className="bg-brand-dark-950 border border-brand-yellow-500 p-4 mb-4">
      <h4 className="text-brand-yellow-400 font-bold mb-3">🔧 Pi Payment Debug</h4>

      <div className="space-y-3">
        {/* SDK Status */}
        <div className="text-xs text-brand-indigo-200">
          <p className="font-bold text-brand-cyan-300">SDK Status:</p>
          <pre className="bg-brand-dark-950 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(piSdkStatus, null, 2)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={checkPiSdk} className="text-xs">
            Refresh SDK Status
          </Button>
          <Button onClick={testPaymentCreation} className="text-xs">
            Test Payment Creation
          </Button>
        </div>

        {/* Test Results */}
        {paymentTestResult && (
          <div className="text-xs text-brand-indigo-200">
            <p className="font-bold text-brand-cyan-300">Test Result:</p>
            <pre className="bg-brand-dark-950 p-2 rounded mt-1 overflow-auto">
              {JSON.stringify(paymentTestResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}