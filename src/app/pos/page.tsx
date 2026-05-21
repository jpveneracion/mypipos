'use client';

import { useState, useEffect } from 'react';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Header */}
      <header className="bg-linear-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">📱 POS Terminal</h1>
          <p className="text-purple-100 text-sm">Point of Sale</p>
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
                className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualBarcode()}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                {searchQuery.trim() && (
                  <button
                    onClick={handleManualBarcode}
                    className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700"
                  >
                    Go
                  </button>
                )}
                <button
                  id="camera-button"
                  onClick={() => setShowScanner(true)}
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
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
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
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-3xl">🛍️</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{product.name}</h3>
                  <p className="text-purple-600 font-bold">${product.price.toFixed(2)}</p>
                  {quantity > 0 && (
                    <div className="mt-2 bg-purple-100 text-purple-700 rounded-full px-2 py-1 text-center text-sm font-semibold">
                      ×{quantity}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full lg:h-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Cart</h2>
            <p className="text-sm text-gray-600">{items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p>Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm">{item.product.name}</h4>
                      <p className="text-purple-600 font-semibold">${item.product.price.toFixed(2)}</p>
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
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => addItem(item.product)}
                        className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center"
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
            <div className="border-t border-gray-200 p-4 space-y-2 bg-gray-50">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800">
                <span>Total</span>
                <span className="text-purple-600">${getTotal().toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-colors shadow-lg"
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