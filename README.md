# myPiPOS - Decentralized Point of Sale & Inventory Management System

A modern, mobile-first Point of Sale (POS) and Inventory Management System (IMS) built with Next.js, featuring secure Pi Network authentication and payments.

## 🌟 The Universal Customer Advantage

### **One Pi Account = Access to All myPiPOS Merchants**

The revolutionary benefit of myPiPOS is that **Pioneers only need to create one customer account** that works across **every merchant** using myPiPOS:

- **🥧 Connect Once:** Pioneers authenticate with Pi Network just once
- **🏪 Shop Everywhere:** Use the same account at any myPiPOS merchant worldwide
- **🚀 No Re-registration:** No need to create new accounts at different stores
- **🌍 Universal Access:** Your customer profile travels with you across the entire myPiPOS network

**How it works:**
1. **Day 1:** Pioneer visits Merchant A → Creates customer account with Pi authentication
2. **Day 2:** Same Pioneer visits Merchant B → **Same account works instantly** - no signup needed
3. **Day 3:** Pioneer visits Merchant C → **Same account, same profile, same experience**

This creates a **universal customer base** where every myPiPOS merchant instantly gains access to millions of Pi Pioneers who are already ready to shop!

## 🌟 Features

### 📱 Mobile POS (Point of Sale)
- **Mobile-first design** optimized for smartphones and tablets
- **Fast checkout** process with intuitive interface
- **Real-time cart management** with instant calculations
- **Pi Network payments** integration for secure transactions
- **Product search** and barcode scanning capabilities
- **Touch-friendly** buttons and gestures
- **Universal customer recognition** - Pioneers use same account across all merchants

### 📊 Desktop IMS (Inventory Management)
- **Desktop-optimized** interface for management tasks
- **Real-time inventory tracking** with low stock alerts
- **Product management** with add/edit/delete functionality
- **Barcode scanning** using Pi Browser for product entry
- **Category management** and bulk operations
- **Sales reporting** and analytics dashboard
- **Universal customer insights** - Track customer behavior across the myPiPOS network

### 🌐 Network Effects for Merchants
- **Instant Customer Base:** Access millions of Pi Pioneers from day one
- **Shared Customer Network:** Every new myPiPOS merchant grows the customer pool for everyone
- **No Customer Acquisition Cost:** Pioneers already have accounts - they're ready to buy
- **Network Growth:** As more merchants join, your potential customer base grows exponentially
- **Cross-Merchant Analytics:** Understand customer shopping patterns across the entire ecosystem

### 🔐 Security & Authentication

### Pi Network Authentication (Production)
- **Pi Network authentication** for secure, decentralized login
- **Role-based access control** (Admin, Manager, Cashier)
- **Secure payment processing** through Pi Network
- **Session management** and token handling

### Development Mode (Admin Access)
For testing without Pi Network authentication, use the built-in admin system:

- **Admin Login**: `/admin/login`
  - **Username**: `admin`
  - **Password**: `admin123`

- **Admin Dashboard**: `/admin/dashboard`
  - System status monitoring
  - Quick access to POS and IMS interfaces
  - Database schema overview
  - Feature testing checklist

**⚠️ Note:** Development mode bypasses Pi Network authentication for testing purposes only. Use secure authentication in production.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (for production database)
- Pi Network developer account (for production)
- Pi Browser (for barcode scanning and testing)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # Pi Network Configuration (Production)
   NEXT_PUBLIC_PI_APP_ID=your-pi-app-id
   PI_API_KEY=your-pi-api-key

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mypipos
   DB_USER=postgres
   DB_PASSWORD=your_password

   # Security Configuration (Production)
   MASTER_ENCRYPTION_KEY=your_master_encryption_key

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - **Main site**: [http://localhost:3000](http://localhost:3000)
   - **Admin login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - **POS**: [http://localhost:3000/pos](http://localhost:3000/pos) (requires auth)
   - **IMS**: [http://localhost:3000/ims](http://localhost:3000/ims) (requires auth)

## 📁 Project Structure

```
myPiPOS/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── pos/              # POS interface
│   │   │   └── page.tsx
│   │   ├── ims/              # IMS interface
│   │   │   └── page.tsx
│   │   └── api/              # API routes
│   │       ├── auth/         # Authentication endpoints
│   │       └── payments/     # Payment endpoints
│   ├── components/
│   │   ├── auth/             # Authentication components
│   │   ├── pos/              # POS-specific components
│   │   ├── ims/              # IMS-specific components
│   │   └── ui/               # Reusable UI components
│   ├── lib/
│   │   ├── pi-auth.ts        # Pi Network authentication
│   │   ├── pi-payments.ts    # Pi payment processing
│   │   └── store.ts          # State management
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── public/                   # Static assets
└── package.json
```

## 🎯 Usage

### For Pioneers (Customers)

**One Account, Universal Shopping:**
1. **First Time:** Visit any myPiPOS merchant → Login with Pi Network → Create customer profile
2. **Every Time After:** Visit ANY myPiPOS merchant → Same login → Same profile → No signup needed
3. **Seamless Experience:** Your preferences, history, and profile work across all merchants

**Example Pioneer Journey:**
- **Monday:** Coffee shop using myPiPOS → Create account with Pi → Buy coffee
- **Tuesday:** Restaurant using myPiPOS → Same login → Order lunch (no new account)
- **Wednesday:** Retail store using myPiPOS → Same login → Shop (instant recognition)
- **Thursday:** Another myPiPOS merchant → Same account → Same experience

### For Merchants (Business Owners)

**Instant Access to Universal Customer Base:**
1. **Sign up** for myPiPOS as a merchant
2. **Configure** your products and inventory
3. **Start accepting** Pi payments from millions of ready-to-shop Pioneers
4. **No customer onboarding needed** - Pioneers already have accounts!

### For Cashiers (Mobile POS)

1. **Login** with your Pi Network credentials
2. **Scan products** or search by name/SKU
3. **Add items** to cart by tapping products
4. **Review cart** and adjust quantities
5. **Complete payment** using Pi Network
6. **Get confirmation** and receipt

### For Managers (Desktop IMS)

1. **Access dashboard** at `/ims`
2. **Monitor inventory** levels and alerts
3. **Add new products** manually or via barcode scanning
4. **Update stock levels** and product information
5. **View reports** and analytics
6. **Manage users** and permissions

## 🔧 Configuration

### Pi Network Setup

1. **Register your app** at [Pi Developer Portal](https://developers.minepi.com)
2. **Get your App ID** and API keys
3. **Configure callbacks** in your Pi Network app settings
4. **Update environment variables** with your credentials

### Barcode Scanning

For barcode scanning functionality:
- Use **Pi Browser** to access the IMS interface
- The scanner will use your device's camera
- Products can be added automatically via barcode recognition

## 📱 Responsive Design

- **Mobile (< 768px):** Optimized POS interface with large touch targets
- **Tablet (768px - 1024px):** Adaptive layout for both POS and IMS
- **Desktop (> 1024px):** Full-featured IMS with detailed views

## 🛠️ Technology Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Authentication:** Pi Network SDK
- **Database:** PostgreSQL with RLS and DEK encryption
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 📊 API Endpoints

### Products
- `GET /api/products` - List products (supports search, category, barcode filters)
- `GET /api/products/pricing` - Get merchant-specific pricing
- `POST /api/products/pricing` - Create/update merchant pricing
- `PATCH /api/products/pricing` - Update merchant pricing

### Sales
- `GET /api/sales` - Get sales history (with merchant filtering)
- `POST /api/sales` - Create new sale with items

### Inventory
- `GET /api/inventory` - Get inventory levels (supports low_stock filter)
- `POST /api/inventory` - Create/update inventory items
- `PATCH /api/inventory` - Adjust stock quantities

### Authentication
- `POST /api/auth/pi-network` - Pi Network authentication (dev mode supported)

### Statistics & Data
- `GET /api/stats` - Get business statistics and analytics
- `GET /api/merchant` - Get merchant settings
- `PATCH /api/merchant` - Update merchant settings

### Database
The system uses a revolutionary universal product architecture:

```
products (Universal Catalog)
├── Shared product definitions (99.8% storage savings)
├── Universal barcode system
└── Standardized categories

merchant_products (Per-Merchant Pricing)
├── Individual merchant pricing
├── Cost price tracking
└── Margin calculations

merchant_inventory (Per-Merchant Stock)
├── Individual merchant inventory levels
├── Stock threshold management
└── Reorder point settings
```

### Security Features
- **Full UUID Coverage**: All primary and foreign keys
- **Row-Level Security (RLS)**: Multi-tenant data isolation
- **DEK Encryption**: Per-merchant envelope encryption
- **Master Encryption Key**: Stored in Vercel environment variables
- **Security Definers**: All functions run with proper permissions

## 📄 License

This project is part of the myPiPOS ecosystem.

## 🤝 Contributing

Contributions are welcome! Please follow our coding standards and submit pull requests to the main branch.

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**Built with ❤️ using Next.js and Pi Network**
