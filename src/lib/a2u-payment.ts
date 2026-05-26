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
 * Clear incomplete payment using mypiroll's "janitor protocol"
 * Tries cancel first, then completes with existing txid if cancel fails
 */
async function clearIncompletePayment(paymentId: string, apiKey: string, apiUrl: string): Promise<{ success: boolean; method: string; txid?: string }> {
  console.log('[A2U Janitor] Clearing zombie payment:', paymentId);

  try {
    // Step 1: Try to cancel (works for A2U payments)
    console.log('[A2U Janitor] Step 1: Trying to cancel payment...');
    const cancelResponse = await fetch(`${apiUrl}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_message: 'Zombie payment cleaned up by myPiPOS backend'
      })
    });

    if (cancelResponse.ok) {
      console.log('[A2U Janitor] ✅ Zombie payment cancelled successfully');
      return { success: true, method: 'cancel' };
    }

    // Step 2: Cancel failed - check if it's a 403 with txid we can use
    const cancelError = await cancelResponse.json().catch(() => ({}));
    console.log('[A2U Janitor] Cancel failed:', cancelError.error || cancelError.error_message);

    // Step 3: If it's a 403 with payment data, extract txid and complete
    if (cancelError.payment?.transaction?.txid && cancelError.payment?.transaction?.verified) {
      const txid = cancelError.payment.transaction.txid;
      console.log('[A2U Janitor] Step 2: Found verified txid in cancel error!', txid);
      console.log('[A2U Janitor] Completing payment with ACTUAL txid...');

      const completeResponse = await fetch(`${apiUrl}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid })
      });

      if (completeResponse.ok) {
        console.log('[A2U Janitor] ✅ Zombie payment COMPLETED successfully!');
        return { success: true, method: 'complete-from-cancel-error', txid };
      }

      console.error('[A2U Janitor] Complete failed:', await completeResponse.text());
    }

    console.error('[A2U Janitor] ❌ Cannot clear - no verified txid found');
    return { success: false, method: 'failed' };

  } catch (error) {
    console.error('[A2U Janitor] Error:', error);
    return { success: false, method: 'error' };
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
    const apiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    if (!apiKey) {
      return {
        success: false,
        error: 'Pi Network credentials not configured (PI_API_KEY)'
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

      // If it's pending from a recent attempt, try to clean it up
      if (existing.status === 'pending' && existing.payment_id) {
        console.log(`[A2U] Cleaning up stale pending payment:`, existing.payment_id);

        // Try to clear the incomplete payment using mypiroll's janitor protocol
        const clearResult = await clearIncompletePayment(existing.payment_id, apiKey, apiUrl);

        if (clearResult.success) {
          console.log(`[A2U] ✅ Successfully cleared incomplete payment using method:`, clearResult.method);

          // Update the existing payment record
          await query(
            `UPDATE a2u_payments SET
              status = 'completed',
              txid = $1,
              payment_completed_at = NOW(),
              completed_at = NOW(),
              error_message = NULL
            WHERE id = $2`,
            [clearResult.txid || null, existing.id]
          );

          return {
            success: true,
            payment: {
              id: existing.id,
              transactionNumber: existing.transaction_number,
              paymentId: existing.payment_id,
              txid: clearResult.txid,
              amount: existing.amount,
              memo: existing.memo,
              status: 'completed',
              toUser: {
                id: user.id,
                username: user.username,
                piUid: user.pi_uid
              }
            },
            message: `Successfully completed pending payment of ${amount} Pi to ${user.username}!`
          };
        }

        // Mark as failed if we couldn't clear it
        await query(
          `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
          ['Failed to clear incomplete payment', existing.id]
        );

        return {
          success: false,
          error: `Failed to clear existing incomplete payment. Please try again in a few minutes.`
        };
      }

      // If it's failed, we can proceed with a new payment
      console.log(`[A2U] Previous payment failed, proceeding with new payment`);
    }

    // Step 2: Create A2U payment record in database
    const transactionNumber = `A2U-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Generate VERY unique memo to avoid Pi Network duplicate detection with U2A payments
    const uniqueMemo = `${memo} - A2U REWARD ${transactionNumber}`;
    console.log('[A2U] Using unique memo:', uniqueMemo);

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
        '', // Will be set after Pi API call
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

    // Step 3: Create A2U payment using Pi Network API
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

        // Handle duplicate payment error
        if (errorData.exists === true && errorData.payment) {
          console.log('[A2U] Payment already exists on Pi Network, checking payment type...');

          const existingPiPayment = errorData.payment;
          const paymentDirection = existingPiPayment.direction;
          const paymentId = existingPiPayment.identifier;

          console.log('[A2U] Existing payment direction:', paymentDirection);

          // IMPORTANT: Only complete if it's actually an A2U (app_to_user) payment
          // If it's U2A (user_to_app), we need to create a new A2U payment instead
          if (paymentDirection === 'app_to_user' && paymentId) {
            console.log('[A2U] Found existing A2U payment, using janitor protocol...');

            // Try to complete the existing payment using janitor protocol
            const clearResult = await clearIncompletePayment(paymentId, apiKey, apiUrl);

            if (clearResult.success) {
              console.log('[A2U] ✅ Successfully completed existing A2U payment using method:', clearResult.method);

              // Update our database record
              await query(
                `UPDATE a2u_payments SET
                  payment_id = $1,
                  txid = $2,
                  status = 'completed',
                  payment_completed_at = NOW(),
                  completed_at = NOW()
                WHERE id = $3`,
                [paymentId, clearResult.txid || null, a2uPayment.id]
              );

              return {
                success: true,
                payment: {
                  id: a2uPayment.id,
                  transactionNumber: a2uPayment.transaction_number,
                  paymentId: paymentId,
                  txid: clearResult.txid,
                  amount: a2uPayment.amount,
                  memo: a2uPayment.memo,
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
          } else if (paymentDirection === 'user_to_app') {
            console.log('[A2U] ❌ Existing payment is U2A (user-to-app), not A2U!');
            console.log('[A2U] This is the wrong direction. We need to create a new A2U payment.');
            console.log('[A2U] Making memo even more unique to avoid false duplicate detection...');

            // The issue is that Pi Network is matching different payment directions
            // We need to make the memo even more unique to avoid this
            throw new Error(`Found existing ${paymentDirection} payment with same parameters. Please use a different memo or contact support.`);
          }

          // If direction is neither, proceed with error
          throw new Error(errorData.error || errorData.error_message || 'Failed to create payment');
        }

        throw new Error(errorData.error || errorData.error_message || 'Failed to create payment');
      }

      const paymentData = await createResponse.json();
      const paymentId = paymentData.identifier || paymentData.id;

      console.log('[A2U] ✅ Payment created with ID:', paymentId);

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
        const submitError = await submitResponse.json().catch(() => ({}));
        throw new Error(submitError.error || submitError.error_message || 'Failed to submit payment');
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

      return {
        success: true,
        payment: {
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
        },
        message: `Successfully sent ${amount} Pi to ${user.username}!`
      };

    } catch (apiError) {
      console.error('[A2U] Pi API error:', apiError);

      // Update A2U payment as failed
      await query(
        `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [apiError instanceof Error ? apiError.message : 'Unknown API error', a2uPayment.id]
      );

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