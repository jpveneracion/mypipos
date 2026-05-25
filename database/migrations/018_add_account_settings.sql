-- ============================================================================
-- ACCOUNT SETTINGS MIGRATION
-- ============================================================================
-- Adds account settings support for both customers (pioneers) and merchants
-- Includes personal settings, business settings, and cashback functionality
-- Follows established RLS and SECURITY DEFINER patterns from migration 004
-- ============================================================================

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PERSONAL SETTINGS ADDITIONS TO USERS TABLE
-- ============================================================================

-- Add personal account settings columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pi_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS cashback_preferences JSONB DEFAULT '{"enable_pi_cashback": true, "enable_mypipos_tokens": true, "cashback_percentage": 2.5}',
ADD COLUMN IF NOT EXISTS payment_preferences JSONB DEFAULT '{"default_payment_method": "pi", "save_payment_methods": false}',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications": true, "push_notifications": false, "sms_notifications": false, "promotional_emails": true}',
ADD COLUMN IF NOT EXISTS saved_addresses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS purchase_history_settings JSONB DEFAULT '{"save_purchase_history": true, "receipt_preferences": "digital"}';

-- Add comments for documentation
COMMENT ON COLUMN users.pi_address IS 'Pi Network address for receiving cashback in Pi tokens or mypipos tokens - single address for both token types';
COMMENT ON COLUMN users.cashback_preferences IS 'User preferences for cashback rewards including enablement flags and percentage settings';
COMMENT ON COLUMN users.payment_preferences IS 'User payment method preferences including default method and saved payment methods';
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences across email, push, SMS channels';
COMMENT ON COLUMN users.saved_addresses IS 'Array of saved delivery/billing addresses for customer purchases';
COMMENT ON COLUMN users.purchase_history_settings IS 'Settings for purchase history tracking and receipt preferences';

-- ============================================================================
-- BUSINESS SETTINGS ADDITIONS TO MERCHANTS TABLE
-- ============================================================================

-- Add business settings columns to merchants table
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"enabled_methods": ["pi", "cash", "card"], "default_method": "pi", "pi_settings": {}, "cash_settings": {}, "card_settings": {}}',
ADD COLUMN IF NOT EXISTS store_hours JSONB DEFAULT '{"monday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "tuesday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "wednesday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "thursday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "friday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "saturday": {"open": "10:00", "closed": false, "close_time": "16:00"}, "sunday": {"closed": true}}',
ADD COLUMN IF NOT EXISTS store_locations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS staff_permissions JSONB DEFAULT '{"default_cashier_role": "cashier", "allow_manager_analytics": true, "allow_manager_inventory": true, "allow_staff_discounts": false}',
ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{"billing_address": {}, "payment_method": "pi", "invoice_email": "", "tax_exempt": false}',
ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{"enable_analytics": true, "retention_days": 365, "export_permissions": ["admin", "manager"], "custom_metrics": []}';

-- Add comments for documentation
COMMENT ON COLUMN merchants.payment_methods IS 'Configured payment methods including Pi Network, cash, card with their specific settings and processing rules';
COMMENT ON COLUMN merchants.store_hours IS 'Weekly store operating hours with open/close times and closure indicators for each day';
COMMENT ON COLUMN merchants.store_locations IS 'Array of store/location objects with address, contact, terminal assignments, and operational settings';
COMMENT ON COLUMN merchants.staff_permissions IS 'Default staff role permissions and access controls for different user roles within the merchant organization';
COMMENT ON COLUMN merchants.billing_info IS 'Merchant billing information including address, payment preferences, and tax exemption status';
COMMENT ON COLUMN merchants.api_keys IS 'Encrypted API keys for third-party integrations and payment processors';
COMMENT ON COLUMN merchants.analytics_config IS 'Analytics and reporting configuration including retention, export permissions, and custom metrics';

-- ============================================================================
-- SETTINGS AUDIT LOG TABLE
-- ============================================================================

-- Create settings audit log table to track all settings changes
CREATE TABLE IF NOT EXISTS settings_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    settings_type VARCHAR(50) NOT NULL, -- 'personal' or 'business'
    field_changed VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    change_reason TEXT
);

-- Add indexes for audit log queries
CREATE INDEX idx_settings_audit_log_user_id ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_merchant_id ON settings_audit_log(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX idx_settings_audit_log_settings_type ON settings_audit_log(settings_type);
CREATE INDEX idx_settings_audit_log_changed_at ON settings_audit_log(changed_at DESC);

-- Enable RLS on settings_audit_log table
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings_audit_log
-- Users can read their own personal settings audit logs
CREATE POLICY settings_audit_log_select_own_policy ON settings_audit_log
    FOR SELECT
    TO mypipos_app
    USING (
        user_id = current_setting('app.current_user_id', true)::UUID
        AND settings_type = 'personal'
    );

-- Merchant admins can read business settings audit logs for their merchant
CREATE POLICY settings_audit_log_select_merchant_policy ON settings_audit_log
    FOR SELECT
    TO mypipos_app
    USING (
        merchant_id = current_setting('app.current_merchant_id', true)::UUID
        AND settings_type = 'business'
    );

-- System can insert audit logs (done via trigger function)
CREATE POLICY settings_audit_log_insert_policy ON settings_audit_log
    FOR INSERT
    TO mypipos_app
    WITH CHECK (true);

-- Add comment for audit log table
COMMENT ON TABLE settings_audit_log IS 'Audit trail for all account settings changes, supports compliance and debugging with user/merchant context tracking';

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Function to update personal settings with audit logging
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
        WHEN 'pi_address' THEN
            -- Handle pi_address separately as it's not JSONB
            SELECT pi_address INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET pi_address = p_new_value->>'pi_address', updated_at = NOW() WHERE id = p_user_id RETURNING
                jsonb_build_object('pi_address', pi_address) INTO v_updated_value;
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

-- Function to update business settings with audit logging
CREATE OR REPLACE FUNCTION update_business_settings(
    p_merchant_id UUID,
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
        WHEN 'payment_methods' THEN
            SELECT payment_methods INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET payment_methods = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING payment_methods INTO v_updated_value;
        WHEN 'store_hours' THEN
            SELECT store_hours INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET store_hours = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING store_hours INTO v_updated_value;
        WHEN 'store_locations' THEN
            SELECT store_locations INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET store_locations = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING store_locations INTO v_updated_value;
        WHEN 'staff_permissions' THEN
            SELECT staff_permissions INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET staff_permissions = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING staff_permissions INTO v_updated_value;
        WHEN 'billing_info' THEN
            SELECT billing_info INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET billing_info = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING billing_info INTO v_updated_value;
        WHEN 'api_keys' THEN
            SELECT api_keys INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET api_keys = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING api_keys INTO v_updated_value;
        WHEN 'analytics_config' THEN
            SELECT analytics_config INTO v_old_value FROM merchants WHERE id = p_merchant_id;
            UPDATE merchants SET analytics_config = p_new_value, updated_at = NOW() WHERE id = p_merchant_id RETURNING analytics_config INTO v_updated_value;
        ELSE
            RAISE EXCEPTION 'Invalid business settings field: %', p_settings_field;
    END CASE;

    -- Log the change
    INSERT INTO settings_audit_log (
        user_id, merchant_id, settings_type, field_changed,
        old_value, new_value, ip_address, user_agent, change_reason
    ) VALUES (
        p_user_id, p_merchant_id, 'business', p_settings_field,
        v_old_value, v_updated_value, p_ip_address, p_user_agent, p_change_reason
    );

    RETURN v_updated_value;
END;
$$;

-- Function to get complete user settings (personal + business if applicable)
CREATE OR REPLACE FUNCTION get_user_account_settings(p_user_id UUID)
RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT jsonb_build_object(
        'personal', jsonb_build_object(
            'pi_address', u.pi_address,
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

-- Function to get user's settings audit log
CREATE OR REPLACE FUNCTION get_user_settings_audit_log(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    settings_type VARCHAR(50),
    field_changed VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMP WITH TIME ZONE,
    change_reason TEXT
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        id, settings_type, field_changed, old_value, new_value, changed_at, change_reason
    FROM settings_audit_log
    WHERE user_id = p_user_id
    ORDER BY changed_at DESC
    LIMIT p_limit;
$$;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for users with cashback addresses (for cashback processing)
CREATE OR REPLACE VIEW users_with_cashback AS
SELECT
    u.id,
    u.username,
    u.pi_username,
    u.pi_address,
    u.cashback_preferences,
    u.loyalty_points,
    u.total_purchases,
    u.created_at
FROM users u
WHERE u.pi_address IS NOT NULL
    AND (u.cashback_preferences->>'enable_pi_cashback')::boolean = true;

-- View for merchant settings summary
CREATE OR REPLACE VIEW merchant_settings_summary AS
SELECT
    m.id as merchant_id,
    m.business_name,
    m.payment_methods->>'default_method' as default_payment_method,
    m.store_hours,
    jsonb_array_length(m.store_locations) as location_count,
    m.staff_permissions->>'allow_manager_analytics' as allow_manager_analytics,
    m.analytics_config->>'enable_analytics' as analytics_enabled,
    m.updated_at as settings_last_updated
FROM merchants m
WHERE m.is_active = true;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION update_personal_settings TO mypipos_app;
GRANT EXECUTE ON FUNCTION update_business_settings TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_user_account_settings TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_user_settings_audit_log TO mypipos_app;

-- Grant permissions on new tables
GRANT SELECT, INSERT ON settings_audit_log TO mypipos_app;

-- Grant usage on views
GRANT SELECT ON users_with_cashback TO mypipos_app;
GRANT SELECT ON merchant_settings_summary TO mypipos_app;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for common settings queries
CREATE INDEX idx_users_pi_address ON users(pi_address) WHERE pi_address IS NOT NULL;
CREATE INDEX idx_users_cashback_preferences ON users USING GIN (cashback_preferences);
CREATE INDEX idx_merchants_payment_methods ON merchants USING GIN (payment_methods);
CREATE INDEX idx_merchants_store_locations ON merchants USING GIN (store_locations);

-- ============================================================================
-- DATA MIGRATION FOR EXISTING USERS
-- ============================================================================

-- Ensure all existing users have default settings values
UPDATE users
SET
    cashback_preferences = COALESCE(cashback_preferences, '{"enable_pi_cashback": true, "enable_mypipos_tokens": true, "cashback_percentage": 2.5}'),
    payment_preferences = COALESCE(payment_preferences, '{"default_payment_method": "pi", "save_payment_methods": false}'),
    notification_preferences = COALESCE(notification_preferences, '{"email_notifications": true, "push_notifications": false, "sms_notifications": false, "promotional_emails": true}'),
    saved_addresses = COALESCE(saved_addresses, '[]'),
    purchase_history_settings = COALESCE(purchase_history_settings, '{"save_purchase_history": true, "receipt_preferences": "digital"}')
WHERE cashback_preferences IS NULL
    OR payment_preferences IS NULL
    OR notification_preferences IS NULL
    OR saved_addresses IS NULL
    OR purchase_history_settings IS NULL;

-- Ensure all existing merchants have default business settings
UPDATE merchants
SET
    payment_methods = COALESCE(payment_methods, '{"enabled_methods": ["pi", "cash", "card"], "default_method": "pi", "pi_settings": {}, "cash_settings": {}, "card_settings": {}}'),
    store_hours = COALESCE(store_hours, '{"monday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "tuesday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "wednesday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "thursday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "friday": {"open": "09:00", "closed": false, "close_time": "17:00"}, "saturday": {"open": "10:00", "closed": false, "close_time": "16:00"}, "sunday": {"closed": true}}'),
    store_locations = COALESCE(store_locations, '[]'),
    staff_permissions = COALESCE(staff_permissions, '{"default_cashier_role": "cashier", "allow_manager_analytics": true, "allow_manager_inventory": true, "allow_staff_discounts": false}'),
    billing_info = COALESCE(billing_info, '{"billing_address": {}, "payment_method": "pi", "invoice_email": "", "tax_exempt": false}'),
    api_keys = COALESCE(api_keys, '{}'),
    analytics_config = COALESCE(analytics_config, '{"enable_analytics": true, "retention_days": 365, "export_permissions": ["admin", "manager"], "custom_metrics": []}')
WHERE payment_methods IS NULL
    OR store_hours IS NULL
    OR store_locations IS NULL
    OR staff_permissions IS NULL
    OR billing_info IS NULL
    OR api_keys IS NULL
    OR analytics_config IS NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_personal_settings IS 'Security definer function to update user personal settings with automatic audit logging - supports cashback_preferences, payment_preferences, notification_preferences, saved_addresses, purchase_history_settings, pi_address';
COMMENT ON FUNCTION update_business_settings IS 'Security definer function to update merchant business settings with automatic audit logging - requires merchant_id and user_id for permission tracking';
COMMENT ON FUNCTION get_user_account_settings IS 'Security definer function that retrieves complete user account settings including both personal and business settings if user is a merchant';
COMMENT ON FUNCTION get_user_settings_audit_log IS 'Security definer function to retrieve user''s settings change history with configurable limit';
COMMENT ON VIEW users_with_cashback IS 'View of users who have configured Pi addresses for cashback rewards - used by cashback processing system';
COMMENT ON VIEW merchant_settings_summary IS 'Summary view of merchant settings for analytics and reporting - includes payment methods, locations, and analytics configuration';

COMMIT;