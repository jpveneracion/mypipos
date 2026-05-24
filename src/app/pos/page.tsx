'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useCartStore } from '@/lib/store';
import { Product } from '@/types';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Sample products - would come from API
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Coffee',
    price: 3.50,
    sku: 'COF001',
    barcode: '1234567890123',
    category: 'Beverages',
    stock: 50,
    minStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Sandwich',
    price: 6.99,
    sku: 'SND001',
    barcode: '9876543210987',
    category: 'Food',
    stock: 20,
    minStock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Salad',
    price: 5.49,
    sku: 'SAL001',
    barcode: '5555555555555',
    category: 'Food',
    stock: 15,
    minStock: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Tea',
    price: 2.99,
    sku: 'TEA001',
    barcode: '1111111111111',
    category: 'Beverages',
    stock: 35,
    minStock: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    name: 'Cookie',
    price: 1.99,
    sku: 'CKI001',
    barcode: '2222222222222',
    category: 'Snacks',
    stock: 60,
    minStock: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function POSPage() {
  const router = useRouter();
  const { isAuthenticated, merchantId, currentContext } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'product' | 'customer'>('product');
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name?: string;
    piUsername?: string;
  } | null>(null);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (!merchantId) {
      router.push('/customer');
      return;
    }

    if (currentContext !== 'merchant') {
      router.push('/mode-selection');
      return;
    }
  }, [isAuthenticated, merchantId, currentContext, router]);

  // Set up global handler for Pi Browser
  useEffect(() => {
    (window as any).openScanner = () => setShowScanner(true);
    return () => { delete (window as any).openScanner; };
  }, []);

  const { items, addItem, removeItem, updateQuantity, getSubtotal, getTax, getTotal, clearCart } = useCartStore();

  const categories = ['All', 'Beverages', 'Food', 'Snacks'];

  const filteredProducts = sampleProducts.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleBarcodeScanned = (barcode: string) => {
    const product = sampleProducts.find(p => p.barcode === barcode);
    if (product) {
      addItem(product);
      setSelectedCategory(product.category);
      // Show success feedback
      alert(`Added ${product.name} to cart`);
    } else {
      alert(`Product with barcode "${barcode}" not found`);
    }
    setShowScanner(false);
  };

  const handleCustomerQRScanned = async (customerData: string) => {
    try {
      console.log('Scanned customer data:', customerData);

      const mockCustomer = {
        id: customerData,
        name: customerData.includes('@') ? customerData.split('@')[0] : 'Customer',
        piUsername: customerData.includes('@') ? customerData : `@${customerData}`,
      };

      setSelectedCustomer(mockCustomer);
      setShowScanner(false);
      alert(`Customer identified: ${mockCustomer.name}`);
    } catch (error) {
      console.error('Customer scan error:', error);
      alert('Failed to identify customer');
    }
  };

  const handleCheckout = () => {
    const total = getTotal();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const confirmed = window.confirm(
      `Checkout Summary:\n` +
      `• ${itemCount} items\n` +
      `• Subtotal: $${getSubtotal().toFixed(2)}\n` +
      `• Tax: $${getTax().toFixed(2)}\n` +
      `• Total: $${total.toFixed(2)}\n\n` +
      `Proceed with Pi payment?`
    );

    if (confirmed) {
      alert(`Processing Pi payment of $${total.toFixed(2)}...\n\n(Payment integration to be implemented)`);
      clearCart();
      setSelectedCustomer(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            if (scannerMode === 'product') {
              handleBarcodeScanned(barcode);
            } else {
              handleCustomerQRScanned(barcode);
            }
          }}
          onClose={() => setShowScanner(false)}
          mode={scannerMode}
        />
      )}

      {/* Premium Header */}
      <header className="backdrop-blur-xl bg-white/70 dark:bg-oceanic-900/70 border-b border-oceanic-100 dark:border-oceanic-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center shadow-glass">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                    POS Terminal
                  </h1>
                  <p className="text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">
                    Point of Sale
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => router.push('/ims')}
              className="border-oceanic-200 dark:border-oceanic-700 hover:bg-oceanic-50 dark:hover:bg-oceanic-900/30"
            >
              <span className="mr-2">📦</span>
              Inventory
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Search and Filter */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search products or enter barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchQuery.trim() && handleBarcodeScanned(searchQuery.trim())}
                className="pr-24"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
                {searchQuery.trim() && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleBarcodeScanned(searchQuery.trim())}
                    className="px-3"
                  >
                    Go
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setScannerMode('product');
                    setShowScanner(true);
                  }}
                  className="px-3"
                >
                  📷
                </Button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2 rounded-full whitespace-nowrap transition-all duration-300 font-medium ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-oceanic-500 to-sky-600 text-white shadow-glass'
                      : 'bg-white dark:bg-oceanic-900 text-oceanic-700 dark:text-oceanic-300 hover:bg-oceanic-50 dark:hover:bg-oceanic-800 border border-oceanic-200 dark:border-oceanic-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = items.find(item => item.product.id === product.id);
              const quantity = cartItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  className="glassmorphism rounded-2xl p-4 cursor-pointer hover:shadow-glass-lg transition-all duration-300 transform hover:-translate-y-1 group"
                  onClick={() => addItem(product)}
                >
                  <div className="aspect-square bg-gradient-to-br from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                    <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🛍️</span>
                    {quantity > 0 && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-full flex items-center justify-center shadow-glass">
                        <span className="text-white text-sm font-bold">{quantity}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-oceanic-900 dark:text-oceanic-100 text-sm mb-1 truncate">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <p className="text-oceanic-600 dark:text-oceanic-400 font-bold text-lg">
                      ${product.price.toFixed(2)}
                    </p>
                    <div className="w-8 h-8 bg-gradient-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-800 dark:to-sky-800 rounded-full flex items-center justify-center group-hover:from-oceanic-500 group-hover:to-sky-600 group-hover:text-white transition-all duration-300">
                      <span className="text-oceanic-600 dark:text-oceanic-400 group-hover:text-white font-bold">+</span>
                    </div>
                  </div>

                  <p className="text-xs text-oceanic-500 dark:text-oceanic-500 mt-2">
                    Stock: {product.stock}
                  </p>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-oceanic-900 dark:text-oceanic-100 mb-2">
                No products found
              </h3>
              <p className="text-oceanic-600 dark:text-oceanic-400">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="lg:w-96 bg-white/50 dark:bg-oceanic-950/50 border-l border-oceanic-100 dark:border-oceanic-800 flex flex-col backdrop-blur-xl">
          {/* Customer Section */}
          <div className="p-6 border-b border-oceanic-100 dark:border-oceanic-800 bg-gradient-to-r from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-oceanic-900 dark:text-oceanic-100 uppercase tracking-wide">
                Customer
              </h3>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setScannerMode('customer');
                  setShowScanner(true);
                }}
                className="px-3 py-1 text-xs"
              >
                <span className="mr-1">📷</span>
                Scan QR
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-full flex items-center justify-center text-white font-bold shadow-glass">
                    {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-oceanic-900 dark:text-oceanic-100 text-sm">
                      {selectedCustomer.name || 'Customer'}
                    </div>
                    <div className="text-xs text-oceanic-600 dark:text-oceanic-400">
                      @{selectedCustomer.piUsername || 'unknown'}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full mt-3 text-xs text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                >
                  Clear Customer
                </Button>
              </div>
            ) : (
              <div className="text-center text-oceanic-500 dark:text-oceanic-400 text-sm py-4 glassmorphism rounded-xl">
                <div className="text-2xl mb-1">👤</div>
                <p>No customer selected</p>
              </div>
            )}
          </div>

          {/* Cart Header */}
          <div className="p-6 border-b border-oceanic-100 dark:border-oceanic-800">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100">Cart</h2>
              <div className="w-8 h-8 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-glass">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </div>
            <p className="text-sm text-oceanic-600 dark:text-oceanic-400">
              {items.reduce((sum, item) => sum + item.quantity, 0)} items
            </p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center text-oceanic-500 dark:text-oceanic-400 py-12">
                <div className="text-5xl mb-3">🛒</div>
                <p className="font-semibold mb-1">Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50 hover:shadow-glass transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-oceanic-900 dark:text-oceanic-100 text-sm">
                          {item.product.name}
                        </h4>
                        <p className="text-oceanic-600 dark:text-oceanic-400 font-bold">
                          ${item.product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantity(item.product.id, item.quantity - 1);
                            } else {
                              removeItem(item.product.id);
                            }
                          }}
                          className="w-8 h-8 p-0 rounded-full bg-oceanic-100 dark:bg-oceanic-800 hover:bg-oceanic-200 dark:hover:bg-oceanic-700"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold text-oceanic-900 dark:text-oceanic-100">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => addItem(item.product)}
                          className="w-8 h-8 p-0 rounded-full bg-gradient-to-r from-oceanic-500 to-sky-600 hover:from-oceanic-600 hover:to-sky-700"
                        >
                          +
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-oceanic-900 dark:text-oceanic-100">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="border-t border-oceanic-100 dark:border-oceanic-800 p-6 space-y-3 bg-gradient-to-t from-oceanic-50 to-white dark:from-oceanic-900/30 dark:to-oceanic-950/50">
              <div className="flex justify-between text-oceanic-600 dark:text-oceanic-400">
                <span>Subtotal</span>
                <span className="font-semibold">${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-oceanic-600 dark:text-oceanic-400">
                <span>Tax (8%)</span>
                <span className="font-semibold">${getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-oceanic-900 dark:text-oceanic-100 pt-2 border-t border-oceanic-200 dark:border-oceanic-700">
                <span>Total</span>
                <span className="bg-gradient-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                  ${getTotal().toFixed(2)}
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-oceanic-600 to-sky-600 hover:from-oceanic-700 hover:to-sky-700 shadow-glass-lg hover:shadow-glass-xl transform hover:scale-[1.02] transition-all duration-300"
              >
                <span className="mr-2">🥧</span>
                Pay with Pi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
