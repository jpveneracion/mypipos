'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class POSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('=== POS ERROR BOUNDARY ===');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('========================');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D0F16] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-brand-indigo-900/50 backdrop-blur-xl border border-brand-indigo-800 rounded-2xl p-8 shadow-glow">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-brand-magenta-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-brand-magenta-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-brand-indigo-200 text-center mb-4">
              POS Error
            </h1>

            {this.state.error && (
              <div className="bg-brand-magenta-900/20 border border-brand-magenta-700 rounded-xl p-4 mb-6">
                <p className="text-brand-magenta-300 font-semibold text-sm mb-2">Error:</p>
                <p className="text-brand-magenta-400 text-sm font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 font-semibold rounded-xl hover:from-brand-cyan-500 hover:to-brand-cyan-700 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Reload POS
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
