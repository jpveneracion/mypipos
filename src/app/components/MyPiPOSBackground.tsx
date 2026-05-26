"use client"

import { motion } from "framer-motion"

/**
 * myPiPOS Animated Background (Pi Orb Design)
 *
 * Original animated background with floating orbs.
 * Features:
 * - Cyan radial gradient
 * - Floating animated dots (cyan + purple)
 * - Grid pattern for depth
 * - Breathing animation
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

      {/* Glowing orb */}
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

      {/* Floating dots */}
      {[
        { top: "20%", left: "8%", size: 6, color: "#14D3C5", delay: 0 },
        { top: "60%", left: "5%", size: 4, color: "#a78bfa", delay: 1 },
        { top: "35%", right: "10%", size: 5, color: "#14D3C5", delay: 2 },
        { top: "70%", right: "8%", size: 3, color: "#a78bfa", delay: 1.5 },
        { top: "85%", left: "25%", size: 4, color: "#14D3C5", delay: 0.5 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top,
            left: orb.left,
            right: orb.right,
            width: orb.size * 2,
            height: orb.size * 2,
            background: orb.color,
            boxShadow: `0 0 ${orb.size * 4}px ${orb.color}`,
            opacity: 0.6,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
