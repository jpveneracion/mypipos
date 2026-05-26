-- Test the exact queries our code is running

-- Step 1: Find user by ID (what get-by-id does)
SELECT
    id,
    username,
    pi_uid,
    pi_wallet_address,
    CASE WHEN pi_uid IS NULL THEN 'NULL' ELSE 'HAS PI_UID' END as has_pi_uid
FROM users
WHERE id = 'd821f5d3-8e78-4cfe-bd0f-891d9198e6c8';

-- Step 2: Try to find same user by pi_uid (what A2U library does)
SELECT
    id,
    username,
    pi_uid,
    pi_wallet_address
FROM users
WHERE pi_uid = 'd5ffc915-dc06-4449-9480-5f183d3a1964';

-- Step 3: Check for any data type issues
SELECT
    id,
    username,
    pi_uid,
    LENGTH(pi_uid) as pi_uid_length,
    TYPEOF(pi_uid::text) as pi_uid_type,
    pi_wallet_address
FROM users
WHERE id = 'd821f5d3-8e78-4cfe-bd0f-891d9198e6c8';

-- Step 4: Check if there are multiple users with same pi_uid
SELECT
    id,
    username,
    pi_uid,
    pi_wallet_address
FROM users
WHERE pi_uid = 'd5ffc915-dc06-4449-9480-5f183d3a1964'
OR id = 'd821f5d3-8e78-4cfe-bd0f-891d9198e6c8';