-- ============================================================================
-- REMOVE DUPLICATE PI ADDRESS COLUMN
-- ============================================================================
-- Migration 018 added pi_address to users table, but pi_wallet_address
-- already exists from migration 007 for the same purpose (receiving Pi).
-- This removes the duplicate and consolidates to use pi_wallet_address.
-- ============================================================================

BEGIN;

-- First, copy any data from pi_address to pi_wallet_address for users who have it
UPDATE users
SET pi_wallet_address = COALESCE(pi_address, pi_wallet_address)
WHERE pi_address IS NOT NULL AND pi_wallet_address IS NULL;

-- Update the security function that fetches settings to use pi_wallet_address
CREATE OR REPLACE FUNCTION get_user_account_settings(p_user_id UUID)
RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT jsonb_build_object(
        'personal', jsonb_build_object(
            'pi_wallet_address', u.pi_wallet_address,
            'cashback_preferences', u.cashback_preferences,
            'payment_preferences', u.payment_preferences,
            'notification_preferences', u.notification_preferences,
            'saved_addresses', u.saved_addresses,
            'purchase_history_settings', u.purchase_history_settings
        ),
        'business', CASE
            WHEN u.merchant_id IS NOT NULL THEN
                jsonb_build_object(
                    'payment_methods', m.payment_methods,
                    'store_hours', m.store_hours,
                    'store_locations', m.store_locations,
                    'staff_permissions', m.staff_permissions,
                    'billing_info', m.billing_info,
                    'api_keys', m.api_keys,
                    'analytics_config', m.analytics_config
                )
            ELSE NULL
        END,
        'user_info', jsonb_build_object(
            'id', u.id,
            'username', u.username,
            'pi_username', u.pi_username,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'phone', u.phone,
            'user_type', u.user_type,
            'role', u.role,
            'merchant_id', u.merchant_id
        )
    )
    FROM users u
    LEFT JOIN merchants m ON u.merchant_id = m.id
    WHERE u.id = p_user_id;
$$;

-- Update the security function to use pi_wallet_address instead of pi_address
CREATE OR REPLACE FUNCTION update_personal_settings(
    p_user_id UUID,
    p_settings_field VARCHAR(100),
    p_new_value JSONB,
    p_change_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_value JSONB;
    v_updated_value JSONB;
BEGIN
    -- Get current value
    CASE p_settings_field
        WHEN 'cashback_preferences' THEN
            SELECT cashback_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET cashback_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING cashback_preferences INTO v_updated_value;
        WHEN 'payment_preferences' THEN
            SELECT payment_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET payment_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING payment_preferences INTO v_updated_value;
        WHEN 'notification_preferences' THEN
            SELECT notification_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET notification_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING notification_preferences INTO v_updated_value;
        WHEN 'saved_addresses' THEN
            SELECT saved_addresses INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET saved_addresses = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING saved_addresses INTO v_updated_value;
        WHEN 'purchase_history_settings' THEN
            SELECT purchase_history_settings INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET purchase_history_settings = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING purchase_history_settings INTO v_updated_value;
        WHEN 'pi_wallet_address' THEN
            -- Handle pi_wallet_address separately as it's not JSONB
            SELECT pi_wallet_address INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET pi_wallet_address = p_new_value->>'pi_wallet_address', updated_at = NOW() WHERE id = p_user_id RETURNING
                jsonb_build_object('pi_wallet_address', pi_wallet_address) INTO v_updated_value;
        ELSE
            RAISE EXCEPTION 'Invalid personal settings field: %', p_settings_field;
    END CASE;

    -- Log the change
    INSERT INTO settings_audit_log (
        user_id, merchant_id, settings_type, field_changed,
        old_value, new_value, ip_address, user_agent, change_reason
    ) VALUES (
        p_user_id, NULL, 'personal', p_settings_field,
        v_old_value, v_updated_value, p_ip_address, p_user_agent, p_change_reason
    );

    RETURN v_updated_value;
END;
$$;

-- Now drop the redundant pi_address column with CASCADE to handle dependencies
ALTER TABLE users DROP COLUMN IF EXISTS pi_address CASCADE;

-- Update the comment on pi_wallet_address to reflect its dual purpose
COMMENT ON COLUMN users.pi_wallet_address IS 'Pi Network wallet address for receiving A2U payments and cashback rewards';

COMMIT;