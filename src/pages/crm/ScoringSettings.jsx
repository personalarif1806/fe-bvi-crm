import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal, Save, RefreshCw, RotateCcw, Plus, Trash2, Info } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { inputClass } from '../../components/Modal.jsx'
import { CrmPage, PageHeader, ErrorBanner, LoadingBlock, PrimaryButton, GhostButton } from '../../components/crm/CrmUI.jsx'
import {
  RATING_META, formatThousands,
  CONTACT_LEVELS, LEAD_SEGMENTS, CUSTOMER_STATUSES, RFQ_STAGES,
} from '../../data/crmData.js'

const FIELD_LABELS = {
  emailValid: 'Email valid', phone: 'Nomor telepon', mobile: 'Nomor HP (mobile)',
  company: 'Nama perusahaan', website: 'Website',
}
const STATUS_LABELS = { CONTACTED: 'Dihubungi', WORKING: 'Diproses', QUALIFIED: 'Terkualifikasi' }
// Label opsi per blok kategori (dipakai untuk menampilkan input bobot).
const LABELS = {
  contactLevel: Object.fromEntries(CONTACT_LEVELS),
  segment: Object.fromEntries(LEAD_SEGMENTS),
  customerStatus: Object.fromEntries(CUSTOMER_STATUSES),
  rfqStage: Object.fromEntries(RFQ_STAGES),
}

export default function ScoringSettings() {
  const [cfg, setCfg] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [newSource, setNewSource] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    crmApi.scoringConfig()
      .then((r) => { setCfg(r.config); setDefaults(r.defaults) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // Update immutable pada path bertingkat (mis. ['fields','company']).
  function setPath(path, value) {
    setCfg((c) => {
      const next = structuredClone(c)
      let o = next
      for (let i = 0; i < path.length - 1; i += 1) o = o[path[i]]
      o[path[path.length - 1]] = value
      return next
    })
  }
  const numOnly = (v) => v.replace(/\D/g, '')

  async function save() {
    setSaving(true); setMsg(''); setError('')
    const res = await runAction(crmApi.saveScoringConfig(cfg))
    setSaving(false)
    if (res.ok) { setCfg(res.data.config); setMsg('Konfigurasi tersimpan. Skor lead baru/diedit akan memakai bobot ini.') }
    else setError(res.error || 'Gagal menyimpan konfigurasi.')
  }

  async function recompute() {
    setSaving(true); setMsg(''); setError('')
    const res = await runAction(crmApi.recomputeScores())
    setSaving(false)
    if (res.ok) setMsg(`Skor dihitung ulang: ${res.data.updated} dari ${res.data.total} lead diperbarui.`)
    else setError(res.error || 'Gagal menghitung ulang.')
  }

  function resetDefault() {
    if (defaults) setCfg(structuredClone(defaults))
    setMsg('Nilai default dimuat ke form — klik Simpan untuk menerapkan.')
  }

  function addSource() {
    const name = newSource.trim()
    if (!name || cfg.source[name] !== undefined) return
    setCfg((c) => ({ ...c, source: { ...c.source, [name]: 0 } }))
    setNewSource('')
  }
  function removeSource(name) {
    setCfg((c) => { const s = { ...c.source }; delete s[name]; return { ...c, source: s } })
  }

  // Skor maksimum teoretis dari bobot saat ini (untuk pratinjau band rating).
  // Blok kategori menyumbang nilai opsi tertingginya saja (hanya satu bisa dipilih).
  const maxScore = useMemo(() => {
    if (!cfg) return 0
    const fieldSum = Object.values(cfg.fields).reduce((a, b) => a + Number(b || 0), 0)
    const best = (block) => Math.max(0, ...Object.values(cfg[block]).map(Number))
    const total = fieldSum + Number(cfg.revenue.points || 0)
      + ['contactLevel', 'segment', 'source', 'status', 'customerStatus', 'rfqStage'].reduce((a, b) => a + best(b), 0)
    return Math.min(100, total)
  }, [cfg])

  if (loading && !cfg) return <CrmPage><div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat konfigurasi…" /></div></CrmPage>
  if (!cfg) return <CrmPage><ErrorBanner message={error || 'Gagal memuat konfigurasi.'} /></CrmPage>

  const hot = Number(cfg.rating.hot || 0)
  const warm = Number(cfg.rating.warm || 0)

  return (
    <CrmPage>
      <Link to="/crm/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Leads</Link>
      <PageHeader title="Pengaturan Skor Lead" subtitle="Atur bobot & ambang scoring tanpa menyentuh kode. Berlaku untuk perhitungan berikutnya.">
        <GhostButton onClick={resetDefault}><RotateCcw className="h-4 w-4" /> Muat Default</GhostButton>
        <GhostButton onClick={recompute} disabled={saving}><RefreshCw className="h-4 w-4" /> Hitung Ulang Semua</GhostButton>
        <PrimaryButton onClick={save} disabled={saving}><Save className="h-4 w-4" /> Simpan</PrimaryButton>
      </PageHeader>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Bobot kelengkapan data */}
          <Card title="Bobot Kelengkapan Data" hint="Poin ditambahkan bila field terisi.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.keys(FIELD_LABELS).map((k) => (
                <PointInput key={k} label={FIELD_LABELS[k]} value={cfg.fields[k]} onChange={(v) => setPath(['fields', k], v)} />
              ))}
            </div>
          </Card>

          {/* Level kontak */}
          <Card title="Bobot Level Kontak" hint="Pilih satu — decision-maker paling menentukan closing.">
            <BlockInputs cfg={cfg} block="contactLevel" order={CONTACT_LEVELS} setPath={setPath} />
          </Card>

          {/* Firmografi: ambang nilai tahunan + kategori segmen */}
          <Card title="Firmografi" hint="Ambang nilai tahunan + segmen pelanggan.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ThresholdRow label="Nilai tahunan (Rp) ≥" money threshold={cfg.revenue.threshold} points={cfg.revenue.points}
                onThreshold={(v) => setPath(['revenue', 'threshold'], v)} onPoints={(v) => setPath(['revenue', 'points'], v)} />
              <div className="rounded-xl border border-slate-100 p-3">
                <span className="block text-xs font-medium text-slate-600">Segmen pelanggan (pilih satu)</span>
                <div className="mt-2"><BlockInputs cfg={cfg} block="segment" order={LEAD_SEGMENTS} setPath={setPath} cols="grid-cols-2" /></div>
              </div>
            </div>
          </Card>

          {/* Bobot sumber */}
          <Card title="Bobot Sumber Lead" hint="Sumber berkualitas (mis. Referral) biasanya diberi poin lebih tinggi.">
            <div className="space-y-2">
              {Object.keys(cfg.source).map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-700">{s}</span>
                  <input inputMode="numeric" className={`${inputClass} w-24`} value={cfg.source[s]} onChange={(e) => setPath(['source', s], numOnly(e.target.value))} />
                  <button onClick={() => removeSource(s)} title="Hapus sumber" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Nama sumber baru…" className={`${inputClass} flex-1`} />
                <GhostButton onClick={addSource}><Plus className="h-4 w-4" /> Tambah</GhostButton>
              </div>
            </div>
          </Card>

          {/* Bobot status */}
          <Card title="Bobot Status Lead" hint="Posisi lead di funnel.">
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(cfg.status).map((s) => (
                <PointInput key={s} label={STATUS_LABELS[s] || s} value={cfg.status[s]} onChange={(v) => setPath(['status', s], v)} />
              ))}
            </div>
          </Card>

          {/* Status pelanggan & tahap RFQ — dua prediktor closing terkuat */}
          <Card title="Bobot Status Pelanggan" hint="Riwayat kerja sama — prediktor closing terkuat.">
            <BlockInputs cfg={cfg} block="customerStatus" order={CUSTOMER_STATUSES} setPath={setPath} />
          </Card>

          <Card title="Bobot Tahap Permintaan / RFQ" hint="Sinyal niat beli — makin konkret makin tinggi.">
            <BlockInputs cfg={cfg} block="rfqStage" order={RFQ_STAGES} setPath={setPath} />
          </Card>
        </div>

        {/* Kolom kanan: ambang rating + pratinjau */}
        <div className="space-y-5">
          <Card title="Ambang Rating" hint="Skor menentukan Hot/Warm/Cold.">
            <div className="space-y-3">
              <PointInput label="Skor minimal Hot" value={cfg.rating.hot} onChange={(v) => setPath(['rating', 'hot'], v)} max={100} />
              <PointInput label="Skor minimal Warm" value={cfg.rating.warm} onChange={(v) => setPath(['rating', 'warm'], v)} max={100} />
              <p className="text-xs text-slate-400">Warm harus lebih kecil dari Hot.</p>
            </div>
            {/* Bar band */}
            <div className="mt-4">
              <div className="flex h-3 overflow-hidden rounded-full">
                <div className="bg-sky-400" style={{ width: `${warm}%` }} title="Cold" />
                <div className="bg-amber-400" style={{ width: `${Math.max(0, hot - warm)}%` }} title="Warm" />
                <div className="bg-rose-500" style={{ width: `${Math.max(0, 100 - hot)}%` }} title="Hot" />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-400"><span>0</span><span>Warm ≥{warm}</span><span>Hot ≥{hot}</span><span>100</span></div>
            </div>
          </Card>

          <Card title="Pratinjau">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-900 px-2 text-lg font-bold text-white">{maxScore}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">Skor maksimum</p>
                <p className="text-xs text-slate-400">dari bobot saat ini (dibatasi 100)</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Lead dengan data terlengkap akan bernilai <strong>{maxScore}</strong> → rating{' '}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RATING_META[maxScore >= hot ? 'HOT' : maxScore >= warm ? 'WARM' : 'COLD'].cls}`}>
                {RATING_META[maxScore >= hot ? 'HOT' : maxScore >= warm ? 'WARM' : 'COLD'].label}
              </span>.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>Menyimpan hanya memengaruhi perhitungan berikutnya. Untuk menerapkan ke lead lama, klik <strong>Hitung Ulang Semua</strong>.</span>
            </div>
          </Card>

          <Card title="Aturan Gating HOT" hint="Berlaku terpisah dari skor — skor tetap murni mengukur potensi.">
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Lead hanya boleh berating <strong>Hot</strong> bila (email <em>atau</em> telepon/HP terisi) <strong>dan</strong> nama perusahaan terisi.</li>
              <li>Skor ≥ ambang Hot tapi syarat belum terpenuhi → rating ditahan di <strong>Warm</strong> + diberi tag <strong>Lengkapi Data</strong>.</li>
              <li>Skornya sendiri tidak dipotong: 70 tetap tercatat 70.</li>
            </ul>
          </Card>
        </div>
      </div>
    </CrmPage>
  )
}

function Card({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><SlidersHorizontal className="h-4 w-4 text-slate-400" /> {title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// Input bobot untuk satu blok kategori. `order` menjaga urutan tampil tetap
// sama dengan form lead; opsi tak dikenal (hasil edit manual) tetap ikut tampil.
function BlockInputs({ cfg, block, order, setPath, cols = 'grid-cols-2 sm:grid-cols-3' }) {
  const known = order.map(([v]) => v)
  const keys = [...known.filter((k) => cfg[block][k] !== undefined), ...Object.keys(cfg[block]).filter((k) => !known.includes(k))]
  return (
    <div className={`grid gap-3 ${cols}`}>
      {keys.map((k) => (
        <PointInput key={k} label={LABELS[block]?.[k] || k} value={cfg[block][k]} onChange={(v) => setPath([block, k], v)} />
      ))}
    </div>
  )
}

function PointInput({ label, value, onChange, max = 100 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input inputMode="numeric" className={inputClass} value={value}
        onChange={(e) => { let n = e.target.value.replace(/\D/g, ''); if (n !== '' && Number(n) > max) n = String(max); onChange(n) }} />
    </label>
  )
}

function ThresholdRow({ label, threshold, points, onThreshold, onPoints, money }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[10px] text-slate-400">Ambang</span>
          <input inputMode="numeric" className={inputClass} value={money ? formatThousands(threshold) : threshold}
            onChange={(e) => onThreshold(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <span className="mb-1 block text-[10px] text-slate-400">Poin</span>
          <input inputMode="numeric" className={inputClass} value={points}
            onChange={(e) => { let n = e.target.value.replace(/\D/g, ''); if (n !== '' && Number(n) > 100) n = '100'; onPoints(n) }} />
        </div>
      </div>
    </div>
  )
}
