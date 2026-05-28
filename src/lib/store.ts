import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, User } from '@/types';
import type { Customer } from '@/types/customer';

interface CartStore {
  items: CartItem[];
  merchantTaxRate: number;
  setMerchantTaxRate: (taxRate: number) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  merchantTaxRate: 0.08, // Default 8% until merchant data loads

  setMerchantTaxRate: (taxRate) => set({ merchantTaxRate: taxRate }),

  addItem: (product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.product.id === product.id);
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  },

  getTax: () => {
    const subtotal = get().getSubtotal();
    const taxRate = get().merchantTaxRate;
    return subtotal * taxRate;
  },

  getTotal: () => {
    return get().getSubtotal() + get().getTax();
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  merchantId: string | null;
  merchantData: any | null; // Merchant settings including tax_rate
  currentContext: 'merchant' | 'customer';
  setAuth: (isAuthenticated: boolean, user: User | null, merchantId?: string | null) => void;
  setMerchantId: (merchantId: string | null) => void;
  setMerchantData: (merchantData: any) => void;
  setContext: (context: 'merchant' | 'customer') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      merchantId: null,
      merchantData: null,
      currentContext: 'customer',
      setAuth: (isAuthenticated, user, merchantId) => set({
        isAuthenticated,
        user,
        merchantId: merchantId || null,
        currentContext: merchantId ? 'merchant' : 'customer'
      }),
      setMerchantId: (merchantId) => set({ merchantId }),
      setMerchantData: (merchantData) => set({ merchantData }),
      setContext: (context) => set({ currentContext: context }),
      logout: () => {
        try {
          // Clear persisted storage first
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mypipos-auth');
          }
        } catch (e) {
          console.warn('Failed to clear auth storage:', e);
        }

        try {
          // Then update state with error boundary
          set({
            isAuthenticated: false,
            user: null,
            merchantId: null,
            merchantData: null,
            currentContext: 'customer'
          });
        } catch (e) {
          console.warn('Failed to update auth state:', e);
        }
      },
    }),
    {
      name: 'mypipos-auth',
    }
  )
);