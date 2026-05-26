"use client"

import { motion } from "framer-motion"

/**
 * myPiPOS Animated Background
 *
 * Ocean Deep theme animated background.
 * Features:
 * - Cyan radial gradient
 * - Floating cyan/teal particles
 * - Grid pattern for depth
 * - Subtle breathing animation
 */
export default function MyPiPOSBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">

      {/* Main radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(54,60,79,0.5) 0%, transparent 70%)",
        }}
      />

      {/* Cyan glowing core */}
      <motion.div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(20,211,197,0.18) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,237,225,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(37,237,225,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating particles */}
      {[
        { top: "20%", left: "8%", size: 6, color: "#14D3C5", delay: 0 },
        { top: "60%", left: "5%", size: 4, color: "#25ede1", delay: 1 },
        { top: "35%", right: "10%", size: 5, color: "#14D3C5", delay: 2 },
        { top: "70%", right: "8%", size: 3, color: "#A6F1E0", delay: 1.5 },
        { top: "85%", left: "25%", size: 4, color: "#14D3C5", delay: 0.5 },
      ].map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: particle.top,
            left: particle.left,
            right: particle.right,
            width: particle.size * 2,
            height: particle.size * 2,
            background: particle.color,
            boxShadow: `0 0 ${particle.size * 4}px ${particle.color}`,
            opacity: 0.6,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
