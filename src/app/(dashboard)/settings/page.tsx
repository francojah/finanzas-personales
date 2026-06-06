'use client'

import Link from 'next/link'
import { Wallet, Tag, CreditCard, Users, Bell, Bot, ArrowRight, BookOpen, ChevronDown, ChevronUp, UserCircle } from 'lucide-react'
import { useState } from 'react'

const SECTIONS = [
  {
    href: '/settings/profile', icon: UserCircle, label: 'Mi perfil', description: 'Nombre, contraseña y eliminar cuenta',
    iconColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.1)',
    instructions: 'Actualizá tu nombre, cambiá tu contraseña o eliminá tu cuenta y todos tus datos de forma permanente.',
  },
  {
    href: '/settings/accounts', icon: Wallet, label: 'Cuentas', description: 'Bancarias, broker, crypto, efectivo',
    iconColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.1)',
    instructions: 'Agregá todas tus cuentas: banco, caja de ahorro, billeteras crypto, brokers y efectivo. Asignale un nombre, moneda y saldo inicial. Esto te permite ver tu patrimonio total consolidado.',
  },
  {
    href: '/settings/categories', icon: Tag, label: 'Categorías', description: 'Gastos e ingresos personalizados',
    iconColor: 'var(--accent-icon)', iconBg: 'var(--accent-bg)',
    instructions: 'Creá categorías propias: "Sueldo", "Alquiler", "Supermercado", etc. Podés asignar color e ícono a cada una para filtrar y analizar tus movimientos.',
  },
  {
    href: '/settings/credit-cards', icon: CreditCard, label: 'Tarjetas de crédito', description: 'Fecha de cierre y vencimiento',
    iconColor: '#c084fc', iconBg: 'rgba(192,132,252,0.1)',
    instructions: 'Registrá tus tarjetas con fecha de cierre y vencimiento. La app te avisa antes del vencimiento y agrupa gastos por resumen.',
  },
  {
    href: '/settings/people', icon: Users, label: 'Personas', description: 'Contactos para cobros pendientes',
    iconColor: '#fb923c', iconBg: 'rgba(251,146,60,0.1)',
    instructions: 'Agregá contactos a quienes les prestaste dinero. Asociá gastos compartidos a una persona y mirá el resumen de saldos pendientes.',
  },
  {
    href: '/settings/alerts', icon: Bell, label: 'Alertas', description: 'Vencimientos, gastos y cobros',
    iconColor: '#fbbf24', iconBg: 'rgba(251,191,36,0.1)',
    instructions: 'Configurá alertas para vencimientos de tarjetas, límite de gastos por categoría y cobros vencidos. Aparecen en el banner del dashboard.',
  },
  {
    href: '/settings/telegram', icon: Bot, label: 'Bot de Telegram', description: 'Cargá gastos desde el celular',
    iconColor: '#38bdf8', iconBg: 'rgba(56,189,248,0.1)',
    instructions: 'Conectá el bot para registrar gastos rápido: mandás "café 500" y lo carga automáticamente. Copiá tu token en la configuración y escribile /start al bot.',
  },
]

export default function SettingsPage() {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Configuración</h1>

      <div className="space-y-2 mb-5">
        {SECTIONS.map(({ href, icon: Icon, label, description, iconColor, iconBg }) => (
          <Link
            key={href} href={href}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: iconBg }}>
              <Icon size={19} style={{ color: iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-faint)' }} />
          </Link>
        ))}
      </div>

      {/* Panel de instrucciones */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center gap-3 px-4 py-3.5"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-bg)' }}>
            <BookOpen size={13} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <span className="flex-1 text-sm font-semibold text-left" style={{ color: 'var(--text-secondary)' }}>
            ¿Cómo completar cada sección?
          </span>
          {guideOpen
            ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          }
        </button>

        {guideOpen && (
          <div className="px-4 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {SECTIONS.map(({ icon: Icon, label, instructions, iconColor }) => (
              <div key={label} className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color: iconColor }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                </div>
                <p className="text-xs leading-5" style={{ color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>
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
