'use client'

import { motion } from 'framer-motion'

/**
 * myPiPOS Animated Logo
 *
 * A distinctive animated logo.
 * Features:
 * - Rotating cyan rings
 * - Pulsing core
 * - Floating particles
 * - Cool blue/teal color scheme
 */
export function AnimatedLogo({ size = 120 }: { size?: number }) {
  const ringSize = size * 0.8
  const coreSize = size * 0.4
  const particleCount = 8

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer rotating ring */}
      <motion.div
        className="absolute rounded-full border-2 border-transparent"
        style={{
          width: ringSize,
          height: ringSize,
          borderTopColor: '#14D3C5',
          borderRightColor: '#11a79e',
          opacity: 0.8
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Middle counter-rotating ring */}
      <motion.div
        className="absolute rounded-full border-2 border-transparent"
        style={{
          width: ringSize * 0.75,
          height: ringSize * 0.75,
          borderBottomColor: '#25ede1',
          borderLeftColor: '#0d8b84',
          opacity: 0.6
        }}
        animate={{
          rotate: -360
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Inner ring */}
      <motion.div
        className="absolute rounded-full border border-transparent"
        style={{
          width: ringSize * 0.5,
          height: ringSize * 0.5,
          borderTopColor: '#A6F1E0',
          borderBottomColor: '#A6F1E0',
          opacity: 0.4
        }}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Pulsing core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: coreSize,
          height: coreSize,
          background: 'radial-gradient(circle, #14D3C5 0%, #11a79e 50%, #0d8b84 100%)',
          boxShadow: '0 0 30px rgba(20,211,197,0.6), 0 0 60px rgba(20,211,197,0.3)'
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.9, 1, 0.9]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Floating particles */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2
        const radius = ringSize * 0.65
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              background: '#14D3C5',
              boxShadow: '0 0 8px rgba(20,211,197,0.8)'
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 0
            }}
            animate={{
              x: [0, x],
              y: [0, y],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeOut'
            }}
          />
        )
      })}

      {/* Text overlay */}
      <div
        className="absolute font-display font-bold text-white pointer-events-none"
        style={{
          fontSize: coreSize * 0.5,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}
      >
        POS
      </div>
    </div>
  )
}

/**
 * Compact version for headers/nav
 */
export function AnimatedLogoSmall({ size = 40 }: { size?: number }) {
  const ringSize = size * 0.9
  const coreSize = size * 0.5

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Single rotating ring */}
      <motion.div
        className="absolute rounded-full border border-transparent"
        style={{
          width: ringSize,
          height: ringSize,
          borderTopColor: '#14D3C5',
          borderRightColor: '#11a79e',
          opacity: 0.8
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Pulsing core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: coreSize,
          height: coreSize,
          background: 'radial-gradient(circle, #14D3C5 0%, #11a79e 100%)',
          boxShadow: '0 0 15px rgba(20,211,197,0.5)'
        }}
        animate={{
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* "POS" letters */}
      <div
        className="absolute font-display font-bold text-white pointer-events-none"
        style={{
          fontSize: coreSize * 0.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.4)'
        }}
      >
        POS
      </div>
    </div>
  )
}
