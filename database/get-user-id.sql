-- ============================================================================
-- Get Your User ID for Test Pi Claim Reset
-- ============================================================================
-- Run this query first to get your actual user ID
-- ============================================================================

-- Find your user by username
SELECT
  id as user_id,  -- This is what you need!
  username,
  pi_uid,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Or search by specific username
-- SELECT id, username, pi_uid
-- FROM users
-- WHERE username = 'your-username-here';

-- ============================================================================
-- Once you have your user_id, use it in the reset query below
-- ============================================================================

-- Copy your user_id from above and paste it here:
-- DELETE FROM a2u_payments
-- WHERE to_user_id = 'PASTE_YOUR_USER_ID_HERE'
-- AND transaction_type = 'customer_reward'
-- AND metadata->>'reward_type' = 'test_pi_claim';