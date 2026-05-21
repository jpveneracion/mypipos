'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import BarcodeScanner from '@/components/pos/BarcodeScanner';

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
  const [mobileView, setMobileView] = useState<'dashboard' | 'inventory' | 'add'>('dashboard');

  // Set up global handler for Pi Browser
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
    if (product.stock === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-700', icon: '🚫' };
    if (product.stock <= product.minStock) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' };
    return { status: 'In Stock', color: 'bg-green-100 text-green-700', icon: '✅' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barcode Scanner Modal */}
      {scanningBarcode && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setScanningBarcode(false)}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">📊 Inventory Management</h1>
              <p className="text-purple-100 text-sm md:text-base">Manage your products and stock levels</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setScanningBarcode(true)}
                className="flex-1 md:flex-none bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">📷</span>
                <span className="hidden sm:inline">Scan Barcode</span>
                <span className="sm:hidden">Scan</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 md:flex-none bg-white text-purple-600 px-4 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">➕</span>
                <span className="hidden sm:inline">Add Product</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:p-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Products</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">{products.length}</p>
              </div>
              <div className="text-2xl md:text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Value</p>
                <p className="text-xl md:text-3xl font-bold text-gray-800">
                  ${products.reduce((sum, p) => sum + (p.price * p.stock), 0).toFixed(2)}
                </p>
              </div>
              <div className="text-2xl md:text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Low Stock</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">{lowStockProducts.length}</p>
              </div>
              <div className="text-2xl md:text-4xl">⚠️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Out of Stock</p>
                <p className="text-2xl md:text-3xl font-bold text-red-600">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <div className="text-2xl md:text-4xl">🚫</div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts - Mobile */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-xl md:text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Stock Alerts</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  {outOfStockProducts.length > 0 && (
                    <div className="mb-2">
                      <p className="font-semibold">Out of Stock:</p>
                      <ul className="list-disc list-inside">
                        {outOfStockProducts.map(product => (
                          <li key={product.id}>{product.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lowStockProducts.filter(p => p.stock > 0).length > 0 && (
                    <div>
                      <p className="font-semibold">Low Stock:</p>
                      <ul className="list-disc list-inside">
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
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm md:text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors text-sm font-medium ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            🛍️
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.barcode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.icon} {stockStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-purple-600 hover:text-purple-900 mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      🛍️
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.barcode}</p>
                      <p className="text-xs text-gray-600">{product.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                    {stockStatus.icon}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Stock</p>
                    <p className="text-lg font-bold text-gray-900">{product.stock}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Price</p>
                    <p className="text-lg font-bold text-purple-600">${product.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">SKU</p>
                    <p className="text-sm font-medium text-gray-900">{product.sku}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-purple-700">
                    Edit
                  </button>
                  <button
                    onClick={() => setScanningBarcode(true)}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-indigo-700"
                  >
                    📷 Scan
                  </button>
                  <button className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-red-700">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or category filter</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Add Product Modal - Mobile Optimized */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500">
            <div className="sticky top-0 bg-purple-900 border-b border-purple-700 p-4 md:p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add New Product</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setScannedBarcode('');
                  }}
                  className="text-purple-300 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Here you would handle the form submission
                  alert('Product form submitted! Barcode: ' + scannedBarcode);
                  setShowAddModal(false);
                  setScannedBarcode('');
                }}
              >
                {/* Scan Barcode Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setScanningBarcode(true);
                  }}
                  className="w-full bg-indigo-800 hover:bg-indigo-700 text-purple-200 p-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-purple-600 cursor-pointer touch-manipulation active:bg-indigo-900"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span className="text-2xl">📷</span>
                  <span>Scan Barcode with Camera</span>
                </button>

                <div className="border-t border-purple-700 pt-4">
                  <p className="text-center text-purple-300 mb-4">or enter manually</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Product Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Price</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">SKU</label>
                    <input type="text" className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Stock</label>
                    <input type="number" className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Min Stock</label>
                    <input type="number" className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">
                    Barcode {scannedBarcode && <span className="text-green-400">✓ Scanned</span>}
                  </label>
                  <input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional"
                  />
                  {scannedBarcode && (
                    <p className="text-xs text-green-400 mt-1">Barcode "{scannedBarcode}" ready to use</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Category</label>
                  <select className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500">
                    <option value="">Select category</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Description</label>
                  <textarea className="w-full px-3 py-2 border border-purple-600 bg-purple-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500" rows={3} placeholder="Optional" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setScannedBarcode('');
                    }}
                    className="flex-1 px-4 py-3 border border-purple-600 text-purple-200 rounded-lg hover:bg-purple-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}