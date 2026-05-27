'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { useCartStore } from '@/lib/store';
import { Product } from '@/types';
import Header from '@/components/Header';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { getCurrencySymbol, formatPrice } from '@/lib/currency';
import {
  ShoppingCart,
  Scan,
  Search,
  Package,
  Coffee,
  Sandwich,
  Salad,
  CircleDollarSign,
  Cookie,
  User,
  X,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Barcode,
  Box,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';

// Icon mapping for products
const productIcons: Record<string, React.ReactNode> = {
  'Coffee': <Coffee className="w-6 h-6" />,
  'Sandwich': <Sandwich className="w-6 h-6" />,
  'Salad': <Salad className="w-6 h-6" />,
  'Tea': <Coffee className="w-6 h-6" />,
  'Cookie': <Cookie className="w-6 h-6" />,
};

export default function POSPage() {
  const router = useRouter();
  const { isAuthenticated, merchantId, currentContext, setMerchantData } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'product' | 'customer'>('product');
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name?: string;
    piUsername?: string;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

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
  }, [isAuthenticated, merchantId, router]);

  // Set up global handler for Pi Browser
  useEffect(() => {
    (window as any).openScanner = () => setShowScanner(true);
    return () => { delete (window as any).openScanner; };
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      if (!merchantId) return;

      try {
        setLoadingProducts(true);
        setProductsError(null);

        const response = await fetch(`/api/products?merchant_id=${merchantId}`);
        const data = await response.json();

        if (data.success) {
          setProducts(data.products);
        } else {
          setProductsError(data.error || 'Failed to load products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductsError('Failed to connect to product API');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [merchantId]);

  const { items, addItem, removeItem, updateQuantity, getSubtotal, getTax, getTotal, clearCart, setMerchantTaxRate, merchantTaxRate } = useCartStore();

  // Fetch merchant data to get tax rate
  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!merchantId) return;

      try {
        const response = await fetch(`/api/merchant?merchant_id=${merchantId}`);
        const data = await response.json();

        if (data.success && data.merchant) {
          const merchant = data.merchant;

          // Store merchant data in auth store
          setMerchantData(merchant);

          // Set the tax rate (convert from percentage to decimal)
          const taxRate = (merchant.tax_rate || 8) / 100;
          setMerchantTaxRate(taxRate);
        }
      } catch (error) {
        console.error('Error fetching merchant data:', error);
        // Keep default 8% tax rate on error
      }
    };

    fetchMerchantData();
  }, [merchantId, setMerchantData, setMerchantTaxRate]);

  // Extract categories from products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addItem(product);
      setSelectedCategory(product.category);
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
    const currencySymbol = getCurrencySymbol();

    const confirmed = window.confirm(
      `Checkout Summary:\n` +
      `• ${itemCount} items\n` +
      `• Subtotal: ${getSubtotal().toFixed(7)} ${currencySymbol}\n` +
      `• Tax: ${getTax().toFixed(7)} ${currencySymbol}\n` +
      `• Total: ${total.toFixed(7)} ${currencySymbol}\n\n` +
      `Proceed with Pi payment?`
    );

    if (confirmed) {
      alert(`Processing Pi payment of ${total.toFixed(7)} ${currencySymbol}...\n\n(Payment integration to be implemented)`);
      clearCart();
      setSelectedCustomer(null);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#0D0F16] flex flex-col overflow-hidden">
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

      {/* Shared Header */}
      <Header title="POS Terminal" subtitle="Point of Sale System" />

      {/* Back to Mode Selection */}
      <div className="px-6 py-3 bg-[#0D0F16]/50 border-b border-brand-indigo-800/30">
        <button
          onClick={() => router.push('/mode-selection')}
          className="flex items-center gap-2 text-brand-indigo-400 hover:text-[#14D3C5] transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mode Selection</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 overflow-y-auto order-1 lg:order-1">
          <div className="container mx-auto px-6 py-6">
            {/* Navigation Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                variant="outline"
                onClick={() => router.push('/mode-selection')}
                className="border-brand-indigo-700 text-brand-indigo-300 hover:bg-brand-indigo-900/50"
              >
                ← Back to Mode Selection
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/ims')}
                className="border-brand-indigo-700 text-brand-indigo-300 hover:bg-brand-indigo-900/50"
              >
                <Box className="mr-2 w-4 h-4" />
                Go to Inventory
              </Button>
            </div>

            {/* Category Filter */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeInUp}
              className="mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 shadow-glow font-semibold'
                        : 'bg-brand-indigo-900/50 text-brand-indigo-400 hover:bg-brand-indigo-900/70 border border-brand-indigo-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Loading State */}
            {loadingProducts && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-brand-cyan-400 animate-spin mb-4" />
                <p className="text-brand-indigo-300 text-lg font-semibold">Loading products...</p>
              </div>
            )}

            {/* Error State */}
            {productsError && (
              <div className="bg-brand-magenta-900/30 border border-brand-magenta-700 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-brand-magenta-400 mx-auto mb-4" />
                <h3 className="text-brand-magenta-300 text-lg font-semibold mb-2">Failed to Load Products</h3>
                <p className="text-brand-magenta-400 text-sm mb-4">{productsError}</p>
                <Button
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-brand-magenta-600 hover:bg-brand-magenta-700 text-white"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Products Grid */}
            {!loadingProducts && !productsError && (
              <>
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeInUp}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filteredProducts.map((product, index) => {
                const cartItem = items.find(item => item.product.id === product.id);
                const quantity = cartItem?.quantity || 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => addItem(product)}
                    className="group relative bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 rounded-2xl p-6 cursor-pointer hover:shadow-glass hover:border-brand-cyan-700 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-linear-to-br from-brand-cyan-900/20 to-brand-indigo-900/20 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-br from-brand-cyan-400/0 to-brand-cyan-600/0 group-hover:from-brand-cyan-400/10 group-hover:to-brand-cyan-600/10 transition-all duration-300" />
                      <div className="relative z-10 text-brand-cyan-400 group-hover:text-brand-cyan-300 group-hover:scale-110 transition-all duration-300">
                        {product.imageUrl || product.ipfsHash ? (
                          <img
                            src={product.imageUrl || `https://gateway.pinata.cloud/ipfs/${product.ipfsHash}`}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        {(!product.imageUrl && !product.ipfsHash) && (
                        <div className="flex items-center justify-center">
                          {productIcons[product.name] || <Package className="w-8 h-8" />}
                        </div>
                      )}
                      </div>
                      {quantity > 0 && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-full flex items-center justify-center shadow-glow">
                          <span className="text-brand-dark-950 text-sm font-bold">{quantity}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-display font-semibold text-brand-indigo-200 text-base mb-2 truncate">
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between mb-2">
                      <p className="text-brand-cyan-400 font-bold text-lg">
                        {formatPrice(product.price)}
                      </p>
                      <div className="w-8 h-8 bg-brand-indigo-800 rounded-lg flex items-center justify-center group-hover:from-brand-cyan-400 group-hover:to-brand-cyan-600 group-hover:text-white transition-all duration-300">
                        <Plus className="w-4 h-4 text-brand-cyan-400 group-hover:text-brand-dark-950" />
                      </div>
                    </div>

                    <p className="text-xs text-brand-indigo-500">
                      Stock: {product.stock}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>

            {filteredProducts.length === 0 && !loadingProducts && !productsError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-4xl mb-4 text-brand-indigo-700">
                  <Search />
                </div>
                <h3 className="text-lg font-display font-semibold text-brand-indigo-400 mb-2">
                  No products found
                </h3>
                <p className="text-brand-indigo-600">
                  Try adjusting your search or category filter
                </p>
              </motion.div>
            )}
              </>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96 border-l-0 lg:border-l border-brand-indigo-800/50 flex flex-col backdrop-blur-xl bg-brand-indigo-900/30 shrink-0 order-2 lg:order-3">
          {/* Customer Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 border-b border-brand-indigo-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-brand-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setScannerMode('customer');
                  setShowScanner(true);
                }}
                className="px-3 py-1 text-xs bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 hover:from-brand-cyan-500 hover:to-brand-cyan-700 font-semibold"
              >
                <Scan className="w-3 h-3 mr-1" />
                Scan QR
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="bg-linear-to-br from-brand-cyan-900/20 to-brand-indigo-900/20 backdrop-blur-xl border border-brand-cyan-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-full flex items-center justify-center shadow-glow">
                    <User className="w-5 h-5 text-brand-dark-950" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-brand-indigo-200 text-sm">
                      {selectedCustomer.name || 'Customer'}
                    </div>
                    <div className="text-xs text-brand-cyan-400">
                      @{selectedCustomer.piUsername || 'unknown'}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full mt-3 text-xs text-brand-magenta-400 hover:text-brand-magenta-300 hover:bg-brand-magenta-900/20"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Customer
                </Button>
              </div>
            ) : (
              <div className="text-center text-brand-indigo-600 text-sm py-6 bg-brand-indigo-900/30 rounded-xl border border-brand-indigo-800/30">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No customer selected</p>
              </div>
            )}
          </motion.div>

          {/* Item Scanning Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="p-4 border-b border-brand-indigo-800/50"
          >
            <div className="mb-3">
              <h3 className="text-xs font-bold text-brand-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Scan className="w-3 h-3" />
                Add Items
              </h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or scan item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchQuery.trim() && handleBarcodeScanned(searchQuery.trim())}
                  className="w-full h-10 pl-8 pr-20 py-2 rounded-lg bg-brand-indigo-800 border border-brand-indigo-700 text-brand-indigo-200 text-sm placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 focus:outline-none"
                  disabled={!selectedCustomer}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-indigo-500 pointer-events-none" />
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      setScannerMode('product');
                      setShowScanner(true);
                    }}
                    disabled={!selectedCustomer}
                    className="px-2 py-1 bg-brand-cyan-600 text-white text-xs rounded hover:bg-brand-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Scan Item Barcode"
                  >
                    <Scan className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {!selectedCustomer && (
                <p className="text-xs text-brand-indigo-500 mt-1 text-center">
                  Scan customer QR first to add items
                </p>
              )}
            </div>
          </motion.div>

          {/* Cart Header */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 border-b border-brand-indigo-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-brand-indigo-200 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-cyan-400" />
                Cart
              </h2>
              <div className="w-8 h-8 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-full flex items-center justify-center shadow-glow">
                <span className="text-brand-dark-950 text-sm font-bold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-8 text-brand-indigo-600">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 bg-brand-indigo-900/30 rounded-xl border border-brand-indigo-800/50"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-brand-indigo-200 text-sm mb-1">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-brand-indigo-500">
                        {formatPrice(item.product.price)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-brand-indigo-800 flex items-center justify-center text-brand-indigo-400 hover:bg-brand-indigo-700 hover:text-brand-indigo-200 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-semibold text-brand-indigo-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-brand-indigo-800 flex items-center justify-center text-brand-indigo-400 hover:bg-brand-indigo-700 hover:text-brand-indigo-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="w-7 h-7 rounded-lg bg-brand-magenta-900/30 flex items-center justify-center text-brand-magenta-400 hover:bg-brand-magenta-900/50 hover:text-brand-magenta-300 transition-colors ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Cart Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 p-6 overflow-y-auto"
          >
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-brand-indigo-400">
                <span>Subtotal</span>
                <span className="font-semibold text-brand-indigo-200">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm text-brand-indigo-400">
                <span>Tax ({(merchantTaxRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-brand-indigo-200">{formatPrice(getTax())}</span>
              </div>
              <div className="h-px bg-brand-indigo-800 my-3"></div>
              <div className="flex justify-between">
                <span className="text-base font-semibold text-brand-indigo-300">Total</span>
                <span className="text-xl font-bold text-brand-cyan-400">{formatPrice(getTotal())}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="w-full py-4 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 hover:from-brand-cyan-500 hover:to-brand-cyan-700 font-bold text-base shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <CreditCard className="mr-2 w-5 h-5" />
                Checkout
              </Button>

              {items.length > 0 && (
                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="w-full border-brand-magenta-800/50 text-brand-magenta-400 hover:bg-brand-magenta-900/30 hover:text-brand-magenta-300"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Clear Cart
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}