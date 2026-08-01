import { useEffect, useState } from 'react'
import { Sparkles, AlertTriangle, ArrowRight, Info } from 'lucide-react'
import Modal, { Field, inputClass } from '../Modal.jsx'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import {
  LEAD_STATUS, LEAD_STATUS_META, LEAD_SOURCES, INDUSTRIES, RATINGS, RATING_META,
  CONTACT_LEVELS, LEAD_SEGMENTS, CUSTOMER_STATUSES, RFQ_STAGES,
  formatThousands, formatCurrency, scoreTone,
} from '../../data/crmData.js'

// ============================ FORM TAMBAH/EDIT LEAD ============================
const emptyLead = {
  firstName: '', lastName: '', company: '', title: '', email: '', phone: '', mobile: '',
  website: '', industry: '', region: '', source: 'Manual', status: 'NEW', rating: '',
  annualRevenue: '', employeeCount: '', description: '',
  contactLevel: 'UNKNOWN', segment: '', customerStatus: 'NEW', rfqStage: 'NONE',
}

export function LeadFormModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(emptyLead)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [dupes, setDupes] = useState(null) // daftar kandidat duplikat dari server
  const [initKey, setInitKey] = useState(null)

  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing ? {
        firstName: editing.firstName, lastName: editing.lastName, company: editing.company || '',
        title: editing.title || '', email: editing.email || '', phone: editing.phone || '', mobile: editing.mobile || '',
        website: editing.website || '', industry: editing.industry || '', region: editing.region || '',
        source: editing.source || 'Manual', status: editing.status, rating: editing.ratingManual || '',
        annualRevenue: editing.annualRevenue ? String(editing.annualRevenue) : '',
        employeeCount: editing.employeeCount ? String(editing.employeeCount) : '',
        contactLevel: editing.contactLevel || 'UNKNOWN', segment: editing.segment || '',
        customerStatus: editing.customerStatus || 'NEW', rfqStage: editing.rfqStage || 'NONE',
        description: editing.description || '',
      } : { ...emptyLead })
      setErrors({}); setSubmitting(false); setDupes(null)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Pratinjau skor: dihitung server (debounce 400ms) supaya rumus scoring tidak
  // pernah bercabang antara FE & BE. Gagal/offline → panel skor disembunyikan.
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => {
      crmApi.previewLeadScore({
        email: form.email, phone: form.phone, mobile: form.mobile, company: form.company,
        website: form.website, annualRevenue: form.annualRevenue === '' ? 0 : Number(form.annualRevenue),
        contactLevel: form.contactLevel, segment: form.segment, customerStatus: form.customerStatus,
        rfqStage: form.rfqStage, source: form.source, status: form.status,
      }).then(setPreview).catch(() => setPreview(null))
    }, 400)
    return () => clearTimeout(t)
  }, [
    open, form.email, form.phone, form.mobile, form.company, form.website, form.annualRevenue,
    form.contactLevel, form.segment, form.customerStatus, form.rfqStage, form.source, form.status,
  ])

  function payload(force) {
    return {
      ...form,
      annualRevenue: form.annualRevenue === '' ? null : Number(form.annualRevenue),
      employeeCount: form.employeeCount === '' ? null : Number(form.employeeCount),
      rating: form.rating || null,
      segment: form.segment || null,
      ...(force ? { force: true } : {}),
    }
  }

  async function doSave(force) {
    setSubmitting(true)
    const res = editing
      ? await runAction(crmApi.updateLead(editing.id, payload(false)))
      : await runAction(crmApi.createLead(payload(force)))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose(); return }
    // 409 dengan daftar duplikat → tampilkan peringatan (ala Zoho), beri opsi tetap simpan.
    if (res.fields?.duplicate) { setDupes(res.fields.duplicate); return }
    setErrors(res.fields || { firstName: res.error })
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Nama depan wajib diisi.'
    if (!form.lastName.trim()) errs.lastName = 'Nama belakang wajib diisi.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setDupes(null)
    doSave(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Lead' : 'Tambah Lead'} subtitle="Skor & rating dihitung otomatis dari kelengkapan & kualitas data." maxWidth="max-w-2xl">
      {dupes ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Kemungkinan duplikat ditemukan</p>
              <p className="mt-0.5 text-xs text-amber-700">Email/telepon cocok dengan data berikut. Periksa sebelum membuat lead baru.</p>
              <ul className="mt-2 space-y-1">
                {dupes.map((d) => (
                  <li key={`${d.type}-${d.code}`} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs text-slate-600">
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{d.type === 'lead' ? 'Lead' : 'Kontak'}</span>{' '}
                    <span className="font-medium text-slate-800">{d.name}</span> · {d.email || d.phone}{d.account ? ` · ${d.account}` : ''} <span className="font-mono text-slate-400">{d.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setDupes(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Kembali & ubah</button>
            <button type="button" onClick={() => doSave(true)} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition hover:bg-amber-700 disabled:opacity-60">
              Tetap Simpan
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Panel skor mengikuti isian secara langsung (dihitung server). */}
          <ScorePreview preview={preview} />

          {/* Identitas & kontak — blok 1 scoring (kelengkapan data). */}
          <Section title="Identitas & Kontak" note="Blok kelengkapan data (14 poin) + syarat gating Hot.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Depan" required error={errors.firstName}><input className={inputClass} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
              <Field label="Nama Belakang" required error={errors.lastName}><input className={inputClass} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Perusahaan" hint="Wajib agar lead bisa berating Hot"><input className={inputClass} value={form.company} onChange={(e) => set('company', e.target.value)} /></Field>
              <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Email" error={errors.email}><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Telepon Kantor"><input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="No. HP (Mobile)"><input className={inputClass} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></Field>
            </div>
          </Section>

          {/* Blok 2, 3, 6, 7 — dimensi berbobot terbesar dalam model baru. */}
          <Section title="Penilaian Lead" note="Level kontak, firmografi, riwayat pelanggan & niat beli — porsi terbesar skor.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Level Kontak" error={errors.contactLevel} hint="Decision-maker bernilai paling tinggi">
                <select className={inputClass} value={form.contactLevel} onChange={(e) => set('contactLevel', e.target.value)}>
                  {CONTACT_LEVELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </Field>
              <Field label="Segmen Pelanggan" error={errors.segment} hint="Jenis instansi calon klien">
                <select className={inputClass} value={form.segment} onChange={(e) => set('segment', e.target.value)}>
                  <option value="">— (dihitung sebagai Lainnya)</option>
                  {LEAD_SEGMENTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status Pelanggan" error={errors.customerStatus} hint="Riwayat kerja sama dengan BVI">
                <select className={inputClass} value={form.customerStatus} onChange={(e) => set('customerStatus', e.target.value)}>
                  {CUSTOMER_STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </Field>
              <Field label="Tahap Permintaan / RFQ" error={errors.rfqStage} hint="Sinyal niat beli">
                <select className={inputClass} value={form.rfqStage} onChange={(e) => set('rfqStage', e.target.value)}>
                  {RFQ_STAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Estimasi Nilai Tahunan (IDR)" error={errors.annualRevenue} hint="Berpoin bila ≥ Rp100 jt">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputClass} pl-9`} value={formatThousands(form.annualRevenue)} onChange={(e) => set('annualRevenue', e.target.value.replace(/\D/g, ''))} placeholder="0" />
                </div>
              </Field>
              <Field label="Sumber">
                <select className={inputClass} value={form.source} onChange={(e) => set('source', e.target.value)}>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {LEAD_STATUS.filter((s) => s !== 'CONVERTED').map((s) => <option key={s} value={s}>{LEAD_STATUS_META[s].label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Data pelengkap: tidak lagi masuk hitungan skor sejak model 7 blok. */}
          <Section title="Data Pelengkap" note="Tidak memengaruhi skor — untuk segmentasi, konversi & tindak lanjut.">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Jabatan" hint="Dibawa saat konversi ke Kontak"><input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="mis. Manajer QHSE" /></Field>
              <Field label="Industri">
                <select className={inputClass} value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                  <option value="">—</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Region"><input className={inputClass} value={form.region} onChange={(e) => set('region', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Jumlah Karyawan" error={errors.employeeCount}>
                <input type="text" inputMode="numeric" className={inputClass} value={form.employeeCount} onChange={(e) => set('employeeCount', e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </Field>
              <Field label="Rating" hint="Kosong = otomatis dari skor">
                <select className={inputClass} value={form.rating} onChange={(e) => set('rating', e.target.value)}>
                  <option value="">Otomatis</option>
                  {RATINGS.map((r) => <option key={r} value={r}>{RATING_META[r].label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Catatan"><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </Section>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60">
              {editing ? 'Simpan Perubahan' : 'Tambah Lead'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// Kelompok field pada form lead — judulnya memetakan blok scoring agar user
// paham field mana yang menggerakkan skor dan mana yang sekadar data.
function Section({ title, note, children }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3.5">
      <legend className="px-1.5 text-xs font-semibold text-slate-700">{title}</legend>
      {note && <p className="-mt-1 text-[11px] text-slate-400">{note}</p>}
      {children}
    </fieldset>
  )
}

// Skor & rating hasil hitungan server atas isian form saat ini.
function ScorePreview({ preview }) {
  if (!preview) return null
  const meta = RATING_META[preview.rating] || RATING_META.COLD
  const top = [...preview.breakdown].filter((r) => r.of > r.points).sort((a, b) => (b.of - b.points) - (a.of - a.points))[0]
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-base font-bold ${scoreTone(preview.score)}`}>{preview.score}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            Skor saat ini · <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
          </p>
          {top && <p className="mt-0.5 truncate text-[11px] text-slate-400">Peluang terbesar: {top.label} (+{top.of - top.points})</p>}
        </div>
      </div>
      {preview.gated && (
        <p className="mt-2 rounded-lg bg-amber-100/70 px-2.5 py-1.5 text-[11px] text-amber-800">
          <strong>{preview.gatingTag}</strong> — skor sudah level Hot, tapi rating ditahan di Warm sampai email/telepon <em>dan</em> nama perusahaan terisi.
        </p>
      )}
    </div>
  )
}

// ============================ MODAL KONVERSI ============================
export function ConvertModal({ lead, onClose, onDone }) {
  const open = !!lead
  const [form, setForm] = useState({ accountName: '', npwp: '', createDeal: true, dealName: '', amount: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [initKey, setInitKey] = useState(null)

  const key = open ? lead.id : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm({
        accountName: lead.company || lead.fullName, npwp: '', createDeal: true,
        dealName: `${lead.company || lead.fullName} — Deal`, amount: '',
      })
      setErrors({}); setSubmitting(false); setResult(null)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = await runAction(crmApi.convertLead(lead.id, {
      accountName: form.accountName, npwp: form.npwp || null, createDeal: form.createDeal,
      dealName: form.dealName, amount: Number(form.amount) || 0,
    }))
    setSubmitting(false)
    if (res.ok) { setResult(res.data); onDone?.() } else setErrors(res.fields || { dealName: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title="Konversi Lead" subtitle={lead ? `${lead.fullName} → Account + Kontak${form.createDeal ? ' + Deal' : ''}` : ''} maxWidth="max-w-lg">
      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Konversi berhasil!</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Account: <span className="font-mono">{result.accountCode}</span> {result.accountCreated ? '(baru)' : '(ditautkan ke golden record)'}</li>
              <li>Kontak: <span className="font-mono">{result.contactCode}</span></li>
              {result.dealCode && <li>Deal: <span className="font-mono">{result.dealCode}</span></li>}
            </ul>
          </div>
          <div className="flex justify-end"><button onClick={onClose} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Selesai</button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-700">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <span>Bila Account dengan <strong>NPWP</strong> atau nama sama sudah ada, sistem menautkan ke Account itu (golden record) — bukan membuat duplikat.</span>
          </div>
          <Field label="Nama Account" required error={errors.name}><input className={inputClass} value={form.accountName} onChange={(e) => set('accountName', e.target.value)} /></Field>
          <Field label="NPWP (opsional)" hint="Kunci pencocokan golden record"><input className={inputClass} value={form.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="01.234.567.8-901.000" /></Field>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={form.createDeal} onChange={(e) => set('createDeal', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
            Buat Deal baru dari lead ini
          </label>
          {form.createDeal && (
            <>
              <Field label="Nama Deal" required error={errors.dealName}><input className={inputClass} value={form.dealName} onChange={(e) => set('dealName', e.target.value)} /></Field>
              <Field label="Nilai Deal (IDR)" error={errors.amount}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputClass} pl-9`} value={formatThousands(form.amount)} onChange={(e) => set('amount', e.target.value.replace(/\D/g, ''))} placeholder="0" />
                </div>
              </Field>
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60">
              <Sparkles className="h-4 w-4" /> Konversi
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ============================ RINCIAN SKOR ============================
export function ScoreBreakdown({ score, rating, breakdown }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-base font-bold ${scoreTone(score)}`}>{score}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Skor Lead</p>
            <p className="text-xs text-slate-400">dari 100 · rating {RATING_META[rating]?.label || rating}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${RATING_META[rating]?.cls || ''}`}>
          <span className={`h-2 w-2 rounded-full ${RATING_META[rating]?.dot || 'bg-slate-400'}`} /> {RATING_META[rating]?.label || rating}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${score >= 60 ? 'bg-rose-500' : score >= 30 ? 'bg-amber-500' : 'bg-sky-500'}`} style={{ width: `${score}%` }} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {breakdown?.map((r, i) => (
          <li key={i} className="flex items-center justify-between text-xs">
            <span className={r.applied ? 'text-slate-700' : 'text-slate-400'}>{r.applied ? '✓' : '○'} {r.label}</span>
            <span className={`font-semibold ${r.applied ? 'text-emerald-600' : 'text-slate-300'}`}>+{r.points}<span className="text-slate-300"> / {r.of}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
