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
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.1)',
    instructions: 'Agregá todas tus cuentas: banco, caja de ahorro, billeteras crypto (USDT, BTC), brokers de inversión y efectivo. Asignale un nombre, moneda y saldo inicial. Esto te permite ver tu patrimonio total consolidado.',
  },
  {
    href: '/settings/categories',
    icon: Tag,
    label: 'Categorías',
    description: 'Gastos e ingresos personalizados',
    iconColor: '#a89efa',
    iconBg: 'rgba(124,111,247,0.1)',
    instructions: 'Creá categorías propias para organizar tus movimientos: "Sueldo", "Alquiler", "Supermercado", etc. Podés asignar un color e ícono a cada una. Las categorías sirven para filtrar y analizar tus gastos e ingresos.',
  },
  {
    href: '/settings/credit-cards',
    icon: CreditCard,
    label: 'Tarjetas de crédito',
    description: 'Fecha de cierre y vencimiento',
    iconColor: '#c084fc',
    iconBg: 'rgba(192,132,252,0.1)',
    instructions: 'Registrá tus tarjetas de crédito con la fecha de cierre y de vencimiento de pago. La app te avisa antes del vencimiento y agrupa los gastos por resumen. Usá el nombre del banco y los últimos 4 dígitos.',
  },
  {
    href: '/settings/people',
    icon: Users,
    label: 'Personas',
    description: 'Contactos para cobros pendientes',
    iconColor: '#fb923c',
    iconBg: 'rgba(251,146,60,0.1)',
    instructions: 'Agregá contactos a quienes les prestaste dinero o te deben. Cuando registres un gasto compartido o préstamo, podés asociarlo a una persona y ver el resumen de saldos pendientes.',
  },
  {
    href: '/settings/alerts',
    icon: Bell,
    label: 'Alertas',
    description: 'Vencimientos, gastos y cobros',
    iconColor: '#fbbf24',
    iconBg: 'rgba(251,191,36,0.1)',
    instructions: 'Configurá alertas para: vencimiento de tarjetas (X días antes), límite de gastos por categoría, y cobros pendientes vencidos. Las alertas aparecen en el banner superior de la app.',
  },
  {
    href: '/settings/telegram',
    icon: Bot,
    label: 'Bot de Telegram',
    description: 'Cargá gastos desde el celular',
    iconColor: '#38bdf8',
    iconBg: 'rgba(56,189,248,0.1)',
    instructions: 'Conectá el bot de Telegram para registrar gastos rápido sin abrir la app. Mandás un mensaje como "café 500" y lo carga automáticamente. Copiá tu token en la configuración y escribile /start al bot.',
  },
]

export default function SettingsPage() {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#ededed' }}>Configuración</h1>

      {/* Secciones */}
      <div className="space-y-2 mb-5">
        {SECTIONS.map(({ href, icon: Icon, label, description, iconColor, iconBg }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all group"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#333333'
              el.style.background = '#1e1e1e'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#2a2a2a'
              el.style.background = '#1a1a1a'
            }}
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: iconBg }}>
              <Icon size={19} style={{ color: iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: '#ededed' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#666' }}>{description}</p>
            </div>
            <ArrowRight size={14} style={{ color: '#444' }} />
          </Link>
        ))}
      </div>

      {/* Panel de instrucciones */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161616', border: '1px solid #222' }}>
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center gap-3 px-4 py-3.5"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,111,247,0.1)' }}>
            <BookOpen size={13} style={{ color: '#7c6ff7' }} />
          </div>
          <span className="flex-1 text-sm font-semibold text-left" style={{ color: '#999' }}>
            ¿Cómo completar cada sección?
          </span>
          {guideOpen
            ? <ChevronUp size={14} style={{ color: '#555' }} />
            : <ChevronDown size={14} style={{ color: '#555' }} />
          }
        </button>

        {guideOpen && (
          <div className="px-4 pb-5 space-y-4" style={{ borderTop: '1px solid #1e1e1e' }}>
            {SECTIONS.map(({ icon: Icon, label, instructions, iconColor }) => (
              <div key={label} className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color: iconColor }} />
                  <span className="text-xs font-semibold" style={{ color: '#cccccc' }}>{label}</span>
                </div>
                <p className="text-xs leading-5" style={{ color: '#777', paddingLeft: '1.25rem' }}>
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
