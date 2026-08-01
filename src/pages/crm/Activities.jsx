import { useState } from 'react'
import { Plus, RotateCcw, ListTodo, CircleDot, Clock } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import { inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, TableFooter, LoadingBlock, EmptyState, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'
import { ActivityTimeline, ActivityFormModal } from '../../components/crm/ActivityTimeline.jsx'
import { ACTIVITY_TYPES, ACTIVITY_TYPE_META } from '../../data/crmData.js'

const DEFAULT_QUERY = { search: '', type: 'all', status: 'all', due: 'all', page: 1, pageSize: 20 }

export default function Activities() {
  const list = useServerList(crmApi.listActivities, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  async function toggle(a) {
    await runAction(crmApi.updateActivity(a.id, { status: a.status === 'DONE' ? 'OPEN' : 'DONE' }))
    refresh()
  }

  const cards = [
    { label: 'Total Aktivitas', value: summary.total ?? 0, icon: ListTodo, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Terbuka', value: summary.open ?? 0, icon: CircleDot, accent: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Terlambat', value: summary.overdue ?? 0, icon: Clock, accent: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  const hasFilter = query.search || query.type !== 'all' || query.status !== 'all' || query.due !== 'all'

  return (
    <CrmPage>
      <PageHeader title="Aktivitas" subtitle="Tugas, panggilan, rapat & email — semua aktivitas tim komersial.">
        <GhostButton onClick={refresh}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Aktivitas Baru</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari judul aktivitas…" className={`${inputClass} flex-1`} />
        <div className="flex flex-wrap gap-2">
          <select value={query.type} onChange={(e) => setQuery({ type: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Tipe</option>
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_META[t].label}</option>)}
          </select>
          <select value={query.status} onChange={(e) => setQuery({ status: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Status</option>
            <option value="OPEN">Terbuka</option>
            <option value="DONE">Selesai</option>
          </select>
          <select value={query.due} onChange={(e) => setQuery({ due: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Jatuh Tempo</option>
            <option value="today">Hari ini</option>
            <option value="overdue">Terlambat</option>
            <option value="week">Minggu ini</option>
          </select>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        {loading && items.length === 0 ? (
          <LoadingBlock label="Memuat aktivitas…" />
        ) : items.length === 0 && !hasFilter ? (
          <EmptyState icon={ListTodo} title="Belum ada aktivitas" description="Catat tugas, panggilan, atau rapat pertama Anda."
            action={<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Aktivitas Baru</PrimaryButton>} />
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Tidak ada aktivitas yang cocok dengan filter.</p>
        ) : (
          <>
            <ActivityTimeline
              activities={items}
              onToggle={toggle}
            />
            <div className="mt-4 border-t border-slate-100 pt-1">
              <TableFooter pagination={list.pagination} shownCount={items.length} noun="aktivitas"
                onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
            </div>
          </>
        )}
      </div>

      <ActivityFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={refresh} />
    </CrmPage>
  )
}
