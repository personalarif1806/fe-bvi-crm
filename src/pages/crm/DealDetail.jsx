import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet, Plus, History, TrendingUp, Building2, ShieldCheck, ShieldAlert, Lock, UserCog, FileText, Package, Send, CheckCircle2, RefreshCw, Link2, ExternalLink, Search, Unlink, KeyRound, Mail, Copy, Check as CheckIcon, Clock, LogIn } from 'lucide-react'
import { crmApi, orderApi, portalApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Modal, { Field, inputClass } from '../../components/Modal.jsx'
import { CrmPage, ErrorBanner, LoadingBlock, Badge, PrimaryButton, GhostButton } from '../../components/crm/CrmUI.jsx'
import { ActivityTimeline, ActivityFormModal } from '../../components/crm/ActivityTimeline.jsx'
import LostReasonModal from '../../components/crm/LostReasonModal.jsx'
import {
  DEAL_STATUS_META, FEASIBILITY_META, LOST_REASON_LABEL, feasibilityLabels, serviceLineMeta,
  BRANDS, BRAND_META, JENIS_JASA, JENIS_JASA_META,
  formatCurrency, formatDateTime,
} from '../../data/crmData.js'

export default function DealDetail() {
  const { code } = useParams()
  const { user } = useAuth()
  const canApprove = user?.role === 'Administrator' // peran teknis (approve_feasibility)
  const [deal, setDeal] = useState(null)
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activityOpen, setActivityOpen] = useState(false)
  const [lostPrompt, setLostPrompt] = useState(null)
  const [feasOpen, setFeasOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    crmApi.getDeal(code)
      .then((d) => {
        setDeal(d)
        if (d?.pipelineCode) crmApi.board(d.pipelineCode).then((b) => setStages(b.columns.map((c) => c.stage))).catch(() => {})
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [code])
  useEffect(() => { load() }, [load])

  async function move(toStageId, lostReason, lostReasonNote) {
    const res = await runAction(crmApi.moveDealStage(code, { toStageId, lostReason, lostReasonNote }))
    if (res.ok) { setError(''); load() }
    else if (res.fields?.lostReason) setLostPrompt(toStageId)
    else setError(res.error)
  }

  function onSelectStage(stageId) {
    const s = stages.find((x) => x.id === Number(stageId))
    if (!s || s.id === deal.stageId) return
    if (s.isLost) setLostPrompt(s.id)
    else move(s.id)
  }

  async function toggleActivity(a) {
    await runAction(crmApi.updateActivity(a.id, { status: a.status === 'DONE' ? 'OPEN' : 'DONE' }))
    load()
  }

  if (loading && !deal) return <CrmPage><div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat deal…" /></div></CrmPage>
  if (!deal) return <CrmPage><ErrorBanner message={error || 'Deal tidak ditemukan.'} /><Link to="/crm/deals" className="text-sm text-brand-600">← Kembali ke Deals</Link></CrmPage>

  return (
    <CrmPage>
      <Link to="/crm/deals" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Deals</Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50"><Wallet className="h-6 w-6 text-brand-600" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{deal.name}</h1>
                <Badge meta={DEAL_STATUS_META[deal.status]} />
                {deal.feasibilityStatus && deal.feasibilityStatus !== 'NOT_REQUIRED' && <Badge meta={FEASIBILITY_META[deal.feasibilityStatus]} />}
              </div>
              <p className="font-mono text-xs text-slate-400">{deal.id}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {deal.accountId && <Link to={`/crm/accounts/${deal.accountId}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Building2 className="h-3.5 w-3.5" /> {deal.accountName}</Link>}
                {deal.endClientAccountId && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600"><Lock className="h-3 w-3" /> Klien akhir: {deal.endClientAccountId}</span>}
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${serviceLineMeta(deal.serviceLine).cls}`}>{serviceLineMeta(deal.serviceLine).label}</span>
                {deal.brand && <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${BRAND_META[deal.brand]?.cls || 'bg-slate-100 text-slate-600'}`}>{BRAND_META[deal.brand]?.label || deal.brand}</span>}
                {deal.jenisJasa && <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${JENIS_JASA_META[deal.jenisJasa]?.cls || 'bg-slate-100 text-slate-600'}`}>{JENIS_JASA_META[deal.jenisJasa]?.label || deal.jenisJasa}</span>}
                <span>Pipeline: {deal.pipelineName}</span>
                <span>Pemilik: {deal.ownerName}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(deal.amount)}</p>
            <p className="text-xs text-slate-400">Tertimbang {formatCurrency(deal.weighted)} · {deal.probability}%</p>
          </div>
        </div>

        {/* Pindah stage */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <label className="text-sm font-medium text-slate-600">Stage:</label>
          <select value={deal.stageId} onChange={(e) => onSelectStage(e.target.value)} className={`${inputClass} w-auto`} disabled={deal.status !== 'OPEN'}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.probability}%)</option>)}
          </select>
          {deal.status !== 'OPEN' && <span className="text-xs text-slate-400">Deal sudah {DEAL_STATUS_META[deal.status]?.label.toLowerCase()} — stage terkunci.</span>}
          {deal.lostReason && <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs text-rose-700">Alasan kalah: {LOST_REASON_LABEL[deal.lostReason] || deal.lostReason}{deal.lostReasonNote ? ` — ${deal.lostReasonNote}` : ''}</span>}
          {deal.stageRequiresFeasibility === false && stages.some((s) => s.requiresFeasibility) && !['APPROVED', 'APPROVED_WITH_SUBCONTRACT'].includes(deal.feasibilityStatus) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700"><ShieldAlert className="h-3.5 w-3.5" /> {feasibilityLabels(deal.serviceLine).gateHint}</span>
          )}
        </div>
      </div>

      <KlasifikasiPanel deal={deal} onChanged={load} setError={setError} />

      <PortalKlienPanel deal={deal} />

      <FeasibilityPanel deal={deal} canApprove={canApprove} onOpen={() => setFeasOpen(true)} onChanged={load} setError={setError} />

      <OrderPenawaranPanel deal={deal} onChanged={load} setError={setError} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Activities */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Lini Masa Aktivitas</h3>
            <PrimaryButton onClick={() => setActivityOpen(true)}><Plus className="h-4 w-4" /> Aktivitas</PrimaryButton>
          </div>
          <ActivityTimeline activities={deal.activities} onToggle={toggleActivity} />
        </div>

        {/* Stage history + audit */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><TrendingUp className="h-4 w-4 text-slate-400" /> Riwayat Stage</h3>
            <ol className="mt-3 space-y-2">
              {deal.stageHistory.length === 0 ? <p className="text-sm text-slate-400">Belum ada perpindahan stage.</p> : deal.stageHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{h.fromStage ? `${h.fromStage} → ` : ''}<span className="font-semibold">{h.toStage}</span></span>
                  <span className="text-slate-400">{h.changedBy} · {formatDateTime(h.changedAt)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><History className="h-4 w-4 text-slate-400" /> Jejak Audit</h3>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {deal.audit.length === 0 ? <p className="text-sm text-slate-400">Belum ada jejak.</p> : deal.audit.map((a) => (
                <div key={a.id} className="text-xs">
                  <p className="text-slate-600"><span className="font-semibold">{a.action}</span> · {a.detail}</p>
                  <p className="text-slate-400">{a.actor} — {formatDateTime(a.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ActivityFormModal open={activityOpen} onClose={() => setActivityOpen(false)} preset={{ relatedType: 'deal', relatedCode: deal.id, label: `Untuk ${deal.name}` }} onSaved={load} />
      <LostReasonModal open={lostPrompt != null} onClose={() => setLostPrompt(null)} onConfirm={(reason, note) => { const s = lostPrompt; setLostPrompt(null); move(s, reason, note) }} />
      <FeasibilityFormModal open={feasOpen} onClose={() => setFeasOpen(false)} deal={deal} onSaved={load} />
    </CrmPage>
  )
}

// ---- Panel Klasifikasi & Provisioning (konsep-portal-klien.md §2, B1 & B2) ----
// Dua kolom yang menentukan siapa pemilik deal dan jasa apa yang dijual. Keduanya
// disunting di sini, bukan di modal terpisah: `jenisJasa` adalah gerbang stage
// pada lini konsultansi, jadi sales harus bisa mengisinya tepat saat tertahan.
// Terkunci setelah deal menang/kalah — mengubahnya di sana tidak menarik ulang
// keputusan provisioning yang sudah diambil.
function KlasifikasiPanel({ deal, onChanged, setError }) {
  const [busy, setBusy] = useState(false)
  const isConsulting = deal.serviceLine === 'CONSULTING'
  const locked = deal.status !== 'OPEN'
  const perluJenisJasa = isConsulting && !deal.jenisJasa

  async function save(patch) {
    setBusy(true)
    const res = await runAction(crmApi.updateDeal(deal.id, patch))
    setBusy(false)
    if (res.ok) { setError(''); onChanged() } else setError(res.error)
  }

  const akanProvisioning = deal.brand === 'TRINOVATE' && deal.jenisJasa === 'PENDAMPINGAN_AKREDITASI'

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <UserCog className="h-4 w-4 text-slate-400" /> Klasifikasi Deal
        <span className="text-xs font-normal text-slate-400">(merek & jenis jasa — penentu provisioning portal klien)</span>
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Merek" hint="pemilik deal">
          <select className={inputClass} value={deal.brand || 'BVI'} disabled={locked || busy}
            onChange={(e) => save({ brand: e.target.value })}>
            {BRANDS.map((b) => <option key={b} value={b}>{BRAND_META[b].label}</option>)}
          </select>
        </Field>
        {isConsulting && (
          <Field label="Jenis Jasa Konsultansi" hint="wajib sebelum stage proposal">
            <select className={`${inputClass} ${perluJenisJasa ? 'border-rose-300 bg-rose-50/40' : ''}`}
              value={deal.jenisJasa || ''} disabled={locked || busy}
              onChange={(e) => save({ jenisJasa: e.target.value || null })}>
              <option value="">— Belum ditentukan —</option>
              {JENIS_JASA.map((j) => <option key={j} value={j}>{JENIS_JASA_META[j].label}</option>)}
            </select>
          </Field>
        )}
      </div>

      {isConsulting && deal.jenisJasa && (
        <p className="mt-2 text-xs text-slate-500">{JENIS_JASA_META[deal.jenisJasa]?.desc}</p>
      )}
      {perluJenisJasa && !locked && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
          Pipeline konsultansi melayani lebih dari satu jasa. Pilih jenis jasa lebih dulu — tanpa itu deal tidak bisa masuk stage proposal ke atas.
        </p>
      )}
      {akanProvisioning && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none" />
          Saat deal menang, sistem menyiapkan proyek portal klien sebagai <span className="font-medium">draf</span> + tugas CRM untuk ditinjau. Undangan tidak terkirim otomatis.
        </p>
      )}
      {locked && <p className="mt-3 text-xs text-slate-400">Deal sudah {DEAL_STATUS_META[deal.status]?.label.toLowerCase()} — klasifikasi terkunci.</p>}
    </div>
  )
}

// ---- Panel Portal Klien (konsep-portal-klien.md §9) ----
// Hanya untuk deal konsultansi yang sudah menang: di luar itu proyek portal
// memang tidak pernah lahir, dan panel kosong hanya jadi kebisingan.
//
// Read-only, dan akan tetap begitu. Yang ditampilkan adalah nama pengguna
// (email) dan keadaan undangannya — bukan kata sandi: kolomnya bcrypt dan tidak
// pernah diketahui siapa pun di TSI (P5). Klien menetapkannya sendiri lewat
// tautan sekali pakai; kalau tautan itu hangus, jalan masuknya "Lupa sandi",
// bukan CRM.
const AKUN_STATUS_META = {
  DIUNDANG: { label: 'Diundang', cls: 'bg-amber-100 text-amber-700' },
  AKTIF: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  NONAKTIF: { label: 'Nonaktif', cls: 'bg-slate-100 text-slate-500' },
}
const PROYEK_STATUS_META = {
  DRAFT: { label: 'Draf — belum diaktifkan', cls: 'bg-amber-100 text-amber-700' },
  AKTIF: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  SELESAI: { label: 'Selesai', cls: 'bg-sky-100 text-sky-700' },
  DIBATALKAN: { label: 'Dibatalkan', cls: 'bg-rose-100 text-rose-700' },
}

function Salin({ nilai, label }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" title={`Salin ${label}`}
      onClick={() => { navigator.clipboard?.writeText(nilai).then(() => { setOk(true); setTimeout(() => setOk(false), 1500) }).catch(() => {}) }}
      className="inline-flex items-center rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
      {ok ? <CheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function PortalKlienPanel({ deal }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [gagal, setGagal] = useState('')
  const relevan = deal.serviceLine === 'CONSULTING' && deal.status === 'WON'

  useEffect(() => {
    if (!relevan) { setData(null); return }
    setLoading(true)
    portalApi.dealPanel(deal.id)
      .then(setData)
      .catch((e) => setGagal(e.message))
      .finally(() => setLoading(false))
  }, [relevan, deal.id])

  if (!relevan) return null

  // Deal menang tapi tidak melahirkan proyek: hampir selalu karena satu dari
  // syarat gate §2 tidak terpenuhi. Sebutkan yang mana — tanpa ini konsultan
  // hanya melihat ketiadaan dan menduga sistemnya rusak.
  if (data && !data.ada) {
    const kurang = []
    if (deal.brand !== 'TRINOVATE') kurang.push('merek deal bukan Trinovate')
    if (deal.jenisJasa !== 'PENDAMPINGAN_AKREDITASI') kurang.push('jenis jasa bukan Pendampingan Akreditasi')
    if (!deal.accountId) kurang.push('deal belum tertaut ke Account')
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><KeyRound className="h-4 w-4 text-slate-400" /> Portal Klien</h3>
        <p className="mt-2 text-sm text-slate-500">
          Deal ini menang tapi tidak melahirkan proyek portal.
          {kurang.length > 0
            ? <> Syarat yang belum terpenuhi: <span className="font-medium text-slate-700">{kurang.join(', ')}</span>. Perbaiki di panel Klasifikasi Deal, lalu pindahkan deal keluar dan kembali ke stage menang.</>
            : ' Semua syarat terlihat terpenuhi — periksa log server pada saat perpindahan stage.'}
        </p>
      </div>
    )
  }

  if (loading && !data) return <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat portal klien…" /></div>
  if (gagal) return <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft"><h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><KeyRound className="h-4 w-4 text-slate-400" /> Portal Klien</h3><p className="mt-2 text-sm text-rose-600">{gagal}</p></div>
  if (!data?.ada) return null

  const { proyek, ringkasan, akses, tautanUrl } = data
  const draft = proyek.status === 'DRAFT'
  const akun = akses?.akun || []

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <KeyRound className="h-4 w-4 text-slate-400" /> Portal Klien
          <span className="font-mono text-xs font-normal text-slate-400">{proyek.id}</span>
        </h3>
        <div className="flex items-center gap-2">
          <Badge meta={PROYEK_STATUS_META[proyek.status] || { label: proyek.status, cls: 'bg-slate-100 text-slate-600' }} />
          {tautanUrl && (
            <a href={tautanUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              Buka di portal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {draft ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <p className="font-medium">Akun klien belum dibuat.</p>
          <p className="mt-1">
            Deal menang hanya membuat proyek berstatus draf dan satu tugas CRM. Akun dan undangan
            baru terbit saat konsultan menekan <span className="font-medium">"Aktifkan &amp; kirim undangan"</span> di
            portal — di situlah penerima, hasil assessment yang diimpor, dan ruang lingkup awal ditinjau lebih dulu.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Gap Closure', nilai: ringkasan.gcr == null ? '—' : `${ringkasan.gcr}%` },
              { label: 'Progres Langkah', nilai: `${ringkasan.langkah.no}/${ringkasan.langkah.total}` },
              { label: 'Antre Review', nilai: ringkasan.antreanReview },
              { label: 'Diaktifkan', nilai: proyek.diaktifkanPada ? formatDateTime(proyek.diaktifkanPada) : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-[11px] text-slate-400">{s.label}</p>
                <p className="text-sm font-semibold text-slate-800">{s.nilai}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Akses login klien</p>
              {akses?.masukUrl && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <LogIn className="h-3.5 w-3.5" /> {akses.masukUrl}
                  <Salin nilai={akses.masukUrl} label="alamat halaman masuk" />
                </span>
              )}
            </div>

            {akun.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Belum ada akun yang tertaut ke proyek ini.</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                {akun.map((a) => (
                  <div key={a.email} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800">
                        {a.nama}
                        {a.jabatan && <span className="text-xs font-normal text-slate-400">· {a.jabatan}</span>}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {a.peran === 'KLIEN_ADMIN' ? 'Admin lab' : 'Anggota'}
                        </span>
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                        <Mail className="h-3.5 w-3.5 text-slate-300" /> {a.email}
                        <Salin nilai={a.email} label="email" />
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {a.terakhirLogin ? `Terakhir masuk ${formatDateTime(a.terakhirLogin)}` : 'Belum pernah masuk'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge meta={AKUN_STATUS_META[a.status] || { label: a.status, cls: 'bg-slate-100 text-slate-600' }} />
                      {a.undangan && (
                        <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${a.undangan.hangus ? 'text-rose-600' : 'text-slate-400'}`}>
                          <Clock className="h-3 w-3" />
                          {a.undangan.dipakaiPada
                            ? `Undangan ditebus ${formatDateTime(a.undangan.dipakaiPada)}`
                            : a.undangan.hangus
                              ? `Undangan hangus ${formatDateTime(a.undangan.kedaluwarsa)}`
                              : `Undangan berlaku s/d ${formatDateTime(a.undangan.kedaluwarsa)}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Nama pengguna adalah email di atas. <span className="font-medium text-slate-500">Kata sandi tidak pernah dibuat atau disimpan oleh TSI</span> —
              klien menetapkannya sendiri lewat tautan undangan sekali pakai (berlaku 7 hari). Bila undangan
              sudah hangus atau sandi lupa, arahkan klien ke "Lupa sandi" di halaman masuk; akun berstatus
              Diundang pun tetap dilayani.
            </p>
          </div>
        </>
      )}

      {data.catatanInternal && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Catatan internal:</span> {data.catatanInternal}
        </p>
      )}
    </div>
  )
}

// ---- Panel Feasibility Gate (US-FG-01) ----
function FeasibilityPanel({ deal, canApprove, onOpen, onChanged, setError }) {
  const f = deal.feasibility
  const [busy, setBusy] = useState(false)
  // Istilah checklist mengikuti lini layanan deal (lab / training / konsultansi);
  // datanya tetap satu model CrmFeasibilityReview.
  const L = feasibilityLabels(deal.serviceLine)

  async function decide(status) {
    setBusy(true)
    const res = await runAction(crmApi.decideFeasibility(deal.id, { status }))
    setBusy(false)
    if (res.ok) { setError(''); onChanged() } else setError(res.error)
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ShieldCheck className="h-4 w-4 text-slate-400" /> {L.title} <span className="text-xs font-normal text-slate-400">{L.caption}</span></h3>
        {f && <Badge meta={FEASIBILITY_META[f.status]} />}
      </div>

      {!f ? (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p className="text-sm text-slate-500">Belum ada kaji ulang. Deal tidak dapat lanjut ke stage penawaran/proposal sebelum di-APPROVED.</p>
          <PrimaryButton onClick={onOpen}><Plus className="h-4 w-4" /> Buat {L.title}</PrimaryButton>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <Check label={L.scopeAccredited} ok={f.scopeAccredited} />
            <Check label={L.capacityAvailable} ok={f.capacityAvailable} />
            <Check label={L.samplerAvailable} ok={f.samplerAvailable} />
            <Check label={L.requiresSubcontract} ok={f.requiresSubcontract} invert />
            <Check label="Persetujuan pelanggan" ok={f.customerConsent} muted={!f.requiresSubcontract} />
          </div>
          {f.outOfScopeParams.length > 0 && (
            <p className="text-xs text-slate-500">{L.outOfScope}: <span className="font-medium text-rose-600">{f.outOfScopeParams.join(', ')}</span></p>
          )}
          {f.requiresSubcontract && f.subcontractLabName && <p className="text-xs text-slate-500">{L.subcontractLabel}: <span className="font-medium">{f.subcontractLabName}</span></p>}
          {f.notes && <p className="text-xs text-slate-500">Catatan: {f.notes}</p>}
          {f.reviewedAt && <p className="text-xs text-slate-400">Diputus oleh {f.reviewerName} · {formatDateTime(f.reviewedAt)}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <GhostButton onClick={onOpen}>Sunting Review</GhostButton>
            {canApprove ? (
              <>
                {!f.requiresSubcontract && <button disabled={busy} onClick={() => decide('APPROVED')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Setujui</button>}
                {f.requiresSubcontract && <button disabled={busy} onClick={() => decide('APPROVED_WITH_SUBCONTRACT')} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">Setujui + {L.subcontractLabel}</button>}
                <button disabled={busy} onClick={() => decide('REJECTED')} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Tolak</button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400"><UserCog className="h-3.5 w-3.5" /> Hanya peran teknis yang dapat menyetujui.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Panel Penawaran via Order Management (tautan Deal ↔ Order) ----
const ORDER_CATEGORY_BY_SEGMENT = {
  COMPLIANCE_OWNER: 'Industri', INTERMEDIARY: 'Konsultan', SUBCONTRACT_LAB: 'Laboratorium',
  GOVERNMENT: 'Lainnya', AD_HOC: 'Personal',
}

function prettyStatus(s) { return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) }

function OrderPenawaranPanel({ deal, onChanged, setError }) {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const order = deal.order

  async function unlink() {
    const res = await runAction(crmApi.unlinkDealOrder(deal.id))
    if (res.ok) { setError(''); onChanged() } else setError(res.error)
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><FileText className="h-4 w-4 text-slate-400" /> Penawaran (Order Management)</h3>
        {!order && (
          <div className="flex gap-2">
            <GhostButton onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4" /> Tautkan Order</GhostButton>
            <PrimaryButton onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Buat Penawaran</PrimaryButton>
          </div>
        )}
      </div>

      {!order ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 py-5 text-center text-sm text-slate-400">
          Belum ada penawaran. Buat Order baru (data pelanggan terisi otomatis) lalu susun penawaran di Order Management, atau tautkan Order yang sudah ada.
        </p>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-500" />
              <span className="font-mono text-sm font-semibold text-slate-700">{order.code}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{prettyStatus(order.status)}</span>
            </div>
            <button onClick={unlink} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"><Unlink className="h-3.5 w-3.5" /> Lepas tautan</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Pelanggan: {order.customerName}</span>
            {order.quotation ? (
              <>
                <span>Penawaran: <span className="font-semibold text-slate-700">{order.quotation.isDraft ? '(draft)' : order.quotation.number}</span></span>
                <span>Grand total: <span className="font-semibold text-slate-800">{formatCurrency(order.quotation.grandTotal)}</span></span>
              </>
            ) : <span className="text-amber-600">Belum ada penawaran tersusun.</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <PrimaryButton onClick={() => navigate(`/orders/${order.code}/quotation`)}><FileText className="h-4 w-4" /> {order.quotation ? 'Buka / Sunting Penawaran' : 'Susun Penawaran'}</PrimaryButton>
            <GhostButton onClick={() => navigate(`/orders/${order.code}`)}><ExternalLink className="h-4 w-4" /> Lihat Order</GhostButton>
          </div>
        </div>
      )}

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} deal={deal}
        onCreated={(orderCode) => { setCreateOpen(false); navigate(`/orders/${orderCode}/quotation`) }} setError={setError} />
      <LinkOrderModal open={linkOpen} onClose={() => setLinkOpen(false)} dealCode={deal.id}
        onLinked={() => { setLinkOpen(false); onChanged() }} setError={setError} />
    </div>
  )
}

// Modal buat Order dari Deal — field wajib order di-prefill dari Account.
const emptyOrderForm = { category: 'Industri', customerName: '', address: '', pic: '', email: '', contact: '', testRequest: '', sampleEstimate: '' }

function CreateOrderModal({ open, onClose, deal, onCreated, setError }) {
  const [form, setForm] = useState(emptyOrderForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initOpen, setInitOpen] = useState(false)

  if (open !== initOpen) {
    setInitOpen(open)
    if (open) {
      setErrors({}); setSubmitting(false)
      // Prefill dari Account terkait.
      setForm((f) => ({ ...emptyOrderForm, testRequest: deal.name, customerName: deal.accountName || '' }))
      if (deal.accountId) {
        crmApi.getAccount(deal.accountId).then((a) => {
          const primary = (a.contacts || []).find((c) => c.isPrimary) || (a.contacts || [])[0]
          setForm({
            category: ORDER_CATEGORY_BY_SEGMENT[a.customerType] || 'Lainnya',
            customerName: a.name || '',
            address: [a.city, a.province].filter(Boolean).join(', ') || a.region || '',
            pic: primary ? `${primary.firstName} ${primary.lastName}`.trim() : '',
            email: primary?.email || '',
            contact: primary?.phone || a.phone || '',
            testRequest: deal.name || '',
            sampleEstimate: '',
          })
        }).catch(() => {})
      }
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await runAction(crmApi.createDealOrder(deal.id, form))
    setSubmitting(false)
    if (res.ok) onCreated(res.data.orderCode); else setErrors(res.fields || { customerName: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title="Buat Penawaran (Order Baru)" subtitle="Data pelanggan terisi otomatis dari Account. Lengkapi lalu lanjut ke penyusun penawaran." maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori" error={errors.category}>
            <select className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {['Industri', 'Konsultan', 'Laboratorium', 'Universitas', 'Mahasiswa', 'NGO', 'Personal', 'Lainnya'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Customer" required error={errors.customerName}><input className={inputClass} value={form.customerName} onChange={(e) => set('customerName', e.target.value)} /></Field>
        </div>
        <Field label="Alamat" required error={errors.address}><input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="PIC" required error={errors.pic}><input className={inputClass} value={form.pic} onChange={(e) => set('pic', e.target.value)} /></Field>
          <Field label="Email" required error={errors.email}><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="pic@perusahaan.co.id" /></Field>
          <Field label="Kontak" required error={errors.contact}><input className={inputClass} value={form.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        </div>
        <Field label="Permintaan Uji" required error={errors.testRequest}><textarea className={inputClass} rows={2} value={form.testRequest} onChange={(e) => set('testRequest', e.target.value)} /></Field>
        <Field label="Rencana Estimasi Sampel" required error={errors.sampleEstimate}><input className={inputClass} value={form.sampleEstimate} onChange={(e) => set('sampleEstimate', e.target.value)} placeholder="mis. 5 titik air limbah" /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'Membuat…' : 'Buat & Susun Penawaran'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

// Modal tautkan Order yang sudah ada.
function LinkOrderModal({ open, onClose, dealCode, onLinked, setError }) {
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [initOpen, setInitOpen] = useState(false)

  if (open !== initOpen) {
    setInitOpen(open)
    if (open) {
      setQ(''); setLoading(true)
      orderApi.list().then((r) => setOrders(r.data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false))
    }
  }
  const filtered = orders.filter((o) => !q || `${o.id} ${o.customerName}`.toLowerCase().includes(q.toLowerCase()))

  async function link(code) {
    const res = await runAction(crmApi.linkDealOrder(dealCode, code))
    if (res.ok) onLinked(); else setError(res.error)
  }

  return (
    <Modal open={open} onClose={onClose} title="Tautkan Order yang Ada" subtitle="Pilih Order Management yang penawarannya untuk deal ini." maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama pelanggan…" className={`${inputClass} pl-9`} />
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {loading && <p className="text-sm text-slate-400">Memuat order…</p>}
          {!loading && filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Tidak ada order.</p>}
          {filtered.map((o) => (
            <button key={o.id} onClick={() => link(o.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
              <div>
                <p className="font-mono text-xs font-semibold text-slate-700">{o.id}</p>
                <p className="text-sm text-slate-600">{o.customerName}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{prettyStatus(o.status)}</span>
                {o.quotation && <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(o.quotation.grandTotal)}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function Check({ label, ok, invert, muted }) {
  const good = invert ? !ok : ok
  return (
    <div className={`flex items-center gap-1.5 ${muted ? 'opacity-40' : ''}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${good ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className="text-slate-600">{label}: <span className="font-medium">{ok ? 'Ya' : 'Tidak'}</span></span>
    </div>
  )
}

const emptyFeas = { scopeAccredited: true, capacityAvailable: true, samplerAvailable: true, requiresSubcontract: false, customerConsent: false, subcontractLabName: '', outOfScopeParams: '', notes: '' }

function FeasibilityFormModal({ open, onClose, deal, onSaved }) {
  const L = feasibilityLabels(deal.serviceLine)
  const [form, setForm] = useState(emptyFeas)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initOpen, setInitOpen] = useState(false)
  if (open !== initOpen) {
    setInitOpen(open)
    if (open) {
      const f = deal.feasibility
      setForm(f ? {
        scopeAccredited: f.scopeAccredited, capacityAvailable: f.capacityAvailable, samplerAvailable: f.samplerAvailable,
        requiresSubcontract: f.requiresSubcontract, customerConsent: f.customerConsent,
        subcontractLabName: f.subcontractLabName || '', outOfScopeParams: (f.outOfScopeParams || []).join(';'), notes: f.notes || '',
      } : { ...emptyFeas })
      setErrors({}); setSubmitting(false)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = await runAction(crmApi.saveFeasibility(deal.id, {
      ...form,
      outOfScopeParams: form.outOfScopeParams ? form.outOfScopeParams.split(';').map((s) => s.trim()).filter(Boolean) : [],
    }))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { notes: res.error })
  }

  const Toggle = ({ k, label }) => (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
      {label}
    </label>
  )

  return (
    <Modal open={open} onClose={onClose} title={L.title} subtitle={L.modalSubtitle} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2">
          <Toggle k="scopeAccredited" label={L.scopeAccredited} />
          <Toggle k="capacityAvailable" label={L.capacityAvailable} />
          <Toggle k="samplerAvailable" label={L.samplerAvailable} />
          <Toggle k="requiresSubcontract" label={L.requiresSubcontract} />
        </div>
        <Field label={L.outOfScopeField} hint="pisahkan dengan ;" error={errors.outOfScopeParams}>
          <input className={inputClass} value={form.outOfScopeParams} onChange={(e) => set('outOfScopeParams', e.target.value)} placeholder={L.outOfScopePlaceholder} />
        </Field>
        {form.requiresSubcontract && (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <Field label={L.subcontractName} error={errors.subcontractLabName}>
              <input className={inputClass} value={form.subcontractLabName} onChange={(e) => set('subcontractLabName', e.target.value)} placeholder={L.subcontractPlaceholder} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <input type="checkbox" checked={form.customerConsent} onChange={(e) => set('customerConsent', e.target.checked)} className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-400" />
              {L.consent}
            </label>
          </div>
        )}
        <Field label="Catatan" error={errors.notes}>
          <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <p className="text-xs text-slate-400">Menyimpan menetapkan status ke <span className="font-medium">Menunggu Kaji Ulang</span>. Persetujuan dilakukan peran teknis pada panel.</p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>Simpan Review</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
