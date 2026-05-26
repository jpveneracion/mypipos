/**
 * A2U Payment Library
 * Uses direct HTTP API for proper A2U (App-to-User) payments with mypiroll-style incomplete payment handling
 */

import { query } from '@/lib/db';

export interface A2UPaymentRequest {
  uid: string;
  amount: number;
  memo: string;
  transaction_type: 'merchant_payout' | 'customer_refund' | 'customer_reward' | 'staff_payout' | 'affiliate_payout' | 'platform_payout';
  metadata?: Record<string, any>;
}

/**
 * Cancel any incomplete payment outright
 * Returns true if successfully cancelled or if payment doesn't exist
 */
async function cancelIncompletePayment(paymentId: string, apiKey: string, apiUrl: string): Promise<boolean> {
  console.log('[A2U Janitor] Cancelling payment outright:', paymentId);

  try {
    const cancelResponse = await fetch(`${apiUrl}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_message: 'Cancelling incomplete payment to allow new A2U payment'
      })
    });

    if (cancelResponse.ok) {
      console.log('[A2U Janitor] ✅ Payment cancelled successfully');
      return true;
    }

    // If payment doesn't exist or already completed/cancelled, that's fine
    if (cancelResponse.status === 404) {
      console.log('[A2U Janitor] Payment not found (404), treating as cleared');
      return true;
    }

    const cancelError = await cancelResponse.json().catch(() => ({}));
    console.log('[A2U Janitor] Cancel failed:', cancelError.error || cancelError.error_message);

    // If it's already completed, that's fine too
    if (cancelError.payment?.status === 'completed' ||
        cancelError.payment?.status?.developer_completed) {
      console.log('[A2U Janitor] Payment already completed, treating as cleared');
      return true;
    }

    console.error('[A2U Janitor] ❌ Failed to cancel payment');
    return false;

  } catch (error) {
    console.error('[A2U Janitor] Error cancelling payment:', error);
    return false;
  }
}

export async function processA2UPayment(request: A2UPaymentRequest) {
  try {
    const { uid, amount, memo, transaction_type, metadata = {} } = request;

    console.log(`[A2U] Processing A2U payment:`, { uid, amount, memo, transaction_type });

    // Validation
    if (!uid || !amount || !memo || !transaction_type) {
      return {
        success: false,
        error: 'Missing required fields: uid, amount, memo, transaction_type'
      };
    }

    // Validate transaction type
    const validTransactionTypes = ['merchant_payout', 'customer_refund', 'customer_reward', 'staff_payout', 'affiliate_payout', 'platform_payout'];
    if (!validTransactionTypes.includes(transaction_type)) {
      return {
        success: false,
        error: `Invalid transaction_type. Must be one of: ${validTransactionTypes.join(', ')}`
      };
    }

    // Validate amount
    if (amount <= 0 || amount > 1000) {
      return {
        success: false,
        error: 'Amount must be between 0 and 1000 Pi'
      };
    }

    // Get user by Pi UID
    const userResult = await query(
      `SELECT * FROM users WHERE pi_uid = $1`,
      [uid]
    );

    if (!userResult.rows[0]) {
      return {
        success: false,
        error: 'User not found with this Pi UID'
      };
    }

    const user = userResult.rows[0];

    // Check if user has wallet address
    if (!user.pi_wallet_address) {
      return {
        success: false,
        error: 'User does not have a wallet address set'
      };
    }

    // Get API credentials
    const apiKey = process.env.PI_API_KEY;
    const walletPrivateKey = process.env.PI_WALLET_PRIVATE_KEY;
    const apiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    console.log('[A2U] API credentials check:', {
      hasApiKey: !!apiKey,
      hasWalletKey: !!walletPrivateKey,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      walletKeyPrefix: walletPrivateKey ? `${walletPrivateKey.substring(0, 8)}...` : 'none'
    });

    if (!apiKey) {
      return {
        success: false,
        error: 'Pi Network credentials not configured (PI_API_KEY)'
      };
    }

    if (!walletPrivateKey) {
      return {
        success: false,
        error: 'Pi Network wallet credentials not configured (PI_WALLET_PRIVATE_KEY) - required for A2U payments'
      };
    }

    // Step 1: Check for existing incomplete payment for this user and transaction type
    const existingPayment = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = $2
       AND metadata->>'reward_type' = $3
       AND status IN ('pending', 'failed')
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, transaction_type, metadata?.reward_type]
    );

    if (existingPayment.rows.length > 0) {
      const existing = existingPayment.rows[0];
      console.log(`[A2U] Found existing payment:`, existing.transaction_number, existing.status);

      // Cancel any incomplete payment outright before creating new one
      if (existing.status === 'pending' && existing.payment_id) {
        console.log(`[A2U] Cancelling incomplete payment:`, existing.payment_id);

        const cancelled = await cancelIncompletePayment(existing.payment_id, apiKey, apiUrl);

        if (cancelled) {
          console.log(`[A2U] ✅ Successfully cancelled incomplete payment`);

          // Mark as cancelled in our database
          await query(
            `UPDATE a2u_payments SET
              status = 'failed',
              error_message = 'Cancelled to allow new payment'
            WHERE id = $1`,
            [existing.id]
          );
        } else {
          console.log(`[A2U] ⚠️ Failed to cancel existing payment, will try new payment anyway`);
        }
      }
    }

    // Step 2: Create A2U payment record in database
    const transactionNumber = `A2U-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Generate VERY unique memo to avoid Pi Network duplicate detection with U2A payments
    const uniqueMemo = `${memo} - A2U REWARD ${transactionNumber}`;
    console.log('[A2U] Using unique memo:', uniqueMemo);

    // Step 3: Create A2U payment using Pi Network API FIRST
    // Only create database entry if Pi payment succeeds
    let a2uPayment: any; // Declare early to avoid scoping issues
    console.log(`[A2U] Creating A2U payment via HTTP API...`);

    try {
      const paymentArgs = {
        payment: {
          amount: amount.toFixed(7),
          memo: uniqueMemo,
          uid: user.pi_uid,  // CRITICAL: Recipient's Pi UID
          metadata: {
            transaction_id: transactionNumber,
            user_id: user.id,
            ...metadata
          }
        }
      };

      console.log('[A2U] Payment args:', {
        amount: paymentArgs.payment.amount,
        memo: paymentArgs.payment.memo,
        uid: paymentArgs.payment.uid,
        hasUid: !!paymentArgs.payment.uid
      });

      let paymentId: string; // Declare paymentId here so it's available in error handling

      const createResponse = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentArgs)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.error_message;

        // Handle ongoing_payment_found error
        if (errorMessage === 'ongoing_payment_found') {
          throw new Error('You have an incomplete payment blocking new A2U payments. This is likely the U2A payment from last night (May 25). Wait 10 minutes for it to expire, or contact Pi Network support to cancel payment ID: L4mg3hv4oNOHZQPVLSrfBdJsHgzu');
        }
        // Handle duplicate payment error - but skip if we just retried
        else if (errorData.exists === true && errorData.payment && errorMessage !== 'ongoing_payment_found') {
          console.log('[A2U] Payment already exists on Pi Network, checking payment type...');

          const existingPiPayment = errorData.payment;
          const paymentDirection = existingPiPayment.direction;
          const existingPaymentId = existingPiPayment.identifier;

          console.log('[A2U] Existing payment direction:', paymentDirection);

          // IMPORTANT: Only complete if it's actually an A2U (app_to_user) payment
          // If it's U2A (user_to_app), we need to create a new A2U payment instead
          if (paymentDirection === 'app_to_user' && existingPaymentId) {
            console.log('[A2U] Found existing A2U payment, completing it...');

            // Complete the existing A2U payment
            if (existingPiPayment.transaction?.txid) {
              const txid = existingPiPayment.transaction.txid;
              console.log('[A2U] Completing with existing txid:', txid);

              const completeResponse = await fetch(`${apiUrl}/payments/${existingPaymentId}/complete`, {
                method: 'POST',
                headers: {
                  'Authorization': `Key ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ txid })
              });

              if (completeResponse.ok) {
                console.log('[A2U] ✅ Successfully completed existing A2U payment');

                // Don't create database entry for completed existing payment
                return {
                  success: true,
                  payment: {
                    paymentId: existingPaymentId,
                    txid: txid,
                    amount: amount,
                    memo: memo,
                    status: 'completed',
                    toUser: {
                      id: user.id,
                      username: user.username,
                      piUid: user.pi_uid
                    }
                  },
                  message: `Successfully sent ${amount} Pi to ${user.username}!`
                };
              }
            }
          } else if (paymentDirection === 'user_to_app') {
            console.log('[A2U] ❌ Existing payment is U2A (user-to-app), not A2U!');
            throw new Error(`Found existing ${paymentDirection} payment. Cannot create A2U payment with same parameters.`);
          }

          // If direction is neither, proceed with error
          throw new Error(errorData.error || errorData.error_message || 'Failed to create payment');
        } else {
          throw new Error(errorMessage || 'Failed to create payment');
        }
      }

      let paymentData: any = await createResponse.json();
      paymentId = paymentData.identifier || paymentData.id;

      console.log('[A2U] ✅ Payment created with ID:', paymentId);
    console.log('[A2U] Payment data:', {
      id: paymentData.id,
      identifier: paymentData.identifier,
      amount: paymentData.amount,
      memo: paymentData.memo,
      status: paymentData.status,
      direction: paymentData.direction,
      from: paymentData.from_address,
      to: paymentData.to_address
    });

    // NOW create database entry only after successful Pi payment creation
    const a2uPaymentResult = await query(
      `INSERT INTO a2u_payments (
        transaction_number,
        payment_id,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        status,
        network,
        from_address,
        to_address
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        transactionNumber,
        paymentId,
        user.id,
        'customer',
        user.username,
        user.pi_uid,
        amount,
        uniqueMemo,
        transaction_type,
        JSON.stringify(metadata),
        'pending',
        'Pi Testnet',
        'Pi Platform Wallet',
        user.pi_wallet_address
      ]
    );

    const a2uPayment = a2uPaymentResult.rows[0];
    console.log(`[A2U] Created A2U payment record:`, a2uPayment.transaction_number);

      // Step 4: Submit payment to blockchain
      console.log('[A2U] Submitting to blockchain...');
      const submitResponse = await fetch(`${apiUrl}/payments/${paymentId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!submitResponse.ok) {
        const submitErrorText = await submitResponse.text();
        console.error('[A2U] Submit failed with status:', submitResponse.status);
        console.error('[A2U] Submit error response:', submitErrorText);

        let submitError;
        try {
          submitError = JSON.parse(submitErrorText);
        } catch (e) {
          submitError = { error: submitErrorText };
        }

        throw new Error(submitError.error || submitError.error_message || `Failed to submit payment (${submitResponse.status})`);
      }

      const submitData = await submitResponse.json();
      const txid = submitData.txid || submitData.transaction_id;

      console.log('[A2U] ✅ Payment submitted with TXID:', txid);

      // Step 5: Complete payment
      console.log('[A2U] Completing payment...');
      const completeResponse = await fetch(`${apiUrl}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid })
      });

      if (!completeResponse.ok) {
        const completeError = await completeResponse.json().catch(() => ({}));
        throw new Error(completeError.error || completeError.error_message || 'Failed to complete payment');
      }

      console.log('[A2U] ✅ Payment completed successfully!');

      // Step 6: Update A2U payment record
      if (a2uPayment) {
        await query(
          `UPDATE a2u_payments SET
            payment_id = $1,
            txid = $2,
            status = 'completed',
            payment_completed_at = NOW(),
            completed_at = NOW()
          WHERE id = $3`,
          [paymentId, txid, a2uPayment.id]
        );

        console.log(`[A2U] ✅ A2U payment completed successfully!`);
      }

      return {
        success: true,
        payment: a2uPayment ? {
          id: a2uPayment.id,
          transactionNumber: a2uPayment.transaction_number,
          paymentId: paymentId,
          txid: txid,
          amount: a2uPayment.amount,
          memo: a2uPayment.memo,
          status: 'completed',
          toUser: {
            id: user.id,
            username: user.username,
            piUid: user.pi_uid
          }
        } : {
          paymentId: paymentId,
          txid: txid,
          amount: amount,
          memo: memo,
          status: 'completed',
          toUser: {
            id: user.id,
            username: user.username,
            piUid: user.pi_uid
          }
        },
        message: `Successfully sent ${amount} Pi to ${user.username}!`
      };

    } catch (apiError) {
      console.error('[A2U] Pi API error:', apiError);

      // Only update database if we created an entry
      if (a2uPayment) {
        await query(
          `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
          [apiError instanceof Error ? apiError.message : 'Unknown API error', a2uPayment.id]
        );
      }

      return {
        success: false,
        error: `Pi Network API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
      };
    }

  } catch (error) {
    console.error('[A2U] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}