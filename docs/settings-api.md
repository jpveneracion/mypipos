# Account Settings API Documentation

## Overview

The account settings API provides endpoints for managing user personal settings and merchant business settings. All endpoints require authentication and implement role-based access control.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require a valid authentication token. Include the session token in your request headers or cookies.

## Personal Settings Endpoints

### GET /api/user/settings

Retrieves complete account settings for the authenticated user, including both personal and business information.

**Authentication:** Required  
**Roles:** All authenticated users  
**Response Format:** JSON

**Request Example:**
```bash
curl -X GET http://localhost:3000/api/user/settings \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "pi_username": "johndoe",
      "user_type": "customer",
      "role": null,
      "merchant_id": null
    },
    "personal": {
      "pi_address": "psp...",
      "cashback_preferences": {
        "enable_pi_tokens": true,
        "enable_mypipos_tokens": false
      },
      "payment_preferences": {
        "default_method": "pi_network"
      },
      "notification_preferences": {
        "email_enabled": true,
        "promotional_enabled": false
      },
      "saved_addresses": [],
      "purchase_history_settings": {
        "retention_days": 365
      }
    },
    "business": null
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `404` - User not found
- `500` - Server error
- `503` - Database connection error

---

### PUT /api/user/settings/update

Updates a specific personal setting field for the authenticated user.

**Authentication:** Required  
**Roles:** All authenticated users  
**Request Body:** JSON

**Request Parameters:**
- `field` (string, required): The field name to update
- `value` (any, required): The new value for the field

**Valid Fields:**
- `cashback_preferences` - Cashback enablement flags
- `payment_preferences` - Default payment method
- `notification_preferences` - Email and notification settings
- `saved_addresses` - Array of saved addresses
- `purchase_history_settings` - History retention preferences
- `pi_address` - Pi Network address for cashback

**Request Example:**
```bash
curl -X PUT http://localhost:3000/api/user/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "pi_address",
    "value": "psp1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "field": "pi_address",
  "updatedValue": {
    "pi_address": "psp1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz"
  }
}
```

**Update Cashback Preferences:**
```bash
curl -X PUT http://localhost:3000/api/user/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "cashback_preferences",
    "value": {
      "enable_pi_tokens": true,
      "enable_mypipos_tokens": true
    }
  }'
```

**Update Notification Preferences:**
```bash
curl -X PUT http://localhost:3000/api/user/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "notification_preferences",
    "value": {
      "email_enabled": true,
      "promotional_enabled": true
    }
  }'
```

**Error Responses:**
- `400` - Invalid field name or request data
- `401` - Authentication required
- `500` - Server error

---

## Business Settings Endpoints

### GET /api/merchant/settings

Retrieves business settings for authenticated merchant users.

**Authentication:** Required  
**Roles:** merchant_admin, merchant_staff  
**Response Format:** JSON

**Request Example:**
```bash
curl -X GET http://localhost:3000/api/merchant/settings \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "merchant_id": "123e4567-e89b-12d3-a456-426614174000",
    "business": {
      "payment_methods": {
        "pi_network": {
          "enabled": true,
          "config": {}
        },
        "cash": {
          "enabled": true,
          "config": {}
        }
      },
      "store_hours": {
        "monday": { "open": "09:00", "close": "18:00", "enabled": true },
        "tuesday": { "open": "09:00", "close": "18:00", "enabled": true },
        "wednesday": { "open": "09:00", "close": "18:00", "enabled": true },
        "thursday": { "open": "09:00", "close": "18:00", "enabled": true },
        "friday": { "open": "09:00", "close": "18:00", "enabled": true },
        "saturday": { "open": "10:00", "close": "16:00", "enabled": true },
        "sunday": { "open": null, "close": null, "enabled": false }
      },
      "store_locations": [
        {
          "id": "loc-1",
          "name": "Main Store",
          "address": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zip": "10001"
        }
      ],
      "staff_permissions": {
        "cashier": {
          "can_refund": true,
          "can_discount": false
        }
      },
      "billing_info": {
        "billing_address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
      },
      "analytics_config": {
        "enabled": true,
        "report_frequency": "weekly"
      }
    }
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `403` - Access denied - merchant role required
- `404` - Settings not found
- `500` - Server error
- `503` - Database connection error

---

### PUT /api/merchant/settings/update

Updates a specific business setting field.

**Authentication:** Required  
**Roles:** merchant_admin only  
**Request Body:** JSON

**Request Parameters:**
- `field` (string, required): The field name to update
- `value` (any, required): The new value for the field

**Valid Fields:**
- `payment_methods` - Enabled payment methods and configuration
- `store_hours` - Weekly operating hours
- `store_locations` - Physical store locations
- `staff_permissions` - Role-based access controls
- `billing_info` - Billing address and payment info
- `api_keys` - Third-party integration keys
- `analytics_config` - Analytics and reporting preferences

**Request Example:**
```bash
curl -X PUT http://localhost:3000/api/merchant/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "store_hours",
    "value": {
      "monday": { "open": "08:00", "close": "20:00", "enabled": true },
      "tuesday": { "open": "08:00", "close": "20:00", "enabled": true },
      "wednesday": { "open": "08:00", "close": "20:00", "enabled": true },
      "thursday": { "open": "08:00", "close": "20:00", "enabled": true },
      "friday": { "open": "08:00", "close": "20:00", "enabled": true },
      "saturday": { "open": "09:00", "close": "18:00", "enabled": true },
      "sunday": { "open": null, "close": null, "enabled": false }
    }
  }'
```

**Update Payment Methods:**
```bash
curl -X PUT http://localhost:3000/api/merchant/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "payment_methods",
    "value": {
      "pi_network": { "enabled": true, "config": {} },
      "cash": { "enabled": true, "config": {} }
    }
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "field": "store_hours",
  "updatedValue": {
    "monday": { "open": "08:00", "close": "20:00", "enabled": true },
    "tuesday": { "open": "08:00", "close": "20:00", "enabled": true },
    "wednesday": { "open": "08:00", "close": "20:00", "enabled": true },
    "thursday": { "open": "08:00", "close": "20:00", "enabled": true },
    "friday": { "open": "08:00", "close": "20:00", "enabled": true },
    "saturday": { "open": "09:00", "close": "18:00", "enabled": true },
    "sunday": { "open": null, "close": null, "enabled": false }
  }
}
```

**Error Responses:**
- `400` - Invalid field name or request data
- `401` - Authentication required
- `403` - Access denied - merchant admin role required
- `404` - User not found
- `500` - Server error

---

## Data Field Reference

### Personal Settings Fields

#### cashback_preferences
Controls how users receive cashback rewards.
```json
{
  "enable_pi_tokens": true,      // Enable Pi token cashback
  "enable_mypipos_tokens": false // Enable mypipos token cashback
}
```

#### payment_preferences
User's default payment method.
```json
{
  "default_method": "pi_network" // or "cash", "card", etc.
}
```

#### notification_preferences
Email and notification settings.
```json
{
  "email_enabled": true,         // Enable transactional emails
  "promotional_enabled": false   // Enable marketing emails
}
```

#### saved_addresses
Array of saved shipping/billing addresses.
```json
[
  {
    "id": "addr-1",
    "label": "Home",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "default": true
  }
]
```

#### purchase_history_settings
Purchase history retention preferences.
```json
{
  "retention_days": 365          // Days to retain purchase history
}
```

#### pi_address
Pi Network wallet address for receiving cashback.
```json
"psp1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz"
```

### Business Settings Fields

#### payment_methods
Payment methods available to customers.
```json
{
  "pi_network": {
    "enabled": true,
    "config": {}
  },
  "cash": {
    "enabled": true,
    "config": {}
  }
}
```

#### store_hours
Weekly operating hours.
```json
{
  "monday": { "open": "09:00", "close": "18:00", "enabled": true },
  "tuesday": { "open": "09:00", "close": "18:00", "enabled": true },
  "wednesday": { "open": "09:00", "close": "18:00", "enabled": true },
  "thursday": { "open": "09:00", "close": "18:00", "enabled": true },
  "friday": { "open": "09:00", "close": "18:00", "enabled": true },
  "saturday": { "open": "10:00", "close": "16:00", "enabled": true },
  "sunday": { "open": null, "close": null, "enabled": false }
}
```

#### store_locations
Physical store locations.
```json
[
  {
    "id": "loc-1",
    "name": "Main Store",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "phone": "+1234567890"
  }
]
```

#### staff_permissions
Role-based access control for staff.
```json
{
  "cashier": {
    "can_refund": true,
    "can_discount": false,
    "can_void": false
  },
  "manager": {
    "can_refund": true,
    "can_discount": true,
    "can_void": true
  }
}
```

#### billing_info
Merchant billing information.
```json
{
  "billing_address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "tax_id": "12-3456789"
}
```

#### api_keys
Third-party service integrations.
```json
{
  "analytics": {
    "enabled": true,
    "provider": "google_analytics",
    "key": "UA-XXXXXXXXX-X"
  }
}
```

#### analytics_config
Analytics and reporting preferences.
```json
{
  "enabled": true,
  "report_frequency": "weekly",
  "include_customer_analytics": true
}
```

---

## Security Features

### Audit Logging
All settings updates are logged with:
- User ID who made the change
- IP address
- User agent
- Timestamp
- Field changed
- Old and new values

### Row-Level Security
- Multi-tenant data isolation
- Users can only access their own settings
- Merchant staff can only view settings for their merchant

### Role-Based Access Control
- **Personal Settings**: Available to all authenticated users
- **Business Settings**: Available to merchant_admin and merchant_staff
- **Business Settings Updates**: Requires merchant_admin role

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid field, invalid data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (user or settings not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection error)

---

## Testing Examples

### Test Personal Settings (curl)

```bash
# Get personal settings
curl -X GET http://localhost:3000/api/user/settings \
  --cookie "session-token=your-token"

# Update Pi address for cashback
curl -X PUT http://localhost:3000/api/user/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "pi_address",
    "value": "psp1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz"
  }'

# Enable cashback preferences
curl -X PUT http://localhost:3000/api/user/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "cashback_preferences",
    "value": {
      "enable_pi_tokens": true,
      "enable_mypipos_tokens": true
    }
  }'
```

### Test Business Settings (curl)

```bash
# Get business settings
curl -X GET http://localhost:3000/api/merchant/settings \
  --cookie "session-token=your-token"

# Update store hours
curl -X PUT http://localhost:3000/api/merchant/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "store_hours",
    "value": {
      "monday": { "open": "08:00", "close": "20:00", "enabled": true },
      "tuesday": { "open": "08:00", "close": "20:00", "enabled": true },
      "wednesday": { "open": "08:00", "close": "20:00", "enabled": true },
      "thursday": { "open": "08:00", "close": "20:00", "enabled": true },
      "friday": { "open": "08:00", "close": "20:00", "enabled": true },
      "saturday": { "open": "09:00", "close": "18:00", "enabled": true },
      "sunday": { "open": null, "close": null, "enabled": false }
    }
  }'

# Enable payment methods
curl -X PUT http://localhost:3000/api/merchant/settings/update \
  -H "Content-Type: application/json" \
  --cookie "session-token=your-token" \
  -d '{
    "field": "payment_methods",
    "value": {
      "pi_network": { "enabled": true, "config": {} },
      "cash": { "enabled": true, "config": {} }
    }
  }'
```

---

## Implementation Notes

### Database Functions
The API uses PostgreSQL security functions:
- `get_user_account_settings(user_id)` - Retrieves user settings with RLS
- `update_personal_settings(user_id, field, value)` - Updates personal fields
- `update_business_settings(merchant_id, user_id, field, value)` - Updates business fields

### Client Detection
The system automatically captures:
- IP address from `x-forwarded-for` or `x-real-ip` headers
- User agent from `user-agent` header

### Validation
- Field names are validated against allowlists
- Invalid field names return 400 error
- All updates are atomic and transactional