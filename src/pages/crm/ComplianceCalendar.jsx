import { useEffect, useState, useCallback } from 'react'
import {
  CalendarClock, RotateCcw, Zap, AlertTriangle, Wallet, CalendarDays, Building2, ChevronDown,
} from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import Modal, { inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, SummaryCards, ErrorBanner, LoadingBlock, EmptyState, PrimaryButton, GhostButton, Badge,
} from '../../components/crm/CrmUI.jsx'
import {
  MATRIX_LABEL, SERVED_BY, SERVED_BY_META, CUSTOMER_TYPE_META,
  dueTone, daysUntil, formatDate, formatCompactCurrency, formatCurrency,
} from '../../data/crmData.js'

export default function ComplianceCalendar() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(90)
  const [servedBy, setServedBy] = useState('all')
  const [owner, setOwner] = useState('all')
  const [owners, setOwners] = useState([])
  const [genOpen, setGenOpen] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { days }
      if (servedBy !== 'all') params.servedBy = servedBy
      if (owner !== 'all') params.owner = owner
      const res = await crmApi.complianceCalendar(params)
      setData(res)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [days, servedBy, owner])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    crmApi.listAccounts({ pageSize: 100 })
      .then((r) => setOwners([...new Set((r.data || []).map((a) => a.ownerName).filter(Boolean))]))
      .catch(() => {})
  }, [])

  async function runScheduler() {
    setGenerating(true); setGenResult(null)
    try {
      const res = await crmApi.generateRecurringDeals()
      setGenResult(res)
      load()
    } catch (e) { setGenResult({ error: e.message }) } finally { setGenerating(false) }
  }

  const s = data?.summary
  const cards = [
    { label: 'Titik Jatuh Tempo', value: s?.pointCount ?? 0, hint: `dalam ${days} hari`, icon: CalendarDays, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Estimasi Nilai', value: formatCompactCurrency(s?.totalValue ?? 0), hint: 'total forecast', icon: Wallet, accent: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Lewat Jatuh Tempo', value: s?.overdueCount ?? 0, hint: 'perlu tindakan', icon: AlertTriangle, accent: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Periode', value: s?.periodCount ?? 0, hint: 'bulan terjadwal', icon: CalendarClock, accent: 'text-sky-600', bg: 'bg-sky-50' },
  ]

  return (
    <CrmPage>
      <PageHeader title="Kalender Kepatuhan" subtitle="Forecast jatuh tempo pemantauan 90 hari — dikelompokkan per bulan & per pelanggan.">
        <GhostButton onClick={load}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => { setGenResult(null); setGenOpen(true) }}><Zap className="h-4 w-4" /> Buat Deal Recurring</PrimaryButton>
      </PageHeader>

      <SummaryCards cards={cards} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} w-auto`}>
            {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} hari ke depan</option>)}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="all">Semua Account Manager</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={servedBy} onChange={(e) => setServedBy(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="all">Semua Status</option>
            {SERVED_BY.map((sb) => <option key={sb} value={sb}>{SERVED_BY_META[sb].label}</option>)}
          </select>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat kalender…" /></div>
      ) : !data || data.groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
          <EmptyState icon={CalendarClock} title="Tidak ada jatuh tempo" description="Belum ada titik sampling yang jatuh tempo pada rentang & filter ini." />
        </div>
      ) : (
        <div className="space-y-5">
          {data.groups.map((g) => (
            <PeriodGroup key={g.period} group={g} />
          ))}
        </div>
      )}

      {/* Dialog scheduler */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Buat Deal Recurring Otomatis" maxWidth="max-w-lg"
        subtitle="Scheduler membuat 1 Deal per lokasi per periode untuk titik Bumi Ventila yang jatuh tempo ≤ 60 hari. Idempoten — aman dijalankan berulang.">
        <div className="space-y-4">
          {!genResult && (
            <p className="text-sm text-slate-500">Menandai juga Deal yang lewat &gt; 30 hari sebagai <span className="font-medium text-rose-600">berisiko (AT_RISK)</span> dan membuat task untuk Account Manager.</p>
          )}
          {genResult && !genResult.error && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Scheduler selesai.</p>
              <ul className="mt-2 space-y-0.5">
                <li>{genResult.scannedPoints} titik dipindai, {genResult.groups} grup (lokasi × periode).</li>
                <li>{genResult.createdDeals} deal dibuat ({genResult.createdLines} baris titik).</li>
                <li>{genResult.skipped} dilewati (sudah ada — idempoten).</li>
                <li>{genResult.atRiskMarked} ditandai berisiko, {genResult.tasksCreated} task dibuat.</li>
              </ul>
            </div>
          )}
          {genResult?.error && <ErrorBanner message={genResult.error} />}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <GhostButton onClick={() => setGenOpen(false)}>{genResult ? 'Tutup' : 'Batal'}</GhostButton>
            {!genResult && <PrimaryButton onClick={runScheduler} disabled={generating}><Zap className="h-4 w-4" /> {generating ? 'Menjalankan…' : 'Jalankan Scheduler'}</PrimaryButton>}
          </div>
        </div>
      </Modal>
    </CrmPage>
  )
}

function PeriodGroup({ group }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 bg-slate-50/60 px-5 py-3 text-left">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-slate-800">{group.label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{group.pointCount} titik</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">{formatCompactCurrency(group.value)}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="divide-y divide-slate-100">
          {group.accounts.map((acc) => (
            <div key={acc.accountId} className="px-5 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{acc.accountName}</span>
                  {acc.customerType && <Badge meta={CUSTOMER_TYPE_META[acc.customerType]} />}
                  <span className="text-xs text-slate-400">AM: {acc.ownerName}</span>
                </div>
                <span className="text-xs font-semibold text-slate-600">{formatCurrency(acc.value)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {acc.points.map((p) => {
                  const d = daysUntil(p.nextDueDate)
                  return (
                    <div key={p.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueTone(p.nextDueDate)}`}>{formatDate(p.nextDueDate)}</span>
                      <span className="text-xs text-slate-600">{p.pointCode}</span>
                      <span className="text-[11px] text-slate-400">{MATRIX_LABEL[p.matrix] || p.matrix}</span>
                      <Badge meta={SERVED_BY_META[p.servedBy]} />
                      <span className={`text-[11px] font-medium ${d < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{d < 0 ? `lewat ${Math.abs(d)}h` : `${d}h lagi`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
