import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { Field, inputClass } from '../../components/Modal.jsx'
import { CrmPage, ErrorBanner, LoadingBlock, Badge, PrimaryButton, GhostButton } from '../../components/crm/CrmUI.jsx'
import { QUOTE_STATUS_META, DISCOUNT_APPROVAL_THRESHOLD, formatCurrency, formatThousands, formatDate } from '../../data/crmData.js'

const EDITABLE = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED']

export default function QuoteBuilder() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [catalog, setCatalog] = useState({ services: [], packages: [] })
  const [lines, setLines] = useState([])
  const [taxRate, setTaxRate] = useState(11)
  const [validUntil, setValidUntil] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([crmApi.getQuote(code), crmApi.catalog()])
      .then(([q, c]) => {
        setQuote(q); setCatalog(c)
        setLines((q.lines || []).map((l) => ({ ...l, key: `L${l.id}`, unitPrice: String(l.unitPrice) })))
        setTaxRate(q.taxRate); setValidUntil(q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [code])
  useEffect(() => { load() }, [load])

  // Peta katalog untuk lookup cepat.
  const catalogMap = useMemo(() => {
    const m = new Map()
    catalog.services.forEach((s) => m.set(`service:${s.refCode}`, s))
    catalog.packages.forEach((p) => m.set(`package:${p.refCode}`, p))
    return m
  }, [catalog])

  const editable = quote && EDITABLE.includes(quote.status)

  function addLine() {
    setLines((ls) => [...ls, { key: `N${Date.now()}${ls.length}`, refType: '', refCode: '', description: '', method: '', quantity: 1, unitPrice: '', discountPct: 0 }])
  }
  function removeLine(key) { setLines((ls) => ls.filter((l) => l.key !== key)) }
  function setLine(key, patch) { setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l))) }
  function pickItem(key, value) {
    const item = catalogMap.get(value)
    if (!item) { setLine(key, { refType: '', refCode: '' }); return }
    setLine(key, { refType: item.refType, refCode: item.refCode, description: item.name, method: item.method || '', unitPrice: '' })
  }

  // Kalkulasi live (mengikuti aturan server).
  const calc = useMemo(() => {
    let subtotal = 0, discountTotal = 0, maxDisc = 0
    const rows = lines.map((l) => {
      const item = catalogMap.get(`${l.refType}:${l.refCode}`)
      const base = l.unitPrice === '' ? (item?.basePrice ?? 0) : Number(l.unitPrice) || 0
      const qty = Number(l.quantity) || 0
      const disc = Number(l.discountPct) || 0
      const gross = base * qty
      const lineDisc = Math.round((gross * disc) / 100)
      subtotal += gross; discountTotal += lineDisc; maxDisc = Math.max(maxDisc, disc)
      return { ...l, effPrice: base, lineTotal: gross - lineDisc }
    })
    const net = subtotal - discountTotal
    const tax = Math.round((net * (Number(taxRate) || 0)) / 100)
    const overallPct = subtotal ? Math.round((discountTotal / subtotal) * 100) : 0
    return { rows, subtotal, discountTotal, tax, grandTotal: net + tax, needsApproval: maxDisc > DISCOUNT_APPROVAL_THRESHOLD || overallPct > DISCOUNT_APPROVAL_THRESHOLD }
  }, [lines, taxRate, catalogMap])

  async function save() {
    setSaving(true); setError('')
    const payload = {
      taxRate: Number(taxRate) || 0,
      validUntil: validUntil || undefined,
      lines: lines.filter((l) => l.refType && l.refCode).map((l) => ({
        refType: l.refType, refCode: l.refCode, quantity: Number(l.quantity) || 1,
        discountPct: Number(l.discountPct) || 0,
        unitPrice: l.unitPrice === '' ? undefined : Number(l.unitPrice),
      })),
    }
    const res = await runAction(crmApi.saveQuote(code, payload))
    setSaving(false)
    if (res.ok) load(); else setError(res.error)
  }

  async function revise() {
    const res = await runAction(crmApi.reviseQuote(code))
    if (res.ok) navigate(`/crm/quotes/${res.data.id}`); else setError(res.error)
  }

  if (loading && !quote) return <CrmPage><div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat penawaran…" /></div></CrmPage>
  if (!quote) return <CrmPage><ErrorBanner message={error || 'Penawaran tidak ditemukan.'} /></CrmPage>

  const options = [
    { group: 'Parameter', items: catalog.services },
    { group: 'Paket', items: catalog.packages },
  ]

  return (
    <CrmPage>
      <Link to={`/crm/deals/${quote.dealId}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Deal {quote.dealId}</Link>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-600" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Penawaran {quote.id}</h1>
              <Badge meta={QUOTE_STATUS_META[quote.status]} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">v{quote.version}{quote.isCurrent ? ' · aktif' : ''}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Price book: {quote.priceBookCode || '—'} · Berlaku s.d. {formatDate(quote.validUntil)}</p>
          </div>
          {editable ? (
            <div className="flex gap-2">
              <GhostButton onClick={addLine}><Plus className="h-4 w-4" /> Baris</GhostButton>
              <PrimaryButton onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan'}</PrimaryButton>
            </div>
          ) : (
            <GhostButton onClick={revise}><RefreshCw className="h-4 w-4" /> Buat Revisi</GhostButton>
          )}
        </div>
        {!editable && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Penawaran berstatus {QUOTE_STATUS_META[quote.status]?.label} — terkunci. Buat revisi untuk mengubah (versi baru).</p>}
      </div>

      <ErrorBanner message={error} />

      {/* Baris item */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Metode</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
                <th className="px-4 py-3 text-right font-medium">Disk %</th>
                <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                {editable && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calc.rows.map((l) => (
                <tr key={l.key} className="align-top">
                  <td className="px-4 py-3">
                    {editable ? (
                      <select className={`${inputClass} min-w-[220px]`} value={l.refType && l.refCode ? `${l.refType}:${l.refCode}` : ''} onChange={(e) => pickItem(l.key, e.target.value)}>
                        <option value="">— Pilih item katalog —</option>
                        {options.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map((it) => <option key={`${it.refType}:${it.refCode}`} value={`${it.refType}:${it.refCode}`}>{it.name}{it.isAccredited === false ? ' ⚠︎ non-akreditasi' : ''}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <div><p className="font-medium text-slate-700">{l.description}</p>{l.isAccredited === false && <span className="text-[11px] text-amber-600">di luar ruang lingkup akreditasi</span>}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.method || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {editable ? <input type="number" min="1" className={`${inputClass} w-20 text-right`} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} /> : l.quantity}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editable ? (
                      <input type="text" inputMode="numeric" className={`${inputClass} w-28 text-right`} placeholder={String(catalogMap.get(`${l.refType}:${l.refCode}`)?.basePrice ?? '')}
                        value={l.unitPrice === '' ? '' : formatThousands(l.unitPrice)} onChange={(e) => setLine(l.key, { unitPrice: e.target.value.replace(/\D/g, '') })} />
                    ) : formatCurrency(l.effPrice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editable ? <input type="number" min="0" max="100" className={`${inputClass} w-16 text-right ${Number(l.discountPct) > DISCOUNT_APPROVAL_THRESHOLD ? 'text-amber-600' : ''}`} value={l.discountPct} onChange={(e) => setLine(l.key, { discountPct: e.target.value })} /> : `${l.discountPct}%`}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(l.lineTotal)}</td>
                  {editable && <td className="px-4 py-3 text-right"><button onClick={() => removeLine(l.key)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td>}
                </tr>
              ))}
              {lines.length === 0 && <tr><td colSpan={editable ? 7 : 6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada baris. {editable && 'Klik "Baris" untuk menambah item.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800">Ketentuan</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="PPN (%)"><input type="number" min="0" className={inputClass} value={taxRate} disabled={!editable} onChange={(e) => setTaxRate(e.target.value)} /></Field>
            <Field label="Berlaku s.d."><input type="date" className={inputClass} value={validUntil} disabled={!editable} onChange={(e) => setValidUntil(e.target.value)} /></Field>
          </div>
          {calc.needsApproval && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>Diskon melebihi {DISCOUNT_APPROVAL_THRESHOLD}% — menyimpan akan menetapkan status <strong>Menunggu Approval</strong> dan quote tidak dapat dikirim sebelum disetujui (BR-06).</span>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-slate-800">Ringkasan Harga</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(calc.subtotal)} />
            <Row label="Diskon" value={`− ${formatCurrency(calc.discountTotal)}`} />
            <Row label={`PPN ${taxRate}%`} value={formatCurrency(calc.tax)} />
            <div className="border-t border-slate-100 pt-2"><Row label="Grand Total" value={formatCurrency(calc.grandTotal)} bold /></div>
          </dl>
        </div>
      </div>
    </CrmPage>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-slate-500 ${bold ? 'font-semibold text-slate-700' : ''}`}>{label}</dt>
      <dd className={`text-slate-800 ${bold ? 'text-lg font-bold' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}
