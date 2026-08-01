import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, Pencil, Trash2, Sparkles, Plus, History, Mail, Phone, Smartphone,
  Globe, MapPin, Building2, Briefcase, Users2, Wallet, CheckCircle2,
} from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { ConfirmDialog } from '../../components/Modal.jsx'
import { CrmPage, ErrorBanner, LoadingBlock, Badge, PrimaryButton, GhostButton } from '../../components/crm/CrmUI.jsx'
import { ActivityTimeline, ActivityFormModal } from '../../components/crm/ActivityTimeline.jsx'
import { LeadFormModal, ConvertModal, ScoreBreakdown } from '../../components/crm/LeadForms.jsx'
import { LEAD_STATUS, LEAD_STATUS_META, RATING_META, formatCurrency, formatDateTime } from '../../data/crmData.js'

export default function LeadDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [toDelete, setToDelete] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    crmApi.getLead(code).then(setLead).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [code])
  useEffect(() => { load() }, [load])

  async function changeStatus(status) {
    await runAction(crmApi.updateLead(code, { status }))
    load()
  }
  async function toggleActivity(a) {
    await runAction(crmApi.updateActivity(a.id, { status: a.status === 'DONE' ? 'OPEN' : 'DONE' }))
    load()
  }
  async function remove() {
    const res = await runAction(crmApi.removeLead(code))
    if (res.ok) navigate('/crm/leads')
  }

  if (loading && !lead) return <CrmPage><div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat lead…" /></div></CrmPage>
  if (!lead) return <CrmPage><ErrorBanner message={error || 'Lead tidak ditemukan.'} /><Link to="/crm/leads" className="text-sm text-brand-600">← Kembali ke Leads</Link></CrmPage>

  const converted = lead.status === 'CONVERTED'

  return (
    <CrmPage>
      <Link to="/crm/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Leads</Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50"><UserPlus className="h-6 w-6 text-brand-600" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{lead.fullName}</h1>
                <Badge meta={LEAD_STATUS_META[lead.status]} />
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${RATING_META[lead.rating]?.cls}`}>
                  <span className={`h-2 w-2 rounded-full ${RATING_META[lead.rating]?.dot}`} /> {RATING_META[lead.rating]?.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{lead.title ? `${lead.title} · ` : ''}{lead.company || 'Tanpa perusahaan'}</p>
              <p className="font-mono text-xs text-slate-400">{lead.id} · Sumber: {lead.source || '—'} · Pemilik: {lead.ownerName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!converted && <PrimaryButton onClick={() => setConvertOpen(true)}><Sparkles className="h-4 w-4" /> Konversi</PrimaryButton>}
            {!converted && <GhostButton onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</GhostButton>}
            <GhostButton onClick={() => setToDelete(true)}><Trash2 className="h-4 w-4" /> Hapus</GhostButton>
          </div>
        </div>

        {/* Status stepper cepat */}
        {!converted && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-500">Ubah status:</span>
            {LEAD_STATUS.filter((s) => s !== 'CONVERTED').map((s) => (
              <button key={s} onClick={() => changeStatus(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${lead.status === s ? `${LEAD_STATUS_META[s].cls}` : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {LEAD_STATUS_META[s].label}
              </button>
            ))}
          </div>
        )}

        {/* Banner konversi */}
        {converted && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700"><CheckCircle2 className="h-4 w-4" /> Lead terkonversi</span>
            {lead.convertedAccountCode && <Link to={`/crm/accounts/${lead.convertedAccountCode}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Building2 className="h-3.5 w-3.5" /> {lead.convertedAccountCode}</Link>}
            {lead.convertedDealCode && <Link to={`/crm/deals/${lead.convertedDealCode}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Wallet className="h-3.5 w-3.5" /> {lead.convertedDealCode}</Link>}
            {lead.convertedContactCode && <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-xs">{lead.convertedContactCode}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom kiri: info + aktivitas */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-slate-800">Informasi Lead</h3>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Telepon" value={lead.phone} />
              <InfoRow icon={Smartphone} label="Mobile" value={lead.mobile} />
              <InfoRow icon={Globe} label="Website" value={lead.website} />
              <InfoRow icon={Briefcase} label="Industri" value={lead.industry} />
              <InfoRow icon={MapPin} label="Region" value={lead.region} />
              <InfoRow icon={Wallet} label="Est. Nilai Tahunan" value={lead.annualRevenue ? formatCurrency(lead.annualRevenue) : null} />
              <InfoRow icon={Users2} label="Jumlah Karyawan" value={lead.employeeCount} />
            </dl>
            {lead.description && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">Catatan</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{lead.description}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Lini Masa Aktivitas</h3>
              <PrimaryButton onClick={() => setActivityOpen(true)}><Plus className="h-4 w-4" /> Aktivitas</PrimaryButton>
            </div>
            <ActivityTimeline activities={lead.activities} onToggle={toggleActivity} />
          </div>
        </div>

        {/* Kolom kanan: skor + audit */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <ScoreBreakdown score={lead.score} rating={lead.rating} breakdown={lead.scoreBreakdown} />
            {lead.ratingManual && <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">Rating di-override manual ke <strong>{RATING_META[lead.ratingManual]?.label}</strong> (otomatis: {RATING_META[lead.ratingAuto]?.label}).</p>}
            {/* Gating: skor sudah level Hot tapi kontak/perusahaan belum lengkap. */}
            {lead.ratingGated && (
              <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                <strong>{lead.gatingTag}</strong> — skor sudah masuk Hot, tapi rating ditahan di Warm sampai email/telepon dan nama perusahaan terisi.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><History className="h-4 w-4 text-slate-400" /> Jejak Audit</h3>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {lead.audit.length === 0 ? <p className="text-sm text-slate-400">Belum ada jejak.</p> : lead.audit.map((a) => (
                <div key={a.id} className="text-xs">
                  <p className="text-slate-600"><span className="font-semibold">{a.action}</span> · {a.detail}</p>
                  <p className="text-slate-400">{a.actor} — {formatDateTime(a.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} editing={lead} onSaved={load} />
      <ConvertModal lead={convertOpen ? lead : null} onClose={() => setConvertOpen(false)} onDone={load} />
      <ActivityFormModal open={activityOpen} onClose={() => setActivityOpen(false)} preset={{ relatedType: 'lead', relatedCode: lead.id, label: `Untuk ${lead.fullName}` }} onSaved={load} />
      <ConfirmDialog open={toDelete} onClose={() => setToDelete(false)} onConfirm={remove} title="Hapus Lead" message={`Yakin menghapus lead "${lead.fullName}"?`} confirmLabel="Hapus Lead" />
    </CrmPage>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 py-1.5">
      <dt className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Icon className="h-3.5 w-3.5" /> {label}</dt>
      <dd className="truncate text-right text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  )
}
