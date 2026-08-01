import { useState } from 'react'
import { Upload, CheckCircle2, XCircle, FileDown } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import Modal, { Field, inputClass } from '../../components/Modal.jsx'
import { PrimaryButton, GhostButton, ErrorBanner } from '../../components/crm/CrmUI.jsx'

const COLUMNS = [
  'npwp', 'site_code', 'site_name', 'point_code', 'point_name', 'matrix', 'frequency',
  'frequency_detail', 'legal_basis', 'required_params', 'last_tested_date', 'served_by',
  'served_via', 'estimated_value', 'latitude', 'longitude',
]

const TEMPLATE = `${COLUMNS.join(',')}
012345678901000,PLANT-01,Pabrik Cikarang,OUT-IPAL-01,Outlet IPAL Utama,WASTEWATER,MONTHLY,,PermenLHK No. 5/2014,BOD;COD;TSS;pH,2026-06-14,BUMI_VENTILA,DIRECT,3500000,-6.30125,107.15230`

// Parser CSV ringan: dukung field ber-tanda kutip & koma di dalamnya.
function parseCsv(text) {
  const rows = []
  let field = ''
  let record = []
  let inQuotes = false
  const pushField = () => { record.push(field); field = '' }
  const pushRecord = () => { if (record.length > 1 || record[0] !== '') rows.push(record); record = [] }
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1 }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') pushField()
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { pushField(); pushRecord() }
    else field += c
  }
  if (field !== '' || record.length) { pushField(); pushRecord() }
  return rows
}

function toObjects(text) {
  const rows = parseCsv(text.trim())
  if (rows.length < 2) return { header: [], objects: [] }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const objects = rows.slice(1).map((r) => {
    const o = {}
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim() })
    return o
  })
  return { header, objects }
}

export function ImportPointsModal({ open, onClose, accounts, onImported }) {
  const [accountId, setAccountId] = useState('')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() { setText(''); setPreview(null); setResult(null); setError(''); setAccountId('') }
  function close() { reset(); onClose() }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setText(await file.text())
    setPreview(null); setResult(null)
  }

  async function doPreview() {
    setError(''); setResult(null)
    const { objects } = toObjects(text)
    if (objects.length === 0) { setError('Tidak ada baris data. Pastikan ada header + minimal 1 baris.'); return }
    setBusy(true)
    const res = await runAction(crmApi.importPoints({ rows: objects, mode: 'preview' }))
    setBusy(false)
    if (res.ok) setPreview(res.data); else setError(res.error)
  }

  async function doCommit() {
    if (!accountId) { setError('Pilih account tujuan impor.'); return }
    setError('')
    const { objects } = toObjects(text)
    setBusy(true)
    const res = await runAction(crmApi.importPoints({ accountCode: accountId, rows: objects, mode: 'commit' }))
    setBusy(false)
    if (res.ok) { setResult(res.data); onImported?.() } else setError(res.error)
  }

  function downloadErrors() {
    const rows = preview?.rows?.filter((r) => !r.valid) || result?.invalidRows || []
    const lines = ['row_number,errors', ...rows.map((r) => `${r.rowNumber},"${r.errors.join('; ')}"`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'baris-gagal.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={open} onClose={close} title="Impor Massal Titik Sampling" maxWidth="max-w-3xl"
      subtitle="Unggah/tempel CSV. Pratinjau memvalidasi per baris; hanya baris valid yang di-commit (US-SP-02).">
      <div className="space-y-4">
        <ErrorBanner message={error} />

        {!result && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Account Tujuan" required hint="lokasi baru dibuat otomatis dari site_code">
                <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">— Pilih account —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Unggah File CSV">
                <input type="file" accept=".csv,text/csv" onChange={onFile} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700" />
              </Field>
            </div>
            <Field label="Atau tempel CSV" hint={`Kolom: ${COLUMNS.join(', ')}`}>
              <textarea className={`${inputClass} min-h-[120px] font-mono text-xs`} value={text} onChange={(e) => { setText(e.target.value); setPreview(null) }} placeholder={TEMPLATE} />
            </Field>
            <button type="button" onClick={() => setText(TEMPLATE)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Isi contoh template</button>
          </>
        )}

        {preview && !result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-slate-700">{preview.total} baris</span>
              <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {preview.validCount} valid</span>
              <span className="inline-flex items-center gap-1 text-rose-600"><XCircle className="h-4 w-4" /> {preview.invalidCount} invalid</span>
              {preview.invalidCount > 0 && (
                <button onClick={downloadErrors} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"><FileDown className="h-3.5 w-3.5" /> Unduh baris gagal</button>
              )}
            </div>
            <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400">
                  <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Titik</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber} className={r.valid ? '' : 'bg-rose-50/40'}>
                      <td className="px-3 py-1.5 text-slate-400">{r.rowNumber}</td>
                      <td className="px-3 py-1.5 text-slate-600">{r.data.pointCode} — {r.data.pointName}</td>
                      <td className="px-3 py-1.5">{r.valid ? <span className="text-emerald-600">Valid</span> : <span className="text-rose-600">{r.errors.join('; ')}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Impor selesai.</p>
            <p className="mt-1">{result.created} titik dibuat · {result.skippedExisting} dilewati (sudah ada) · {result.invalidCount} baris invalid diabaikan.</p>
            {result.invalidCount > 0 && (
              <button onClick={downloadErrors} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline">Unduh baris gagal</button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton onClick={close}>{result ? 'Tutup' : 'Batal'}</GhostButton>
          {!result && !preview && <PrimaryButton onClick={doPreview} disabled={busy || !text.trim()}><Upload className="h-4 w-4" /> Pratinjau</PrimaryButton>}
          {!result && preview && (
            <>
              <GhostButton onClick={() => setPreview(null)}>Ubah Data</GhostButton>
              <PrimaryButton onClick={doCommit} disabled={busy || preview.validCount === 0}>Commit {preview.validCount} Baris Valid</PrimaryButton>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
