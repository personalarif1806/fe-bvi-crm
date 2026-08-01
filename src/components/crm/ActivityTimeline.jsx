import { useState } from 'react'
import { CheckCircle2, Circle, Clock, Phone, Mail, Users, ListTodo, Plus } from 'lucide-react'
import Modal, { Field, inputClass } from '../Modal.jsx'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { ACTIVITY_TYPES, ACTIVITY_TYPE_META, formatDateTime, toLocalInput } from '../../data/crmData.js'
import { PrimaryButton } from './CrmUI.jsx'

const TYPE_ICON = { TASK: ListTodo, CALL: Phone, MEETING: Users, EMAIL: Mail }

// Lini masa aktivitas reusable — dipasang di tab Activities (Account/Deal) &
// dipakai di halaman /crm/activities. relatedType/relatedCode menautkan record.
export function ActivityTimeline({ activities = [], onToggle, emptyLabel = 'Belum ada aktivitas tercatat.' }) {
  if (!activities.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    )
  }
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-5">
      {activities.map((a) => {
        const Icon = TYPE_ICON[a.type] || ListTodo
        const done = a.status === 'DONE'
        return (
          <li key={a.id} className="relative">
            <span className={`absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${done ? 'bg-emerald-500' : a.overdue ? 'bg-rose-500' : 'bg-brand-500'}`}>
              <Icon className="h-3 w-3 text-white" />
            </span>
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-soft">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`truncate text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{a.subject}</p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ACTIVITY_TYPE_META[a.type]?.cls || 'bg-slate-100 text-slate-500'}`}>
                    {ACTIVITY_TYPE_META[a.type]?.label || a.type}
                  </span>
                  {a.overdue && !done && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      <Clock className="h-2.5 w-2.5" /> Terlambat
                    </span>
                  )}
                </div>
                {a.notes && <p className="mt-0.5 truncate text-xs text-slate-500">{a.notes}</p>}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {a.dueDate ? `Jatuh tempo ${formatDateTime(a.dueDate)}` : 'Tanpa jatuh tempo'} · {a.ownerName}
                </p>
              </div>
              {onToggle && (
                <button
                  onClick={() => onToggle(a)}
                  title={done ? 'Tandai belum selesai' : 'Tandai selesai'}
                  className={`flex-none rounded-lg p-1.5 transition ${done ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600'}`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// Form buat/ubah aktivitas. Bila relatedType/relatedCode di-preset (dari detail
// record), field relasi disembunyikan.
const empty = { type: 'TASK', subject: '', notes: '', dueDate: '', status: 'OPEN' }

export function ActivityFormModal({ open, onClose, editing, preset, onSaved }) {
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  // Reset form saat modal dibuka / target berubah.
  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing
        ? { type: editing.type, subject: editing.subject, notes: editing.notes || '', dueDate: toLocalInput(editing.dueDate), status: editing.status }
        : { ...empty })
      setErrors({})
      setSubmitting(false)
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.subject.trim()) { setErrors({ subject: 'Judul wajib diisi.' }); return }
    setSubmitting(true)
    const body = {
      type: form.type,
      subject: form.subject,
      notes: form.notes || null,
      dueDate: form.dueDate || null,
      status: form.status,
      ...(editing ? {} : { relatedType: preset?.relatedType || null, relatedCode: preset?.relatedCode || null }),
    }
    const res = editing
      ? await runAction(crmApi.updateActivity(editing.id, body))
      : await runAction(crmApi.createActivity(body))
    setSubmitting(false)
    if (res.ok) { onSaved?.(); onClose() }
    else setErrors(res.fields || { subject: res.error })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Ubah Aktivitas' : 'Aktivitas Baru'} subtitle={preset?.label} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipe">
            <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_META[t].label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="OPEN">Terbuka</option>
              <option value="DONE">Selesai</option>
            </select>
          </Field>
        </div>
        <Field label="Judul" required error={errors.subject}>
          <input className={inputClass} value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="mis. Telepon follow-up penawaran" />
        </Field>
        <Field label="Jatuh Tempo" error={errors.dueDate}>
          <input type="datetime-local" className={inputClass} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
        <Field label="Catatan">
          <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan' : 'Tambah'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
