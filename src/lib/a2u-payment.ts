/**
 * A2U Payment Library
 * Uses pi-backend SDK for proper A2U (App-to-User) payments
 */

import { query } from '@/lib/db';

// Dynamic import for pi-backend (only available server-side)
let PiNetworkClass: any = null;

async function getPiNetworkClass() {
  if (PiNetworkClass) return PiNetworkClass;

  try {
    if (typeof window !== 'undefined') {
      throw new Error('pi-backend can only be used server-side');
    }

    const piBackend = await import('pi-backend');
    // Handle both default export and named export
    PiNetworkClass = (piBackend as any).default || piBackend;
    return PiNetworkClass;
  } catch (error) {
    console.error('[A2U] Failed to import pi-backend:', error);
    throw new Error('pi-backend package not available. Install it with: npm install pi-backend');
  }
}

export interface A2UPaymentRequest {
  uid: string;
  amount: number;
  memo: string;
  transaction_type: 'merchant_payout' | 'customer_refund' | 'customer_reward' | 'staff_payout' | 'affiliate_payout' | 'platform_payout';
  metadata?: Record<string, any>;
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

      // If it's pending from a recent attempt, try to continue or fail it
      if (existing.status === 'pending') {
        const timeSinceCreated = Date.now() - new Date(existing.created_at).getTime();
        // If pending for more than 5 minutes, mark as failed
        if (timeSinceCreated > 5 * 60 * 1000) {
          await query(
            `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
            ['Payment timed out', existing.id]
          );
          console.log(`[A2U] Marked stale pending payment as failed`);
        } else {
          return {
            success: false,
            error: `Payment already in progress. Please wait ${Math.ceil((5 * 60 * 1000 - timeSinceCreated) / 1000)} seconds before trying again.`
          };
        }
      }
    }

    // Step 2: Create A2U payment record in database
    const transactionNumber = `A2U-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

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
        '', // Will be set after Pi SDK call
        user.id,
        'customer',
        user.username,
        user.pi_uid,
        amount,
        memo,
        transaction_type,
        JSON.stringify(metadata),
        'pending',
        'Pi Testnet',
        'Pi Platform Wallet', // Using SDK handles wallet address
        user.pi_wallet_address
      ]
    );

    const a2uPayment = a2uPaymentResult.rows[0];

    console.log(`[A2U] Created A2U payment record:`, a2uPayment.transaction_number);

    // Step 2: Use pi-backend SDK for A2U payment
    console.log(`[A2U] Using pi-backend SDK for A2U payment...`);

    // Get API credentials outside try block for error handling
    const apiKey = process.env.PI_API_KEY;
    const walletPrivateKey = process.env.PI_WALLET_PRIVATE_KEY;

    try {
      const PiNetwork = await getPiNetworkClass();

      // Get API credentials
      console.log('[A2U] Checking environment variables...');
      console.log('[A2U] All env vars starting with PI:', Object.keys(process.env)
        .filter(key => key.startsWith('PI_'))
        .map(key => `${key}: ${key.substring(0, 15)}...`)
      );

      console.log('[A2U] Env var status:', {
        PI_API_KEY: apiKey ? 'SET' : 'NOT SET',
        PI_WALLET_PRIVATE_KEY: walletPrivateKey ? 'SET' : 'NOT SET',
        PI_WALLET_PRIVATE_SEED: process.env.PI_WALLET_PRIVATE_SEED ? 'SET' : 'NOT SET'
      });

      if (!apiKey || !walletPrivateKey) {
        throw new Error('Pi Network credentials not configured (PI_API_KEY, PI_WALLET_PRIVATE_KEY)');
      }

      console.log('[A2U] Initializing Pi SDK with credentials...');
      console.log('[A2U] Available env vars:', {
        hasApiKey: !!apiKey,
        hasWalletKey: !!walletPrivateKey,
        apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
        walletKeyPrefix: walletPrivateKey ? `${walletPrivateKey.substring(0, 8)}...` : 'none',
        nodeEnv: process.env.NODE_ENV
      });

      const pi = new PiNetwork(apiKey, walletPrivateKey);
      console.log('[A2U] Pi SDK initialized');

      // Step 2a: Create payment using SDK
      console.log('[A2U] Step 1: Creating A2U payment...');
      const paymentArgs = {
        amount: amount.toFixed(7),
        memo: memo,
        uid: user.pi_uid,  // CRITICAL: Recipient's Pi UID
        metadata: {
          transaction_id: transactionNumber,
          user_id: user.id,
          ...metadata
        }
      };

      console.log('[A2U] Payment args:', {
        amount: paymentArgs.amount,
        memo: paymentArgs.memo,
        uid: paymentArgs.uid,
        hasUid: !!paymentArgs.uid
      });

      const paymentId = await pi.createPayment(paymentArgs);
      console.log('[A2U] ✅ Payment created with ID:', paymentId);

      // Step 2b: Submit payment to blockchain
      console.log('[A2U] Step 2: Submitting to blockchain...');
      const txid = await pi.submitPayment(paymentId);
      console.log('[A2U] ✅ Payment submitted with TXID:', txid);

      // Step 2c: Complete payment
      console.log('[A2U] Step 3: Completing payment...');
      const completedPayment = await pi.completePayment(paymentId, txid);
      console.log('[A2U] ✅ Payment completed:', completedPayment.status);

      // Step 3: Update A2U payment record
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

    } catch (sdkError: any) {
      console.error('[A2U] Pi SDK error:', sdkError);

      // Handle duplicate payment error
      if (sdkError?.response?.data?.exists === true) {
        console.log('[A2U] Payment already exists, attempting to complete it...');
        console.log('[A2U] Existing payment data:', JSON.stringify(sdkError.response.data, null, 2));

        try {
          const existingPayment = sdkError.response.data.payment;
          console.log('[A2U] Payment object:', existingPayment);
          console.log('[A2U] Payment ID candidates:', {
            payment_id: existingPayment?.payment_id,
            id: existingPayment?.id,
            identifier: existingPayment?.identifier
          });

          const paymentId = existingPayment?.payment_id || existingPayment?.id || existingPayment?.identifier;

          // Check if the existing payment is already completed
          if (existingPayment?.status === 'completed' || existingPayment?.txid) {
            console.log('[A2U] Existing payment is already completed:', existingPayment);

            // Update our database record to match
            await query(
              `UPDATE a2u_payments SET
                payment_id = $1,
                txid = $2,
                status = 'completed',
                payment_completed_at = NOW(),
                completed_at = NOW()
              WHERE id = $3`,
              [
                paymentId,
                existingPayment?.txid || null,
                a2uPayment.id
              ]
            );

            return {
              success: true,
              payment: {
                id: a2uPayment.id,
                transactionNumber: a2uPayment.transaction_number,
                paymentId: paymentId,
                txid: existingPayment?.txid,
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

          if (paymentId) {
            console.log('[A2U] Found existing payment ID:', paymentId);

            // Check if payment already has a txid
            const existingTxid = existingPayment?.transaction?.txid;
            const isVerified = existingPayment?.status?.transaction_verified;

            console.log('[A2U] Payment status:', {
              hasTxid: !!existingTxid,
              txid: existingTxid,
              isVerified: isVerified,
              developerCompleted: existingPayment?.status?.developer_completed
            });

            const PiNetwork = await getPiNetworkClass();
            const pi = new PiNetwork(apiKey, walletPrivateKey);

            let finalTxid = existingTxid;

            // Only submit if no txid exists
            if (!existingTxid) {
              console.log('[A2U] Submitting existing payment to blockchain...');
              finalTxid = await pi.submitPayment(paymentId);
              console.log('[A2U] ✅ Payment submitted with TXID:', finalTxid);
            } else {
              console.log('[A2U] Payment already has txid, skipping submit...');
            }

            // Complete payment
            console.log('[A2U] Completing existing payment...');
            await pi.completePayment(paymentId, finalTxid);
            console.log('[A2U] ✅ Payment completed');

            // Update database record
            await query(
              `UPDATE a2u_payments SET
                payment_id = $1,
                txid = $2,
                status = 'completed',
                payment_completed_at = NOW(),
                completed_at = NOW()
              WHERE id = $3`,
              [paymentId, finalTxid, a2uPayment.id]
            );

            return {
              success: true,
              payment: {
                id: a2uPayment.id,
                transactionNumber: a2uPayment.transaction_number,
                paymentId: paymentId,
                txid: finalTxid,
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
        } catch (completionError: any) {
          console.error('[A2U] Failed to complete existing payment:', completionError);
          console.error('[A2U] Completion error details:', {
            message: completionError?.message,
            response: completionError?.response?.data,
            status: completionError?.response?.status,
            stack: completionError?.stack
          });

          // Return a more specific error message
          await query(
            `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
            [`Payment already exists but could not be completed: ${completionError?.message || 'Unknown error'}`, a2uPayment.id]
          );

          return {
            success: false,
            error: `Payment already exists on Pi Network. Please contact support with transaction ID: ${a2uPayment.transaction_number}`
          };
        }
      } else {
        console.error('[A2U] No payment ID found in existing payment object');
      }

      // Update A2U payment as failed
      await query(
        `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [sdkError?.message || 'Unknown SDK error', a2uPayment.id]
      );

      return {
        success: false,
        error: `Pi Network SDK error: ${sdkError?.message || 'Unknown error'}`
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