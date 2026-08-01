import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Search, Pencil, Trash2, RotateCcw, MapPin, Upload, ShieldCheck,
  Radar, Percent, Building2, AlertTriangle,
} from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import Modal, { ConfirmDialog, Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, TableFooter, LoadingBlock, EmptyState,
  PrimaryButton, GhostButton, Badge,
} from '../../components/crm/CrmUI.jsx'
import {
  MATRICES, MATRIX_LABEL, FREQUENCIES, FREQUENCY_LABEL, SERVED_BY, SERVED_BY_META,
  SERVED_VIA, SERVED_VIA_LABEL, dueTone, formatDate, formatCompactCurrency,
} from '../../data/crmData.js'
import { SitesManagerModal } from './SitesManager.jsx'
import { ImportPointsModal } from './ImportPoints.jsx'

const DEFAULT_QUERY = { search: '', matrix: 'all', servedBy: 'all', account: 'all', sortBy: 'due', page: 1, pageSize: 10 }

export default function SamplingPoints() {
  const list = useServerList(crmApi.listPoints, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list
  const [accounts, setAccounts] = useState([])
  const [sites, setSites] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [servedByFor, setServedByFor] = useState(null)
  const [sitesOpen, setSitesOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Muat account & site untuk pemilih form/impor.
  async function loadRefs() {
    const [accRes, siteRes] = await Promise.all([
      crmApi.listAccounts({ pageSize: 100, sortBy: 'name' }).catch(() => ({ data: [] })),
      crmApi.listAllSites().catch(() => ({ data: [] })),
    ])
    setAccounts(accRes.data || [])
    setSites(siteRes.data || [])
  }
  useEffect(() => { loadRefs() }, [])

  const cards = [
    { label: 'Total Titik', value: summary.total ?? 0, icon: Radar, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Titik Aktif', value: summary.active ?? 0, icon: MapPin, accent: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Dilayani Bumi Ventila', value: summary.servedByBvi ?? 0, icon: ShieldCheck, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Coverage Ratio', value: `${summary.coverage ?? 0}%`, hint: 'titik Bumi Ventila ÷ titik aktif', icon: Percent, accent: 'text-violet-600', bg: 'bg-violet-50' },
  ]
  const hasFilter = query.search || query.matrix !== 'all' || query.servedBy !== 'all' || query.account !== 'all'

  async function remove() {
    if (!toDelete) return
    await runAction(crmApi.removePoint(toDelete.id))
    refresh()
  }

  function afterMutation() { refresh(); loadRefs() }

  return (
    <CrmPage>
      <PageHeader title="Registry Titik Sampling" subtitle="Master data titik pemantauan lingkungan — sumber forecast jatuh tempo & deteksi kebocoran per titik.">
        <GhostButton onClick={refresh}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <GhostButton onClick={() => setSitesOpen(true)}><Building2 className="h-4 w-4" /> Kelola Lokasi</GhostButton>
        <GhostButton onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Impor</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Titik</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari kode / nama titik…" className={`${inputClass} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={query.account} onChange={(e) => setQuery({ account: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={query.matrix} onChange={(e) => setQuery({ matrix: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Matriks</option>
            {MATRICES.map((m) => <option key={m} value={m}>{MATRIX_LABEL[m]}</option>)}
          </select>
          <select value={query.servedBy} onChange={(e) => setQuery({ servedBy: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Status</option>
            {SERVED_BY.map((s) => <option key={s} value={s}>{SERVED_BY_META[s].label}</option>)}
          </select>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading && items.length === 0 ? (
          <LoadingBlock label="Memuat titik sampling…" />
        ) : (summary.total === 0 && !hasFilter) ? (
          <EmptyState icon={Radar} title="Belum ada titik sampling"
            description="Bangun registry dari titik pemantauan pelanggan. Tambah manual atau impor massal dari data order historis."
            action={<div className="flex gap-2"><GhostButton onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Impor</GhostButton><PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Titik</PrimaryButton></div>} />
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"><span className="text-xs text-slate-400">Memuat…</span></div>}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Titik</th>
                    <th className="px-5 py-3 font-medium">Account / Lokasi</th>
                    <th className="px-5 py-3 font-medium">Matriks</th>
                    <th className="px-5 py-3 font-medium">Frekuensi</th>
                    <th className="px-5 py-3 font-medium">Jatuh Tempo</th>
                    <th className="px-5 py-3 font-medium">Status Layanan</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{p.pointCode}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p className="text-slate-700">{p.accountName}</p>
                        <p className="text-xs text-slate-400">{p.siteName}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{MATRIX_LABEL[p.matrix] || p.matrix}</td>
                      <td className="px-5 py-4 text-slate-600">{FREQUENCY_LABEL[p.frequency] || p.frequency}</td>
                      <td className="px-5 py-4">
                        {p.nextDueDate
                          ? <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${dueTone(p.nextDueDate)}`}>{formatDate(p.nextDueDate)}</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => setServedByFor(p)} title="Ubah status layanan">
                          <Badge meta={SERVED_BY_META[p.servedBy]} />
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(p); setFormOpen(true) }} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setToDelete(p)} title="Hapus" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada titik yang cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TableFooter pagination={list.pagination} shownCount={items.length} noun="titik"
              onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
          </>
        )}
      </div>

      <PointFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} accounts={accounts} sites={sites} onSaved={afterMutation} onManageSites={() => setSitesOpen(true)} />
      <ServedByModal point={servedByFor} onClose={() => setServedByFor(null)} onSaved={afterMutation} />
      <SitesManagerModal open={sitesOpen} onClose={() => setSitesOpen(false)} accounts={accounts} onChanged={afterMutation} />
      <ImportPointsModal open={importOpen} onClose={() => setImportOpen(false)} accounts={accounts} onImported={afterMutation} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Titik" message={`Yakin menghapus titik "${toDelete?.name}"?`} confirmLabel="Hapus Titik" />
    </CrmPage>
  )
}

const emptyPoint = {
  accountId: '', siteId: '', pointCode: '', name: '', matrix: 'WASTEWATER', frequency: 'MONTHLY',
  frequencyDetail: '', servedBy: 'UNKNOWN', servedVia: 'DIRECT', estimatedValue: '', lastTestedDate: '',
  requiredParams: '', legalBasis: '',
}

function toDateInput(v) { return v ? new Date(v).toISOString().slice(0, 10) : '' }

export function PointFormModal({ open, onClose, editing, accounts, sites, onSaved, onManageSites }) {
  const [form, setForm] = useState(emptyPoint)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing
        ? {
            accountId: editing.accountId || '', siteId: editing.siteId || '', pointCode: editing.pointCode,
            name: editing.name, matrix: editing.matrix, frequency: editing.frequency,
            frequencyDetail: editing.frequencyDetail || '', servedBy: editing.servedBy, servedVia: editing.servedVia,
            estimatedValue: editing.estimatedValue || '', lastTestedDate: toDateInput(editing.lastTestedDate),
            requiredParams: (editing.requiredParams || []).join(';'), legalBasis: editing.legalBasis || '',
          }
        : { ...emptyPoint })
      setErrors({}); setSubmitting(false)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const sitesForAccount = useMemo(
    () => sites.filter((s) => !form.accountId || s.accountId === form.accountId),
    [sites, form.accountId],
  )

  async function submit(e) {
    e.preventDefault()
    const body = {
      ...form,
      requiredParams: form.requiredParams ? form.requiredParams.split(';').map((s) => s.trim()).filter(Boolean) : [],
      estimatedValue: form.estimatedValue === '' ? 0 : Number(form.estimatedValue),
    }
    // servedBy diubah lewat dialog khusus saat edit (butuh alasan).
    if (editing) delete body.servedBy
    setSubmitting(true)
    const res = editing ? await runAction(crmApi.updatePoint(editing.id, body)) : await runAction(crmApi.createPoint(body))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { name: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Titik Sampling' : 'Tambah Titik Sampling'} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account" required error={errors.accountId}>
              <select className={inputClass} value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value, siteId: '' }))}>
                <option value="">— Pilih account —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Lokasi (Site)" required error={errors.siteId}
              hint={form.accountId && sitesForAccount.length === 0 ? 'Belum ada lokasi — klik "Kelola Lokasi"' : undefined}>
              <select className={inputClass} value={form.siteId} disabled={!form.accountId} onChange={(e) => set('siteId', e.target.value)}>
                <option value="">{form.accountId ? '— Pilih lokasi —' : 'Pilih account dulu'}</option>
                {sitesForAccount.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.siteCode})</option>)}
              </select>
            </Field>
          </div>
        )}
        {!editing && (
          <button type="button" onClick={onManageSites} className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Kelola / tambah lokasi</button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kode Titik" required error={errors.pointCode}>
            <input className={inputClass} value={form.pointCode} onChange={(e) => set('pointCode', e.target.value)} placeholder="OUT-IPAL-01" disabled={!!editing} />
          </Field>
          <Field label="Nama Titik" required error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Outlet IPAL Utama" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matriks" required error={errors.matrix}>
            <select className={inputClass} value={form.matrix} onChange={(e) => set('matrix', e.target.value)}>
              {MATRICES.map((m) => <option key={m} value={m}>{MATRIX_LABEL[m]}</option>)}
            </select>
          </Field>
          <Field label="Frekuensi" required error={errors.frequency}>
            <select className={inputClass} value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
            </select>
          </Field>
        </div>
        {form.frequency === 'CUSTOM' && (
          <Field label="Detail Frekuensi" required error={errors.frequencyDetail} hint="mis. setiap 45 hari">
            <input className={inputClass} value={form.frequencyDetail} onChange={(e) => set('frequencyDetail', e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3">
          {!editing && (
            <Field label="Status Layanan" error={errors.servedBy}>
              <select className={inputClass} value={form.servedBy} onChange={(e) => set('servedBy', e.target.value)}>
                {SERVED_BY.map((s) => <option key={s} value={s}>{SERVED_BY_META[s].label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Via" error={errors.servedVia}>
            <select className={inputClass} value={form.servedVia} onChange={(e) => set('servedVia', e.target.value)}>
              {SERVED_VIA.map((s) => <option key={s} value={s}>{SERVED_VIA_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Estimasi Nilai (Rp)" error={errors.estimatedValue} hint="per pengujian">
            <input type="number" min="0" className={inputClass} value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Terakhir Diuji" error={errors.lastTestedDate} hint="menentukan jatuh tempo">
            <input type="date" className={inputClass} value={form.lastTestedDate} onChange={(e) => set('lastTestedDate', e.target.value)} />
          </Field>
          <Field label="Parameter Wajib" hint="pisahkan dengan ;">
            <input className={inputClass} value={form.requiredParams} onChange={(e) => set('requiredParams', e.target.value)} placeholder="BOD;COD;TSS;pH" />
          </Field>
        </div>
        <Field label="Dasar Hukum" error={errors.legalBasis}>
          <input className={inputClass} value={form.legalBasis} onChange={(e) => set('legalBasis', e.target.value)} placeholder="PermenLHK No. 5/2014" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan Perubahan' : 'Tambah Titik'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

// ---- US-SP-03: dialog ubah servedBy (wajib alasan → AuditLog) ----
function ServedByModal({ point, onClose, onSaved }) {
  const [servedBy, setServedBy] = useState('BUMI_VENTILA')
  const [servedVia, setServedVia] = useState('DIRECT')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  const key = point?.id || null
  if (key !== initKey) {
    setInitKey(key)
    if (point) { setServedBy(point.servedBy); setServedVia(point.servedVia); setReason(''); setError('') }
  }

  async function submit(e) {
    e.preventDefault()
    if (!reason.trim()) { setError('Alasan wajib diisi.'); return }
    setSubmitting(true)
    const res = await runAction(crmApi.changeServedBy(point.id, { servedBy, servedVia, reason }))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setError(res.fields?.reason || res.error)
  }

  return (
    <Modal open={!!point} onClose={onClose} title="Ubah Status Layanan Titik" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">Titik <span className="font-semibold text-slate-700">{point?.name}</span>. Perubahan status layanan dicatat di jejak audit (BR-09).</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dilayani Oleh">
            <select className={inputClass} value={servedBy} onChange={(e) => setServedBy(e.target.value)}>
              {SERVED_BY.map((s) => <option key={s} value={s}>{SERVED_BY_META[s].label}</option>)}
            </select>
          </Field>
          <Field label="Via">
            <select className={inputClass} value={servedVia} onChange={(e) => setServedVia(e.target.value)}>
              {SERVED_VIA.map((s) => <option key={s} value={s}>{SERVED_VIA_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Alasan Perubahan" required error={error}>
          <textarea className={`${inputClass} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. Pindah ke kompetitor karena harga; konfirmasi PIC." />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>Simpan</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
