'use client';

import { useState } from 'react';

export default function ClearStuckPaymentPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const clearStuckPayment = async () => {
    setStatus('loading');
    setMessage('Starting...');

    try {
      // Step 1: Submit to blockchain
      setMessage('Step 1: Submitting payment to blockchain...');
      const submitResponse = await fetch('/api/debug/submit-stuck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: 'gZIOv1PmSXT93SZYZckiKFjlEYmO'
        })
      });

      const submitData = await submitResponse.json();
      if (!submitData.success) {
        throw new Error('Step 1 failed: ' + submitData.error);
      }

      // Step 2: Complete payment
      setMessage('Step 2: Completing payment on server...');
      const completeResponse = await fetch('/api/debug/complete-stuck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: 'gZIOv1PmSXT93SZYZckiKFjlEYmO',
          txid: submitData.txid
        })
      });

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error('Step 2 failed: ' + completeData.error);
      }

      setStatus('success');
      setMessage(`✅ Payment completed! TXID: ${submitData.txid}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Clear Stuck A2U Payment</h1>

      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p><strong>Payment ID:</strong> gZIOv1PmSXT93SZYZckiKFjlEYmO</p>
        <p><strong>Issue:</strong> Incomplete payment blocking new A2U payments</p>
        <p><strong>Status:</strong> developer_approved=true, developer_completed=false</p>
      </div>

      {status === 'idle' && (
        <button
          onClick={clearStuckPayment}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Complete Stuck Payment (2 Steps)
        </button>
      )}

      {status === 'loading' && (
        <div style={{ padding: '15px', background: '#2196F3', borderRadius: '8px', color: 'white' }}>
          {message}
        </div>
      )}

      {status === 'success' && (
        <div style={{ padding: '15px', background: '#4CAF50', borderRadius: '8px', color: 'white' }}>
          {message}
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '15px', background: '#f44336', borderRadius: '8px', color: 'white' }}>
          ❌ {message}
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <p>This will:</p>
        <ol>
          <li>Submit payment gZIOv1PmSXT93SZYZckiKFjlEYmO to blockchain</li>
          <li>Complete the payment on server using pi-backend SDK</li>
          <li>Clear the pipeline so you can create new A2U payments</li>
        </ol>
      </div>
    </div>
  );
}
