-- ============================================================================
-- Step 1: Find Your User ID
-- ============================================================================
-- Run this query first to get your actual user ID

SELECT
  id as user_id,           -- Copy this UUID!
  username,
  pi_uid,
  email,
  created_at
FROM users
-- WHERE username = 'your-username'  -- Uncomment and add your username if you know it
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- Step 2: Check if you have a Test Pi claim
-- ============================================================================
-- After you get your user_id from above, check if you have a claim
-- Replace 'YOUR_USER_ID_FROM_STEP_1' with your actual ID

SELECT
  id,
  transaction_number,
  amount,
  status,
  created_at as claimed_at
FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID_FROM_STEP_1'  -- Paste your ID here
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';

-- ============================================================================
-- Step 3: Reset Your Test Pi Claim
-- ============================================================================
-- Delete your claim record
-- Replace 'YOUR_USER_ID_FROM_STEP_1' with your actual ID

DELETE FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID_FROM_STEP_1'  -- Paste your ID here
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';

-- ============================================================================
-- Step 4: Verify Reset
-- ============================================================================
-- Should return 0 claims if reset was successful
SELECT COUNT(*) as remaining_claims
FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID_FROM_STEP_1'  -- Paste your ID here
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';

-- ============================================================================
-- Example usage:
-- ============================================================================
-- 1. Run Step 1 query to get your user ID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
-- 2. Copy that ID and replace 'YOUR_USER_ID_FROM_STEP_1' in the queries below
-- 3. Run Step 2 to check your claims
-- 4. Run Step 3 to delete the claim
-- 5. Run Step 4 to verify it's deleted