'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/types';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Package,
  Scan,
  Search,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  X,
  Barcode,
  DollarSign,
  Box,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

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
    if (product.stock === 0) return { status: 'Out of Stock', color: 'bg-error-900/30 text-error-200 border-error-700', icon: AlertCircle };
    if (product.stock <= product.minStock) return { status: 'Low Stock', color: 'bg-warning-900/30 text-warning-200 border-warning-700', icon: AlertTriangle };
    return { status: 'In Stock', color: 'bg-success-900/30 text-success-200 border-success-700', icon: CheckCircle };
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#0D0F16] flex flex-col overflow-hidden">
      {/* Barcode Scanner Modal */}
      {scanningBarcode && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setScanningBarcode(false)}
        />
      )}

      {/* Premium Header */}
      <header className="relative z-50 border-b border-brand-indigo-800/50 backdrop-blur-xl bg-brand-indigo-900/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 shadow-glow">
                <BarChart3 className="w-6 h-6 text-brand-dark-950" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 bg-clip-text text-transparent">
                  Inventory Management
                </h1>
                <p className="text-xs text-brand-indigo-400 font-medium">
                  Manage products and stock levels
                </p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex gap-3 w-full md:w-auto"
            >
              <Button
                variant="outline"
                size="md"
                onClick={() => setScanningBarcode(true)}
                className="border-brand-indigo-700 text-brand-indigo-300 hover:bg-brand-indigo-900/50 hover:border-brand-cyan-500 transition-all"
              >
                <Scan className="mr-2 w-4 h-4" />
                <span className="hidden sm:inline">Scan Barcode</span>
              </Button>

              <Button
                size="md"
                onClick={() => setShowAddModal(true)}
                className="bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 hover:from-brand-cyan-500 hover:to-brand-cyan-700 font-semibold shadow-glow"
              >
                <Plus className="mr-2 w-4 h-4" />
                <span className="hidden sm:inline">Add Product</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 flex-1 overflow-y-auto">
        {/* Dashboard Stats */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="relative overflow-hidden bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan-400/5 rounded-full blur-3xl group-hover:bg-brand-cyan-400/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-indigo-400 text-sm font-medium">Total Products</p>
                  <p className="text-3xl font-display font-bold text-brand-indigo-200">{products.length}</p>
                </div>
                <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                  <Package className="w-6 h-6 text-brand-cyan-400" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan-400/5 rounded-full blur-3xl group-hover:bg-brand-cyan-400/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-indigo-400 text-sm font-medium">Total Value</p>
                  <p className="text-3xl font-display font-bold text-brand-indigo-200">
                    ${totalValue.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                  <DollarSign className="w-6 h-6 text-brand-cyan-400" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning-400/5 rounded-full blur-3xl group-hover:bg-warning-400/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-indigo-400 text-sm font-medium">Low Stock</p>
                  <p className="text-3xl font-display font-bold text-warning-400">{lowStockProducts.length}</p>
                </div>
                <div className="w-12 h-12 bg-linear-to-br from-warning-400/10 to-amber-400/10 rounded-xl flex items-center justify-center border border-warning-700/30">
                  <AlertTriangle className="w-6 h-6 text-warning-400" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error-400/5 rounded-full blur-3xl group-hover:bg-error-400/10 transition-all"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-indigo-400 text-sm font-medium">Out of Stock</p>
                  <p className="text-3xl font-display font-bold text-error-400">
                    {products.filter(p => p.stock === 0).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-linear-to-br from-error-400/10 to-red-400/10 rounded-xl flex items-center justify-center border border-error-700/30">
                  <AlertCircle className="w-6 h-6 text-error-400" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Low Stock Alerts */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6"
          >
            <Card className="bg-linear-to-r from-warning-900/30 to-amber-900/30 backdrop-blur-xl border border-warning-700/50">
              <div className="flex items-start gap-4 p-6">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-warning-400/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-display font-bold text-warning-200 mb-4">Stock Alerts</h3>
                  <div className="space-y-3 text-sm">
                    {outOfStockProducts.length > 0 && (
                      <div className="bg-error-900/40 backdrop-blur-xl border border-error-700/50 rounded-xl p-4">
                        <p className="font-semibold text-error-200 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Out of Stock
                        </p>
                        <ul className="list-disc list-inside text-error-300 space-y-1">
                          {outOfStockProducts.map(product => (
                            <li key={product.id}>{product.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lowStockProducts.filter(p => p.stock > 0).length > 0 && (
                      <div className="bg-warning-900/40 backdrop-blur-xl border border-warning-700/50 rounded-xl p-4">
                        <p className="font-semibold text-warning-200 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Low Stock
                        </p>
                        <ul className="list-disc list-inside text-warning-300 space-y-1">
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
          </motion.div>
        )}

        {/* Search and Filter */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-6"
        >
          <Card className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50">
            <div className="flex flex-col lg:flex-row gap-4 p-6">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-indigo-500" />
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
                      selectedCategory === category
                        ? 'bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 shadow-glow font-semibold'
                        : 'bg-brand-indigo-950/50 text-brand-indigo-400 hover:bg-brand-indigo-900/70 border border-brand-indigo-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Desktop Table View */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="hidden md:block"
        >
          <Card className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-indigo-950/50 border-b border-brand-indigo-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-indigo-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-indigo-800/50">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <tr key={product.id} className="hover:bg-brand-indigo-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-12 w-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                              <Package className="w-6 h-6 text-brand-cyan-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-brand-indigo-200">{product.name}</div>
                              <div className="text-sm text-brand-indigo-500">{product.barcode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-indigo-300 font-medium">{product.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium bg-brand-cyan-900/30 text-brand-cyan-300 border border-brand-cyan-700/50 rounded-full">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-indigo-200 font-bold">{product.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 bg-clip-text text-transparent">${product.price.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-full border ${stockStatus.color}`}>
                            <stockStatus.icon className="w-3 h-3" />
                            {stockStatus.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-brand-cyan-400 hover:text-brand-cyan-300 mr-3 transition-colors">
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button className="text-brand-magenta-400 hover:text-brand-magenta-300 transition-colors">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Mobile Card View */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="md:hidden space-y-4"
        >
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <Card key={product.id} className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300">
                <div className="flex items-start justify-between mb-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-14 w-14 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                      <Package className="w-7 h-7 text-brand-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-display font-bold text-brand-indigo-200">{product.name}</h3>
                      <p className="text-xs text-brand-indigo-500">{product.barcode}</p>
                      <p className="text-xs text-brand-cyan-400">{product.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full border ${stockStatus.color} inline-flex items-center gap-1`}>
                    <stockStatus.icon className="w-3 h-3" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 px-6">
                  <div className="bg-brand-indigo-950/50 rounded-lg p-3 text-center border border-brand-indigo-800/50">
                    <p className="text-xs text-brand-indigo-500 font-medium">Stock</p>
                    <p className="text-lg font-bold text-brand-indigo-200">{product.stock}</p>
                  </div>
                  <div className="bg-brand-indigo-950/50 rounded-lg p-3 text-center border border-brand-indigo-800/50">
                    <p className="text-xs text-brand-indigo-500 font-medium">Price</p>
                    <p className="text-lg font-bold bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 bg-clip-text text-transparent">${product.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-brand-indigo-950/50 rounded-lg p-3 text-center border border-brand-indigo-800/50">
                    <p className="text-xs text-brand-indigo-500 font-medium">SKU</p>
                    <p className="text-sm font-bold text-brand-indigo-200">{product.sku}</p>
                  </div>
                </div>

                <div className="flex gap-2 p-6 pt-0">
                  <Button size="sm" className="flex-1 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 font-semibold">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScanningBarcode(true)}
                    className="flex-1 border-brand-indigo-700 text-brand-indigo-400"
                  >
                    <Scan className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-brand-magenta-800/50 text-brand-magenta-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-brand-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-indigo-800/50">
              <Search className="w-10 h-10 text-brand-indigo-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-brand-indigo-300 mb-2">No products found</h3>
            <p className="text-brand-indigo-500 mb-6">Try adjusting your search or category filter</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="border-brand-indigo-700 text-brand-indigo-400 hover:bg-brand-indigo-900/50"
            >
              Clear Filters
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-indigo-900 backdrop-blur-xl border border-brand-indigo-700 rounded-2xl shadow-glass-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 border-b border-brand-cyan-700 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-bold text-brand-dark-950">Add New Product</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setScannedBarcode('');
                  }}
                  className="text-brand-dark-950/80 hover:text-brand-dark-950 text-2xl font-bold"
                >
                  <X className="w-6 h-6" />
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
                  className="w-full py-6 border-2 border-dashed border-brand-cyan-700 hover:border-brand-cyan-500 flex flex-col items-center gap-2 bg-brand-cyan-900/20 text-brand-cyan-400 hover:bg-brand-cyan-900/30 transition-all"
                >
                  <Barcode className="w-8 h-8" />
                  <span className="font-semibold">Scan Barcode with Camera</span>
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="grow border-t border-brand-indigo-700"></div>
                  <span className="shrink-0 mx-4 text-brand-indigo-500 font-medium">or enter manually</span>
                  <div className="grow border-t border-brand-indigo-700"></div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Product Name</label>
                  <Input type="text" className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Price</label>
                    <Input type="number" step="0.01" className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-indigo-300 mb-2">SKU</label>
                    <Input type="text" className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Stock</label>
                    <Input type="number" className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Min Stock</label>
                    <Input type="number" className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-indigo-300 mb-2">
                    Barcode {scannedBarcode && <span className="text-success-400 ml-2">✓ Scanned</span>}
                  </label>
                  <Input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-brand-indigo-950/50 border-brand-indigo-700 text-brand-indigo-200 placeholder-brand-indigo-500 focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                  />
                  {scannedBarcode && (
                    <p className="text-xs text-success-400 mt-1">Barcode "{scannedBarcode}" ready to use</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Category</label>
                  <select className="w-full px-4 py-3 border border-brand-indigo-700 rounded-xl focus:ring-2 focus:ring-brand-cyan-500 bg-brand-indigo-950/50 text-brand-indigo-200 focus:border-brand-cyan-500">
                    <option value="">Select category</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-indigo-300 mb-2">Description</label>
                  <textarea className="w-full px-4 py-3 border border-brand-indigo-700 rounded-xl focus:ring-2 focus:ring-brand-cyan-500 bg-brand-indigo-950/50 text-brand-indigo-200 focus:border-brand-cyan-500" rows={3} placeholder="Optional" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setScannedBarcode('');
                    }}
                    className="flex-1 border-brand-indigo-700 text-brand-indigo-400 hover:bg-brand-indigo-900/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-linear-to-r from-brand-cyan-400 to-brand-cyan-600 text-brand-dark-950 hover:from-brand-cyan-500 hover:to-brand-cyan-700 font-semibold shadow-glow"
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