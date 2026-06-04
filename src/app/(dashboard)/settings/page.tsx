'use client'

import Link from 'next/link'
import { Wallet, Tag, CreditCard, Users, Bell, Bot, ArrowRight } from 'lucide-react'

const SECTIONS = [
  {
    href: '/settings/accounts',
    icon: Wallet,
    label: 'Cuentas',
    description: 'Bancarias, broker, crypto, efectivo',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/settings/categories',
    icon: Tag,
    label: 'Categorías',
    description: 'Gastos e ingresos personalizados',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    href: '/settings/credit-cards',
    icon: CreditCard,
    label: 'Tarjetas de crédito',
    description: 'Fecha de cierre y vencimiento',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/settings/people',
    icon: Users,
    label: 'Personas',
    description: 'Contactos para cobros pendientes',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    href: '/settings/alerts',
    icon: Bell,
    label: 'Alertas',
    description: 'Vencimientos, gastos y cobros',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    href: '/settings/telegram',
    icon: Bot,
    label: 'Bot de Telegram',
    description: 'Cargá gastos desde el celular',
    color: 'bg-sky-50 text-sky-600',
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Configuración</h1>
      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, label, description, color }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-4 hover:shadow-sm hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{label}</p>
              <p className="text-sm text-slate-400">{description}</p>
            </div>
            <ArrowRight size={16} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
