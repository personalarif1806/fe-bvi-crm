import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, RotateCcw, UserPlus, Target, CheckCircle2, Zap, Sparkles, Flame } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import { ConfirmDialog, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, Badge, TableFooter, LoadingBlock, EmptyState, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'
import { LeadFormModal, ConvertModal } from '../../components/crm/LeadForms.jsx'
import {
  LEAD_STATUS, LEAD_STATUS_META, LEAD_SOURCES, RATINGS, RATING_META, scoreTone, formatDate,
} from '../../data/crmData.js'

const DEFAULT_QUERY = { search: '', status: 'all', source: 'all', rating: 'all', sortBy: 'score', page: 1, pageSize: 10 }

export default function Leads() {
  const list = useServerList(crmApi.listLeads, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [converting, setConverting] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const cards = [
    { label: 'Total Lead', value: summary.total ?? 0, icon: UserPlus, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Terkualifikasi', value: summary.qualified ?? 0, icon: Target, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Diproses', value: summary.statusCounts?.WORKING ?? 0, icon: Zap, accent: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Terkonversi', value: summary.converted ?? 0, icon: CheckCircle2, accent: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  const hasFilter = query.search || query.status !== 'all' || query.source !== 'all' || query.rating !== 'all'

  async function remove() {
    if (!toDelete) return
    await runAction(crmApi.removeLead(toDelete.id))
    refresh()
  }

  return (
    <CrmPage>
      <PageHeader title="Leads" subtitle="Tangkap, skoring & kualifikasi prospek, lalu konversi ke Account, Kontak & Deal.">
        <GhostButton onClick={refresh}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Lead</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari nama / perusahaan / email…" className={`${inputClass} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={query.status} onChange={(e) => setQuery({ status: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Status</option>
            {LEAD_STATUS.map((s) => <option key={s} value={s}>{LEAD_STATUS_META[s].label}</option>)}
          </select>
          <select value={query.rating} onChange={(e) => setQuery({ rating: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Rating</option>
            {RATINGS.map((r) => <option key={r} value={r}>{RATING_META[r].label}</option>)}
          </select>
          <select value={query.source} onChange={(e) => setQuery({ source: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Sumber</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={query.sortBy} onChange={(e) => setQuery({ sortBy: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="score">Urut: Skor tertinggi</option>
            <option value="updated">Urut: Terbaru</option>
            <option value="name">Urut: Nama</option>
          </select>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading && items.length === 0 ? (
          <LoadingBlock label="Memuat lead…" />
        ) : (summary.total === 0 && !hasFilter) ? (
          <EmptyState icon={UserPlus} title="Belum ada lead" description="Tambahkan prospek pertama Anda untuk mulai membangun pipeline."
            action={<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah Lead</PrimaryButton>} />
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"><span className="text-xs text-slate-400">Memuat…</span></div>}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Lead</th>
                    <th className="px-5 py-3 font-medium">Kontak</th>
                    <th className="px-5 py-3 font-medium">Sumber</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-center font-medium">Rating</th>
                    <th className="px-5 py-3 text-center font-medium">Skor</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((l) => (
                    <tr key={l.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <Link to={`/crm/leads/${l.id}`} className="font-medium text-slate-800 hover:text-brand-600">{l.fullName}</Link>
                        <p className="text-xs text-slate-400">{l.title ? `${l.title} · ` : ''}{l.company || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{l.email || '—'}</p>
                        <p className="text-xs text-slate-400">{l.phone || l.mobile || ''}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{l.source || '—'}</td>
                      <td className="px-5 py-4"><Badge meta={LEAD_STATUS_META[l.status]} /></td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${RATING_META[l.rating]?.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${RATING_META[l.rating]?.dot}`} /> {RATING_META[l.rating]?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span title="Skor dihitung dari kelengkapan & kualitas data — buka detail untuk rincian" className={`inline-flex h-7 min-w-7 cursor-help items-center justify-center rounded-full px-2 text-xs font-bold ${scoreTone(l.score)}`}>{l.score}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {l.status !== 'CONVERTED' && (
                            <button onClick={() => setConverting(l)} title="Konversi" className="rounded-lg p-2 text-brand-500 transition hover:bg-brand-50"><Sparkles className="h-4 w-4" /></button>
                          )}
                          {l.status !== 'CONVERTED' && (
                            <button onClick={() => { setEditing(l); setFormOpen(true) }} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => setToDelete(l)} title="Hapus" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada lead yang cocok dengan pencarian.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <TableFooter pagination={list.pagination} shownCount={items.length} noun="lead"
              onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
          </>
        )}
      </div>

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={refresh} />
      <ConvertModal lead={converting} onClose={() => setConverting(null)} onDone={refresh} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Hapus Lead" message={`Yakin menghapus lead "${toDelete?.fullName}"?`} confirmLabel="Hapus Lead" />
    </CrmPage>
  )
}
