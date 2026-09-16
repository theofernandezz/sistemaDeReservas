'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Transición entre pasos del flujo de reserva (especialista → fecha → confirmar).
 * Vive en template.tsx (no layout.tsx): ese archivo se remonta en cada navegación,
 * así que la animación de entrada corre siempre, sin depender de key={pathname}
 * sobre AnimatePresence (frágil cruzando Server Components de Next).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
