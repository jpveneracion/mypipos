'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// Sample inventory data
const sampleInventory: Product[] = [
  {
    id: '1',
    name: 'Heinz Tomato Ketchup',
    description: 'Classic tomato ketchup 500ml bottle',
    price: 3.99,
    cost: 2.50,
    sku: 'COF001',
    barcode: '011110021113',
    category: 'Condiments',
    stock: 45,
    minStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Coca-Cola 500ml',
    description: 'Refreshing cola drink',
    price: 1.99,
    cost: 1.20,
    sku: 'SND001',
    barcode: '054490000131',
    category: 'Beverages',
    stock: 8,
    minStock: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Lays Classic Chips',
    description: 'Classic salted potato chips 150g',
    price: 2.49,
    cost: 1.50,
    sku: 'SAL001',
    barcode: '028400486048',
    category: 'Snacks',
    stock: 67,
    minStock: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Bottled Water 1L',
    description: 'Spring water 1 liter bottle',
    price: 0.99,
    cost: 0.40,
    sku: 'WAT001',
    barcode: '012345678901',
    category: 'Beverages',
    stock: 120,
    minStock: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    name: 'Chocolate Bar',
    description: 'Milk chocolate bar 100g',
    price: 1.49,
    cost: 0.80,
    sku: 'CHO001',
    barcode: '012345678902',
    category: 'Confectionery',
    stock: 3,
    minStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function IMSPage() {
  const [products, setProducts] = useState<Product[]>(sampleInventory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');

  useEffect(() => {
    (window as any).openScanner = () => setScanningBarcode(true);
    return () => { delete (window as any).openScanner; };
  }, []);

  const categories = ['All', 'Beverages', 'Food', 'Snacks', 'Condiments', 'Confectionery'];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const lowStockProducts = products.filter(product => product.stock <= product.minStock);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  const handleBarcodeScanned = (barcode: string) => {
    const existingProduct = products.find(p => p.barcode === barcode);
    if (existingProduct) {
      alert(`Product with barcode "${barcode}" already exists: ${existingProduct.name}`);
    } else {
      setScannedBarcode(barcode);
      setShowAddModal(true);
    }
    setScanningBarcode(false);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { status: 'Out of Stock', color: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300 border-error-200 dark:border-error-800', icon: '🚫' };
    if (product.stock <= product.minStock) return { status: 'Low Stock', color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300 border-warning-200 dark:border-warning-800', icon: '⚠️' };
    return { status: 'In Stock', color: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 border-success-200 dark:border-success-800', icon: '✅' };
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      {/* Barcode Scanner Modal */}
      {scanningBarcode && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setScanningBarcode(false)}
        />
      )}

      {/* Premium Header */}
      <header className="backdrop-blur-xl bg-white/70 dark:bg-oceanic-900/70 border-b border-oceanic-100 dark:border-oceanic-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center shadow-glass">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                  Inventory Management
                </h1>
                <p className="text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">
                  Manage products and stock levels
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                size="md"
                onClick={() => setScanningBarcode(true)}
                className="border-oceanic-200 dark:border-oceanic-700 hover:bg-oceanic-50 dark:hover:bg-oceanic-900/30"
              >
                <span className="mr-2">📷</span>
                <span className="hidden sm:inline">Scan Barcode</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => setShowAddModal(true)}
                className="bg-linear-to-r from-oceanic-600 to-sky-600 hover:from-oceanic-700 hover:to-sky-700"
              >
                <span className="mr-2">➕</span>
                <span className="hidden sm:inline">Add Product</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 flex-1">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Total Products</p>
                <p className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100">{products.length}</p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center text-2xl">
                📦
              </div>
            </div>
          </Card>

          <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Total Value</p>
                <p className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-emerald-100 to-success-100 dark:from-emerald-900/30 dark:to-success-900/30 rounded-xl flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
          </Card>

          <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Low Stock</p>
                <p className="text-3xl font-bold text-warning-600">{lowStockProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-warning-100 to-amber-100 dark:from-warning-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>
          </Card>

          <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Out of Stock</p>
                <p className="text-3xl font-bold text-error-600">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-error-100 to-red-100 dark:from-error-900/30 dark:to-red-900/30 rounded-xl flex items-center justify-center text-2xl">
                🚫
              </div>
            </div>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <Card className="mb-6 glassmorphism bg-linear-to-r from-warning-50 to-amber-50 dark:from-warning-900/20 dark:to-amber-900/20 border-warning-200 dark:border-warning-800">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-warning-900 dark:text-warning-100 mb-2">Stock Alerts</h3>
                <div className="space-y-2 text-sm">
                  {outOfStockProducts.length > 0 && (
                    <div className="glassmorphism bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-700 rounded-xl p-3">
                      <p className="font-semibold text-error-900 dark:text-error-100 mb-1">Out of Stock:</p>
                      <ul className="list-disc list-inside text-error-800 dark:text-error-200">
                        {outOfStockProducts.map(product => (
                          <li key={product.id}>{product.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lowStockProducts.filter(p => p.stock > 0).length > 0 && (
                    <div className="glassmorphism bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-700 rounded-xl p-3">
                      <p className="font-semibold text-warning-900 dark:text-warning-100 mb-1">Low Stock:</p>
                      <ul className="list-disc list-inside text-warning-800 dark:text-warning-200">
                        {lowStockProducts.filter(p => p.stock > 0).map(product => (
                          <li key={product.id}>
                            {product.name} - {product.stock} units left
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="mb-6 glassmorphism">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
                    selectedCategory === category
                      ? 'bg-linear-to-r from-oceanic-500 to-sky-600 text-white shadow-glass'
                      : 'bg-white dark:bg-oceanic-900 text-oceanic-700 dark:text-oceanic-300 hover:bg-oceanic-50 dark:hover:bg-oceanic-800 border border-oceanic-200 dark:border-oceanic-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Desktop Table View */}
        <Card className="hidden md:block glassmorphism overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-oceanic-50 dark:bg-oceanic-900/50 border-b border-oceanic-200 dark:border-oceanic-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-oceanic-700 dark:text-oceanic-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-oceanic-100 dark:divide-oceanic-800">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-oceanic-50 dark:hover:bg-oceanic-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-12 w-12 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center text-xl">
                            🛍️
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-oceanic-900 dark:text-oceanic-100">{product.name}</div>
                            <div className="text-sm text-oceanic-600 dark:text-oceanic-400">{product.barcode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-oceanic-900 dark:text-oceanic-100 font-medium">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-medium bg-oceanic-100 text-oceanic-700 dark:bg-oceanic-900/50 dark:text-oceanic-300 rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-oceanic-900 dark:text-oceanic-100 font-bold">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${stockStatus.color} inline-flex items-center gap-1`}>
                          <span>{stockStatus.icon}</span>
                          <span>{stockStatus.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button size="sm" variant="ghost" className="text-oceanic-600 hover:text-oceanic-900 mr-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-error-600 hover:text-error-900">
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <Card key={product.id} className="glassmorphism hover:shadow-glass transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-14 w-14 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center text-2xl">
                      🛍️
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-oceanic-900 dark:text-oceanic-100">{product.name}</h3>
                      <p className="text-xs text-oceanic-600 dark:text-oceanic-400">{product.barcode}</p>
                      <p className="text-xs text-oceanic-700 dark:text-oceanic-300">{product.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full border ${stockStatus.color} inline-flex items-center gap-1`}>
                    <span>{stockStatus.icon}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-oceanic-50 dark:bg-oceanic-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">Stock</p>
                    <p className="text-lg font-bold text-oceanic-900 dark:text-oceanic-100">{product.stock}</p>
                  </div>
                  <div className="bg-oceanic-50 dark:bg-oceanic-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">Price</p>
                    <p className="text-lg font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-oceanic-50 dark:bg-oceanic-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-oceanic-600 dark:text-oceanic-400 font-medium">SKU</p>
                    <p className="text-sm font-bold text-oceanic-900 dark:text-oceanic-100">{product.sku}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 bg-linear-to-r from-oceanic-600 to-sky-600"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScanningBarcode(true)}
                    className="flex-1 border-oceanic-200 dark:border-oceanic-700"
                  >
                    📷 Scan
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <Card className="text-center py-16 glassmorphism">
            <div className="text-7xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">No products found</h3>
            <p className="text-oceanic-600 dark:text-oceanic-400 mb-6">Try adjusting your search or category filter</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="border-oceanic-200 dark:border-oceanic-700"
            >
              Clear Filters
            </Button>
          </Card>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glassmorphism bg-linear-to-br from-oceanic-50 to-sky-50 dark:from-oceanic-900 dark:to-sky-900 rounded-2xl shadow-glass-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-oceanic-200 dark:border-oceanic-800">
            <div className="sticky top-0 bg-linear-to-r from-oceanic-600 to-sky-600 dark:from-oceanic-700 dark:to-sky-700 border-b border-oceanic-200 dark:border-oceanic-800 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add New Product</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setScannedBarcode('');
                  }}
                  className="text-white/80 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Product form submitted! Barcode: ' + scannedBarcode);
                  setShowAddModal(false);
                  setScannedBarcode('');
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setScanningBarcode(true);
                  }}
                  className="w-full py-6 border-2 border-dashed border-oceanic-300 dark:border-oceanic-600 hover:border-oceanic-500 bg-white dark:bg-oceanic-800/50 flex flex-col items-center gap-2"
                >
                  <span className="text-3xl">📷</span>
                  <span className="font-semibold text-oceanic-700 dark:text-oceanic-300">Scan Barcode with Camera</span>
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="grow border-t border-oceanic-300 dark:border-oceanic-600"></div>
                  <span className="shrink-0 mx-4 text-oceanic-700 dark:text-oceanic-300 font-medium">or enter manually</span>
                  <div className="grow border-t border-oceanic-300 dark:border-oceanic-600"></div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Product Name</label>
                  <Input type="text" className="w-full" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Price</label>
                    <Input type="number" step="0.01" className="w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">SKU</label>
                    <Input type="text" className="w-full" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Stock</label>
                    <Input type="number" className="w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Min Stock</label>
                    <Input type="number" className="w-full" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                    Barcode {scannedBarcode && <span className="text-success-700 dark:text-success-300">✓ Scanned</span>}
                  </label>
                  <Input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    placeholder="Optional"
                    className="w-full"
                  />
                  {scannedBarcode && (
                    <p className="text-xs text-success-700 dark:text-success-300 mt-1">Barcode "{scannedBarcode}" ready to use</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Category</label>
                  <select className="w-full px-4 py-3 border border-oceanic-300 dark:border-oceanic-600 rounded-xl focus:ring-2 focus:ring-oceanic-500 bg-white dark:bg-oceanic-800 text-oceanic-900 dark:text-oceanic-100">
                    <option value="">Select category</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">Description</label>
                  <textarea className="w-full px-4 py-3 border border-oceanic-300 dark:border-oceanic-600 rounded-xl focus:ring-2 focus:ring-oceanic-500 bg-white dark:bg-oceanic-800 text-oceanic-900 dark:text-oceanic-100" rows={3} placeholder="Optional" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setScannedBarcode('');
                    }}
                    className="flex-1 border-oceanic-300 dark:border-oceanic-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 bg-linear-to-r from-oceanic-600 to-sky-600"
                  >
                    Add Product
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
