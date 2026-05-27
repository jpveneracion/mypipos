'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the entire error object for debugging
    console.error('=== APPLICATION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error digest:', error.digest);
    console.error('Full error object:', error);
    console.error('Error keys:', Object.keys(error));
    console.error('========================');
  }, [error]);

  // Extract all possible error information
  const errorName = error.name || 'Unknown Error';
  const errorMessage = error.message || 'An unexpected error occurred';
  const errorStack = error.stack || '';
  const errorDigest = error.digest;

  return (
    <div className="min-h-screen bg-[#0D0F16] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-brand-indigo-900/50 backdrop-blur-xl border border-brand-indigo-800 rounded-2xl p-8 shadow-glow">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-brand-magenta-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-brand-magenta-400" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-bold text-brand-indigo-200 text-center mb-4">
          {errorName}
        </h1>

        {/* Error Message */}
        <div className="bg-brand-magenta-900/20 border border-brand-magenta-700 rounded-xl p-4 mb-6">
          <p className="text-brand-magenta-300 font-semibold text-sm mb-2">Error Details:</p>
          <p className="text-brand-magenta-400 text-sm font-mono break-words">
            {errorMessage}
          </p>
          {errorDigest && (
            <p className="text-brand-indigo-500 text-xs mt-2">
              Error ID: {errorDigest}
            </p>
          )}
        </div>

        {/* Full Error Object (for debugging) */}
        <details className="mb-6">
          <summary className="text-brand-indigo-400 text-sm font-semibold cursor-pointer hover:text-brand-indigo-300 mb-2">
            Show Technical Details (Debug Info)
          </summary>
          <div className="bg-brand-indigo-950 border border-brand-indigo-800 rounded-xl p-4 mt-2 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {/* Error Properties */}
              <div>
                <p className="text-brand-indigo-300 text-xs font-semibold mb-1">Error Properties:</p>
                <pre className="text-brand-indigo-400 text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify({
                    name: error.name,
                    message: error.message,
                    digest: error.digest,
                    keys: Object.keys(error)
                  }, null, 2)}
                </pre>
              </div>

              {/* Stack Trace */}
              {errorStack && (
                <div>
                  <p className="text-brand-indigo-300 text-xs font-semibold mb-1">Stack Trace:</p>
                  <pre className="text-brand-indigo-400 text-xs font-mono whitespace-pre-wrap break-words">
                    {errorStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 font-semibold rounded-xl hover:from-brand-cyan-500 hover:to-brand-cyan-700 transition-all shadow-glow"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-indigo-800 border border-brand-indigo-700 text-brand-indigo-300 font-semibold rounded-xl hover:bg-brand-indigo-700 hover:text-brand-indigo-200 transition-all"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-brand-indigo-500 text-sm">
            If this problem persists, please contact support with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}