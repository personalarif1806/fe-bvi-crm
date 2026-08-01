import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, RotateCcw, Users, Star } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import Modal, { ConfirmDialog, Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, TableFooter, LoadingBlock, EmptyState, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'

const DEFAULT_QUERY = { search: '', page: 1, pageSize: 10 }

export default function Contacts() {
  const list = useServerList(crmApi.listContacts, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  async function remove() {
    if (!toDelete) return
    await runAction(crmApi.removeContact(toDelete.id))
    refresh()
  }

  return (
    <CrmPage>
      <PageHeader title="Kontak" subtitle="Orang-orang di dalam Account pelanggan.">
        <GhostButton onClick={refresh}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Kontak</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={[{ label: 'Total Kontak', value: summary.total ?? 0, icon: Users, accent: 'text-brand-600', bg: 'bg-brand-50' }]} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari nama / email…" className={`${inputClass} pl-9`} />
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading && items.length === 0 ? (
          <LoadingBlock label="Memuat kontak…" />
        ) : (summary.total === 0 && !query.search) ? (
          <EmptyState icon={Users} title="Belum ada kontak" description="Tambahkan kontak pertama Anda."
            action={<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Kontak</PrimaryButton>} />
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"><span className="text-xs text-slate-400">Memuat…</span></div>}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium">Jabatan</th>
                    <th className="px-5 py-3 font-medium">Kontak</th>
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c) => (
                    <tr key={c.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          {c.fullName}
                          {c.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" title="Kontak utama" />}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">{c.id}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{c.title || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{c.email || '—'}</p>
                        <p className="text-xs text-slate-400">{c.phone || ''}</p>
                      </td>
                      <td className="px-5 py-4">
                        {c.accountId ? <Link to={`/crm/accounts/${c.accountId}`} className="text-brand-600 hover:underline">{c.accountName}</Link> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(c); setFormOpen(true) }} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setToDelete(c)} title="Hapus" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada kontak yang cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TableFooter pagination={list.pagination} shownCount={items.length} noun="kontak"
              onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
          </>
        )}
      </div>

      <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={refresh} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Kontak" message={`Yakin menghapus kontak "${toDelete?.fullName}"?`} confirmLabel="Hapus Kontak" />
    </CrmPage>
  )
}

const emptyContact = { firstName: '', lastName: '', title: '', email: '', phone: '', accountId: '', isPrimary: false }

// Reusable: bila `lockedAccount` diisi ({ id, name }) field account dikunci
// (dipakai quick-create dari detail Account).
export function ContactFormModal({ open, onClose, editing, onSaved, lockedAccount }) {
  const [form, setForm] = useState(emptyContact)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [initKey, setInitKey] = useState(null)

  // Muat daftar account untuk selektor (sekali saat modal dibuka tanpa lock).
  useEffect(() => {
    if (!open || lockedAccount) return
    crmApi.listAccounts({ pageSize: 100, sortBy: 'name' }).then((r) => setAccounts(r.data)).catch(() => setAccounts([]))
  }, [open, lockedAccount])

  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing
        ? { firstName: editing.firstName, lastName: editing.lastName, title: editing.title || '', email: editing.email || '', phone: editing.phone || '', accountId: editing.accountId || '', isPrimary: !!editing.isPrimary }
        : { ...emptyContact, accountId: lockedAccount?.id || '' })
      setErrors({}); setSubmitting(false)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Nama depan wajib diisi.'
    if (!form.lastName.trim()) errs.lastName = 'Nama belakang wajib diisi.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    const body = { ...form, accountId: lockedAccount?.id || form.accountId || null }
    const res = editing ? await runAction(crmApi.updateContact(editing.id, body)) : await runAction(crmApi.createContact(body))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { firstName: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Kontak' : 'Tambah Kontak'} subtitle={lockedAccount ? `Untuk account ${lockedAccount.name}` : undefined} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama Depan" required error={errors.firstName}><input className={inputClass} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Nama Belakang" required error={errors.lastName}><input className={inputClass} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
        </div>
        <Field label="Jabatan"><input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" error={errors.email}><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Telepon"><input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
        {!lockedAccount && (
          <Field label="Account" error={errors.accountId}>
            <select className={inputClass} value={form.accountId} onChange={(e) => set('accountId', e.target.value)}>
              <option value="">— Tanpa Account —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => set('isPrimary', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
          Jadikan kontak utama
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan' : 'Tambah Kontak'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
