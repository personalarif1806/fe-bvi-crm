import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Wallet, Trophy, Users, Building2, UserPlus, CalendarClock, ArrowRight, ShieldAlert, Percent, Radar } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { formatCompactCurrency, formatCurrency, LEAD_STATUS_META, CUSTOMER_TYPE_META } from '../../data/crmData.js'
import { CrmPage, PageHeader, SummaryCards, ErrorBanner, LoadingBlock, Badge } from '../../components/crm/CrmUI.jsx'

export default function CrmDashboard() {
  const [data, setData] = useState(null)
  const [compliance, setCompliance] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    crmApi.dashboard()
      .then((d) => { if (alive) setData(d) })
      .catch((e) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    crmApi.complianceDashboard()
      .then((d) => { if (alive) setCompliance(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const cards = data ? [
    { label: 'Nilai Pipeline (terbuka)', value: formatCompactCurrency(data.pipelineValue), hint: `${data.openDeals} deal aktif`, icon: Wallet, accent: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Forecast Tertimbang', value: formatCompactCurrency(data.weightedPipeline), hint: 'amount × probabilitas', icon: TrendingUp, accent: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Deal Menang', value: formatCompactCurrency(data.wonValue), hint: `${data.wonDeals} deal won`, icon: Trophy, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Aktivitas Terlambat', value: data.overdueActivities, hint: 'perlu ditindaklanjuti', icon: CalendarClock, accent: 'text-rose-600', bg: 'bg-rose-50' },
  ] : []

  return (
    <CrmPage>
      <PageHeader title="Dashboard CRM" subtitle="Ringkasan real-time pipeline penjualan, lead, dan aktivitas." />
      <ErrorBanner message={error} />
      {loading ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat ringkasan CRM…" /></div>
      ) : data && (
        <>
          <SummaryCards cards={cards} />

          {data.winRateByPipeline?.length > 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
              <h2 className="text-sm font-semibold text-slate-800">Win Rate per Pipeline <span className="text-xs font-normal text-slate-400">(recurring dikecualikan)</span></h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.winRateByPipeline.map((p) => (
                  <div key={p.pipeline} className="flex items-center gap-3">
                    <span className="w-44 flex-none truncate text-xs font-medium text-slate-600" title={p.pipeline}>{p.pipeline}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.winRate}%` }} />
                    </div>
                    <span className="w-24 flex-none text-right text-xs font-semibold text-slate-700">{p.winRate}% <span className="font-normal text-slate-400">({p.won}/{p.total})</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Ringkasan Lead per status */}
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Lead per Status</h2>
                <Link to="/crm/leads" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  Kelola lead <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-4 space-y-2.5">
                {Object.entries(LEAD_STATUS_META).map(([status, meta]) => {
                  const count = data.leads.counts[status] || 0
                  const pct = data.leads.total ? Math.round((count / data.leads.total) * 100) : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-28 flex-none text-xs font-medium text-slate-500">{meta.label}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 flex-none text-right text-xs font-semibold text-slate-700">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Basis data */}
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
              <h2 className="text-sm font-semibold text-slate-800">Basis Data CRM</h2>
              <div className="mt-4 space-y-3">
                <StatRow icon={Building2} label="Account" value={data.accounts} to="/crm/accounts" />
                <StatRow icon={Users} label="Kontak" value={data.contacts} to="/crm/contacts" />
                <StatRow icon={UserPlus} label="Lead" value={data.leads.total} to="/crm/leads" />
                <StatRow icon={Wallet} label="Deal (terbuka)" value={data.openDeals} to="/crm/deals" />
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                Total nilai menang: <span className="font-semibold text-slate-600">{formatCurrency(data.wonValue)}</span>
              </p>
            </div>
          </div>

          {compliance && <ComplianceSection c={compliance} />}
        </>
      )}
    </CrmPage>
  )
}

function ComplianceSection({ c }) {
  const cards = [
    { label: 'Coverage Ratio', value: `${c.coverage.overall}%`, hint: `${c.coverage.totalBvi}/${c.coverage.totalActive} titik aktif Bumi Ventila`, icon: Percent, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Revenue at Risk', value: formatCompactCurrency(c.revenueAtRisk), hint: 'titik Bumi Ventila lewat tempo', icon: ShieldAlert, accent: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Due vs Booked (90h)', value: `${c.dueVsBooked.bookedPoints}/${c.dueVsBooked.dueIn90}`, hint: `${c.dueVsBooked.unbooked} belum dibooking`, icon: Radar, accent: 'text-violet-600', bg: 'bg-violet-50' },
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Kepatuhan & Registry</h2>
        <Link to="/crm/compliance" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">Kalender kepatuhan <ArrowRight className="h-3 w-3" /></Link>
      </div>

      <SummaryCards cards={cards} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Coverage per account — segmen A perlu perhatian */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Coverage per Account</h3>
            <span className="text-xs text-slate-400">{c.coverage.needsAttention.length} perlu perhatian</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {c.coverage.rows.slice(0, 8).map((r) => (
              <div key={r.accountId} className="flex items-center gap-3">
                <span className="w-40 flex-none truncate text-xs font-medium text-slate-600" title={r.accountName}>{r.accountName}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${r.coverage >= 85 ? 'bg-emerald-500' : r.coverage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.coverage}%` }} />
                </div>
                <span className="w-10 flex-none text-right text-xs font-semibold text-slate-700">{r.coverage}%</span>
                <span className="w-14 flex-none text-right text-[11px] text-slate-400">{r.bvi}/{r.total}</span>
              </div>
            ))}
            {c.coverage.rows.length === 0 && <p className="text-sm text-slate-400">Belum ada titik aktif.</p>}
          </div>
        </div>

        {/* Breakdown per segmen */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-slate-800">Per Segmen Pelanggan</h3>
          <div className="mt-4 space-y-3">
            {c.segments.map((s) => (
              <div key={s.customerType} className="rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <Badge meta={CUSTOMER_TYPE_META[s.customerType]}>{s.customerType}</Badge>
                  <span className="text-sm font-bold text-slate-900">{formatCompactCurrency(s.revenue)}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{s.deals} deal won · {s.points} titik · {s.bviPoints} BV{s.atRiskValue > 0 ? ` · at-risk ${formatCompactCurrency(s.atRiskValue)}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon: Icon, label, value, to }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50">
      <span className="flex items-center gap-2.5 text-sm text-slate-600">
        <Icon className="h-4 w-4 text-brand-500" /> {label}
      </span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </Link>
  )
}
