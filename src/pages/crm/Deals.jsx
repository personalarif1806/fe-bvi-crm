import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RotateCcw, LayoutGrid, List, Wallet, TrendingUp, Layers, GripVertical } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { useServerList, runAction } from '../../lib/useServerList.js'
import Modal, { Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, TableFooter, LoadingBlock, EmptyState, Badge, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'
import {
  DEAL_STATUS_META, CUSTOMER_TYPE_META, SERVICE_LINES, serviceLineMeta,
  formatCompactCurrency, formatCurrency, formatThousands,
} from '../../data/crmData.js'
import LostReasonModal from '../../components/crm/LostReasonModal.jsx'

// Kelompokkan pipeline per lini layanan untuk <optgroup> di selector.
// Pipeline tanpa lini (type GENERIC) masuk grup "Umum".
function groupByServiceLine(pipelines) {
  return [...SERVICE_LINES, 'OTHER']
    .map((line) => ({ line, meta: serviceLineMeta(line), items: pipelines.filter((p) => (p.serviceLine || 'OTHER') === line) }))
    .filter((g) => g.items.length > 0)
}

export default function Deals() {
  const [view, setView] = useState('kanban')
  const [formOpen, setFormOpen] = useState(false)

  return (
    <CrmPage>
      <PageHeader title="Deals & Pipeline" subtitle="Kelola peluang penjualan — geser kartu antar stage pada papan Kanban.">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-soft">
          <button onClick={() => setView('kanban')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'kanban' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid className="h-4 w-4" /> Kanban</button>
          <button onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><List className="h-4 w-4" /> Daftar</button>
        </div>
        <PrimaryButton onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Tambah Deal</PrimaryButton>
      </PageHeader>

      {view === 'kanban' ? <DealBoard formOpen={formOpen} setFormOpen={setFormOpen} /> : <DealTable formOpen={formOpen} setFormOpen={setFormOpen} />}
    </CrmPage>
  )
}

// ============================ KANBAN ============================
function DealBoard({ formOpen, setFormOpen }) {
  const [board, setBoard] = useState(null)
  const [pipelines, setPipelines] = useState([])
  const [pipeCode, setPipeCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dragCode, setDragCode] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [lostPrompt, setLostPrompt] = useState(null) // { dealCode, toStageId }

  // Muat daftar pipeline sekali → pilih default sebagai awal.
  useEffect(() => {
    crmApi.pipelines()
      .then((r) => {
        const list = r.data || []
        setPipelines(list)
        const def = list.find((p) => p.isDefault) || list[0]
        if (def) setPipeCode((c) => c || def.id)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    crmApi.board(pipeCode || undefined)
      .then(setBoard)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [pipeCode])
  useEffect(() => { load() }, [load])

  async function doMove(dealCode, toStageId, lostReason, lostReasonNote) {
    const res = await runAction(crmApi.moveDealStage(dealCode, { toStageId, lostReason, lostReasonNote }))
    if (res.ok) load()
    else if (res.fields?.lostReason) setLostPrompt({ dealCode, toStageId })
    else setError(res.error)
  }

  function onDrop(col) {
    const code = dragCode
    setDragCode(null); setDragOver(null)
    if (!code) return
    const deal = board.columns.flatMap((c) => c.deals).find((d) => d.id === code)
    if (!deal || deal.stageId === col.stage.id) return
    if (col.stage.isLost) { setLostPrompt({ dealCode: code, toStageId: col.stage.id }); return }
    doMove(code, col.stage.id)
  }

  if (loading && !board) return <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat papan…" /></div>
  if (!board?.pipeline) return <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><EmptyState icon={Layers} title="Belum ada pipeline" description="Jalankan seed CRM untuk membuat pipeline default." /></div>

  const cards = [
    { label: 'Jumlah Deal', value: board.summary.count, icon: Layers, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Nilai Kotor', value: formatCompactCurrency(board.summary.gross), icon: Wallet, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nilai Tertimbang', value: formatCompactCurrency(board.summary.weighted), icon: TrendingUp, accent: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-500">Pipeline:</label>
          <select value={pipeCode} onChange={(e) => setPipeCode(e.target.value)} className={`${inputClass} w-auto`}>
            {groupByServiceLine(pipelines).map((g) => (
              <optgroup key={g.line} label={g.meta.label}>
                {g.items.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}{p.dealCount != null ? ` · ${p.dealCount} deal` : ''}</option>)}
              </optgroup>
            ))}
          </select>
          {board.pipeline.serviceLine && (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${serviceLineMeta(board.pipeline.serviceLine).cls}`}>
              {serviceLineMeta(board.pipeline.serviceLine).label}
            </span>
          )}
        </div>
        <GhostButton onClick={load}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
      </div>
      <SummaryCards cards={cards} />
      <ErrorBanner message={error} />

      <div className="overflow-x-auto pb-3">
        <div className="flex gap-4" style={{ minWidth: `${board.columns.length * 280}px` }}>
          {board.columns.map((col) => (
            <div
              key={col.stage.id}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.stage.id) }}
              onDragLeave={() => setDragOver((s) => (s === col.stage.id ? null : s))}
              onDrop={() => onDrop(col)}
              className={`flex w-[264px] flex-none flex-col rounded-2xl border bg-slate-50/60 transition ${dragOver === col.stage.id ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200/70'}`}
            >
              <div className="border-b border-slate-200/70 px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">{col.stage.name}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-soft">{col.count}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatCompactCurrency(col.gross)}</span>
                  <span className="inline-flex items-center gap-1">{col.stage.probability}% · {formatCompactCurrency(col.weighted)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2.5" style={{ minHeight: '120px' }}>
                {col.deals.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragCode(d.id)}
                    onDragEnd={() => { setDragCode(null); setDragOver(null) }}
                    className={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-soft transition hover:shadow-card active:cursor-grabbing ${dragCode === d.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-300 group-hover:text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/crm/deals/${d.id}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-brand-600">{d.name}</Link>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{d.accountName || 'Tanpa account'}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{formatCompactCurrency(d.amount)}</span>
                          {d.status !== 'OPEN' && <Badge meta={DEAL_STATUS_META[d.status]} />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {col.deals.length === 0 && <p className="py-6 text-center text-xs text-slate-300">Tarik kartu ke sini</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DealFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <LostReasonModal open={!!lostPrompt} onClose={() => setLostPrompt(null)} onConfirm={(reason, note) => { const p = lostPrompt; setLostPrompt(null); doMove(p.dealCode, p.toStageId, reason, note) }} />
    </>
  )
}

// ============================ LIST ============================
const DEFAULT_QUERY = { search: '', status: 'all', serviceLine: 'all', sortBy: 'updated', page: 1, pageSize: 10 }

function DealTable({ formOpen, setFormOpen }) {
  const list = useServerList(crmApi.listDeals, DEFAULT_QUERY)
  const { items, summary, loading, error, query, setQuery, refresh } = list

  const cards = [
    { label: 'Total Deal', value: summary.total ?? 0, icon: Layers, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Nilai Kotor', value: formatCompactCurrency(summary.gross ?? 0), icon: Wallet, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nilai Tertimbang', value: formatCompactCurrency(summary.weighted ?? 0), icon: TrendingUp, accent: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <>
      <SummaryCards cards={cards} />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft lg:flex-row lg:items-center">
        <input value={query.search} onChange={(e) => setQuery({ search: e.target.value })} placeholder="Cari deal…" className={`${inputClass} flex-1`} />
        <div className="flex flex-wrap gap-2">
          <select value={query.serviceLine} onChange={(e) => setQuery({ serviceLine: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Lini Layanan</option>
            {SERVICE_LINES.map((l) => <option key={l} value={l}>{serviceLineMeta(l).label}</option>)}
          </select>
          <select value={query.status} onChange={(e) => setQuery({ status: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="all">Semua Status</option>
            <option value="OPEN">Terbuka</option>
            <option value="WON">Menang</option>
            <option value="LOST">Kalah</option>
          </select>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        {loading && items.length === 0 ? <LoadingBlock label="Memuat deal…" /> : items.length === 0 && summary.total === 0 && query.status === 'all' && query.serviceLine === 'all' && !query.search ? (
          <EmptyState icon={Wallet} title="Belum ada deal" description="Buat deal atau konversi lead untuk mengisi pipeline."
            action={<PrimaryButton onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Tambah Deal</PrimaryButton>} />
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"><span className="text-xs text-slate-400">Memuat…</span></div>}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Deal</th>
                    <th className="px-5 py-3 font-medium">Lini</th>
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 font-medium">Stage</th>
                    <th className="px-5 py-3 text-right font-medium">Nilai</th>
                    <th className="px-5 py-3 text-right font-medium">Tertimbang</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((d) => (
                    <tr key={d.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <Link to={`/crm/deals/${d.id}`} className="font-medium text-slate-800 hover:text-brand-600">{d.name}</Link>
                        <p className="font-mono text-[11px] text-slate-400">{d.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${serviceLineMeta(d.serviceLine).cls}`} title={d.pipelineName || ''}>
                          {serviceLineMeta(d.serviceLine).short}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{d.accountName || '—'}</td>
                      <td className="px-5 py-4"><span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{d.stageName} · {d.probability}%</span></td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatCurrency(d.amount)}</td>
                      <td className="px-5 py-4 text-right text-slate-500">{formatCurrency(d.weighted)}</td>
                      <td className="px-5 py-4"><Badge meta={DEAL_STATUS_META[d.status]} /></td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada deal yang cocok.</td></tr>}
                </tbody>
              </table>
            </div>
            <TableFooter pagination={list.pagination} shownCount={items.length} noun="deal" onPage={(p) => setQuery({ page: p })} onPageSize={(n) => setQuery({ pageSize: n })} />
          </>
        )}
      </div>

      <DealFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} />
    </>
  )
}

// ============================ FORM ============================
const END_CLIENT_SEGMENTS = ['INTERMEDIARY', 'SUBCONTRACT_LAB']

export function DealFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', amount: '', pipelineCode: '', stageId: '', accountId: '', endClientAccountId: '' })
  const [pipelines, setPipelines] = useState([])
  const [accounts, setAccounts] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  useEffect(() => {
    if (!open) return
    crmApi.pipelines().then((r) => setPipelines(r.data)).catch(() => setPipelines([]))
    crmApi.listAccounts({ pageSize: 100, sortBy: 'name' }).then((r) => setAccounts(r.data)).catch(() => setAccounts([]))
  }, [open])

  const key = open ? 'new' : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) { setForm({ name: '', amount: '', pipelineCode: '', stageId: '', accountId: '', endClientAccountId: '' }); setErrors({}); setSubmitting(false) }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const selectedAccount = accounts.find((a) => a.id === form.accountId)
  const needsEndClient = END_CLIENT_SEGMENTS.includes(selectedAccount?.customerType)

  // Default pipeline & reset stage saat pipeline berubah.
  useEffect(() => {
    if (!open || pipelines.length === 0) return
    setForm((f) => {
      if (f.pipelineCode) return f
      const def = pipelines.find((p) => p.isDefault) || pipelines[0]
      return { ...f, pipelineCode: def.id, stageId: def.stages[0]?.id ?? '' }
    })
  }, [open, pipelines])

  const currentPipeline = pipelines.find((p) => p.id === form.pipelineCode)

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Nama deal wajib diisi.' }); return }
    setSubmitting(true)
    const res = await runAction(crmApi.createDeal({
      name: form.name,
      amount: Number(form.amount) || 0,
      pipelineCode: form.pipelineCode || null,
      stageId: form.stageId ? Number(form.stageId) : null,
      accountId: form.accountId || null,
      endClientAccountId: form.endClientAccountId || null,
    }))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { name: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah Deal" subtitle="Pilih pipeline & stage awal deal." maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama Deal" required error={errors.name}><input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="mis. Kontrak Pengujian Semesteran" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nilai Deal (IDR)" error={errors.amount}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
              <input type="text" inputMode="numeric" className={`${inputClass} pl-9`} value={formatThousands(form.amount)} onChange={(e) => set('amount', e.target.value.replace(/\D/g, ''))} placeholder="0" />
            </div>
          </Field>
          <Field label="Account">
            <select className={inputClass} value={form.accountId} onChange={(e) => set('accountId', e.target.value)}>
              <option value="">— Tanpa Account —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pipeline" hint={currentPipeline?.serviceLine ? `Lini ${serviceLineMeta(currentPipeline.serviceLine).label}` : undefined}>
            <select className={inputClass} value={form.pipelineCode} onChange={(e) => { const p = pipelines.find((x) => x.id === e.target.value); set('pipelineCode', e.target.value); set('stageId', p?.stages[0]?.id ?? '') }}>
              {groupByServiceLine(pipelines).map((g) => (
                <optgroup key={g.line} label={g.meta.label}>
                  {g.items.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Stage Awal">
            <select className={inputClass} value={form.stageId} onChange={(e) => set('stageId', e.target.value)}>
              {currentPipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.probability}%)</option>)}
            </select>
          </Field>
        </div>
        {needsEndClient && (
          <Field label="Klien Akhir (End Client)" required error={errors.endClientAccountId}
            hint={`Wajib untuk segmen ${CUSTOMER_TYPE_META[selectedAccount.customerType]?.label} (BR-03)`}>
            <select className={inputClass} value={form.endClientAccountId} onChange={(e) => set('endClientAccountId', e.target.value)}>
              <option value="">— Pilih klien akhir —</option>
              {accounts.filter((a) => a.id !== form.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>Tambah Deal</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
