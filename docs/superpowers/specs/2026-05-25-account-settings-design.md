# Account Settings Design Specification

**Date:** 2026-05-25  
**Author:** Claude (Superpowers Brainstorming)  
**Version:** 1.0  
**Status:** Approved

## Executive Summary

This specification defines a comprehensive account settings system for myPiPOS that supports both customers (Pi Network pioneers) and merchants with enterprise-level configuration needs. The system features a unified settings portal with clear tab separation between personal and business settings, supporting users who may operate in both roles.

## Table of Contents

1. [Requirements Overview](#requirements-overview)
2. [Architecture & Routing](#architecture--routing)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [UI/UX Design](#uiux-design)
6. [State Management](#state-management)
7. [Security & Privacy](#security--privacy)
8. [Testing Strategy](#testing-strategy)
9. [Migration Plan](#migration-plan)
10. [Future Enhancements](#future-enhancements)

## Requirements Overview

### Personal Settings Requirements
- **Profile Management:** Avatar upload, name, email, phone
- **Cashback Configuration:** Single Pi address for Pi tokens and mypipos tokens, enable/disable toggles
- **Payment Preferences:** Default payment method, saved payment methods
- **Purchase History Settings:** History retention, receipt preferences
- **Address Management:** Multiple saved addresses with default selection
- **Notification Preferences:** Email, push, SMS toggles by category

### Business Settings Requirements
- **Business Information:** Name, type, tax ID, contact details
- **Payment Methods:** Enable/disable methods, processor configurations
- **Store Operations:** Locations, hours, terminal assignments
- **Staff Management:** Role permissions, access controls
- **Subscription Management:** Billing info, payment methods
- **API Integration:** API keys, webhook configurations
- **Analytics Configuration:** Enable/disable, retention, export permissions

### Key User Insights
- Merchants can be both customers AND merchants (dual-role users)
- Single Pi address for all token types (Pi tokens + mypipos tokens)
- Merchants can earn cashback when making purchases as customers
- Multi-tenant architecture requires proper data isolation

## Architecture & Routing

### Route Structure
```
/account-settings - Main unified settings page
├── Personal Settings Tab (always visible)
└── Business Settings Tab (merchant roles only)
```

### Component Hierarchy
```
/app/account-settings/page.tsx
├── SettingsLayout (tabs container)
├── PersonalSettingsTab
│   ├── ProfileSettings
│   ├── CashbackAddressSettings  
│   ├── PaymentPreferences
│   ├── AddressManagement
│   ├── PurchaseHistorySettings
│   └── NotificationPreferences
└── BusinessSettingsTab
    ├── BusinessInfoSettings
    ├── PaymentMethodsSettings
    ├── StoreLocationsSettings
    ├── StoreHoursSettings
    ├── StaffPermissionsSettings
    ├── SubscriptionBillingSettings
    ├── APIKeysSettings
    └── AnalyticsPreferencesSettings
```

### Access Control Matrix
```
┌─────────────────────┬───────────────┬───────────────┐
│ Action              │ Customers     │ Merchants     │
├─────────────────────┼───────────────┼───────────────┤
│ View Personal Tab   │ ✓             │ ✓             │
│ Edit Personal       │ ✓ (own only)  │ ✓ (own only)  │
│ View Business Tab   │ ✗             │ ✓ (own only)  │
│ Edit Business       │ ✗             │ ✓ (admin)     │
│ View Audit Logs     │ ✓ (personal)  │ ✓ (both)      │
└─────────────────────┴───────────────┴───────────────┘
```

### Quick Access Integration
- "Settings" button in Header component
- Quick links from customer dashboard and merchant dashboard
- Breadcrumb navigation for context

## Database Schema

### Migration File
`database/migrations/018_add_account_settings.sql`

### Users Table Additions
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pi_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cashback_preferences JSONB DEFAULT '{"enable_pi_cashback": true, "enable_mypipos_tokens": true, "cashback_percentage": 2.5}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_preferences JSONB DEFAULT '{"default_payment_method": "pi", "save_payment_methods": false}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications": true, "push_notifications": false, "sms_notifications": false, "promotional_emails": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_addresses JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS purchase_history_settings JSONB DEFAULT '{"save_purchase_history": true, "receipt_preferences": "digital"}';
```

### Merchants Table Additions
```sql
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"enabled_methods": ["pi", "cash", "card"], "default_method": "pi"}';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS store_hours JSONB DEFAULT '{...}';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS store_locations JSONB DEFAULT '[]';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS staff_permissions JSONB DEFAULT '{...}';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{}';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{}';
```

### Settings Audit Log Table
```sql
CREATE TABLE settings_audit_log (
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
```

### Security Functions
- `update_personal_settings(user_id, field, value, reason, ip, user_agent)` - Updates personal settings with audit logging
- `update_business_settings(merchant_id, user_id, field, value, reason, ip, user_agent)` - Updates business settings with audit logging
- `get_user_account_settings(user_id)` - Retrieves complete user settings (personal + business)
- `get_user_settings_audit_log(user_id, limit)` - Returns settings change history

### Database Views
- `users_with_cashback` - Users who have configured Pi addresses for cashback
- `merchant_settings_summary` - Merchant settings overview for analytics

### Performance Indexes
```sql
CREATE INDEX idx_users_pi_address ON users(pi_address) WHERE pi_address IS NOT NULL;
CREATE INDEX idx_users_cashback_preferences ON users USING GIN (cashback_preferences);
CREATE INDEX idx_merchants_payment_methods ON merchants USING GIN (payment_methods);
CREATE INDEX idx_settings_audit_log_user_id ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_changed_at ON settings_audit_log(changed_at DESC);
```

## API Design

### Personal Settings Endpoints

#### GET /api/user/settings
Retrieves all personal settings for the authenticated user.

**Response:**
```json
{
  "profile": {
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": "https://..."
  },
  "cashbackPreferences": {
    "piAddress": "0x123...",
    "enablePiCashback": true,
    "enableMypiposTokens": true,
    "cashbackPercentage": 2.5
  },
  "paymentPreferences": {
    "defaultPaymentMethod": "pi",
    "savePaymentMethods": false,
    "savedMethods": []
  },
  "savedAddresses": [
    {
      "id": "addr-1",
      "label": "Home",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "isDefault": true
    }
  ],
  "purchaseHistorySettings": {
    "savePurchaseHistory": true,
    "receiptPreferences": "digital"
  },
  "notificationPreferences": {
    "emailNotifications": true,
    "pushNotifications": false,
    "smsNotifications": false,
    "promotionalEmails": true
  }
}
```

#### PUT /api/user/settings/:field
Updates a specific personal settings field.

**Request:**
```json
{
  "cashbackPreferences": {
    "piAddress": "0x456...",
    "enablePiCashback": true,
    "enableMypiposTokens": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "field": "cashbackPreferences",
  "updatedValue": {...},
  "auditLogId": "uuid-123"
}
```

### Business Settings Endpoints

#### GET /api/merchant/settings
Retrieves all business settings for the authenticated merchant.

**Response:**
```json
{
  "businessInfo": {
    "businessName": "My Store",
    "businessType": "retail",
    "taxId": "12-3456789",
    "phone": "+1234567890",
    "email": "store@example.com"
  },
  "paymentMethods": {
    "enabledMethods": ["pi", "cash", "card"],
    "defaultMethod": "pi",
    "piSettings": {
      "autoConfirm": true,
      "timeoutSeconds": 300
    }
  },
  "storeLocations": [
    {
      "id": "loc-1",
      "name": "Main Store",
      "address": {...},
      "isDefault": true,
      "terminalIds": ["pos-1", "pos-2"]
    }
  ],
  "storeHours": {
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    // ... other days
  },
  "staffPermissions": {
    "defaultCashierRole": "cashier",
    "allowManagerAnalytics": true,
    "allowManagerInventory": true,
    "allowStaffDiscounts": false
  },
  "billingInfo": {
    "billingAddress": {...},
    "paymentMethod": "pi",
    "invoiceEmail": "billing@example.com",
    "taxExempt": false
  },
  "apiKeys": {},
  "analyticsConfig": {
    "enableAnalytics": true,
    "retentionDays": 365,
    "exportPermissions": ["admin", "manager"],
    "customMetrics": []
  }
}
```

#### PUT /api/merchant/settings/:field
Updates a specific business settings field.

**Request:**
```json
{
  "paymentMethods": {
    "enabledMethods": ["pi", "cash", "card"],
    "defaultMethod": "pi",
    "piSettings": {
      "autoConfirm": true,
      "timeoutSeconds": 300
    }
  }
}
```

### Audit Log Endpoints

#### GET /api/user/settings/audit-log
#### GET /api/merchant/settings/audit-log
Retrieves settings change history.

**Query Parameters:**
- `limit`: Number of entries to return (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "entries": [
    {
      "id": "log-1",
      "settingsType": "personal",
      "fieldChanged": "cashbackPreferences",
      "oldValue": {...},
      "newValue": {...},
      "changedAt": "2026-05-25T10:30:00Z",
      "changeReason": "Updated Pi address"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### Error Responses

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "pi_address",
      "message": "Invalid Pi address format"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ myPiPOS Settings                    [Save] [×]  │
├─────────────────────────────────────────────────┤
│ [Personal] [Business]                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Profile Section                          │  │
│  │ ┌───┐  John Doe           ┌───────────┐  │  │
│  │ │📷│  john@example.com    │ Upload    │  │  │
│  │ └───┘  +1234567890        └───────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Cashback Configuration                    │  │
│  │ Pi Address: [0x123...]                    │  │
│  │ ☑ Enable Pi cashback                     │  │
│  │ ☑ Enable mypipos tokens                  │  │
│  │ Cashback: 2.5%                            │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Additional sections for addresses,           │
│   payment preferences, notifications, etc.]    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Component Structure

**Personal Settings Sections:**
1. **Profile Section** - Avatar, name, contact info
2. **Cashback Section** - Pi address, enablement toggles, percentage display
3. **Payment Preferences** - Default method, saved methods
4. **Address Management** - Saved addresses list, add/edit forms
5. **Purchase History** - History retention, receipt preferences
6. **Notifications** - Email, push, SMS toggles by category

**Business Settings Sections:**
1. **Business Information** - Name, type, tax ID, contact details
2. **Payment Methods** - Enable/disable, processor configurations
3. **Store Locations** - Location list, terminal assignments
4. **Store Hours** - Weekly schedule editor, holiday hours
5. **Staff Permissions** - Role permissions, access controls
6. **Billing Information** - Billing address, payment method
7. **API Keys** - Key management, webhook configurations
8. **Analytics Configuration** - Enable/disable, retention, permissions

### Interaction Design
- **Tab Switching:** Smooth animations with state preservation
- **Auto-Save:** Debounced auto-save for text fields
- **Manual Save:** Explicit save button for critical changes
- **Validation:** Real-time validation with inline error messages
- **Success Feedback:** Toast notifications on successful saves
- **Loading States:** Skeleton screens during data fetch
- **Error Handling:** Clear error messages with retry options

### Responsive Design
- **Desktop:** Two-column layout for settings sections
- **Tablet:** Single column with collapsible sections
- **Mobile:** Full-width sections with expand/collapse

## State Management

### Settings Store Structure

```typescript
interface SettingsStore {
  // State
  personalSettings: PersonalSettings | null;
  businessSettings: BusinessSettings | null;
  activeTab: 'personal' | 'business';
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  
  // Actions
  fetchPersonalSettings: () => Promise<void>;
  fetchBusinessSettings: () => Promise<void>;
  updatePersonalSetting: (field: string, value: any) => Promise<void>;
  updateBusinessSetting: (field: string, value: any) => Promise<void>;
  setActiveTab: (tab: 'personal' | 'business') => void;
  resetSaveStatus: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Implementation...
    }),
    {
      name: 'mypipos-settings',
      partialize: (state) => ({
        personalSettings: state.personalSettings,
        businessSettings: state.businessSettings,
        activeTab: state.activeTab
      })
    }
  )
);
```

### Data Flow

1. **Initial Load:** Component mounts → store fetches settings → UI renders
2. **User Update:** User changes field → optimistic UI update → API call → audit log → confirm/revert
3. **Error Handling:** API error → rollback optimistic update → show error message
4. **Cross-Tab Sync:** Settings persist across browser tabs via Zustand persistence

### Integration with Existing Stores

- **Auth Store:** User context for permissions and data isolation
- **Cart Store:** Merchant tax rate from business settings
- **Shared State:** User profile data synchronized across stores

## Security & Privacy

### Data Protection

**Personal Data:**
- Pi addresses stored as regular fields (not encrypted)
- Profile data follows existing user table encryption
- Addresses stored in JSONB with proper validation

**Business Data:**
- API keys encrypted using existing DEK system
- Payment processor configurations encrypted
- Staff permissions and roles access-controlled

### Audit Trail

**Capture:**
- User ID who made the change
- Merchant ID (for business settings)
- Field changed with old/new values
- IP address and user agent
- Timestamp and optional change reason

**Retention:**
- Audit logs retained for 1 year minimum
- Older logs archived to cold storage
- Compliance with data protection regulations

### Access Control

**Authentication Required:**
- All API endpoints require valid authentication
- JWT tokens validated on each request
- Session timeouts enforced

**Authorization Checks:**
- Users can only access their own personal settings
- Merchant roles validated for business settings
- Admin-only operations properly enforced
- Cross-tenant access prevented

### Privacy Controls

- **User Consent:** Notification preferences respected
- **Data Export:** Users can export their settings data
- **Data Deletion:** Right to erasure supported
- **Analytics Opt-out:** Analytics can be disabled

## Testing Strategy

### Unit Tests

**Store Tests:**
- Settings store actions and state updates
- Persistence layer functionality
- Error handling and rollback logic

**Component Tests:**
- Individual component rendering
- User interaction handlers
- Form validation logic

**Utility Tests:**
- Data transformation functions
- Validation functions
- Error formatting utilities

### Integration Tests

**API Security:**
- Authentication required on all endpoints
- Authorization properly enforced
- Cross-user access prevented
- Cross-tenant access prevented

**Database Operations:**
- Settings updates with audit logging
- Constraint validation
- Transaction rollback on errors
- Concurrent change handling

**Data Validation:**
- Invalid data rejected with clear errors
- JSONB schema validation
- Address format validation
- Pi address format validation

### E2E Tests

**User Workflows:**
- Complete settings update flows
- Tab switching with state preservation
- Settings persistence across sessions
- Multi-user permission scenarios

**Business Workflows:**
- Merchant settings updates
- Staff permission changes
- Location management
- Payment method configuration

**Error Scenarios:**
- Network error handling
- Invalid data submission
- Permission denied scenarios
- Concurrent edit conflicts

### Performance Tests

**Load Testing:**
- Large saved addresses arrays (100+ entries)
- Multiple store locations with complex assignments
- Audit log queries with thousands of entries
- Concurrent settings updates

**Response Time Targets:**
- Settings page load: < 2 seconds
- Settings update: < 500ms
- Audit log query: < 1 second
- Tab switch: < 100ms

## Migration Plan

### Pre-Migration

1. **Backup:** Create complete backups of users and merchants tables
2. **Testing:** Run migration against staging database
3. **Validation:** Test with subset of production data
4. **Rollback Plan:** Prepare rollback procedures

### Migration Execution

1. **Schedule:** Run during off-peak hours (minimum traffic)
2. **Monitoring:** Monitor for constraint violations
3. **Validation:** Verify data integrity after migration
4. **Performance:** Check query performance with new indexes

### Post-Migration

1. **Testing:** Verify all settings endpoints work correctly
2. **Monitoring:** Watch for any errors or performance issues
3. **Rollback:** Be prepared to rollback if issues arise
4. **Documentation:** Update any relevant documentation

### Rollback Plan

**If Critical Issues Occur:**
1. Stop application servers
2. Restore database from backup
3. Verify data integrity
4. Restart application servers
5. Investigate root cause

**Non-Critical Issues:**
1. Fix issues in place
2. Test fixes thoroughly
3. Deploy fixes
4. Monitor for resolution

## Future Enhancements

### Phase 2 Features

**Real-Time Sync:**
- Settings changes sync across multiple devices
- WebSocket-based updates
- Conflict resolution for concurrent edits

**Settings Templates:**
- Quick merchant onboarding with templates
- Industry-specific settings presets
- Template sharing between merchants

**Advanced Analytics:**
- Settings usage analytics
- A/B testing for settings configurations
- Merchant performance insights

**Automated Cashback:**
- Scheduled cashback distribution
- Cashback tier management
- Integration with loyalty programs

**Multi-Currency Support:**
- Currency preferences in payment settings
- Automatic currency conversion
- Multi-currency pricing support

### Integration Opportunities

**Cashback System:**
- Connect settings to purchase history
- Automated cashback calculations
- Cashback distribution management

**Inventory Management:**
- Store locations linked to inventory
- Terminal assignments for inventory tracking
- Multi-location inventory support

**Sales Reporting:**
- Analytics config for reporting
- Custom metrics integration
- Export permissions for reporting

**Third-Party Integrations:**
- API key management for marketplaces
- Webhook configurations for real-time sync
- Integration settings for accounting systems

## Implementation Phases

### Phase 1 - Foundation (MVP)
**Scope:** Core settings functionality
- Database schema migration (018_add_account_settings.sql)
- Settings store with persistence
- Personal settings UI and API:
  - Profile management
  - Cashback configuration (Pi address)
  - Basic payment preferences
  - Notification preferences
- Business settings UI and API:
  - Business information
  - Basic payment methods configuration
- Settings page routing and layout
- Basic testing coverage

**Success Criteria:**
- Users can access and update personal settings
- Merchants can access and update basic business settings
- Settings persist correctly across sessions
- Audit logging works for all changes

### Phase 2 - Enhancement
**Scope:** Advanced business settings and polish
- Advanced business settings:
  - Store locations management
  - Store hours configuration
  - Staff permissions management
  - Billing information
  - API keys management
  - Analytics configuration
- Audit log UI for reviewing changes
- Address management for personal settings
- Performance optimization
- Comprehensive testing and error handling

**Success Criteria:**
- All business settings configurable
- Full audit trail visible to users
- Performance meets targets
- Test coverage > 80%

### Phase 3 - Integration
**Scope:** System integration and advanced features
- Cashback system integration
- Real-time settings sync across devices
- Analytics integration
- Settings templates for merchant onboarding
- Advanced security features
- Multi-currency support

**Success Criteria:**
- Cashback processing uses settings correctly
- Real-time sync works across devices
- Analytics respect user preferences
- Merchant onboarding streamlined

### Current Focus
This specification focuses on **Phase 1 (MVP)** as the initial implementation scope.

## Appendix

### JSONB Schema Examples

**User cashback_preferences:**
```json
{
  "enable_pi_cashback": true,
  "enable_mypipos_tokens": true,
  "cashback_percentage": 2.5,
  "minimum_purchase": 10.00,
  "maximum_monthly": 100.00
}
```

**Merchant store_locations:**
```json
[
  {
    "id": "loc-1",
    "name": "Main Store",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US"
    },
    "phone": "+1234567890",
    "email": "main@store.com",
    "is_default": true,
    "terminal_ids": ["pos-1", "pos-2"],
    "created_at": "2026-05-25T10:00:00Z"
  }
]
```

**Merchant payment_methods:**
```json
{
  "enabled_methods": ["pi", "cash", "card"],
  "default_method": "pi",
  "pi_settings": {
    "auto_confirm": true,
    "timeout_seconds": 300,
    "min_confirmations": 6
  },
  "cash_settings": {
    "allow_change": true,
    "require_denomination_entry": false
  },
  "card_settings": {
    "processor": "stripe",
    "allow_partial": true,
    "tip_enabled": true
  }
}
```

### Related Files

- Database Migration: `database/migrations/018_add_account_settings.sql`
- API Routes: `src/app/api/user/settings/`, `src/app/api/merchant/settings/`
- Components: `src/app/account-settings/`
- Store: `src/lib/settings-store.ts`
- Types: `src/types/settings.ts`

---

**Document Status:** Complete - Ready for implementation planning phase