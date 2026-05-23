import { create } from 'zustand';
import { Product, CartItem } from '@/types';
import type { Customer } from '@/types/customer';

interface CartStore {
  items: CartItem[];
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
    return subtotal * 0.08; // 8% tax rate
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
  user: { uid: string; username: string } | null;
  merchantId: string | null;
  currentContext: 'merchant' | 'customer' | null;
  setAuth: (isAuthenticated: boolean, user: { uid: string; username: string } | null) => void;
  setMerchantId: (merchantId: string | null) => void;
  switchContext: (context: 'merchant' | 'customer') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  merchantId: null,
  currentContext: null,
  setAuth: (isAuthenticated, user) => set({ isAuthenticated, user }),
  setMerchantId: (merchantId) => set({ merchantId }),
  switchContext: (context) => set({ currentContext: context }),
  logout: () => set({ isAuthenticated: false, user: null, merchantId: null, currentContext: null }),
}));