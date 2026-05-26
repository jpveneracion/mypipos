'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SettingsLayoutProps {
  activeTab: 'personal' | 'business';
  onTabChange: (tab: 'personal' | 'business') => void;
  children: ReactNode;
}

export default function SettingsLayout({
  activeTab,
  onTabChange,
  children
}: SettingsLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Account Settings
        </h1>
        <p className="text-gray-600">
          Manage your personal and business settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => onTabChange('personal')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Personal Settings
          </button>
          <button
            onClick={() => onTabChange('business')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'business'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Business Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
