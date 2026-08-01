import { useState } from 'react'
import Modal, { Field, inputClass } from '../Modal.jsx'
import { PrimaryButton } from './CrmUI.jsx'
import { LOST_REASONS, LOST_REASON_LABEL } from '../../data/crmData.js'

// Modal alasan kalah terstruktur (PRD US-DL-02): pilih dari daftar baku;
// catatan wajib bila memilih "Lainnya" (OTHER). onConfirm(reason, note).
export default function LostReasonModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [initOpen, setInitOpen] = useState(false)
  if (open !== initOpen) { setInitOpen(open); if (open) { setReason(''); setNote(''); setErr('') } }

  function confirm() {
    if (!reason) { setErr('Pilih alasan kalah.'); return }
    if (reason === 'OTHER' && !note.trim()) { setErr('Catatan wajib untuk "Lainnya".'); return }
    onConfirm(reason, note.trim())
  }

  return (
    <Modal open={open} onClose={onClose} title="Alasan Kalah (Lost)" subtitle="Pilih dari daftar baku agar dapat dianalisis." maxWidth="max-w-md">
      <div className="space-y-4">
        <Field label="Alasan" required error={err && !reason ? err : undefined}>
          <select className={inputClass} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} autoFocus>
            <option value="">— Pilih alasan —</option>
            {LOST_REASONS.map((r) => <option key={r} value={r}>{LOST_REASON_LABEL[r]}</option>)}
          </select>
        </Field>
        {reason === 'OTHER' && (
          <Field label="Catatan" required error={err && reason === 'OTHER' ? err : undefined}>
            <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Jelaskan alasan lainnya…" />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton onClick={confirm}>Simpan sebagai Kalah</PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
