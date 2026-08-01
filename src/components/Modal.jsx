import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  // Tutup dengan ESC
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative z-10 my-4 w-full ${maxWidth} rounded-2xl border border-slate-200/70 bg-white shadow-float`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Hapus', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex gap-4">
        <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${danger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="pt-1.5 text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition ${
            danger
              ? 'bg-rose-600 shadow-rose-600/25 hover:bg-rose-700'
              : 'bg-brand-600 shadow-brand-600/25 hover:bg-brand-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ---- Form field helpers (dipakai lintas form) ----
export function Field({ label, required, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
