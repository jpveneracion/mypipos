'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Gift, Loader2, CheckCircle, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface TestPiClaimCardProps {
  userId: string;
}

export function TestPiClaimCard({ userId }: TestPiClaimCardProps) {
  const VERSION = 'test-pi-claim-v2-mypiroll-compatible';
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [piSdkReady, setPiSdkReady] = useState(false);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);

  useEffect(() => {
    let waitForPiInterval: NodeJS.Timeout | null = null;

    const initAndAuth = async () => {
      if (typeof window === "undefined" || !(window as any).Pi) return;

      try {
        const Pi = (window as any).Pi;
        console.log('Initializing Pi Network SDK...');

        // Step 1: Initialize Pi SDK FIRST
        await Pi.init({ version: "2.0" });

        // Step 2: Wait a moment for init to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 3: Handle incomplete payment during authentication (like mypiroll)
        const handleIncompletePayment = async (payment: any) => {
          console.log('[TEST-PI-CLAIM] ⚠️ Zombie payment found during auth:', payment.identifier);

          try {
            // Send to backend to clear using Master API Key
            const clearResponse = await fetch('/api/payments/clear-incomplete-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: payment.identifier
              })
            });

            if (clearResponse.ok) {
              const result = await clearResponse.json();
              console.log('[TEST-PI-CLAIM] ✅ Zombie payment cleared:', result);

              // Wait a moment then retry authentication
              setTimeout(() => {
                console.log('[TEST-PI-CLAIM] Retrying authentication...');
                initAndAuth();
              }, 2000);
            } else {
              const error = await clearResponse.json();
              console.error('[TEST-PI-CLAIM] Failed to clear zombie:', error);
            }
          } catch (err) {
            console.error('[TEST-PI-CLAIM] Error clearing zombie:', err);
          }
        };

        // Step 4: Authenticate with payment scope AND incomplete payment handler
        console.log('Authenticating with Pi Network for payments...');

        const auth = await Pi.authenticate(
          ['username', 'payments'],
          handleIncompletePayment
        );

        const username = auth?.user?.username || 'Unknown User';
        const uid = auth?.user?.uid || 'Unknown UID';

        console.log(`✅ Payment permission granted!\nUser: ${username}\nUID: ${uid}`);

        setPiSdkReady(true);
        console.log('✅ Pi Network SDK ready for payments');
      } catch (error) {
        console.error('Failed to initialize/auth Pi SDK:', error);
        setError(`Failed to initialize Pi Network: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    waitForPiInterval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).Pi) {
        if (waitForPiInterval) clearInterval(waitForPiInterval);
        initAndAuth();
        checkClaimStatus();
      }
    }, 100);

    return () => clearInterval(waitForPiInterval);
  }, [userId]);

  const checkClaimStatus = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Try the regular endpoint first
      const response = await fetch(`/api/customers/claim-test-pi?userId=${userId}`);
      const data = await response.json();

      setDebugInfo(data); // Store for debugging

      if (data.success) {
        setHasClaimed(data.hasClaimed);
      } else {
        setError('Failed to check claim status');
      }
    } catch (error) {
      setError('Network error. Check your connection.');
      setDebugInfo({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const resetClaimStatus = async () => {
    if (!confirm('Are you sure you want to reset your Test Pi claim status? This will allow you to claim again for testing purposes.')) {
      return;
    }

    try {
      const response = await fetch('/api/debug/reset-test-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        // Refresh claim status after reset
        checkClaimStatus();
      } else {
        alert('Failed to reset: ' + data.error);
      }
    } catch (error) {
      alert('Error resetting claim status: ' + String(error));
    }
  };

  const handleClaim = async () => {
    // Check if Pi SDK is ready
    if (!piSdkReady) {
      setError('Pi Network SDK is not ready. Please wait a moment and try again.');
      return;
    }

    setIsClaiming(true);
    setError('');
    setSuccessMessage('');

    try {
      // Check if Pi SDK is available
      const Pi = (window as any).Pi;
      if (!Pi) {
        throw new Error('Pi Network SDK not available. Please use Pi Browser.');
      }

      // Step 1: Create payment via Pi SDK with CORRECT format (like mypiroll)
      const paymentAmount = 1.00;
      const paymentData = {
        amount: paymentAmount.toFixed(7), // Must be string with 7 decimals like "1.0000000"
        memo: 'Test Pi Claim - One-time pioneer bonus',
        metadata: {
          transaction_id: `test_pi_claim_${Date.now()}`,
          user_id: userId,
          type: 'test_pi_claim'
        }
      };

      console.log('Creating payment with data:', paymentData);
      console.log('Payment amount:', paymentAmount.toFixed(7));

      const payment = await Pi.createPayment(paymentData, {
        // Step 2: Payment ready for server approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log(`✅ onReadyForServerApproval fired!\nPayment ID: ${paymentId}\nCalling approve endpoint...`);
          setSuccessMessage('Payment created! Approving with Pi Network...');
          setError('');

          try {
            // Approve payment on backend (matching mypiroll format)
            const response = await fetch('/api/customers/claim-test-pi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: paymentId,
                amount: paymentAmount,
                memo: 'Test Pi Claim - One-time pioneer bonus',
                type: 'test_pi_claim',
                action: 'approve',
                txid: '',
                userId: userId
              })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Payment approval failed');
            }

            console.log('✅ Approve endpoint called! Now check your Pi Browser for wallet popup.');
            setSuccessMessage('✅ Backend approved. Waiting for wallet approval...');
          } catch (error) {
            console.error('Payment approval error:', error);
            setError(error instanceof Error ? error.message : 'Failed to approve payment');
            setIsClaiming(false);
          }
        },

        // Step 3: Payment completed in wallet (ready for server completion)
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log(`✅ Payment approved in wallet!\nPayment ID: ${paymentId}\nTXID: ${txid}\nCalling complete endpoint...`);
          setSuccessMessage('✅ Wallet approved! Processing your claim...');

          try {
            // Complete payment on backend
            const response = await fetch('/api/customers/claim-test-pi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: paymentId,
                amount: paymentAmount,
                memo: 'Test Pi Claim - One-time pioneer bonus',
                type: 'test_pi_claim',
                action: 'complete',
                txid: txid,
                userId: userId
              })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Payment completion failed');
            }

            console.log('✅ Test Pi claim successful!', data);
            setHasClaimed(true);
            setSuccessMessage('Successfully claimed 1 Test Pi! 🎉');
          } catch (error) {
            console.error('Payment completion error:', error);
            setError(error instanceof Error ? error.message : 'Failed to complete payment');
          } finally {
            setIsClaiming(false);
          }
        },

        // Step 4: Payment cancelled
        onCancel: async (paymentId: string) => {
          console.log(`❌ Payment cancelled: ${paymentId}`);
          setPaymentResult(`❌ Payment cancelled`);
          setIsClaiming(false);
        },

        // Step 5: Payment error
        onError: async (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Payment error: ${errorMsg}`);
          setError(`Payment failed: ${errorMsg}`);
          setIsClaiming(false);
        }
      });

    } catch (error) {
      console.error('Claim error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
      setIsClaiming(false);
    }
  };

  // Always show the card (for debugging in Pi Browser)
  return (
    <div className="mb-6 space-y-4">
      {/* Fallback debug - always visible */}
      <div className="p-3 bg-brand-dark-950 border border-brand-yellow-500 rounded-lg">
        <p className="text-brand-yellow-400 text-xs font-bold">⚠️ TestPiClaimCard Component State:</p>
        <div className="text-xs text-brand-indigo-200 mt-1 space-y-1">
          <p>hasClaimed: {hasClaimed === null ? 'null (loading)' : hasClaimed ? 'true (claimed)' : 'false (can claim)'}</p>
          <p>isLoading: {isLoading ? 'true' : 'false'}</p>
          <p>piSdkReady: {piSdkReady ? '✅ true' : '❌ false'}</p>
          <p>userId: {userId?.substring(0, 8)}...</p>
          {error && <p className="text-red-300">Error: {error}</p>}
          {debugInfo && <p className="text-brand-cyan-300">API Response: {JSON.stringify(debugInfo).substring(0, 100)}...</p>}
        </div>
      </div>
      {/* Main Card */}
      {hasClaimed === true ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-linear-to-br from-green-900/20 to-brand-indigo-900/20 backdrop-blur-xl border border-green-700/30">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-green-300">Test Pi Claimed! ✅</h4>
                  <p className="text-sm text-green-400/80">You've already claimed your 1 test Pi bonus.</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : hasClaimed === false ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-linear-to-br from-brand-cyan-900/20 to-brand-indigo-900/20 backdrop-blur-xl border border-brand-cyan-700/30 hover:shadow-glow transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="relative">
                  <div className="w-16 h-16 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Gift className="w-8 h-8 text-brand-dark-950" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-cyan-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-brand-dark-950" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-display font-bold text-brand-indigo-100 mb-1">
                    Claim Your Test Pi
                  </h3>
                  <p className="text-brand-indigo-300 text-sm mb-3">
                    Get 1 test Pi to explore the platform - one-time pioneer bonus!
                  </p>

                  {error && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-2 mb-3">
                      <p className="text-red-300 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </p>
                    </div>
                  )}

                  {successMessage && (
                    <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-2 mb-3">
                      <p className="text-green-300 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {successMessage}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming || !piSdkReady}
                    className="w-full md:w-auto"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Claiming...
                      </>
                    ) : !piSdkReady ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing Pi SDK...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        Claim 1 Test Pi
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        /* Loading state */
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-linear-to-br from-brand-indigo-900/20 to-brand-indigo-900/20 backdrop-blur-xl border border-brand-indigo-700/30">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-brand-cyan-400 animate-spin" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-brand-indigo-300">Checking claim status...</h4>
                  <p className="text-sm text-brand-indigo-400/80">Please wait while we check your eligibility.</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Debug Panel - Always visible for Pi Browser debugging */}
      <Card className="bg-brand-dark-950/50 backdrop-blur-xl border border-brand-indigo-700/30">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-brand-indigo-300 flex items-center gap-2">
              🔍 Debug Info
            </h4>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs bg-brand-cyan-600/20 hover:bg-brand-cyan-600/30 text-brand-cyan-400 px-2 py-1 rounded"
            >
              {showDebug ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Always visible status */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-brand-dark-950 p-2 rounded">
              <span className="text-brand-indigo-400">User ID:</span>
              <p className="text-brand-indigo-200 break-all">{userId?.substring(0, 8)}...</p>
            </div>
            <div className="bg-brand-dark-950 p-2 rounded">
              <span className="text-brand-indigo-400">Status:</span>
              <p className="font-bold">
                {isLoading ? '🔄 Loading...' : hasClaimed === true ? '✅ Claimed' : hasClaimed === false ? '🎯 Can Claim' : '❓ Unknown'}
              </p>
            </div>
          </div>

          {/* Expandable debug details */}
          {showDebug && (
            <div className="space-y-2">
              <div className="bg-brand-dark-950 p-2 rounded text-xs">
                <p className="text-brand-indigo-400 mb-1">API Response:</p>
                <pre className="text-brand-indigo-200 overflow-auto max-h-40 text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>

              {error && (
                <div className="bg-red-900/20 p-2 rounded text-xs">
                  <p className="text-red-300">Error: {error}</p>
                </div>
              )}

              <button
                onClick={checkClaimStatus}
                className="w-full text-xs bg-brand-cyan-600/20 hover:bg-brand-cyan-600/30 text-brand-cyan-400 px-3 py-2 rounded flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh Status
              </button>

              {hasClaimed === true && (
                <button
                  onClick={resetClaimStatus}
                  className="w-full text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Claim Status (Debug)
                </button>
              )}

              <div className="bg-brand-indigo-900/20 p-2 rounded text-xs text-brand-indigo-300">
                <p className="font-bold mb-1">🔗 Debug API:</p>
                <p className="break-all text-brand-indigo-400">
                  /api/debug/test-claim-status?userId={userId}
                </p>
              </div>

              <div className="bg-brand-dark-950 p-2 rounded text-xs text-brand-indigo-300">
                <p className="font-bold mb-1">🔧 Pi SDK Status:</p>
                <p>Window.Pi: {(typeof window !== 'undefined' && (window as any).Pi) ? '✅ Available' : '❌ Not found'}</p>
                <p>SDK Ready: {piSdkReady ? '✅ Yes' : '❌ No'}</p>
                <p className="text-brand-indigo-400 mt-1">
                  {piSdkReady ? 'Ready to create payments' : 'SDK initialization in progress...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}