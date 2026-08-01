import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, ArrowLeft } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import Modal, { ConfirmDialog, Field, inputClass } from '../../components/Modal.jsx'
import { PrimaryButton, GhostButton, ErrorBanner } from '../../components/crm/CrmUI.jsx'
import { PROVINCES, citiesOf } from '../../data/indonesiaRegions.js'

// Modal pengelola Lokasi (Site): pilih account → daftar site → tambah/edit/hapus.
export function SitesManagerModal({ open, onClose, accounts, onChanged }) {
  const [accountId, setAccountId] = useState('')
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list' | 'form'
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  async function load(code) {
    if (!code) { setSites([]); return }
    setLoading(true); setError('')
    try {
      const res = await crmApi.listSitesForAccount(code)
      setSites(res.data || [])
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (open) { setView('list'); setEditing(null); if (accountId) load(accountId) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function pickAccount(code) { setAccountId(code); setView('list'); load(code) }

  async function remove() {
    if (!toDelete) return
    const res = await runAction(crmApi.removeSite(toDelete.id))
    if (!res.ok) { setError(res.error); return }
    load(accountId); onChanged?.()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Kelola Lokasi (Site)" maxWidth="max-w-2xl"
        subtitle="Satu account bisa memiliki banyak lokasi. Titik sampling didaftarkan di bawah lokasi.">
        <div className="space-y-4">
          <Field label="Account">
            <select className={inputClass} value={accountId} onChange={(e) => pickAccount(e.target.value)}>
              <option value="">— Pilih account —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <ErrorBanner message={error} />

          {view === 'list' && accountId && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">{sites.length} lokasi</p>
                <PrimaryButton onClick={() => { setEditing(null); setView('form') }}><Plus className="h-4 w-4" /> Tambah Lokasi</PrimaryButton>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {loading && <p className="text-sm text-slate-400">Memuat…</p>}
                {!loading && sites.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">Belum ada lokasi.</p>}
                {sites.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 flex-none text-brand-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{s.name} <span className="font-mono text-xs text-slate-400">({s.siteCode})</span></p>
                        <p className="text-xs text-slate-400">{[s.city, s.province].filter(Boolean).join(', ') || '—'} · {s.pointCount ?? 0} titik</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(s); setView('form') }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setToDelete(s)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === 'form' && (
            <SiteForm accountId={accountId} editing={editing}
              onCancel={() => setView('list')}
              onSaved={() => { setView('list'); load(accountId); onChanged?.() }} />
          )}
        </div>
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Lokasi" message={`Yakin menghapus lokasi "${toDelete?.name}"? (Tidak bisa jika masih ada titik aktif.)`} confirmLabel="Hapus Lokasi" />
    </>
  )
}

const emptySite = { name: '', siteCode: '', province: '', city: '', addressLine: '', permitNumber: '', permitIssuer: '', permitValidUntil: '' }

function SiteForm({ accountId, editing, onCancel, onSaved }) {
  const [form, setForm] = useState(editing
    ? {
        name: editing.name, siteCode: editing.siteCode, province: editing.province || '', city: editing.city || '',
        addressLine: editing.addressLine || '', permitNumber: editing.permitNumber || '',
        permitIssuer: editing.permitIssuer || '', permitValidUntil: editing.permitValidUntil ? new Date(editing.permitValidUntil).toISOString().slice(0, 10) : '',
      }
    : { ...emptySite })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = editing
      ? await runAction(crmApi.updateSite(editing.id, form))
      : await runAction(crmApi.createSite(accountId, form))
    setSubmitting(false)
    if (res.ok) onSaved(); else setErrors(res.fields || { name: res.error })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar</button>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama Lokasi" required error={errors.name}>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Pabrik Cikarang" />
        </Field>
        <Field label="Kode Lokasi" required error={errors.siteCode} hint="unik per account">
          <input className={inputClass} value={form.siteCode} onChange={(e) => set('siteCode', e.target.value)} placeholder="PLANT-01" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Provinsi">
          <select className={inputClass} value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value, city: '' }))}>
            <option value="">— Pilih provinsi —</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Kota / Kabupaten" hint={!form.province ? 'Pilih provinsi dulu' : undefined}>
          <select className={inputClass} value={form.city} disabled={!form.province} onChange={(e) => set('city', e.target.value)}>
            <option value="">{form.province ? '— Pilih —' : '—'}</option>
            {citiesOf(form.province).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Alamat">
        <input className={inputClass} value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="No. Izin Lingkungan">
          <input className={inputClass} value={form.permitNumber} onChange={(e) => set('permitNumber', e.target.value)} placeholder="SK.660/…" />
        </Field>
        <Field label="Penerbit Izin">
          <input className={inputClass} value={form.permitIssuer} onChange={(e) => set('permitIssuer', e.target.value)} placeholder="DLH …" />
        </Field>
        <Field label="Berlaku s.d." error={errors.permitValidUntil}>
          <input type="date" className={inputClass} value={form.permitValidUntil} onChange={(e) => set('permitValidUntil', e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <GhostButton type="button" onClick={onCancel}>Batal</GhostButton>
        <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan' : 'Tambah Lokasi'}</PrimaryButton>
      </div>
    </form>
  )
}
