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

const COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16',
  '#64748b','#0ea5e9',
]

interface CatForm { name: string; type: 'income' | 'expense'; icon: string; color: string; monthly_budget: string }
interface SubForm { name: string; description: string }

const EMPTY_CAT: CatForm  = { name: '', type: 'expense', icon: 'tag', color: '#6366f1', monthly_budget: '' }
const EMPTY_SUB: SubForm  = { name: '', description: '' }

export default function CategoriesSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CatForm>(EMPTY_CAT)
  const [savingCat, setSavingCat] = useState(false)

  const [showSubForm, setShowSubForm] = useState<string | null>(null)
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

  function openNewCat() {
    setEditingCat(null)
    setCatForm({ ...EMPTY_CAT, type: tab })
    setShowCatForm(true)
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, type: cat.type as 'income' | 'expense', icon: cat.icon, color: cat.color, monthly_budget: (cat as any).monthly_budget?.toString() ?? '' })
    setShowCatForm(true)
  }

  async function saveCat() {
    if (!catForm.name.trim()) { toast.error('Ingresá un nombre'); return }
    setSavingCat(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, name: catForm.name.trim(), type: catForm.type, icon: catForm.icon, color: catForm.color, monthly_budget: catForm.monthly_budget ? parseFloat(catForm.monthly_budget) : null }
    const { error } = editingCat
      ? await supabase.from('categories').update(payload).eq('id', editingCat.id)
      : await supabase.from('categories').insert(payload)
    if (error) { toast.error('Error al guardar'); setSavingCat(false); return }
    toast.success(editingCat ? 'Categoría actualizada' : 'Categoría creada')
    setShowCatForm(false); load(); setSavingCat(false)
  }

  async function deleteCat(cat: Category) {
    if (!confirm(`¿Eliminar "${cat.name}"? También se eliminan sus subcategorías.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Categoría eliminada'); load()
  }

  async function toggleActive(cat: Category) {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    load()
  }

  function openNewSub(categoryId: string) {
    setEditingSub(null); setSubForm(EMPTY_SUB); setShowSubForm(categoryId)
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
    const payload = { user_id: user.id, category_id: categoryId, name: subForm.name.trim(), description: subForm.description || null }
    const { error } = editingSub
      ? await supabase.from('subcategories').update(payload).eq('id', editingSub.id)
      : await supabase.from('subcategories').insert(payload)
    if (error) { toast.error('Error al guardar'); setSavingSub(false); return }
    toast.success(editingSub ? 'Subcategoría actualizada' : 'Subcategoría creada')
    setShowSubForm(null); load(); setSavingSub(false)
  }

  async function deleteSub(sub: Subcategory) {
    if (!confirm(`¿Eliminar "${sub.name}"?`)) return
    const { error } = await supabase.from('subcategories').delete().eq('id', sub.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Subcategoría eliminada'); load()
  }

  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Categorías</h1>
        </div>
        <button onClick={openNewCat}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 mb-5" style={{ background: 'var(--surface-elevated)' }}>
        {([['expense', 'Gastos'], ['income', 'Ingresos']] as const).map(([val, lbl]) => (
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

      {/* Formulario categoría */}
      {showCatForm && (
        <div className="rounded-xl mb-4 p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editingCat ? 'Editar categoría' : 'Nueva categoría'}
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ej: Gastos Hogar" className="input-base" autoFocus />
          </div>

          {!editingCat && (
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {([['expense', 'Gasto'], ['income', 'Ingreso']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setCatForm(f => ({ ...f, type: val }))}
                  className="flex-1 py-2 text-sm font-medium transition-colors"
                  style={catForm.type === val
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-muted)', background: 'transparent' }
                  }>
                  {lbl}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setCatForm(f => ({ ...f, color: c }))}
                  className="w-7 h-7 rounded-lg transition-all"
                  style={{ backgroundColor: c, outline: catForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>

          {catForm.type === 'expense' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Presupuesto mensual <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input type="number" value={catForm.monthly_budget}
                onChange={e => setCatForm(f => ({ ...f, monthly_budget: e.target.value }))}
                placeholder="ej: 50000" className="input-base" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                Si lo completás, aparece una barra de progreso en el dashboard
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowCatForm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={saveCat} disabled={savingCat}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)' }}>
              {savingCat ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-14">
          <Tag size={36} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-3" style={{ color: 'var(--text-muted)' }}>No hay categorías</p>
          <button onClick={openNewCat} className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            + Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => {
            const subs = (cat.subcategories ?? []).filter(s => s.is_active).sort((a, b) => a.sort_order - b.sort_order)
            const isExpanded = expanded === cat.id

            return (
              <div key={cat.id} className="rounded-xl overflow-hidden transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: cat.is_active ? 1 : 0.5 }}>

                {/* Fila categoría */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

                  <button
                    onClick={() => setExpanded(isExpanded ? null : cat.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{subs.length} sub</span>
                    {isExpanded
                      ? <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                      : <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>

                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleActive(cat)}
                      className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                      style={{ color: cat.is_active ? 'var(--text-muted)' : 'var(--accent)' }}>
                      {cat.is_active ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={14} />
                    </button>
                    {!cat.is_default && (
                      <button onClick={() => deleteCat(cat)} className="p-1.5 rounded-lg transition-colors hover:text-red-400"
                        style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategorías expandidas */}
                {isExpanded && (
                  <div className="px-3 py-2 space-y-0.5"
                    style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}>
                    {subs.map(sub => (
                      <div key={sub.id}>
                        {showSubForm === cat.id && editingSub?.id === sub.id ? (
                          <SubForm
                            form={subForm} setForm={setSubForm}
                            onSave={() => saveSub(cat.id)}
                            onCancel={() => { setShowSubForm(null); setEditingSub(null) }}
                            saving={savingSub}
                          />
                        ) : (
                          <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg group transition-colors"
                            style={{ cursor: 'default' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color + '99' }} />
                            <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{sub.name}</span>
                            {sub.description && (
                              <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-faint)' }}>{sub.description}</span>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditSub(sub)} className="p-1 rounded"
                                style={{ color: 'var(--text-muted)' }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteSub(sub)} className="p-1 rounded hover:text-red-400"
                                style={{ color: 'var(--text-muted)' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {showSubForm === cat.id && !editingSub ? (
                      <SubForm
                        form={subForm} setForm={setSubForm}
                        onSave={() => saveSub(cat.id)}
                        onCancel={() => setShowSubForm(null)}
                        saving={savingSub}
                      />
                    ) : (
                      <button
                        onClick={() => openNewSub(cat.id)}
                        className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors w-full mt-0.5"
                        style={{ color: 'var(--accent)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
    <div className="rounded-xl p-3 space-y-2 my-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
          className="flex-1 py-1.5 rounded-lg text-xs font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface-elevated)' }}>
          Cancelar
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent)' }}>
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
