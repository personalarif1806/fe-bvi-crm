import { useRef, useState } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2,
  Video, MapPin, Clock, Pencil, Trash2, User, Monitor, Building,
} from 'lucide-react'
import Modal, { Field, inputClass, ConfirmDialog } from '../Modal.jsx'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { formatDateTime, toLocalInput } from '../../data/crmData.js'
import { PrimaryButton } from './CrmUI.jsx'

export const MEETING_MODE_META = {
  OFFLINE: { label: 'Offline', icon: Building, cls: 'bg-amber-100 text-amber-700' },
  ONLINE: { label: 'Online', icon: Monitor, cls: 'bg-sky-100 text-sky-700' },
}

// ---- Editor rich-text ringan (tanpa dependensi) berbasis contentEditable ----
// Menghasilkan HTML formatting dasar; disanitasi ulang di server sebelum simpan.
const TOOLBAR = [
  { cmd: 'bold', icon: Bold, title: 'Tebal' },
  { cmd: 'italic', icon: Italic, title: 'Miring' },
  { cmd: 'underline', icon: Underline, title: 'Garis bawah' },
  { cmd: 'strikeThrough', icon: Strikethrough, title: 'Coret' },
  { cmd: 'insertUnorderedList', icon: List, title: 'Daftar poin' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Daftar bernomor' },
]

export function RichTextEditor({ value, onChange, resetKey }) {
  const ref = useRef(null)
  const initKey = useRef(null)

  // Inisialisasi innerHTML sekali per pembukaan (uncontrolled) agar caret tidak
  // melompat: React tak boleh menulis ulang innerHTML pada tiap ketikan.
  if (ref.current && initKey.current !== resetKey) {
    initKey.current = resetKey
    ref.current.innerHTML = value || ''
  }

  const exec = (cmd) => {
    document.execCommand(cmd, false, null)
    ref.current?.focus()
    onChange(ref.current?.innerHTML || '')
  }

  const addLink = () => {
    const url = window.prompt('Masukkan URL (https://…)')
    if (!url) return
    document.execCommand('createLink', false, url)
    ref.current?.focus()
    onChange(ref.current?.innerHTML || '')
  }

  return (
    <div className="rounded-xl border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 px-1.5 py-1">
        {TOOLBAR.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          title="Sisipkan tautan"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
        data-placeholder="Tulis notulen meeting di sini…"
        className="prose-note min-h-[9rem] max-h-80 overflow-y-auto px-3 py-2 text-sm text-slate-800 outline-none"
      />
    </div>
  )
}

// ---- Konten HTML read-only (sudah disanitasi server) ----
export function RichContent({ html }) {
  return <div className="prose-note text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: html || '' }} />
}

// ---- Daftar catatan meeting ----
export function MeetingNotesList({ notes = [], onEdit, onDelete, emptyLabel = 'Belum ada catatan meeting.' }) {
  if (!notes.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {notes.map((n) => {
        const mode = MEETING_MODE_META[n.mode] || MEETING_MODE_META.OFFLINE
        const ModeIcon = mode.icon
        return (
          <li key={n.id} className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">{n.title}</h4>
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${mode.cls}`}>
                    <ModeIcon className="h-2.5 w-2.5" /> {mode.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                  {n.meetingAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(n.meetingAt)}</span>}
                  {n.location && (
                    <span className="inline-flex items-center gap-1">
                      {n.mode === 'ONLINE' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />} {n.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {n.ownerName}</span>
                </div>
              </div>
              <div className="flex flex-none items-center gap-1">
                <button onClick={() => onEdit?.(n)} title="Ubah" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete?.(n)} title="Hapus" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <RichContent html={n.content} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ---- Form buat/ubah catatan meeting ----
const empty = { title: '', content: '', mode: 'OFFLINE', location: '', meetingAt: '' }

export function MeetingNoteFormModal({ open, onClose, accountCode, accountName, editing, onSaved }) {
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initKey, setInitKey] = useState(null)

  const key = open ? (editing?.id || 'new') : null
  if (key !== initKey) {
    setInitKey(key)
    if (open) {
      setForm(editing
        ? { title: editing.title, content: editing.content || '', mode: editing.mode, location: editing.location || '', meetingAt: toLocalInput(editing.meetingAt) }
        : { ...empty })
      setErrors({})
      setSubmitting(false)
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    const localErr = {}
    if (!form.title.trim()) localErr.title = 'Judul wajib diisi.'
    if (!form.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()) localErr.content = 'Isi catatan wajib diisi.'
    if (Object.keys(localErr).length) { setErrors(localErr); return }

    setSubmitting(true)
    const body = {
      title: form.title,
      content: form.content,
      mode: form.mode,
      location: form.location || null,
      meetingAt: form.meetingAt || null,
    }
    const res = editing
      ? await runAction(crmApi.updateMeetingNote(editing.id, body))
      : await runAction(crmApi.createMeetingNote(accountCode, body))
    setSubmitting(false)
    if (res.ok) { onSaved?.(); onClose() }
    else setErrors(res.fields || { title: res.error })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Ubah Catatan Meeting' : 'Catatan Meeting Baru'}
      subtitle={accountName ? `Untuk ${accountName}` : undefined}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Judul" required error={errors.title}>
          <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="mis. Kickoff pengujian air limbah" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Jenis Meeting">
            <select className={inputClass} value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="OFFLINE">Offline (tatap muka)</option>
              <option value="ONLINE">Online (daring)</option>
            </select>
          </Field>
          <Field label="Waktu Meeting" error={errors.meetingAt}>
            <input type="datetime-local" className={inputClass} value={form.meetingAt} onChange={(e) => set('meetingAt', e.target.value)} />
          </Field>
        </div>
        <Field label={form.mode === 'ONLINE' ? 'Tautan / Platform' : 'Lokasi'} hint={form.mode === 'ONLINE' ? 'mis. Google Meet / Zoom + tautan' : 'mis. Kantor pusat, Ruang Rapat 2'}>
          <input className={inputClass} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder={form.mode === 'ONLINE' ? 'https://meet.google.com/…' : 'Alamat / ruangan'} />
        </Field>
        <Field label="Notulen" required error={errors.content}>
          <RichTextEditor value={form.content} onChange={(v) => set('content', v)} resetKey={initKey} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <PrimaryButton type="submit" disabled={submitting}>{editing ? 'Simpan' : 'Tambah'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

// Dialog konfirmasi hapus (dipakai halaman detail account).
export function DeleteMeetingNoteDialog({ note, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={Boolean(note)}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Hapus catatan meeting?"
      message={`Catatan "${note?.title || ''}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
    />
  )
}
