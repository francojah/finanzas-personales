'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, Target, Wallet, CheckCircle, Play, Pause } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDateShort, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project, Transaction } from '@/types/database'

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [params.id])

  async function load() {
    const [{ data: proj }, { data: txs }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', params.id as string).single(),
      supabase.from('transactions')
        .select('*, category:categories(name, color)')
        .eq('project_id', params.id as string)
        .order('date', { ascending: false }),
    ])
    setProject(proj as Project)
    setTransactions((txs ?? []) as Transaction[])
    setLoading(false)
  }

  async function setStatus(status: 'active' | 'paused' | 'completed') {
    await supabase.from('projects').update({ status }).eq('id', project!.id)
    toast.success(`Proyecto ${status === 'active' ? 'activado' : status === 'paused' ? 'pausado' : 'completado'}`)
    load()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este proyecto? Los movimientos asociados no se eliminarán.')) return
    await supabase.from('projects').delete().eq('id', project!.id)
    toast.success('Proyecto eliminado')
    router.push('/projects')
  }

  if (loading) return <div className="h-40 flex items-center justify-center text-slate-400">Cargando...</div>
  if (!project) return <div className="text-center py-20 text-slate-400">No encontrado</div>

  const isSavings = project.type === 'savings'
  const isExpense = project.type === 'expense'
  const fmt = (n: number) => (project.budget_currency === 'USD' || project.target_currency === 'USD') ? formatUSD(n) : formatARS(n)

  const spent = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (project.budget_currency === 'USD' ? t.amount_usd : t.amount_ars), 0)

  const budget = project.budget_amount ?? 0
  const target = project.target_amount ?? 0
  const progress = isExpense && budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
  const remaining = isExpense ? Math.max(0, budget - spent) : 0
  const isOverBudget = isExpense && spent > budget

  const barColor = isOverBudget ? 'bg-red-500'
    : progress >= 80 ? 'bg-amber-400'
    : isSavings ? 'bg-green-500'
    : 'bg-indigo-500'

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{project.name}</h1>
            <p className="text-xs text-slate-400 capitalize">{isSavings ? 'Proyecto de ahorro' : 'Proyecto de gasto'}</p>
          </div>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Card principal */}
      <div className="card !p-5 mb-4" style={{ borderColor: project.color + '40' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: project.color + '20' }}>
            {isSavings
              ? <Wallet size={22} style={{ color: project.color }} />
              : <Target size={22} style={{ color: project.color }} />
            }
          </div>
          <div>
            {project.description && <p className="text-sm text-slate-500">{project.description}</p>}
            {project.target_date && (
              <p className="text-xs text-slate-400">Objetivo: {formatDateShort(project.target_date)}</p>
            )}
          </div>
        </div>

        {/* Progreso (gastos) */}
        {isExpense && budget > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastado</span>
              <span className={cn('font-bold', isOverBudget ? 'text-red-600' : 'text-slate-800')}>
                {fmt(spent)} / {fmt(budget)}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{Math.round(progress)}% utilizado</span>
              {!isOverBudget
                ? <span className="text-green-600 font-medium">Disponible: {fmt(remaining)}</span>
                : <span className="text-red-500 font-medium">Excedido: {fmt(spent - budget)}</span>
              }
            </div>
          </div>
        )}

        {/* Meta de ahorro */}
        {isSavings && target > 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-slate-400 mb-1">Meta</p>
            <p className="text-2xl font-bold" style={{ color: project.color }}>
              {project.target_currency === 'USD' ? formatUSD(target) : formatARS(target)}
            </p>
          </div>
        )}
      </div>

      {/* Acciones de estado */}
      <div className="flex gap-2 mb-4">
        {project.status !== 'active' && (
          <button onClick={() => setStatus('active')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100">
            <Play size={14} /> Activar
          </button>
        )}
        {project.status === 'active' && (
          <button onClick={() => setStatus('paused')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100">
            <Pause size={14} /> Pausar
          </button>
        )}
        {project.status !== 'completed' && (
          <button onClick={() => setStatus('completed')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100">
            <CheckCircle size={14} /> Completar
          </button>
        )}
      </div>

      {/* Movimientos vinculados */}
      <div className="card !p-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Movimientos vinculados ({transactions.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Asigná movimientos a este proyecto desde el formulario de nuevo movimiento
          </p>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Sin movimientos vinculados</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map(tx => (
              <button key={tx.id}
                onClick={() => router.push(`/transactions/${tx.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left">
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                  </p>
                  <p className="text-xs text-slate-400">{formatDateShort(tx.date)}</p>
                </div>
                <p className={cn('text-sm font-semibold ml-3 shrink-0',
                  tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatARS(tx.amount_ars)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
