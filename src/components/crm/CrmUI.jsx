import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ---- Wrapper halaman: fade-in + max width konsisten dengan halaman lain ----
export function CrmPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-7xl space-y-6"
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

// ---- Kartu ringkasan (grid) ----
// Kelas grid statis (Tailwind JIT tidak mengenali kelas dinamis).
const GRID_COLS = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

export function SummaryCards({ cards }) {
  const cols = GRID_COLS[Math.min(Math.max(cards.length, 2), 4)] || 'lg:grid-cols-4'
  return (
    <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${cols}`}>
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft"
          >
            <div className={`inline-flex rounded-xl p-2.5 ${c.bg || 'bg-brand-50'}`}>
              {Icon && <Icon className={`h-5 w-5 ${c.accent || 'text-brand-600'}`} />}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{c.value}</p>
            {c.hint && <p className="mt-0.5 text-xs text-slate-400">{c.hint}</p>}
          </motion.div>
        )
      })}
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      <span>{message}</span>
    </div>
  )
}

export function Badge({ meta, children, className = '' }) {
  const cls = meta?.cls || className || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {meta?.label || children}
    </span>
  )
}

// ---- Paginasi (identik gaya dengan ServiceCatalog) ----
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, Math.max(page + 2, 5))
  for (let p = start; p <= end; p += 1) pages.push(p)
  const btn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition'
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={`${btn} border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40`} aria-label="Sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`${btn} ${p === page ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={`${btn} border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40`} aria-label="Berikutnya">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ---- Footer tabel: info jumlah + selektor pageSize + paginasi ----
export function TableFooter({ pagination, shownCount, onPage, onPageSize, noun = 'data' }) {
  const { page, pageSize, total, totalPages } = pagination
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = from === 0 ? 0 : from + shownCount - 1
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
        <p className="text-xs text-slate-400">Menampilkan {from}–{to} dari {total} {noun}</p>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Tampilkan</span>
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>per halaman</span>
        </label>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={onPage} />
    </div>
  )
}

export function LoadingBlock({ label = 'Memuat data…' }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-slate-400">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
        {Icon && <Icon className="h-7 w-7 text-brand-600" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---- Tombol ----
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button {...props} className={`inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60 ${className}`}>
      {children}
    </button>
  )
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button {...props} className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60 ${className}`}>
      {children}
    </button>
  )
}
