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
  spent: number      // para proyectos de gasto
  contributed: number // para proyectos de ahorro (manual por ahora)
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:    <div className="w-2 h-2 rounded-full bg-green-400" />,
  paused:    <PauseCircle size={14} className="text-amber-400" />,
  completed: <CheckCircle size={14} className="text-green-500" />,
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
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    const list = (data ?? []) as Project[]

    // Para cada proyecto de gasto, calcular lo gastado
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
        <h1 className="text-2xl font-bold text-slate-900">Proyectos</h1>
        <button onClick={() => router.push('/projects/new')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {/* Stats rápidas */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{active}</p>
            <p className="text-xs text-slate-400">Activos</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-green-600">{savings}</p>
            <p className="text-xs text-slate-400">De ahorro</p>
          </div>
          <div className="card !p-3 text-center">
            <p className="text-xl font-bold text-indigo-600">{expenses}</p>
            <p className="text-xs text-slate-400">De gasto</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        {([['all', 'Todos'], ['savings', 'Ahorro'], ['expense', 'Gasto']] as const).map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === val ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
            )}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No hay proyectos todavía</p>
          <button onClick={() => router.push('/projects/new')}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
            <Plus size={15} /> Crear proyecto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              mep={mep}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project, mep, onClick,
}: {
  project: ProjectWithProgress
  mep: number | null
  onClick: () => void
}) {
  const isSavings = project.type === 'savings'
  const isExpense = project.type === 'expense'

  // Calcular progreso
  let progress = 0
  let current = 0
  let target = 0
  let currentLabel = ''
  let targetLabel = ''

  if (isExpense && project.budget_amount) {
    current = project.spent
    target = project.budget_amount
    progress = Math.min(100, (current / target) * 100)
    const fmt = project.budget_currency === 'USD' ? formatUSD : formatARS
    currentLabel = fmt(current)
    targetLabel = fmt(target)
  }

  if (isSavings && project.target_amount) {
    // Para ahorro, mostraríamos el saldo de la cuenta vinculada (simplificado por ahora)
    target = project.target_amount
    const fmt = project.target_currency === 'USD' ? formatUSD : formatARS
    targetLabel = fmt(target)
  }

  const isOverBudget = isExpense && progress >= 100
  const isNearLimit  = isExpense && progress >= 80 && progress < 100

  const barColor = isOverBudget ? 'bg-red-500'
    : isNearLimit  ? 'bg-amber-400'
    : isSavings    ? 'bg-green-500'
    : 'bg-indigo-500'

  return (
    <button
      onClick={onClick}
      className="w-full card hover:shadow-sm hover:border-slate-300 transition-all text-left active:scale-[0.99]"
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Ícono */}
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
            <p className="font-semibold text-slate-800 truncate">{project.name}</p>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium ml-auto shrink-0',
              isSavings ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'
            )}>
              {isSavings ? 'Ahorro' : 'Gasto'}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{project.description}</p>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {(isExpense && project.budget_amount) || (isSavings && project.target_amount) ? (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>
              {isExpense ? `Gastado: ${currentLabel}` : 'Meta:'}
            </span>
            <span className={cn('font-semibold', isOverBudget ? 'text-red-600' : '')}>
              {isExpense
                ? `${Math.round(progress)}% de ${targetLabel}`
                : targetLabel
              }
            </span>
          </div>
          {isExpense && (
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          {isOverBudget && (
            <p className="text-xs text-red-500 mt-1 font-medium">
              ⚠ Superaste el presupuesto por {isExpense
                ? (project.bu