'use client';

import { useEffect } from 'react';

export default function GlobalErrorHandlers() {
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('╔══════════════════════════════════════╗');
      console.error('║   GLOBAL ERROR HANDLER TRIGGERED    ║');
      console.error('╚══════════════════════════════════════╝');
      console.error('Error message:', event.message);
      console.error('Error filename:', event.filename);
      console.error('Error line:', event.lineno);
      console.error('Error column:', event.colno);
      console.error('Error object:', event.error);
      console.error('Event type:', event.type);
      console.error('Timestamp:', new Date().toISOString());
      console.error('╔══════════════════════════════════════╗');
      console.error('║       END GLOBAL ERROR LOG          ║');
      console.error('╚══════════════════════════════════════╝');

      // Store error info in sessionStorage for the error page to display
      try {
        sessionStorage.setItem('lastError', JSON.stringify({
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          type: event.type,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to store error info:', e);
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('╔══════════════════════════════════════╗');
      console.error('║  UNHANDLED PROMISE REJECTION        ║');
      console.error('╚══════════════════════════════════════╝');
      console.error('Reason:', event.reason);
      console.error('Promise:', event.promise);
      console.error('Event type:', event.type);
      console.error('Timestamp:', new Date().toISOString());
      console.error('╔══════════════════════════════════════╗');
      console.error('║       END PROMISE REJECTION LOG     ║');
      console.error('╚══════════════════════════════════════╝');

      // Store rejection info
      try {
        sessionStorage.setItem('lastRejection', JSON.stringify({
          reason: event.reason?.toString?.() || String(event.reason),
          stack: event.reason?.stack,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to store rejection info:', e);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}