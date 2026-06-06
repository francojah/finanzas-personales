'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Target, Wallet, CheckCircle, PauseCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, cn } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import type { Project } from '@/types/database'
import { PlanGate } from '@/components/shared/PlanGate'
import { OnboardingTip } from '@/components/shared/OnboardingTip'

interface ProjectWithProgress extends Project {
  spent: number
  contributed: number
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--income)' }} />,
  paused:    <PauseCircle size={14} style={{ color: '#fbbf24' }} />,
  completed: <CheckCircle size={14} style={{ color: 'var(--income)' }} />,
}

export default function ProjectsPage() {
  return <PlanGate feature="projects" featureLabel="Metas"><ProjectsPageContent /></PlanGate>
}

function ProjectsPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [projects, setProjects] = useState<ProjectWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'savings' | 'expense'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    const list = (data ?? []) as Project[]

    const withProgress: ProjectWithProgress[] = await Promise.all(
      list.map(async (project) => {
        let spent = 0
        if (project.type === 'expense') {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount_ars, amount_usd')
            .eq('project_id', project.id)
            .eq('type', 'expense')
          spent = (txs ?? []).reduce((s, t) =>
            s + (project.budget_currency === 'USD' ? t.amount_usd : t.amount_ars), 0)
        }
        return { ...project, spent, contributed: 0 }
      })
    )

    setProjects(withProgress)
    setLoading(false)
  }

  const filtered = tab === 'all' ? projects : projects.filter(p => p.type === tab)
  const active   = projects.filter(p => p.status === 'active').length
  const savings  = projects.filter(p => p.type === 'savings').length
  const expenses = projects.filter(p => p.type === 'expense').length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <OnboardingTip
        tipId="projects"
        title="Metas de ahorro y gasto"
        description="Creá una meta para tu próximo objetivo: vacaciones, un auto, fondo de emergencia. REGI$TRATIO te muestra cuánto te falta y a qué ritmo vas."
        cta={{ label: 'Crear primera meta', href: '/projects/new' }}
        accent
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Proyectos</h1>
        <button onClick={() => router.push('/projects/new')}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {/* Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activos',    value: active,   color: 'var(--text-primary)' },
            { label: 'De ahorro',  value: savings,  color: 'var(--income)'       },
            { label: 'De gasto',   value: expenses, color: 'var(--accent-icon)'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl p-1" style={{ background: 'var(--surface-elevated)' }}>
        {([['all', 'Todos'], ['savings', 'Ahorro'], ['expense', 'Gasto']] as const).map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === val
              ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
              : { color: 'var(--text-muted)' }
            }>
            {lbl}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No hay proyectos todavía</p>
          <button onClick={() => router.push('/projects/new')}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Crear proyecto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project} mep={mep}
              onClick={() => router.push(`/projects/${project.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, mep, onClick }: { project: ProjectWithProgress; mep: number | null; onClick: () => void }) {
  const isSavings    = project.type === 'savings'
  const isExpense    = project.type === 'expense'
  let progress = 0, current = 0, target = 0, currentLabel = '', targetLabel = ''

  if (isExpense && project.budget_amount) {
    current = project.spent; target = project.budget_amount
    progress = Math.min(100, (current / target) * 100)
    const fmt = project.budget_currency === 'USD' ? formatUSD : formatARS
    currentLabel = fmt(current); targetLabel = fmt(target)
  }
  if (isSavings && project.target_amount) {
    target = project.target_amount
    targetLabel = (project.target_currency === 'USD' ? formatUSD : formatARS)(target)
  }

  const isOverBudget = isExpense && progress >= 100
  const isNearLimit  = isExpense && progress >= 80 && progress < 100
  const barColor     = isOverBudget ? 'var(--expense)' : isNearLimit ? '#fbbf24' : isSavings ? 'var(--income)' : 'var(--accent)'

  return (
    <button onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: project.color + '20' }}>
          {isSavings
            ? <Wallet size={18} style={{ color: project.color }} />
            : <Target size={18} style={{ color: project.color }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {STATUS_ICONS[project.status]}
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto shrink-0"
              style={isSavings
                ? { background: 'var(--income-bg)', color: 'var(--income)' }
                : { background: 'var(--accent-bg)', color: 'var(--accent-text)' }
              }>
              {isSavings ? 'Ahorro' : 'Gasto'}
            </span>
          </div>
          {project.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{project.description}</p>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {((isExpense && project.budget_amount) || (isSavings && project.target_amount)) && (
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <span>{isExpense ? `Gastado: ${currentLabel}` : 'Meta:'}</span>
            <span className="font-semibold" style={{ color: isOverBudget ? 'var(--expense)' : 'var(--text-secondary)' }}>
              {isExpense ? `${Math.round(progress)}% de ${targetLabel}` : targetLabel}
            </span>
          </div>
          {isExpense && (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%`, background: barColor }} />
            </div>
          )}
          {isOverBudget && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--expense)' }}>
              ⚠ Superaste el presupuesto por {project.budget_amount ? formatARS(project.spent - project.budget_amount) : ''}
            </p>
          )}
        </div>
      )}
    </button>
  )
}
