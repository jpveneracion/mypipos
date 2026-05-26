'use client';

import * as React from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useCartStore } from '@/lib/store';

interface CartPanelProps {
  onCheckout?: () => void;
  className?: string;
}

const CartPanel = React.forwardRef<HTMLDivElement, CartPanelProps>(({ onCheckout, className }, ref) => {
  const { items, updateQuantity, removeItem, getSubtotal, getTax, getTotal } = useCartStore();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) { removeItem(productId); }
    else { updateQuantity(productId, newQuantity); }
  };

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card ref={ref} className={cn('h-full flex flex-col shadow-strong', className)}>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Shopping Cart</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="text-6xl">🛒</div>
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">Your cart is empty</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">Add products to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="glass p-3 rounded-xl space-y-2 hover:shadow-soft transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-neutral-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                      <p className="text-primary-600 dark:text-primary-400 font-bold">${item.product.price.toFixed(7)}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-error-600 hover:text-error-700 transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-12 text-center font-bold text-neutral-900 dark:text-white">{item.quantity}</span>
                      <button onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="font-bold text-neutral-900 dark:text-white">${(item.product.price * item.quantity).toFixed(7)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 space-y-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                <span>Subtotal</span><span>${subtotal.toFixed(7)}</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                <span>Tax (8%)</span><span>${tax.toFixed(7)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span>Total</span><span className="text-primary-600 dark:text-primary-400">${total.toFixed(7)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={onCheckout}>
              🥧 Checkout with Pi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CartPanel.displayName = 'CartPanel';

export { CartPanel };
