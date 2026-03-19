'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle2, Calendar, CreditCard, Clock, Bell, CalendarCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import logo from '@/public/logo/icon.png'

export function InteractiveFeatureCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      
      {/* 1. CALENDARIO INTELIGENTE (Wide Card) */}
      <div className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-linear-to-br from-violet-500/10 via-card to-card border border-violet-500/20 p-8 shadow-lg hover:shadow-xl transition-all duration-500">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 grid md:grid-cols-2 gap-6 items-center">
            {/* Texto a la izquierda */}
            <div>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-4 border border-violet-500/30">
                    <CalendarCheck className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Tu agenda, siempre actualizada</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Tus clientes eligen el horario que les conviene y vos lo ves en tiempo real. Sin llamadas, sin WhatsApp ida y vuelta.
                </p>
            </div>

            {/* Animación a la derecha */}
            <div className="flex items-center justify-center">
                <LiveBookingSimulation />
            </div>
        </div>
      </div>

      {/* 2. INTEGRACIONES - ORBIT MODE (Tall Card - Row Span 2) */}
      <div className="md:row-span-2 relative group overflow-hidden rounded-3xl bg-zinc-950 text-white border border-zinc-800 p-8 flex flex-col shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Conectado a todo.</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
                Google Calendar, MercadoPago, Email, WhatsApp. Todo sincronizado automáticamente.
            </p>
        </div>
        
        <div className="relative z-10 mt-auto flex-1 flex items-center justify-center">
             <IntegrationsOrbit />
        </div>
      </div>

      {/* 3. PAGOS Y SEÑAS (Small Card) */}
      <div className="relative group overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500/10 via-card to-card border border-emerald-500/20 p-8 shadow-lg hover:shadow-xl transition-all duration-500 flex flex-col">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                <CreditCard className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Cobrá señas sin esfuerzo</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
                Reduce cancelaciones cobrando un porcentaje al reservar.
            </p>
        </div>
        
        <div className="relative z-10 mt-4">
            <PaymentFlowAnimation />
        </div>
      </div>

       {/* 4. RECORDATORIOS (Small Card) */}
       <div className="relative group overflow-hidden rounded-3xl bg-linear-to-br from-blue-500/10 via-card to-card border border-blue-500/20 p-8 shadow-lg hover:shadow-xl transition-all duration-500 flex flex-col">
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                <Bell className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Adiós a los olvidos</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
                Recordatorios automáticos por email antes de cada cita.
            </p>
        </div>
        
        <div className="relative z-10 mt-4">
             <NotificationTimeline />
        </div>
      </div>

    </div>
  )
}

// --- ANIMATION COMPONENTS ---

function LiveBookingSimulation() {
    const [currentStep, setCurrentStep] = useState(0)
    
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % 4)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    const timeSlots = [
        { time: '09:00', available: true },
        { time: '10:30', available: true },
        { time: '12:00', available: false },
        { time: '14:00', available: true },
        { time: '15:30', available: true },
    ]

    return (
        <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-[240px] bg-card/80 backdrop-blur-sm rounded-2xl border border-border shadow-xl overflow-hidden relative">
                {/* Header */}
                <div className="bg-violet-500/10 px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-medium text-foreground">Martes, 14 Enero</span>
                    </div>
                </div>
                
                {/* Time slots */}
                <div className="p-3 space-y-2 pb-14">
                    {timeSlots.map((slot, index) => (
                        <motion.div
                            key={slot.time}
                            animate={{
                                scale: currentStep === 1 && index === 1 ? 1.02 : 1,
                                borderColor: currentStep === 1 && index === 1 ? 'rgb(139, 92, 246)' : 'rgba(139, 92, 246, 0)',
                            }}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-colors",
                                slot.available ? "bg-card hover:bg-secondary/50" : "bg-muted/50 opacity-50",
                                currentStep >= 2 && index === 1 && "bg-violet-500/20 border-violet-500"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs font-medium">{slot.time}</span>
                            </div>
                            
                            {currentStep >= 2 && index === 1 ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center gap-1"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                                    <span className="text-[10px] font-bold text-violet-500">RESERVADO</span>
                                </motion.div>
                            ) : (
                                <span className={cn(
                                    "text-[10px]",
                                    slot.available ? "text-emerald-500" : "text-muted-foreground"
                                )}>
                                    {slot.available ? "Disponible" : "Ocupado"}
                                </span>
                            )}
                        </motion.div>
                    ))}
                </div>
                
                {/* Confirmation toast - posición absoluta */}
                <AnimatePresence>
                    {currentStep === 3 && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-emerald-500 text-white rounded-lg flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-medium">¡Turno confirmado!</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function IntegrationsOrbit() {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-linear-to-r from-violet-500/20 via-transparent to-blue-500/20 rounded-full blur-2xl animate-pulse" />
            
            {/* Center Hub */}
            <div className="relative z-20 w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)]">
                <Image src={logo} alt="Buki" width={56} height={56} className="w-12 h-12 object-contain" />
            </div>

            {/* Orbit Rings */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border border-white/10 rounded-full" />
                <div className="absolute w-64 h-64 border border-white/5 rounded-full" />
            </div>

            {/* Inner Orbit - Google Calendar & MercadoPago */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-40 h-40"
            >
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center"
                >
                    <Image 
                        src="/integrations/google-calendar.svg" 
                        alt="Google Calendar"
                        width={40}
                        height={40}
                        className="object-contain"
                    />
                </motion.div>
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center"
                >
                    <Image 
                        src="/integrations/mercadopago.png" 
                        alt="MercadoPago"
                        width={40}
                        height={40}
                        className="object-contain"
                    />
                </motion.div>
            </motion.div>
            
            {/* Outer Orbit - Gmail & WhatsApp */}
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-64 h-64"
            >
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -right-5 -translate-y-1/2 w-10 h-10 flex items-center justify-center"
                >
                    <Image 
                        src="/integrations/gmail.svg" 
                        alt="Gmail"
                        width={40}
                        height={40}
                        className="object-contain"
                    />
                </motion.div>
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -left-5 -translate-y-1/2 w-10 h-10 flex items-center justify-center"
                >
                    <Image 
                        src="/integrations/whatsapp.svg" 
                        alt="WhatsApp"
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                </motion.div>
            </motion.div>
            
            {/* Floating particles - valores fijos para evitar hydration mismatch */}
            {[
                { x: 15, y: -10, duration: 3.5, left: 25, top: 30 },
                { x: -18, y: 12, duration: 4.2, left: 65, top: 45 },
                { x: 8, y: -15, duration: 3.8, left: 40, top: 70 },
                { x: -12, y: 18, duration: 4.5, left: 55, top: 25 },
                { x: 20, y: 5, duration: 3.2, left: 35, top: 55 },
                { x: -8, y: -12, duration: 4.0, left: 70, top: 60 },
            ].map((particle, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                    animate={{
                        x: [0, particle.x],
                        y: [0, particle.y],
                        opacity: [0.2, 0.6, 0.2],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: i * 0.5,
                    }}
                    style={{
                        left: `${particle.left}%`,
                        top: `${particle.top}%`,
                    }}
                />
            ))}
        </div>
    )
}

function PaymentFlowAnimation() {
    const [step, setStep] = useState(0)
    
    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4)
        }, 1500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border p-5 w-full max-w-sm">
            <div className="flex items-center justify-between gap-3">
                {/* Step 1: Service */}
                <motion.div
                    animate={{ 
                        scale: step === 0 ? 1.1 : 1,
                        opacity: step >= 0 ? 1 : 0.5
                    }}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        step >= 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                    )}>
                        <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Reserva</span>
                </motion.div>
                
                <motion.div
                    animate={{ scaleX: step >= 1 ? 1 : 0 }}
                    className="h-0.5 flex-1 bg-emerald-500/50 origin-left"
                />
                
                {/* Step 2: Payment */}
                <motion.div
                    animate={{ 
                        scale: step === 1 ? 1.1 : 1,
                        opacity: step >= 1 ? 1 : 0.5
                    }}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        step >= 1 ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                    )}>
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Seña</span>
                </motion.div>
                
                <motion.div
                    animate={{ scaleX: step >= 2 ? 1 : 0 }}
                    className="h-0.5 flex-1 bg-emerald-500/50 origin-left"
                />
                
                {/* Step 3: Confirmed */}
                <motion.div
                    animate={{ 
                        scale: step >= 2 ? 1.1 : 1,
                        opacity: step >= 2 ? 1 : 0.5
                    }}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        step >= 2 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Listo</span>
                </motion.div>
            </div>
            
            {/* Amount display - altura fija para evitar saltos */}
            <div className="h-8 mt-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {step >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center"
                        >
                            <span className="text-xs text-muted-foreground">Seña recibida: </span>
                            <span className="text-sm font-bold text-emerald-500">$2.500</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function NotificationTimeline() {
    const notifications = [
        { time: '24h antes', message: 'Recordá tu turno mañana', icon: Calendar },
        { time: '2h antes', message: 'Tu cita es en 2 horas', icon: Clock },
        { time: 'Ahora', message: '¡Te esperamos!', icon: Sparkles },
    ]
    
    const [activeIndex, setActiveIndex] = useState(0)
    
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % notifications.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full space-y-2">
            {notifications.map((notif, index) => {
                const Icon = notif.icon
                const isActive = index <= activeIndex
                const isCurrent = index === activeIndex
                
                return (
                    <motion.div
                        key={notif.time}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ 
                            opacity: isActive ? 1 : 0.3,
                            x: 0,
                            scale: isCurrent ? 1.02 : 1
                        }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                            isCurrent 
                                ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10" 
                                : "bg-card/50 border-border"
                        )}
                    >
                        <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            isCurrent ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground">{notif.time}</p>
                        </div>
                        {isCurrent && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                            />
                        )}
                    </motion.div>
                )
            })}
        </div>
    )
}
