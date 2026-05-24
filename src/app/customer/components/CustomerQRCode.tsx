'use client';

import { useState, useEffect } from 'react';
import { generateCustomerQR } from '@/lib/qr-codes';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  username: string;
}

interface CustomerQRCodeProps {
  user: User;
}

export default function CustomerQRCode({ user }: CustomerQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function generateQR() {
      setIsLoading(true);
      setError(null);

      try {
        const qrDataUrl = await generateCustomerQR(user);
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        setError(errorMessage);
        console.error('QR Code generation error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    generateQR();
  }, [user]);

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `mypipos-qr-${user.username}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!qrCodeUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], `mypipos-qr-${user.username}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'myPiPOS Customer QR Code',
          text: `Scan my QR code at checkout for faster payment with ${user.username}`
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(qrCodeUrl);
        alert('QR code copied to clipboard!');
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Failed to share QR code');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glassmorphism rounded-3xl p-8 bg-white dark:bg-oceanic-900/50 shadow-glass-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-2xl mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h2 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
            Your Payment QR Code
          </h2>
          <p className="text-oceanic-700 dark:text-oceanic-300 text-sm">
            Show this QR code at checkout for faster payment
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center mb-8">
          {isLoading ? (
            <div className="w-72 h-72 flex items-center justify-center bg-oceanic-50 dark:bg-oceanic-900/30 rounded-2xl border-2 border-dashed border-oceanic-200 dark:border-oceanic-700">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin" />
                <p className="text-oceanic-700 dark:text-oceanic-300 font-semibold">Generating QR Code...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-72 h-72 flex items-center justify-center bg-error-50 dark:bg-error-900/20 rounded-2xl border-2 border-error-200 dark:border-error-800">
              <div className="text-center px-6">
                <div className="text-5xl mb-3">⚠️</div>
                <p className="text-error-700 dark:text-error-300 font-bold mb-2">Error</p>
                <p className="text-error-600 dark:text-error-400 text-sm mb-4">{error}</p>
                <Button
                  variant="destructive"
                  onClick={() => window.location.reload()}
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-linear-to-r from-oceanic-400 to-sky-400 dark:from-oceanic-600 dark:to-sky-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
              <img
                src={qrCodeUrl}
                alt="Payment QR Code"
                className="relative w-72 h-72 bg-white rounded-2xl shadow-glass border-2 border-oceanic-100 dark:border-oceanic-700 group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </div>

        {/* Username Display */}
        {!isLoading && !error && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-linear-to-r from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 px-6 py-3 rounded-full border border-oceanic-200 dark:border-oceanic-700">
              <span className="text-oceanic-700 dark:text-oceanic-300 font-bold">@{user.username}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isLoading && !error && (
          <div className="flex gap-3 mb-8">
            <Button
              variant="primary"
              onClick={handleDownload}
              className="flex-1 bg-linear-to-r from-oceanic-600 to-sky-600 hover:from-oceanic-700 hover:to-sky-700 shadow-glass hover:shadow-glass-lg transform hover:scale-105 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 border-oceanic-300 dark:border-oceanic-600 text-oceanic-700 dark:text-oceanic-300 hover:bg-oceanic-50 dark:hover:bg-oceanic-900/30 shadow-glass hover:shadow-glass-lg transform hover:scale-105 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </span>
            </Button>
          </div>
        )}

        {/* Footer Instructions */}
        <div className="pt-6 border-t border-oceanic-200 dark:border-oceanic-700">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-oceanic-700 dark:text-oceanic-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-oceanic-700 dark:text-oceanic-300">
                <strong className="text-oceanic-900 dark:text-oceanic-100">How it works:</strong> Show this QR code to the cashier at checkout. They'll scan it to link your purchase to your account.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-linear-to-br from-success-100 to-emerald-100 dark:from-success-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-oceanic-700 dark:text-oceanic-300">
                <strong className="text-oceanic-900 dark:text-oceanic-100">Secure:</strong> Your QR code is time-sensitive and expires after 5 minutes for your security.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-linear-to-br from-warning-100 to-amber-100 dark:from-warning-900/30 dark:to-amber-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-warning-600 dark:text-warning-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-oceanic-700 dark:text-oceanic-300">
                <strong className="text-oceanic-900 dark:text-oceanic-100">Fast:</strong> No need to manually enter your details at checkout - just scan and go!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
