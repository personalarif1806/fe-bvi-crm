import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, RotateCcw, Layers, Workflow, Star, Repeat, ShieldCheck, Trophy, XCircle, ArrowRight,
} from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import Modal, { Field, inputClass } from '../../components/Modal.jsx'
import {
  CrmPage, PageHeader, ErrorBanner, LoadingBlock, EmptyState, PrimaryButton, GhostButton,
} from '../../components/crm/CrmUI.jsx'
import { SERVICE_LINES, PIPELINE_TYPE_META, serviceLineMeta } from '../../data/crmData.js'

// Urutan tampil lini + wadah "Umum" untuk pipeline bertipe GENERIC.
const LINE_ORDER = [...SERVICE_LINES, 'OTHER']

export default function Pipelines() {
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    crmApi.pipelines()
      .then((r) => { setPipelines(r.data || []); setError('') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // Kelompokkan per lini layanan supaya lab, training, dan konsultansi terpisah jelas.
  const groups = LINE_ORDER
    .map((line) => ({ line, items: pipelines.filter((p) => (p.serviceLine || 'OTHER') === line) }))
    .filter((g) => g.items.length > 0)

  return (
    <CrmPage>
      <PageHeader
        title="Pipeline"
        subtitle="Tahapan penjualan per lini layanan — laboratorium, training, dan konsultansi."
      >
        <GhostButton onClick={load}><RotateCcw className="h-4 w-4" /> Muat Ulang</GhostButton>
        <PrimaryButton onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Tambah Pipeline</PrimaryButton>
      </PageHeader>

      <ErrorBanner message={error} />

      {loading && pipelines.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat pipeline…" /></div>
      ) : pipelines.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
          <EmptyState
            icon={Workflow} title="Belum ada pipeline"
            description="Buat pipeline dari template, atau jalankan seed CRM untuk memuat pipeline bawaan."
            action={<PrimaryButton onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Tambah Pipeline</PrimaryButton>}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const meta = serviceLineMeta(g.line)
            return (
              <section key={g.line} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  <p className="text-xs text-slate-400">{meta.desc}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {g.items.map((p) => <PipelineCard key={p.id} pipeline={p} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <PipelineFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
    </CrmPage>
  )
}

// ---- Kartu satu pipeline: metadata + rangkaian stage ----
function PipelineCard({ pipeline }) {
  const typeLabel = PIPELINE_TYPE_META[pipeline.type]?.label || pipeline.type

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-800">{pipeline.name}</h3>
            {pipeline.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                <Star className="h-3 w-3" /> default
              </span>
            )}
            {pipeline.isRecurring && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                <Repeat className="h-3 w-3" /> berulang
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{pipeline.id} · {typeLabel}</p>
        </div>
        <div className="flex-none text-right">
          <p className="text-lg font-bold text-slate-900">{pipeline.dealCount ?? 0}</p>
          <p className="text-[11px] text-slate-400">deal</p>
        </div>
      </div>

      <ol className="mt-4 space-y-1.5">
        {pipeline.stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-slate-100 font-semibold text-slate-500">{i + 1}</span>
            <span className={`min-w-0 flex-1 truncate ${s.isLost ? 'text-slate-400' : 'text-slate-700'}`}>{s.name}</span>
            {s.requiresFeasibility && (
              <span title="Butuh kaji ulang kelayakan/kesiapan disetujui" className="inline-flex flex-none items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                <ShieldCheck className="h-3 w-3" /> gate
              </span>
            )}
            {s.isWon && <Trophy className="h-3.5 w-3.5 flex-none text-emerald-500" />}
            {s.isLost && <XCircle className="h-3.5 w-3.5 flex-none text-rose-400" />}
            <span className="w-9 flex-none text-right font-semibold text-slate-500">{s.probability}%</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <Link to="/crm/deals" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          Lihat papan deal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ---- Form: buat pipeline dari template (atau kosong) ----
function PipelineFormModal({ open, onClose, onSaved }) {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({ templateKey: '', name: '', isDefault: false })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  useEffect(() => {
    if (!open) return
    crmApi.pipelineTemplates().then((r) => setTemplates(r.data || [])).catch(() => setTemplates([]))
  }, [open])

  const key = open ? 'new' : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) { setForm({ templateKey: '', name: '', isDefault: false }); setErrors({}); setSubmitting(false) }
  }

  const selected = templates.find((t) => t.key === form.templateKey) || null

  function pickTemplate(k) {
    const t = templates.find((x) => x.key === k)
    // Nama mengikuti template kecuali pengguna sudah mengetik nama sendiri.
    setForm((f) => ({ ...f, templateKey: k, name: t && (!f.name || templates.some((x) => x.name === f.name)) ? t.name : f.name }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.templateKey) { setErrors({ templateKey: 'Pilih template tahapan.' }); return }
    setSubmitting(true)
    const res = await runAction(crmApi.createPipeline({
      templateKey: form.templateKey,
      name: form.name.trim() || undefined,
      isDefault: form.isDefault,
    }))
    setSubmitting(false)
    if (res.ok) { onSaved(); onClose() } else setErrors(res.fields || { templateKey: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah Pipeline" subtitle="Pilih cetak-biru tahapan sesuai lini layanan." maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Template Tahapan" required error={errors.templateKey}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {templates.map((t) => {
              const meta = serviceLineMeta(t.serviceLine)
              const active = form.templateKey === t.key
              return (
                <button
                  type="button" key={t.key} onClick={() => pickTemplate(t.key)}
                  className={`rounded-xl border p-3 text-left transition ${active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">{t.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{t.stages.length} tahap</p>
                </button>
              )
            })}
            {templates.length === 0 && <p className="text-xs text-slate-400 sm:col-span-3">Template tidak tersedia.</p>}
          </div>
        </Field>

        {selected && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs leading-relaxed text-slate-500">{selected.description}</p>
            <ol className="mt-2.5 space-y-1">
              {selected.stages.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-white font-semibold text-slate-500 shadow-soft">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{s.name}</span>
                  {s.requiresFeasibility && <ShieldCheck className="h-3.5 w-3.5 flex-none text-amber-500" />}
                  {s.isWon && <Trophy className="h-3.5 w-3.5 flex-none text-emerald-500" />}
                  {s.isLost && <XCircle className="h-3.5 w-3.5 flex-none text-rose-400" />}
                  <span className="w-9 flex-none text-right font-semibold text-slate-500">{s.probability}%</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <Field label="Nama Pipeline" error={errors.name} hint="Kosongkan untuk memakai nama template.">
          <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={selected?.name || 'mis. Akuisisi Training 2026'} />
        </Field>

        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
          <span className="text-xs leading-snug text-slate-600">
            Jadikan pipeline default
            <span className="mt-0.5 block text-slate-400">Deal baru & hasil konversi lead masuk ke pipeline ini bila tidak dipilih pipeline lain.</span>
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}><Layers className="h-4 w-4" /> Buat Pipeline</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
