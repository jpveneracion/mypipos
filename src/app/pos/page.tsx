'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useCartStore } from '@/lib/store';
import { Product } from '@/types';
import BarcodeScanner from '@/components/pos/BarcodeScanner';

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
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name?: string;
    piUsername?: string;
  } | null>(null);

  // Auth check
  useEffect(() => {
    // Must be authenticated
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Must be a merchant to access POS
    if (!merchantId) {
      // Not a merchant - send to customer dashboard
      router.push('/customer');
      return;
    }

    // If merchant but not in merchant context, redirect to mode selection
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

  const { items, addItem, removeItem, updateQuantity, getSubtotal, getTax, getTotal } = useCartStore();

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
      setScannedProduct(product);
      addItem(product);
      // Auto-select the category of the scanned product
      setSelectedCategory(product.category);
    } else {
      alert(`Product with barcode "${barcode}" not found`);
    }
    setShowScanner(false);
  };

  const handleManualBarcode = () => {
    if (searchQuery.trim()) {
      handleBarcodeScanned(searchQuery.trim());
    }
  };

  const handleCustomerQRScanned = async (customerData: string) => {
    // customerData could be a Pi username, customer ID, or QR code content
    try {
      // For now, simulate customer lookup - in production this would call an API
      console.log('Scanned customer data:', customerData);

      // Mock customer identification
      const mockCustomer = {
        id: customerData,
        name: customerData.includes('@') ? customerData.split('@')[0] : 'Customer',
        piUsername: customerData.includes('@') ? customerData : `@${customerData}`,
      };

      setSelectedCustomer(mockCustomer);
      setShowScanner(false);

      // Show feedback
      alert(`Customer identified: ${mockCustomer.name}`);
    } catch (error) {
      console.error('Customer scan error:', error);
      alert('Failed to identify customer');
    }
  };

  const handleCheckout = () => {
    // Implement checkout with Pi payment
    const total = getTotal();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    // Create a simple confirmation UI
    const confirmed = window.confirm(
      `Checkout Summary:\n` +
      `• ${itemCount} items\n` +
      `• Subtotal: $${getSubtotal().toFixed(2)}\n` +
      `• Tax: $${getTax().toFixed(2)}\n` +
      `• Total: $${total.toFixed(2)}\n\n` +
      `Proceed with Pi payment?`
    );

    if (confirmed) {
      // Here you would integrate the actual Pi payment
      alert(`Processing Pi payment of $${total.toFixed(2)}...\n\n(Payment integration to be implemented)`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
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

      {/* Header */}
      <header className="bg-linear-to-r from-primary-600 to-secondary-600 text-white p-4 shadow-medium">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">📱 POS Terminal</h1>
              <p className="text-primary-100 text-sm">Point of Sale</p>
            </div>
            <button
              onClick={() => router.push('/ims')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📦 Inventory Management
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Search and Filter */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products or enter barcode..."
                className="w-full px-4 py-3 pr-24 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualBarcode()}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                {searchQuery.trim() && (
                  <button
                    onClick={handleManualBarcode}
                    className="bg-primary-600 text-white px-3 py-1 rounded-md text-sm hover:bg-primary-700"
                  >
                    Go
                  </button>
                )}
                <button
                  id="camera-button"
                  onClick={() => {
                    setScannerMode('product');
                    setShowScanner(true);
                  }}
                >
                  📷
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {scannedProduct && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Added <strong>{scannedProduct.name}</strong> to cart</span>
                <button
                  onClick={() => setScannedProduct(null)}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const cartItem = items.find(item => item.product.id === product.id);
              const quantity = cartItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md p-3 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => addItem(product)}
                >
                  <div className="aspect-square bg-neutral-100 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-3xl">🛍️</span>
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-sm truncate">{product.name}</h3>
                  <p className="text-primary-600 font-bold">${product.price.toFixed(2)}</p>
                  {quantity > 0 && (
                    <div className="mt-2 bg-primary-100 text-primary-700 rounded-full px-2 py-1 text-center text-sm font-semibold">
                      ×{quantity}
                    </div>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">Stock: {product.stock}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-96 bg-white border-l border-neutral-200 flex flex-col h-full lg:h-auto">
          {/* Customer Info Section */}
          <div className="p-4 border-b border-neutral-200 bg-primary-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-800">Customer</h3>
              <button
                onClick={() => {
                  setScannerMode('customer');
                  setShowScanner(true);
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Scan QR
              </button>
            </div>
            {selectedCustomer ? (
              <div className="bg-white rounded-lg p-3 border border-primary-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                    {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-neutral-800">{selectedCustomer.name || 'Customer'}</div>
                    <div className="text-xs text-neutral-600">@{selectedCustomer.piUsername || 'unknown'}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-error-600 hover:text-error-700 mt-1"
                >
                  Clear Customer
                </button>
              </div>
            ) : (
              <div className="text-center text-neutral-500 text-sm py-2">
                No customer selected
              </div>
            )}
          </div>

          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-800">Cart</h2>
            <p className="text-sm text-neutral-600">{items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p>Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-neutral-50 rounded-lg p-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-neutral-800 text-sm">{item.product.name}</h4>
                      <p className="text-primary-600 font-semibold">${item.product.price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.product.id, item.quantity - 1);
                          } else {
                            removeItem(item.product.id);
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => addItem(item.product)}
                        className="w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-neutral-200 p-4 space-y-2 bg-neutral-50">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Tax (8%)</span>
                <span>${getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-neutral-800">
                <span>Total</span>
                <span className="text-primary-600">${getTotal().toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-linear-to-r from-primary-600 to-secondary-600 text-white py-4 rounded-lg font-bold text-lg hover:from-primary-700 hover:to-secondary-700 transition-colors shadow-medium"
              >
                🥧 Pay with Pi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}