-- ============================================================================
-- Reset Test Pi Claim Status
-- ============================================================================
-- This script clears the test Pi claim status for a user
-- Use this for testing purposes to allow re-claiming
-- ============================================================================

-- Method 1: Reset specific user's claim (replace USER_ID with actual UUID)
DELETE FROM a2u_payments
WHERE to_user_id = 'USER_ID'  -- Replace with actual user UUID
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';

-- Method 2: Reset ALL test Pi claims (use with caution!)
-- DELETE FROM a2u_payments
-- WHERE transaction_type = 'customer_reward'
-- AND metadata->>'reward_type' = 'test_pi_claim';

-- Method 3: Check who has claimed before resetting
SELECT
  u.username,
  u.pi_uid,
  a.transaction_number,
  a.amount,
  a.created_at as claimed_at
FROM a2u_payments a
JOIN users u ON a.to_user_id = u.id
WHERE a.transaction_type = 'customer_reward'
AND a.metadata->>'reward_type' = 'test_pi_claim'
ORDER BY a.created_at DESC;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this after reset to verify the claim was deleted
SELECT
  'Test Pi claims remaining: ' || COUNT(*) as status
FROM a2u_payments
WHERE transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Check specific user's claim status:
-- SELECT * FROM a2u_payments
-- WHERE to_user_id = 'your-user-id-here'
-- AND transaction_type = 'customer_reward'
-- AND metadata->>'reward_type' = 'test_pi_claim';

-- Reset specific user:
-- DELETE FROM a2u_payments
-- WHERE to_user_id = 'your-user-id-here'
-- AND transaction_type = 'customer_reward'
-- AND metadata->>'reward_type' = 'test_pi_claim';

-- Reset all claims (testing cleanup):
-- DELETE FROM a2u_payments
-- WHERE transaction_type = 'customer_reward'
-- AND metadata->>'reward_type' = 'test_pi_claim';