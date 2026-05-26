// src/types/settings.ts

/**
 * Personal Settings Types
 * Corresponds to user table columns from migration 018
 */

export interface CashbackPreferences {
  enable_pi_cashback: boolean;
  enable_mypipos_tokens: boolean;
  cashback_percentage: number;
}

export interface PaymentPreferences {
  default_payment_method: 'pi' | 'cash' | 'card';
  save_payment_methods: boolean;
  saved_methods?: SavedPaymentMethod[];
}

export interface SavedPaymentMethod {
  id: string;
  type: 'pi' | 'cash' | 'card';
  label: string;
  is_default: boolean;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  promotional_emails: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  is_default: boolean;
}

export interface PurchaseHistorySettings {
  save_purchase_history: boolean;
  receipt_preferences: 'digital' | 'email' | 'both';
}

export interface PersonalSettings {
  pi_address?: string;
  cashback_preferences: CashbackPreferences;
  payment_preferences: PaymentPreferences;
  notification_preferences: NotificationPreferences;
  saved_addresses: SavedAddress[];
  purchase_history_settings: PurchaseHistorySettings;
}

/**
 * Business Settings Types
 * Corresponds to merchants table columns from migration 018
 */

export interface BusinessInfo {
  business_name: string;
  business_type?: string;
  tax_id?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface PiPaymentSettings {
  auto_confirm?: boolean;
  timeout_seconds?: number;
  min_confirmations?: number;
}

export interface CashSettings {
  allow_change?: boolean;
  require_denomination_entry?: boolean;
}

export interface CardSettings {
  processor?: string;
  allow_partial?: boolean;
  tip_enabled?: boolean;
}

export interface PaymentMethodsConfig {
  enabled_methods: Array<'pi' | 'cash' | 'card'>;
  default_method: 'pi' | 'cash' | 'card';
  pi_settings?: PiPaymentSettings;
  cash_settings?: CashSettings;
  card_settings?: CardSettings;
}

export interface DayHours {
  open: string;
  closed: boolean;
  close_time: string;
}

export interface StoreHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string;
  email?: string;
  terminal_ids?: string[];
  is_active: boolean;
}

export interface StaffPermissions {
  default_cashier_role: 'cashier' | 'manager';
  allow_manager_analytics: boolean;
  allow_manager_inventory: boolean;
  allow_staff_discounts: boolean;
}

export interface BillingAddress {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface BillingInfo {
  billing_address: BillingAddress;
  payment_method: 'pi' | 'cash' | 'card';
  invoice_email: string;
  tax_exempt: boolean;
}

export interface AnalyticsConfig {
  enable_analytics: boolean;
  retention_days: number;
  export_permissions: Array<'admin' | 'manager' | 'cashier'>;
  custom_metrics: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

export interface BusinessSettings {
  payment_methods: PaymentMethodsConfig;
  store_hours: StoreHours;
  store_locations: StoreLocation[];
  staff_permissions: StaffPermissions;
  billing_info: BillingInfo;
  api_keys: Record<string, string>;
  analytics_config: AnalyticsConfig;
}

/**
 * Combined Account Settings
 * Matches the structure returned by get_user_account_settings function
 */

export interface UserInfo {
  id: string;
  username: string;
  pi_username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_type?: 'customer' | 'merchant';
  role?: 'admin' | 'cashier' | 'manager' | 'merchant_admin';
  merchant_id?: string | null;
}

export interface AccountSettings {
  personal: PersonalSettings;
  business: BusinessSettings | null;
  user_info: UserInfo;
}

/**
 * API Response Types
 */

export interface SettingsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  field?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  merchant_id?: string | null;
  settings_type: 'personal' | 'business';
  field_changed: string;
  old_value: any;
  new_value: any;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
  change_reason?: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  has_more: boolean;
}

/**
 * Settings Update Types
 */

export type PersonalSettingsField =
  | 'pi_address'
  | 'cashback_preferences'
  | 'payment_preferences'
  | 'notification_preferences'
  | 'saved_addresses'
  | 'purchase_history_settings';

export type BusinessSettingsField =
  | 'payment_methods'
  | 'store_hours'
  | 'store_locations'
  | 'staff_permissions'
  | 'billing_info'
  | 'api_keys'
  | 'analytics_config';

export interface SettingsUpdateParams<T> {
  field: T;
  value: any;
  change_reason?: string;
}

/**
 * Validation Types
 */

export interface SettingsValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: SettingsValidationError[];
}
