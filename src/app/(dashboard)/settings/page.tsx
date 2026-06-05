'use client'

import Link from 'next/link'
import { Wallet, Tag, CreditCard, Users, Bell, Bot, ArrowRight, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const SECTIONS = [
  {
    href: '/settings/accounts',
    icon: Wallet,
    label: 'Cuentas',
    description: 'Bancarias, broker, crypto, efectivo',
    color: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa' },
    instructions: 'Agregá todas tus cuentas: banco, caja de ahorro, billeteras crypto (USDT, BTC), brokers de inversión y efectivo. Asignale un nombre, moneda y saldo inicial. Esto te permite ver tu patrimonio total consolidado.',
  },
  {
    href: '/settings/categories',
    icon: Tag,
    label: 'Categorías',
    description: 'Gastos e ingresos personalizados',
    color: { bg: 'rgba(124, 111, 247, 0.12)', text: '#a89efa' },
    instructions: 'Creá categorías propias para organizar tus movimientos: "Sueldo", "Alquiler", "Supermercado", etc. Podés asignar un color e ícono a cada una. Las categorías sirven para filtrar y analizar tus gastos e ingresos.',
  },
  {
    href: '/settings/credit-cards',
    icon: CreditCard,
    label: 'Tarjetas de crédito',
    description: 'Fecha de cierre y vencimiento',
    color: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc' },
    instructions: 'Registrá tus tarjetas de crédito con la fecha de cierre y de vencimiento de pago. Esto permite que la app te avise antes del vencimiento y agrupe los gastos por resumen. Usá el nombre del banco y los últimos 4 dígitos.',
  },
  {
    href: '/settings/people',
    icon: Users,
    label: 'Personas',
    description: 'Contactos para cobros pendientes',
    color: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c' },
    instructions: 'Agregá contactos a quienes les prestaste dinero o te deben. Cuando registres un gasto compartido o un préstamo, podés asociarlo a una persona. Así podés ver el resumen de lo que te deben o debés a cada uno.',
  },
  {
    href: '/settings/alerts',
    icon: Bell,
    label: 'Alertas',
    description: 'Vencimientos, gastos y cobros',
    color: { bg: 'rgba(234, 179, 8, 0.12)', text: '#facc15' },
    instructions: 'Configurá alertas automáticas para: vencimiento de tarjetas de crédito (X días antes), límite de gastos por categoría, y cobros pendientes vencidos. Las alertas aparecen en el banner superior de la app.',
  },
  {
    href: '/settings/telegram',
    icon: Bot,
    label: 'Bot de Telegram',
    description: 'Cargá gastos desde el celular',
    color: { bg: 'rgba(14, 165, 233, 0.12)', text: '#38bdf8' },
    instructions: 'Conectá el bot de Telegram para registrar gastos rápido desde tu celular sin abrir la app. Mandás un mensaje como "café 500" y lo carga automáticamente. Necesitás copiar tu token en la configuración y escribirle /start al bot.',
  },
]

export default function SettingsPage() {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#e2e2f0' }}>Configuración</h1>

      {/* Sections */}
      <div className="space-y-2.5 mb-6">
        {SECTIONS.map(({ href, icon: Icon, label, description, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all"
            style={{
              background: '#141420',
              border: '1px solid #252535',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124, 111, 247, 0.25)'
              ;(e.currentTarget as HTMLElement).style.background = '#1a1a28'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#252535'
              ;(e.currentTarget as HTMLElement).style.background = '#141420'
            }}
          >
            <div
              className="p-2.5 rounded-xl shrink-0"
              style={{ background: color.bg }}
            >
              <Icon size={20} style={{ color: color.text }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: '#e2e2f0' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#4a4a65' }}>{description}</p>
            </div>
            <ArrowRight size={15} style={{ color: '#2a2a40' }} />
          </Link>
        ))}
      </div>

      {/* Instructions panel */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: '#0f0f1c',
          border: '1px solid rgba(124, 111, 247, 0.15)',
        }}
      >
        {/* Header — clickable toggle */}
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors"
          style={{ color: '#6b6b85' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124, 111, 247, 0.12)' }}
          >
            <BookOpen size={14} style={{ color: '#7c6ff7' }} />
          </div>
          <span className="flex-1 text-sm font-semibold text-left" style={{ color: '#9090a8' }}>
            ¿Cómo completar cada sección?
          </span>
          {guideOpen
            ? <ChevronUp size={15} />
            : <ChevronDown size={15} />
          }
        </button>

        {/* Content */}
        {guideOpen && (
          <div
            className="px-4 pb-4 space-y-4"
            style={{ borderTop: '1px solid #1a1a28' }}
          >
            {SECTIONS.map(({ icon: Icon, label, instructions, color }) => (
              <div key={label} className="pt-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={13} style={{ color: color.text }} />
                  <span className="text-xs font-semibold" style={{ color: color.text }}>{label}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#4a4a65', paddingLeft: '1.25rem' }}>
                  {instructions}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
