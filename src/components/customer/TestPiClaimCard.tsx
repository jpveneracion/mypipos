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

      // Check claim status (no wallet address needed - works with UID only)
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

      // Claim test Pi using backend endpoint (works with UID only)
      const response = await fetch('/api/customers/claim-test-pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim test Pi');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim test Pi');
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

  // Don't render anything if already claimed
  if (hasClaimed === true) {
    return null;
  }

  return (
    <div className="mb-6">
      {hasClaimed === false && !isLoading ? (
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