import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, RotateCcw, Building2, GitMerge, Users, Wallet, AlertTriangle, Loader2, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import Modal, { ConfirmDialog, Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, TableFooter, LoadingBlock, EmptyState, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'
import { TIERS, CUSTOMER_TYPES, CUSTOMER_TYPE_META } from '../../data/crmData.js'
import { Badge } from '../../components/crm/CrmUI.jsx'
import { PROVINCES, citiesOf } from '../../data/indonesiaRegions.js'

// Tampilan lokasi account: utamakan kota/provinsi, jatuh ke region (data lama).
export function accountLocation(a) {
  return [a.city, a.province].filter(Boolean).join(', ') || a.region || ''
}

const DEFAULT_QUERY = { search: '', tier: 'all', customerType: 'all', sortBy: 'name', page: 1, pageSize: 10 }

export default function Accounts() {
  const list = useServerList(crmApi.listAccounts, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const cards = [
    { label: 'Total Account', value: summary.total ?? 0, icon: Building2, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Grup Duplikat NPWP', value: summary.duplicateGroups ?? 0, icon: AlertTriangle, accent: 'text-amber-600', bg: 'bg-amber-50', hint: 'kandidat merge' },
  ]
  const hasFilter = query.search || query.tier !== 'all' || query.customerType !== 'all'

  async function remove() {
    if (!toDelete) return
    await runAction(crmApi.removeAccount(toDelete.id))
    refresh()
  }

  return (
    <CrmPage>
      <PageHeader title="Accounts" subtitle="Golden record perusahaan pelanggan — kunci cocok = NPWP.">
        <GhostButton onClick={refresh}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <Link to="/crm/accounts/duplicates" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50">
          <GitMerge className="h-4 w-4" /> Duplikat{summary.duplicateGroups ? ` (${summary.duplicateGroups})` : ''}
        </Link>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Account</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari nama / NPWP / kota / provinsi…" className={`${inputClass} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={query.customerType} onChange={(e) => setQuery({ customerType: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Segmen</option>
            {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{CUSTOMER_TYPE_META[t].label}</option>)}
          </select>
          <select value={query.tier} onChange={(e) => setQuery({ tier: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Tier</option>
            {TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
          </select>
          <select value={query.sortBy} onChange={(e) => setQuery({ sortBy: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="name">Urut: Nama</option>
            <option value="updated">Urut: Terbaru diubah</option>
            <option value="created">Urut: Terbaru dibuat</option>
          </select>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading && items.length === 0 ? (
          <LoadingBlock label="Memuat account…" />
        ) : (summary.total === 0 && !hasFilter) ? (
          <EmptyState icon={Building2} title="Belum ada account" description="Tambahkan perusahaan pelanggan pertama Anda."
            action={<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Account</PrimaryButton>} />
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"><span className="text-xs text-slate-400">Memuat…</span></div>}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 font-medium">Segmen</th>
                    <th className="px-5 py-3 font-medium">NPWP</th>
                    <th className="px-5 py-3 font-medium">Industri</th>
                    <th className="px-5 py-3 font-medium">Kota / Provinsi</th>
                    <th className="px-5 py-3 text-center font-medium">Tier</th>
                    <th className="px-5 py-3 text-center font-medium">Relasi</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((a) => (
                    <tr key={a.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <Link to={`/crm/accounts/${a.id}`} className="font-medium text-slate-800 hover:text-brand-600">{a.name}</Link>
                        <p className="font-mono text-[11px] text-slate-400">{a.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        {a.customerType ? <Badge meta={CUSTOMER_TYPE_META[a.customerType]} /> : '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{a.npwp || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{a.industry || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{accountLocation(a) || '—'}</td>
                      <td className="px-5 py-4 text-center">
                        {a.tier ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{a.tier}</span> : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{a.contactCount ?? 0}</span>
                          <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />{a.dealCount ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(a); setFormOpen(true) }} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setToDelete(a)} title="Hapus" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada account yang cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TableFooter pagination={list.pagination} shownCount={items.length} noun="account"
              onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
          </>
        )}
      </div>

      <AccountFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={refresh} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Account" message={`Yakin menghapus account "${toDelete?.name}"?`} confirmLabel="Hapus Account" />
    </CrmPage>
  )
}

const emptyAcc = { name: '', customerType: 'COMPLIANCE_OWNER', npwp: '', centralId: '', industry: '', tier: '', province: '', city: '', website: '', phone: '' }

export function AccountFormModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(emptyAcc)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)
  // M1 — alur identitas Central Customer (hanya untuk account baru).
  const [identity, setIdentity] = useState(null) // { found, central, existingAccount } | null
  const [busy, setBusy] = useState(false)         // resolve/register in-flight
  const [locked, setLocked] = useState(false)     // field legal read-only setelah ditemukan

  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing
        ? { name: editing.name, customerType: editing.customerType || 'COMPLIANCE_OWNER', npwp: editing.npwp || '', centralId: editing.centralId || '', industry: editing.industry || '', tier: editing.tier || '', province: editing.province || '', city: editing.city || '', website: editing.website || '', phone: editing.phone || '' }
        : { ...emptyAcc })
      setErrors({}); setSubmitting(false); setIdentity(null); setBusy(false); setLocked(false)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Account baru wajib melewati resolve/register (BR-02). Gerbang: perlu centralId.
  const isNew = !editing
  const identityDone = !!editing || !!form.centralId
  const blockedByExisting = identity?.existingAccount

  async function doResolve() {
    if (!form.npwp.trim()) { setErrors({ npwp: 'Isi NPWP/NIK lalu klik Cari.' }); return }
    setBusy(true); setErrors({}); setIdentity(null); setLocked(false)
    const res = await runAction(crmApi.resolveIdentity(form.npwp))
    setBusy(false)
    if (!res.ok) { setErrors({ npwp: res.error }); return }
    setIdentity(res.data)
    if (res.data.central) {
      const c = res.data.central
      setForm((f) => ({ ...f, name: c.legalName || f.name, city: c.city || f.city, province: c.province || f.province, centralId: c.centralId }))
      setLocked(true)
    }
  }

  async function doRegister() {
    if (!form.name.trim()) { setErrors({ name: 'Isi nama legal sebelum mendaftarkan.' }); return }
    setBusy(true); setErrors({})
    const res = await runAction(crmApi.registerIdentity({ npwp: form.npwp, legalName: form.name, addressLine: '', city: form.city, province: form.province }))
    setBusy(false)
    if (!res.ok) { setErrors({ npwp: res.error }); return }
    setForm((f) => ({ ...f, centralId: res.data.central.centralId }))
    setIdentity((i) => ({ ...i, found: true, central: res.data.central }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Nama account wajib diisi.' }); return }
    if (isNew && !identityDone) { setErrors({ npwp: 'Selesaikan pencarian/registrasi identitas dulu.' }); return }
    setSubmitting(true)
    const res = editing ? await runAction(crmApi.updateAccount(editing.id, form)) : await runAction(crmApi.createAccount(form))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { name: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Account' : 'Tambah Account'}
      subtitle={isNew ? 'Mulai dari NPWP/NIK — identitas legal dicari di Central Customer (BR-02).' : undefined} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        {/* M1 — Langkah identitas (account baru) */}
        {isNew && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">NPWP/NIK <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              <input className={inputClass} value={form.npwp} onChange={(e) => { set('npwp', e.target.value); set('centralId', ''); setIdentity(null); setLocked(false) }} placeholder="01.234.567.8-901.000" />
              <button type="button" onClick={doResolve} disabled={busy} className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Cari
              </button>
            </div>
            {errors.npwp && <p className="mt-1 text-xs font-medium text-rose-600">{errors.npwp}</p>}

            {blockedByExisting && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>NPWP/NIK sudah terdaftar sebagai <Link to={`/crm/accounts/${identity.existingAccount.code}`} className="inline-flex items-center gap-0.5 font-semibold underline" onClick={onClose}>{identity.existingAccount.name} ({identity.existingAccount.code}) <ExternalLink className="h-3 w-3" /></Link>. Tidak dapat membuat duplikat (BR-01).</span>
              </div>
            )}
            {identity && !blockedByExisting && identity.central && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                <span>Ditemukan di Central Customer · <span className="font-mono font-semibold">{form.centralId}</span>. Identitas legal terisi otomatis (read-only).</span>
              </div>
            )}
            {identity && !blockedByExisting && !identity.central && !form.centralId && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                <span>Tidak ditemukan. Daftarkan sebagai identitas baru?</span>
                <button type="button" onClick={doRegister} disabled={busy} className="inline-flex flex-none items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Daftarkan
                </button>
              </div>
            )}
          </div>
        )}

        <Field label="Nama Account" required error={errors.name} hint={locked ? 'Terkunci dari Central Customer' : undefined}>
          <input className={`${inputClass} ${locked ? 'bg-slate-100 text-slate-500' : ''}`} value={form.name} readOnly={locked} onChange={(e) => set('name', e.target.value)} placeholder="PT ..." />
        </Field>
        <Field label="Segmen Pelanggan" required error={errors.customerType} hint={CUSTOMER_TYPE_META[form.customerType]?.desc}>
          <select className={inputClass} value={form.customerType} onChange={(e) => set('customerType', e.target.value)}>
            {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{CUSTOMER_TYPE_META[t].label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {editing
            ? <Field label="NPWP/NIK" hint="Kunci golden record"><input className={inputClass} value={form.npwp} onChange={(e) => set('npwp', e.target.value)} /></Field>
            : <Field label="Central ID" hint="dari Central Customer"><input className={`${inputClass} bg-slate-100 text-slate-500`} value={form.centralId} readOnly placeholder="—" /></Field>}
          <Field label="Industri"><input className={inputClass} value={form.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tier">
            <select className={inputClass} value={form.tier} onChange={(e) => set('tier', e.target.value)}>
              <option value="">—</option>
              {TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
            </select>
          </Field>
          <Field label="Telepon"><input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Provinsi">
            <select
              className={inputClass}
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value, city: '' }))}
            >
              <option value="">— Pilih provinsi —</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Kota / Kabupaten" hint={!form.province ? 'Pilih provinsi dulu' : undefined}>
            <select
              className={inputClass}
              value={form.city}
              disabled={!form.province}
              onChange={(e) => set('city', e.target.value)}
            >
              <option value="">{form.province ? '— Pilih kota/kabupaten —' : '—'}</option>
              {citiesOf(form.province).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting || blockedByExisting || (isNew && !identityDone)}>{editing ? 'Simpan Perubahan' : 'Tambah Account'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
