-- ============================================================================
-- UPDATE SETTINGS FUNCTIONS FOR BYTEA WALLET ADDRESS
-- ============================================================================
-- Migration 025
-- Purpose: Update settings functions to handle bytea wallet address conversion
-- ============================================================================

BEGIN;

-- Update the get_user_account_settings function to convert bytea to hex string
CREATE OR REPLACE FUNCTION get_user_account_settings(p_user_id UUID)
RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT jsonb_build_object(
        'personal', jsonb_build_object(
            'pi_wallet_address', CASE
                WHEN u.pi_wallet_address IS NOT NULL THEN encode(u.pi_wallet_address, 'hex')
                ELSE NULL
            END,
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

-- Update the update_personal_settings function to handle bytea wallet address
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
    v_wallet_address_hex TEXT;
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
            -- Handle pi_wallet_address separately as it's BYTEA not JSONB
            -- Convert old value to hex for logging
            SELECT encode(pi_wallet_address, 'hex') INTO v_wallet_address_hex FROM users WHERE id = p_user_id;
            v_old_value := jsonb_build_object('pi_wallet_address', v_wallet_address_hex);

            -- Convert hex string from p_new_value to bytea and update
            DECLARE
                v_new_address_hex TEXT;
                v_new_address_bytea BYTEA;
            BEGIN
                v_new_address_hex := p_new_value->>'pi_wallet_address';

                -- Validate and convert hex to bytea
                IF v_new_address_hex IS NOT NULL AND v_new_address_hex != '' THEN
                    -- Remove '0x' prefix if present
                    v_new_address_hex := regexp_replace(v_new_address_hex, '^0x', '', 'i');

                    -- Validate hex format
                    IF v_new_address_hex ~ '^[0-9a-fA-F]+$' THEN
                        v_new_address_bytea := decode(v_new_address_hex, 'hex');
                        UPDATE users SET pi_wallet_address = v_new_address_bytea, updated_at = NOW() WHERE id = p_user_id;

                        -- Convert new value to hex for logging
                        SELECT encode(pi_wallet_address, 'hex') INTO v_wallet_address_hex FROM users WHERE id = p_user_id;
                        v_updated_value := jsonb_build_object('pi_wallet_address', v_wallet_address_hex);
                    ELSE
                        RAISE EXCEPTION 'Invalid hex format for wallet address';
                    END IF;
                ELSE
                    UPDATE users SET pi_wallet_address = NULL, updated_at = NOW() WHERE id = p_user_id;
                    v_updated_value := jsonb_build_object('pi_wallet_address', NULL);
                END IF;
            END;
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

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the functions were updated
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_user_account_settings', 'update_personal_settings')
AND routine_schema = 'public';

-- Test that get_user_account_settings returns wallet address as hex
-- SELECT get_user_account_settings('your-user-id-here');

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;

-- To rollback, restore the previous version from migration 019
*/