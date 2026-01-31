'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Clock, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export interface EnhancedServiceCardProps {
  id: string
  title: string
  description: string
  price: number
  durationMin: number
  image?: string | null
  bookingBasePath?: string
  accentColor?: string
  variant?: 'standard' | 'featured'
}

export function EnhancedServiceCard({ 
  id, 
  title, 
  description, 
  price, 
  durationMin, 
  image, 
  bookingBasePath = '/booking',
  accentColor = '#f97316', // orange-500 default
  variant = 'standard'
}: EnhancedServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const hasImage = !!image
  const isFeatured = variant === 'featured'

  // Calculate accent color variants
  const accentBg = `${accentColor}10`
  const accentBorder = `${accentColor}20`
  const accentHover = accentColor

  return (
    <Link 
      href={`${bookingBasePath}/${id}`} 
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card 
          className={cn(
            "relative overflow-hidden bg-white border-2 transition-all duration-300",
            "hover:shadow-2xl",
            // Featured variant styling
            isFeatured && "md:col-span-2",
            // Dynamic border and background based on accent
            !isFeatured && `border-${accentBorder} hover:border-${accentHover}`,
            isFeatured && `border-2 shadow-lg`,
            isFeatured && `border-${accentBorder}`
          )}
          style={{ 
            borderColor: isFeatured ? `${accentColor}30` : `${accentColor}20`,
            backgroundColor: isFeatured ? `${accentColor}03` : 'white'
          }}
        >
          {/* Background glow effect */}
          <div 
            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-20"
            style={{ backgroundColor: accentColor }}
          />

          {/* Hover overlay with gradient */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 opacity-0 transition-opacity duration-300"
            )}
            style={{ 
              backgroundImage: isHovered 
                ? `linear-gradient(135deg, transparent 0%, ${accentColor}05 100%)`
                : 'none'
            }}
          />

          {/* Image section */}
          {hasImage && (
            <div className="relative w-full h-48 sm:h-40 md:h-48 overflow-hidden">
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay gradient */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
              />
              
              {/* Featured badge */}
              {isFeatured && (
                <div className="absolute top-4 left-4">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Star className="w-4 h-4" />
                    Popular
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-5 sm:p-6">
            <div className="space-y-3">
              {/* Title and price */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-lg sm:text-xl text-gray-900 leading-tight transition-colors group-hover:text-gray-700 line-clamp-2">
                  {title}
                </h3>
                <span 
                  className={cn(
                    "shrink-0 font-bold text-lg sm:text-xl transition-all duration-300",
                    isHovered && "scale-105"
                  )}
                  style={{ color: accentColor }}
                >
                  ${price}
                </span>
              </div>

              {/* Description */}
              {description && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 group-hover:text-gray-500 transition-colors">
                  {description}
                </p>
              )}
            </div>

            {/* Bottom section */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{durationMin} min</span>
              </div>

              {/* CTA button with dynamic styling */}
              <motion.button
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-300"
                style={{ 
                  backgroundColor: isHovered ? accentHover : accentBg,
                  color: isHovered ? 'white' : accentColor,
                  border: `1px solid ${accentBorder}`
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="hidden sm:inline">{isHovered ? 'Ver Horarios' : 'Reservar'}</span>
                <span className="sm:hidden">Ver</span>
                <ChevronRight 
                  className={cn(
                    "w-4 h-4 transition-transform duration-300",
                    isHovered && "translate-x-0.5"
                  )} 
                />
              </motion.button>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}

// Helper function for accent color utilities
export function getAccentVariants(accentColor: string) {
  return {
    accent: accentColor,
    accentBg: `${accentColor}10`,
    accentBgHover: `${accentColor}15`,
    accentBorder: `${accentColor}20`,
    accentBorderHover: `${accentColor}40`,
    accentText: accentColor,
    accentTextLight: `${accentColor}cc`
  }
}