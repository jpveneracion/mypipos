// Core types for myPiPOS system

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  sku: string;
  barcode?: string;
  category: string;
  stock: number;
  minStock: number;
  image?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'pi' | 'cash' | 'card';
  createdAt: Date;
  customerId?: string;
  piPaymentId?: string;
}

export interface User {
  id: string;
  piUsername: string;
  role: 'admin' | 'cashier' | 'manager' | 'merchant_admin';
  userType?: 'customer' | 'merchant';
  onboardingComplete?: boolean;
  merchantId?: string | null;
  createdAt: Date;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  quantity: number;
  reason?: string;
  createdAt: Date;
  userId: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

// Settings types
export * from './settings';