'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme, type Theme } from './ThemeProvider'

const OPTIONS: { value: Theme; icon: typeof Moon; label: string }[] = [
  { value: 'dark',   icon: Moon,    label: 'Oscuro' },
  { value: 'light',  icon: Sun,     label: 'Claro'  },
  { value: 'system', icon: Monitor, label: 'Sistema' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-semibold tracking-widest uppercase px-1 mb-1.5" style={{ color: 'var(--text-faint)' }}>
        Tema
      </p>
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {OPTIONS.map(({ value, icon: Icon, label }) => {
          const active = theme === value
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              title={label}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 transition-all"
              style={active
                ? { background: 'var(--accent-bg)', color: 'var(--accent-icon)' }
                : { background: 'transparent', color: 'var(--text-faint)' }
              }
            >
              <Icon size={13} />
              <span className="text-[10px] font-medium hidden lg:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
