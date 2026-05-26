'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Gift, Loader2, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';

interface TestPiClaimCardProps {
  userId: string;
}

export function TestPiClaimCard({ userId }: TestPiClaimCardProps) {
  const [hasClaimed, setHasClaimed] = useState<boolean | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkClaimStatus();
  }, [userId]);

  const checkClaimStatus = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/customers/claim-test-pi?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setHasClaimed(data.hasClaimed);
      } else {
        setError('Failed to check claim status');
      }
    } catch (error) {
      setError('Network error. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    setError('');
    setSuccessMessage('');

    try {
      setSuccessMessage('Processing your claim...');

      // Get user details first
      const userResponse = await fetch(`/api/users/get-by-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user details');
      }

      const userData = await userResponse.json();
      const user = userData.user;

      if (!user || !user.pi_uid) {
        throw new Error('User does not have a Pi UID. Please authenticate with Pi Network first.');
      }

      // Create A2U payment to send 1 Pi to user
      const a2uResponse = await fetch('/api/payments/a2u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.pi_uid,
          amount: 1.00,
          memo: 'Test Pi Claim - One-time pioneer bonus',
          transaction_type: 'customer_reward',
          metadata: {
            reward_type: 'test_pi_claim',
            user_id: userId,
            claimed_at: new Date().toISOString()
          }
        })
      });

      if (!a2uResponse.ok) {
        const errorData = await a2uResponse.json();
        throw new Error(errorData.error || 'A2U payment failed');
      }

      const a2uResult = await a2uResponse.json();

      if (!a2uResult.success) {
        throw new Error(a2uResult.error || 'A2U payment failed');
      }

      setSuccessMessage('Successfully claimed 1 Test Pi! 🎉 Check your Pi wallet.');
      setHasClaimed(true);

      setTimeout(() => {
        checkClaimStatus();
      }, 2000);

    } catch (error) {
      let errorMessage = 'Failed to claim Test Pi. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="mb-6">
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
                    disabled={isClaiming}
                    className="w-full md:w-auto"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Claiming...
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
    </div>
  );
}