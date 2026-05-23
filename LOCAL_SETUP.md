# myPiPOS Local Development Setup Guide

## ✅ Current Status

Your environment is ready for local development!

### ✓ PostgreSQL Running
- PostgreSQL is running on port 5432
- Database connection configured in `.env.local`

### ✓ Environment Configuration
- `.env.local` file created with default settings
- Database connection: `localhost:5432/mypipos`

## 🚀 Setup Steps

### Step 1: Create Database

**Using Laragon or phpPgAdmin:**
1. Open Laragon → Start All → PostgreSQL
2. Open phpPgAdmin (usually at http://localhost/phpPgAdmin)
3. Create a new database named: `mypipos`

**Or using command line (if you have PostgreSQL tools):**
```sql
CREATE DATABASE mypipos;
```

### Step 2: Update Database Credentials (if needed)

Check your Laragon PostgreSQL credentials and update `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mypipos
DB_USER=postgres          # Your Laragon PostgreSQL username
DB_PASSWORD=postgres      # Your Laragon PostgreSQL password
```

**Default Laragon PostgreSQL credentials:**
- Username: `postgres`
- Password: `postgres` (or empty)
- Port: `5432`

### Step 3: Run Database Migrations

```bash
# Install dependencies (if not already done)
npm install

# Run all migrations
npm run migrate

# Check migration status
npm run migrate:status

# If you need to rollback
npm run migrate:rollback
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## 🔧 Configuration Files

- **`.env.local`** - Your local environment variables (already created)
- **`database/schema.sql`** - Main database schema
- **`database/migrations/`** - Database migrations

## 📊 Database Schema

After running migrations, you'll have **19 tables**:

### Core Business Tables
- `merchants` - Merchant accounts
- `users` - User accounts (Pi Network auth)
- `products` - Universal product catalog
- `merchant_products` - Merchant-specific products
- `merchant_inventory` - Inventory levels
- `categories` - Product categories

### Transaction Tables
- `sales` - Sales transactions
- `sale_items` - Line items
- `invoices` - Customer invoices
- `invoice_items` - Invoice line items
- `pos_terminals` - POS terminals

### Security & System Tables
- `sessions` - User sessions
- `audit_logs` - Audit trail
- `encryption_keys` - Encryption management
- `merchant_settings` - Configuration
- `webhooks` - Webhook integrations
- And more...

## 🧪 Test Database Connection

```bash
npm run db:test
```

## 🎯 Next Steps

1. **Test the home page** - http://localhost:3000
2. **Test Pi Network login** (requires Pi Network app credentials)
3. **Create a test merchant account**
4. **Add products via barcode scanning**
5. **Test customer dashboard flow**

## ❓ Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running in Laragon
- Check credentials in `.env.local`
- Verify database `mypipos` exists

### Port Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process or use a different port
PORT=3001 npm run dev
```

### Migration Errors
- Drop and recreate the database
- Check PostgreSQL logs in Laragon
- Verify database permissions

## 📚 Development Notes

- **Framework:** Next.js 16.2.6 with App Router
- **Database:** PostgreSQL with Row-Level Security
- **Authentication:** Pi Network SDK
- **State Management:** Zustand
- **Styling:** Tailwind CSS

---

**Ready to build the Universal Pi Commerce Network! 🥧**
