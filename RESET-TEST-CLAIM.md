# How to Reset Test Pi Claim Status

There are several ways to reset the test Pi claim status for testing purposes.

## 🚀 Method 1: Using the Debug UI (Easiest)

**Step 1: Go to Customer Page**
- Navigate to `/customer` in your app
- Make sure you're logged in as a customer

**Step 2: Expand Debug Panel**
- Click "Show" on the "🔍 Debug Info" section
- Look for the "Reset Claim Status (Debug)" button
- This button only appears if you've already claimed

**Step 3: Confirm Reset**
- Click "Reset Claim Status (Debug)"
- Confirm the popup dialog
- Your claim status will be cleared immediately

**Step 4: Verify Reset**
- The card should change from "Test Pi Claimed!" back to "Claim Your Test Pi"
- You can now claim again

## 🌐 Method 2: Using API Endpoints

### Check Claim Status
```bash
curl "http://localhost:3000/api/debug/reset-test-claim?userId=YOUR_USER_ID"
```

### Reset Claim Status
```bash
curl -X POST "http://localhost:3000/api/debug/reset-test-claim" \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Test Pi claim status reset successfully",
  "reset": true,
  "deletedClaim": {
    "id": "...",
    "transactionNumber": "A2U-TEST-...",
    "amount": 1.0,
    "claimedAt": "2026-05-25..."
  }
}
```

## 🗄️ Method 3: Direct Database SQL

### Step 1: Get Your User ID
```sql
-- Find your user ID
SELECT id, username, pi_uid
FROM users
WHERE username = 'your-username';
```

### Step 2: Check Current Claim Status
```sql
-- See if you have a test Pi claim
SELECT
  transaction_number,
  amount,
  created_at
FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID'
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';
```

### Step 3: Delete the Claim Record
```sql
-- Reset specific user's claim
DELETE FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID'
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';
```

### Step 4: Verify Reset
```sql
-- Confirm deletion
SELECT COUNT(*) as claims_remaining
FROM a2u_payments
WHERE to_user_id = 'YOUR_USER_ID'
AND transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';
-- Should return 0
```

## 🧹 Method 4: Reset ALL Test Pi Claims (Testing Cleanup)

**⚠️ Use with caution - affects all users!**

```sql
-- Reset all test Pi claims in the system
DELETE FROM a2u_payments
WHERE transaction_type = 'customer_reward'
AND metadata->>'reward_type' = 'test_pi_claim';
```

## 🔧 Method 5: Using Database Script

I've created a SQL script for you: `database/reset-test-claim.sql`

```bash
# Run the script
psql -U your_user -d your_database -f database/reset-test-claim.sql
```

## 📋 What Gets Reset

When you reset a test Pi claim:
- ✅ The claim record is deleted from `a2u_payments` table
- ✅ User can claim Test Pi again
- ✅ All claim history for that user is cleared
- ❌ Does NOT affect actual Pi wallet balance (blockchain is permanent)
- ❌ Does NOT affect other types of payments

## 🎯 Quick Reset Workflow

1. **Check current status**: Visit customer page
2. **Expand debug panel**: Click "Show" button
3. **Reset claim**: Click "Reset Claim Status (Debug)"
4. **Confirm**: Click OK on dialog
5. **Verify**: Card should show "Claim Your Test Pi" button again

## 🔍 Troubleshooting

### Reset button doesn't appear
- Make sure you've already claimed Test Pi
- Expand the debug panel first
- Check if you're in customer mode

### API reset fails
- Verify your user ID is correct
- Check database connection
- Look for error messages in response

### Database reset doesn't work
- Make sure you're using the correct user ID (UUID format)
- Verify the claim exists before trying to delete
- Check database permissions

## 🚫 Important Notes

- **Test Pi claims only**: This only affects test Pi claims, not regular payments
- **Blockchain permanence**: Actual Pi transactions on blockchain cannot be reversed
- **Testing purpose**: Use this for development/testing only
- **Production caution**: Disable debug endpoints in production

---

**Need immediate reset?** Use Method 1 (UI) - it's the fastest and easiest!