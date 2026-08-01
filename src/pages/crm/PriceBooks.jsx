import { useEffect, useMemo, useState } from 'react'
import { Plus, RotateCcw, BookOpen, Pencil, Trash2, Save } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import Modal, { ConfirmDialog, Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, LoadingBlock, EmptyState, PrimaryButton, GhostButton, Badge,
} from '../../components/crm/CrmUI.jsx'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_META, formatCurrency, formatDate } from '../../data/crmData.js'

export default function PriceBooks() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)      // price book being created/edited (meta)
  const [entriesFor, setEntriesFor] = useState(null) // code whose entries to manage
  const [toDelete, setToDelete] = useState(null)

  function load() {
    setLoading(true)
    crmApi.listPriceBooks().then((r) => setItems(r.data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const cards = [
    { label: 'Total Price Book', value: items.length, icon: BookOpen, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Aktif', value: items.filter((p) => p.isActive).length, icon: BookOpen, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  async function remove() { if (!toDelete) return; await runAction(crmApi.removePriceBook(toDelete.id)); load() }

  return (
    <CrmPage>
      <PageHeader title="Price Book" subtitle="Daftar harga per segmen pelanggan — dipakai otomatis saat menyusun penawaran.">
        <GhostButton onClick={load}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Price Book</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />
      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading ? <LoadingBlock label="Memuat price book…" /> : items.length === 0 ? (
          <EmptyState icon={BookOpen} title="Belum ada price book" description="Buat price book Standard dan per segmen agar penawaran memakai harga yang tepat."
            action={<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Price Book</PrimaryButton>} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Segmen</th>
                <th className="px-5 py-3 font-medium">Berlaku</th>
                <th className="px-5 py-3 text-center font-medium">Entri</th>
                <th className="px-5 py-3 text-center font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <button onClick={() => setEntriesFor(p.id)} className="font-medium text-slate-800 hover:text-brand-600">{p.name}</button>
                    <p className="font-mono text-[11px] text-slate-400">{p.id}</p>
                  </td>
                  <td className="px-5 py-4">{p.segment ? <Badge meta={CUSTOMER_TYPE_META[p.segment]} /> : <span className="text-xs text-slate-400">Standard</span>}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{formatDate(p.validFrom)} — {p.validTo ? formatDate(p.validTo) : '∞'}</td>
                  <td className="px-5 py-4 text-center text-slate-600">{p.entryCount ?? 0}</td>
                  <td className="px-5 py-4 text-center">{p.isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Aktif</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Nonaktif</span>}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEntriesFor(p.id)} title="Kelola entri" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><BookOpen className="h-4 w-4" /></button>
                      <button onClick={() => { setEditing(p); setFormOpen(true) }} title="Edit" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setToDelete(p)} title="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PriceBookFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={load} />
      <EntriesModal code={entriesFor} onClose={() => setEntriesFor(null)} onSaved={load} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Price Book" message={`Yakin menghapus "${toDelete?.name}"?`} confirmLabel="Hapus" />
    </CrmPage>
  )
}

const emptyPB = { name: '', segment: '', validFrom: new Date().toISOString().slice(0, 10), validTo: '', isActive: true }

function PriceBookFormModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(emptyPB)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)
  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing ? { name: editing.name, segment: editing.segment || '', validFrom: editing.validFrom ? new Date(editing.validFrom).toISOString().slice(0, 10) : '', validTo: editing.validTo ? new Date(editing.validTo).toISOString().slice(0, 10) : '', isActive: editing.isActive } : { ...emptyPB })
      setErrors({}); setSubmitting(false)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    const body = { ...form, segment: form.segment || null, validTo: form.validTo || null }
    const res = editing ? await runAction(crmApi.updatePriceBook(editing.id, body)) : await runAction(crmApi.createPriceBook(body))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { name: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Price Book' : 'Tambah Price Book'} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama" required error={errors.name}><input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Standard / Kontrak / Pemerintah" /></Field>
        <Field label="Segmen" error={errors.segment} hint="Kosongkan untuk Standard (fallback semua segmen)">
          <select className={inputClass} value={form.segment} onChange={(e) => set('segment', e.target.value)}>
            <option value="">Standard (semua segmen)</option>
            {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{CUSTOMER_TYPE_META[t].label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Berlaku Dari" required error={errors.validFrom}><input type="date" className={inputClass} value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} /></Field>
          <Field label="Berlaku Sampai" error={errors.validTo} hint="kosong = tanpa batas"><input type="date" className={inputClass} value={form.validTo} onChange={(e) => set('validTo', e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Aktif</label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan' : 'Tambah'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

function EntriesModal({ code, onClose, onSaved }) {
  const [pb, setPb] = useState(null)
  const [catalog, setCatalog] = useState({ services: [], packages: [] })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    setLoading(true); setError('')
    Promise.all([crmApi.getPriceBook(code), crmApi.catalog()])
      .then(([p, c]) => { setPb(p); setCatalog(c); setRows((p.entries || []).map((e, i) => ({ key: `E${i}`, ...e, unitPrice: String(e.unitPrice) }))) })
      .catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [code])

  const options = useMemo(() => [
    { group: 'Parameter', items: catalog.services },
    { group: 'Paket', items: catalog.packages },
  ], [catalog])

  // Peta katalog untuk menampilkan nama/metode/harga dasar item terpilih.
  const catalogMap = useMemo(() => {
    const m = new Map()
    catalog.services.forEach((s) => m.set(`service:${s.refCode}`, s))
    catalog.packages.forEach((p) => m.set(`package:${p.refCode}`, p))
    return m
  }, [catalog])

  function itemInfo(r) {
    const found = catalogMap.get(`${r.refType}:${r.refCode}`)
    if (found) return { name: found.name, typeLabel: found.refType === 'package' ? 'Paket' : 'Parameter', method: found.method, basePrice: found.basePrice, missing: false }
    // fallback ke data yang diperkaya backend (mis. item sudah dihapus dari katalog)
    if (r.name) return { name: r.name, typeLabel: r.typeLabel || (r.refType === 'package' ? 'Paket' : 'Parameter'), method: r.method, basePrice: r.basePrice, missing: r.missing }
    return null
  }

  function addRow() { setRows((r) => [...r, { key: `N${Date.now()}${r.length}`, refType: '', refCode: '', unitPrice: '', minQuantity: 1 }]) }
  function setRow(key, patch) { setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x))) }
  function delRow(key) { setRows((r) => r.filter((x) => x.key !== key)) }

  async function save() {
    setSaving(true); setError('')
    const entries = rows.filter((r) => r.refType && r.refCode && r.unitPrice !== '').map((r) => ({ refType: r.refType, refCode: r.refCode, unitPrice: Number(r.unitPrice), minQuantity: Number(r.minQuantity) || 1 }))
    const res = await runAction(crmApi.setPriceBookEntries(code, entries))
    setSaving(false)
    if (res.ok) { onSaved(); onClose() } else setError(res.error)
  }

  return (
    <Modal open={!!code} onClose={onClose} title={`Entri Price Book${pb ? ` — ${pb.name}` : ''}`} subtitle="Harga khusus per item katalog. Item tanpa entri memakai harga katalog dasar." maxWidth="max-w-2xl">
      {loading ? <LoadingBlock label="Memuat…" /> : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {rows.map((r) => {
              const info = itemInfo(r)
              return (
                <div key={r.key} className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                  {/* Nama item katalog / paket (jelas terlihat) */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {info ? (
                        <>
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            {info.name}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${info.typeLabel === 'Paket' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>{info.typeLabel}</span>
                            {info.missing && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">tidak ada di katalog</span>}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                            {r.refCode}{info.method ? ` · ${info.method}` : ''}{info.basePrice != null ? ` · dasar ${formatCurrency(info.basePrice)}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">Belum ada item dipilih</p>
                      )}
                    </div>
                    <button onClick={() => delRow(r.key)} title="Hapus" className="flex-none rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex-1 min-w-[180px]">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">Item katalog</span>
                      <select className={inputClass} value={r.refType && r.refCode ? `${r.refType}:${r.refCode}` : ''} onChange={(e) => { const [t, c] = e.target.value.split(':'); const it = catalogMap.get(e.target.value); setRow(r.key, { refType: t || '', refCode: c || '', name: it?.name, method: it?.method, basePrice: it?.basePrice, typeLabel: it?.refType === 'package' ? 'Paket' : 'Parameter', missing: false }) }}>
                        <option value="">— Pilih item —</option>
                        {options.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((it) => <option key={`${it.refType}:${it.refCode}`} value={`${it.refType}:${it.refCode}`}>{it.name}</option>)}</optgroup>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">Harga (Rp)</span>
                      <input type="number" min="0" className={`${inputClass} w-32`} placeholder={info?.basePrice ?? 'Harga'} value={r.unitPrice} onChange={(e) => setRow(r.key, { unitPrice: e.target.value })} />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">Qty min.</span>
                      <input type="number" min="1" className={`${inputClass} w-20`} title="Qty minimum untuk tarif ini" value={r.minQuantity} onChange={(e) => setRow(r.key, { minQuantity: e.target.value })} />
                    </label>
                  </div>
                </div>
              )
            })}
            {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Belum ada entri.</p>}
          </div>
          <GhostButton onClick={addRow}><Plus className="h-4 w-4" /> Tambah Entri</GhostButton>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
            <PrimaryButton onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan Entri'}</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
