'use client';

import { useState, useEffect } from 'react';

interface StuckPayment {
  identifier: string;
  amount: number;
  memo: string;
  created_at: string;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  from_address: string;
  to_address: string;
  user_uid: string;
}

export default function ClearStuckPaymentPage() {
  const [stuckPayments, setStuckPayments] = useState<StuckPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<StuckPayment | null>(null);
  const [actionStatus, setActionStatus] = useState<'idle' | 'submitting' | 'completing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txid, setTxid] = useState('');

  useEffect(() => {
    fetchStuckPayments();
  }, []);

  const fetchStuckPayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/debug/find-stuck-payments');
      const data = await response.json();

      if (data.success) {
        setStuckPayments(data.payments);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (error) {
      setMessage('Error fetching stuck payments: ' + String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelectedPayment = async (payment: StuckPayment) => {
    setSelectedPayment(payment);
    setActionStatus('submitting');
    setMessage('Step 1: Submitting payment to blockchain...');

    try {
      // Step 1: Submit to blockchain
      const submitResponse = await fetch('/api/debug/submit-stuck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.identifier })
      });

      const submitData = await submitResponse.json();
      if (!submitData.success) {
        throw new Error('Step 1 failed: ' + submitData.error);
      }

      setTxid(submitData.txid);
      setActionStatus('completing');
      setMessage('Step 2: Completing payment on server...');

      // Step 2: Complete payment
      const completeResponse = await fetch('/api/debug/complete-stuck-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: submitData.txid
        })
      });

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error('Step 2 failed: ' + completeData.error);
      }

      setActionStatus('done');
      setMessage(`✅ Payment completed! TXID: ${submitData.txid}`);

      // Refresh the list after 2 seconds
      setTimeout(() => {
        fetchStuckPayments();
        setActionStatus('idle');
        setSelectedPayment(null);
        setTxid('');
        setMessage('');
      }, 2000);

    } catch (error) {
      setActionStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Clear Stuck A2U Payments</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={fetchStuckPayments}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          background: actionStatus === 'error' ? '#f44336' : actionStatus === 'done' ? '#4CAF50' : '#2196F3',
          borderRadius: '8px',
          color: 'white',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Loading stuck payments...
        </div>
      ) : stuckPayments.length === 0 ? (
        <div style={{
          padding: '20px',
          background: '#4CAF50',
          borderRadius: '8px',
          color: 'white',
          textAlign: 'center'
        }}>
          ✅ No stuck A2U payments found! Your wallet is clear.
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Found {stuckPayments.length} stuck A2U payment(s) blocking new payments:
          </p>

          {stuckPayments.map((payment) => (
            <div
              key={payment.identifier}
              style={{
                background: '#1a1a1a',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: selectedPayment?.identifier === payment.identifier ? '2px solid #4CAF50' : '1px solid #333'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <p><strong>📝 Payment ID:</strong> {payment.identifier}</p>
                <p><strong>💰 Amount:</strong> {payment.amount} Pi</p>
                <p><strong>📝 Memo:</strong> {payment.memo}</p>
                <p><strong>👤 User UID:</strong> {payment.user_uid}</p>
                <p><strong>📅 Created:</strong> {new Date(payment.created_at).toLocaleString()}</p>
                <p><strong>🔄 Status:</strong></p>
                <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                  <li>Developer Approved: {payment.status.developer_approved ? '✅' : '❌'}</li>
                  <li>Transaction Verified: {payment.status.transaction_verified ? '✅' : '❌'}</li>
                  <li>Developer Completed: {payment.status.developer_completed ? '✅' : '❌'}</li>
                  <li>Cancelled: {payment.status.cancelled ? '✅' : '❌'}</li>
                </ul>
              </div>

              {actionStatus === 'idle' && (
                <button
                  onClick={() => clearSelectedPayment(payment)}
                  disabled={actionStatus !== 'idle'}
                  style={{
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✅ Complete This Payment (2 Steps)
                </button>
              )}

              {selectedPayment?.identifier === payment.identifier && actionStatus !== 'idle' && (
                <div style={{ marginTop: '10px' }}>
                  {actionStatus === 'submitting' && (
                    <div style={{ color: '#2196F3' }}>⏳ Submitting to blockchain...</div>
                  )}
                  {actionStatus === 'completing' && (
                    <div style={{ color: '#FF9800' }}>⏳ Completing on server...</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px' }}>
        <p><strong>What this does:</strong></p>
        <ol>
          <li>Queries Pi API for incomplete A2U payments (direction: app_to_user)</li>
          <li>For each stuck payment, executes the remaining steps:</li>
          <ul>
            <li>Submit to blockchain (pi.submitPayment)</li>
            <li>Complete on server (pi.completePayment)</li>
          </ul>
          <li>Clears the pipeline so you can create new A2U payments</li>
        </ol>
      </div>
    </div>
  );
}
