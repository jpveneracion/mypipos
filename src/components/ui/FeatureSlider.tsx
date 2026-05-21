'use client';

import { useState, useEffect } from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: '🌍',
    title: 'Universal Customer Base',
    description: 'Connect once to access millions of Pi Pioneers worldwide - every myPiPOS merchant shares the same customer network!',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    icon: '📱',
    title: 'Mobile-First POS',
    description: 'Lightning-fast checkout optimized for smartphones and tablets with touch-friendly interface',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: '🥧',
    title: 'One Login, All Merchants',
    description: 'Pioneers connect their Pi account once and become customers of every myPiPOS merchant instantly',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    icon: '📊',
    title: 'Smart Inventory',
    description: 'Real-time stock tracking with low stock alerts and automated reorder notifications',
    color: 'from-pink-500 to-rose-600'
  },
  {
    icon: '🚀',
    title: 'Instant Market Access',
    description: 'Join myPiPOS and immediately tap into the global Pi Network ecosystem of millions of active users',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: '⚡',
    title: 'Network Effect Growth',
    description: 'As more merchants join, your customer base grows exponentially - the power of shared Pi Network connectivity',
    color: 'from-amber-500 to-orange-600'
  }
];

export default function FeatureSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <div className="relative h-full min-h-[400px]">
      {/* Main Feature Display */}
      <div className="absolute inset-0 flex items-center justify-center">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 scale-100 translate-x-0'
                : index < currentSlide
                ? 'opacity-0 scale-95 -translate-x-full'
                : 'opacity-0 scale-95 translate-x-full'
            }`}
          >
            <div className="text-center px-8 max-w-2xl">
              <div className={`text-8xl mb-6 animate-bounce`}>
                {feature.icon}
              </div>
              <h3 className={`text-4xl font-bold mb-4 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                {feature.title}
              </h3>
              <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Previous feature"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Next feature"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-purple-600 w-8'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}