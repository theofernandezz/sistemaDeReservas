'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServicePreviewProps {
  price: number
  durationMin: number
  accentColor?: string
  rating?: number
  reviews?: number
  isInteractive?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ServicePreview({ 
  price, 
  durationMin, 
  accentColor = '#f97316',
  rating,
  reviews,
  isInteractive = true,
  size = 'md'
}: ServicePreviewProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 24, height: 24, fontSize: 'text-lg', spacing: 2 },
    md: { width: 32, height: 32, fontSize: 'text-2xl', spacing: 3 },
    lg: { width: 40, height: 40, fontSize: 'text-3xl', spacing: 4 }
  }
  
  const config = sizeConfig[size]

  // Floating particles data
  const particles = [
    { id: 1, angle: 0, delay: 0 },
    { id: 2, angle: 120, delay: 0.2 },
    { id: 3, angle: 240, delay: 0.4 }
  ]

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center",
        isInteractive && "cursor-pointer"
      )}
      onMouseEnter={() => isInteractive && setIsHovered(true)}
      onMouseLeave={() => isInteractive && setIsHovered(false)}
    >
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: `${accentColor}30` }}
        animate={{
          rotate: isHovered ? 360 : 0,
          scale: isHovered ? 1.1 : 1
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut"
        }}
      />

      {/* Inner content circle */}
      <motion.div
        className="relative z-10 rounded-full flex flex-col items-center justify-center shadow-lg"
        style={{
          width: `${config.width * 4}px`,
          height: `${config.height * 4}px`,
          backgroundColor: `${accentColor}08`,
          border: `2px solid ${accentColor}20`
        }}
        animate={{
          scale: isHovered ? 1.05 : 1
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        {/* Price */}
        <div 
          className={cn(
            "font-bold transition-all duration-300",
            config.fontSize
          )}
          style={{ 
            color: accentColor,
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          ${price}
        </div>
        
        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          <Clock className="w-3 h-3" />
          <span>{durationMin}m</span>
        </div>
        
        {/* Rating badge (if provided) */}
        {rating && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white shadow-md border"
               style={{ borderColor: `${accentColor}30` }}>
            <Star className="w-3 h-3" style={{ color: accentColor }} fill={accentColor} />
            <span>{rating.toFixed(1)}</span>
            {reviews && <span className="text-gray-400">({reviews})</span>}
          </div>
        )}
      </motion.div>

      {/* Floating particles animation */}
      {isHovered && isInteractive && (
        <div className="absolute inset-0">
          {particles.map((particle) => {
            const radius = config.width * 2
            const x = Math.cos((particle.angle * Math.PI) / 180) * radius
            const y = Math.sin((particle.angle * Math.PI) / 180) * radius
            
            return (
              <motion.div
                key={particle.id}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ 
                  backgroundColor: accentColor,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-4px',
                  marginTop: '-4px'
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: 0,
                  y: 0
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 0.8, 0],
                  x: [x, x * 1.5, x],
                  y: [y, y * 1.5, y]
                }}
                transition={{
                  duration: 2,
                  delay: particle.delay,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
              />
            )
          })}
        </div>
      )}

      {/* Pulsing effect when hovered */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ 
            border: `2px solid ${accentColor}`,
            opacity: 0.3
          }}
          animate={{
            scale: [1, 1.3, 1.5],
            opacity: [0.5, 0.2, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity
          }}
        />
      )}
    </div>
  )
}

// Simplified version for inline use
export function CompactServicePreview({ 
  price, 
  durationMin, 
  accentColor 
}: { 
  price: number
  durationMin: number
  accentColor?: string 
}) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
        style={{ 
          backgroundColor: `${accentColor}10`,
          color: accentColor,
          border: `1px solid ${accentColor}20`
        }}
      >
        ${price}
      </div>
      <div className="text-xs text-gray-500">
        {durationMin}m
      </div>
    </div>
  )
}

// Animated pricing badge for cards
export function PricingBadge({ 
  price, 
  accentColor,
  showSavings = false,
  originalPrice
}: { 
  price: number
  accentColor?: string
  showSavings?: boolean
  originalPrice?: number
}) {
  return (
    <div className="relative">
      {showSavings && originalPrice && originalPrice > price && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
          -${Math.round(originalPrice - price)}
        </div>
      )}
      <div 
        className="px-3 py-1.5 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-105"
        style={{ 
          backgroundColor: `${accentColor}10`,
          color: accentColor,
          border: `1px solid ${accentColor}20`
        }}
      >
        ${price}
      </div>
    </div>
  )
}