'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Category, Subcategory } from '@/types/database'

// ─── Íconos disponibles ───────────────────────────────────────
const ICONS = [
  'home','shopping-cart','car','heart','user','music','book',
  'briefcase','zap','trending-up','trending-down','repeat',
  'tag','target','credit-card','wallet','dollar-sign','globe',
  'coffee','gift','tool','smartphone','star','shield',
]

const COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16',
  '#64748b','#0ea5e9',
]

// ─── Tipos del form ───────────────────────────────────────────
interface CatForm { name: string; type: 'income' | 'expense'; icon: string; color: string }
interface SubForm { name: string; description: string }

const EMPTY_CAT: CatForm  = { name: '', type: 'expense', icon: 'tag', color: '#6366f1' }
const EMPTY_SUB: SubForm  = { name: '', description: '' }

export default function CategoriesSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Formulario categoría
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CatForm>(EMPTY_CAT)
  const [savingCat, setSavingCat] = useState(false)

  // Formulario subcategoría
  const [showSubForm, setShowSubForm] = useState<string | null>(null) // category_id
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null)
  const [subForm, setSubForm] = useState<SubForm>(EMPTY_SUB)
  const [savingSub, setSavingSub] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*, subcategories(*)')
      .eq('type', tab)
      .order('sort_order')
      .order('created_at')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  // ── Categoría ────────────────────────────────────────────────
  function openNewCat() {
    setEditingCat(null)
    setCatForm({ ...EMPTY_CAT, type: tab })
    setShowCatForm(true)
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, type: cat.type as 'income' | 'expense', icon: cat.icon, color: cat.color })
    setShowCatForm(true)
  }

  async function saveCat() {
    if (!catForm.name.trim()) { toast.error('Ingresá un nombre'); return }
    setSavingCat(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { user_id: user.id, name: catForm.name.trim(), type: catForm.type, icon: catForm.icon, color: catForm.color }

    const { error } = editingCat
      ? await supabase.from('categories').update(payload).eq('id', editingCat.id)
      : await supabase.from('categories').insert(payload)

    if (error) { toast.error('Error al guardar'); setSavingCat(false); return }
    toast.success(editingCat ? 'Categoría actualizada' : 'Categoría creada')
    setShowCatForm(false)
    load()
    setSavingCat(false)
  }

  async function deleteCat(cat: Category) {
    if (!confirm(`¿Eliminar "${cat.name}"? También se eliminan sus subcategorías.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Categoría eliminada')
    load()
  }

  async function toggleActive(cat: Category) {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    load()
  }

  // ── Subcategoría ─────────────────────────────────────────────
  function openNewSub(categoryId: string) {
    setEditingSub(null)
    setSubForm(EMPTY_SUB)
    setShowSubForm(categoryId)
  }

  function openEditSub(sub: Subcategory) {
    setEditingSub(sub)
    setSubForm({ name: sub.name, description: sub.description ?? '' })
    setShowSubForm(sub.category_id)
  }

  async function saveSub(categoryId: string) {
    if (!subForm.name.trim()) { toast.error('Ingresá un nombre'); return }
    setSavingSub(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      category_id: categoryId,
      name: subForm.name.trim(),
      description: subForm.description || null,
    }

    const { error } = editingSub
      ? await supabase.from('subcategories').update(payload).eq('id', editingSub.id)
      : await supabase.from('subcategories').insert(payload)

    if (error) { toast.error('Error al guardar'); setSavingSub(false); return }
    toast.success(editingSub ? 'Subcategoría actualizada' : 'Subcategoría creada')
    setShowSubForm(null)
    load()
    setSavingSub(false)
  }

  async function deleteSub(sub: Subcategory) {
    if (!confirm(`¿Eliminar "${sub.name}"?`)) return
    const { error } = await supabase.from('subcategories').delete().eq('id', sub.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Subcategoría eliminada')
    load()
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Categorías</h1>
        </div>
        <button
          onClick={openNewCat}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Tabs Gasto / Ingreso */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
        {([['expense', 'Gastos'], ['income', 'Ingresos']] as const).map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === val ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
            )}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Formulario nueva/editar categoría */}
      {showCatForm && (
        <div className="card mb-4 space-y-4">
          <h2 className="font-semibold text-slate-800">{editingCat ? 'Editar categoría' : 'Nueva categoría'}</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ej: Gastos Hogar"
              className="input-base"
              autoFocus
            />
          </div>

          {/* Tipo (solo si es nueva) */}
          {!editingCat && (
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {([['expense', 'Gasto'], ['income', 'Ingreso']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setCatForm(f => ({ ...f, type: val }))}
                  className={cn('flex-1 py-2 text-sm font-medium transition-colors',
                    catForm.type === val ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  )}>
                  {lbl}
                </button>
              ))}
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setCatForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-lg transition-all', catForm.color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : '')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowCatForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={saveCat} disabled={savingCat}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60">
              {savingCat ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-14">
          <Tag size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">No hay categorías</p>
          <button onClick={openNewCat} className="text-indigo-600 text-sm font-medium hover:underline">
            + Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => {
            const subs = (cat.subcategories ?? []).filter(s => s.is_active).sort((a, b) => a.sort_order - b.sort_order)
            const isExpanded = expanded === cat.id

            return (
              <div key={cat.id} className={cn('card !p-0 overflow-hidden transition-all', !cat.is_active && 'opacity-50')}>

                {/* Fila categoría */}
                <div className="flex items-center gap-3 p-3">
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

                  {/* Nombre + contador subs */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : cat.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="font-semibold text-slate-800 text-sm truncate">{cat.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{subs.length} sub</span>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
                      : <ChevronRight size={14} className="text-slate-400 shrink-0" />
                    }
                  </button>

                  {/* Acciones */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleActive(cat)}
                      className={cn('text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                        cat.is_active ? 'text-slate-400 hover:bg-slate-100' : 'text-indigo-600 hover:bg-indigo-50'
                      )}>
                      {cat.is_active ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button onClick={() => openEditCat(cat)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                    {!cat.is_default && (
                      <button onClick={() => deleteCat(cat)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategorías expandidas */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 space-y-1">
                    {subs.map(sub => (
                      <div key={sub.id}>
                        {showSubForm === cat.id && editingSub?.id === sub.id ? (
                          <SubForm
                            form={subForm}
                            setForm={setSubForm}
                            onSave={() => saveSub(cat.id)}
                            onCancel={() => { setShowSubForm(null); setEditingSub(null) }}
                            saving={savingSub}
                          />
                        ) : (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-100 group">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            <span className="text-sm text-slate-700 flex-1">{sub.name}</span>
                            {sub.description && (
                              <span className="text-xs text-slate-400 truncate max-w-[100px]">{sub.description}</span>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditSub(sub)} className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-600">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteSub(sub)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Form nueva sub */}
                    {showSubForm === cat.id && !editingSub ? (
                      <SubForm
                        form={subForm}
                        setForm={setSubForm}
                        onSave={() => saveSub(cat.id)}
                        onCancel={() => setShowSubForm(null)}
                        saving={savingSub}
                      />
                    ) : (
                      <button
                        onClick={() => openNewSub(cat.id)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium py-1 px-2 hover:bg-indigo-50 rounded-lg transition-colors w-full"
                      >
                        <Plus size={12} /> Agregar subcategoría
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente formulario subcategoría ───────────────────
function SubForm({
  form, setForm, onSave, onCancel, saving,
}: {
  form: SubForm
  setForm: (f: SubForm) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 my-1">
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="Nombre de la subcategoría"
        className="input-base !py-2 text-sm"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && onSave()}
      />
      <input
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción (opcional)"
        className="input-base !py-2 text-sm"
      />
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50">
          Cancelar
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
