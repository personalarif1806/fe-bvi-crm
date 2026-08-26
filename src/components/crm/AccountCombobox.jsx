import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, Search, X } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { CUSTOMER_TYPE_META } from '../../data/crmData.js'

// Pemilih account dengan pencarian: user mengetik kata kunci, daftar account
// yang cocok diambil dari server (`GET /api/crm/accounts?search=`) — bukan
// memfilter 100 baris pertama di klien. Daftar account bisa ribuan; <select>
// biasa hanya memuat halaman pertama, jadi account yang tidak masuk 100 nama
// pertama secara abjad mustahil dipilih.
//
// Nilai yang dipertukarkan adalah OBJEK account (bukan sekadar id) karena
// pemanggil butuh `customerType` untuk aturan turunan (mis. BR-03 klien akhir),
// sementara hasil pencarian server tidak selalu memuat account terpilih.

const PAGE_SIZE = 20

export default function AccountCombobox({
  value,
  onChange,
  placeholder = 'Ketik nama account…',
  emptyLabel = '— Tanpa Account —',
  excludeId,
  invalid = false,
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hi, setHi] = useState(0)
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const reqRef = useRef(0)

  // Ambil hasil saat dropdown terbuka; ketikan didebounce 250ms, race-guard
  // memastikan respons usang tidak menimpa hasil terbaru (pola useServerList).
  useEffect(() => {
    if (!open) return undefined
    const keyword = q.trim()
    const id = ++reqRef.current
    setLoading(true)
    const t = setTimeout(() => {
      crmApi.listAccounts({ search: keyword, pageSize: PAGE_SIZE, sortBy: 'name' })
        .then((r) => {
          if (id !== reqRef.current) return
          setItems(r.data || [])
          setTotal(r.pagination?.total ?? (r.data || []).length)
        })
        .catch(() => { if (id === reqRef.current) { setItems([]); setTotal(0) } })
        .finally(() => { if (id === reqRef.current) setLoading(false) })
    }, keyword ? 250 : 0)
    return () => clearTimeout(t)
  }, [open, q])

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const options = useMemo(() => {
    const list = items.filter((a) => a.id !== excludeId)
    return emptyLabel && !q.trim() ? [null, ...list] : list
  }, [items, excludeId, emptyLabel, q])

  useEffect(() => { setHi(0) }, [items])
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-hi="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [hi, open, items])

  function bukaMenu() { if (!open) { setOpen(true); setQ('') } }

  function pilih(acc) {
    onChange(acc || null)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { bukaMenu(); return }
      if (options.length === 0) return
      setHi((i) => (e.key === 'ArrowDown' ? (i + 1) % options.length : (i - 1 + options.length) % options.length))
    } else if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      if (options.length > 0) pilih(options[hi])
    } else if (e.key === 'Escape') {
      if (!open) return
      e.preventDefault()
      setOpen(false)
      setQ('')
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const teks = open ? q : (value?.name ?? '')

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          className={`w-full rounded-xl border bg-white py-2 pl-9 pr-16 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            invalid
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
          }`}
          value={teks}
          placeholder={value ? value.name : placeholder}
          onChange={(e) => { setQ(e.target.value); if (!open) setOpen(true) }}
          onFocus={bukaMenu}
          onMouseDown={bukaMenu}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {loading && open && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {value && !open && (
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Kosongkan"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-float"
        >
          {options.length === 0 && !loading && (
            <p className="px-3 py-3 text-sm text-slate-500">
              {q.trim() ? <>Tidak ada account cocok dengan “{q.trim()}”.</> : 'Belum ada account.'}
            </p>
          )}
          {options.map((a, i) => {
            const meta = a ? CUSTOMER_TYPE_META[a.customerType] : null
            const terpilih = a ? a.id === value?.id : !value
            return (
              <button
                key={a?.id ?? '__kosong'}
                type="button"
                role="option"
                aria-selected={terpilih}
                data-hi={i === hi}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(a)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${i === hi ? 'bg-brand-50' : ''}`}
              >
                {a ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${terpilih ? 'font-semibold text-brand-700' : 'font-medium text-slate-800'}`}>{a.name}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {a.id}{[a.city, a.region].filter(Boolean).length > 0 && ` · ${[a.city, a.region].filter(Boolean).join(', ')}`}
                      </span>
                    </span>
                    {meta && <span className={`flex-none rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${meta.cls}`} title={meta.label}>{meta.short}</span>}
                  </>
                ) : (
                  <span className="text-sm text-slate-500">{emptyLabel}</span>
                )}
              </button>
            )
          })}
          {total > items.length && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
              Menampilkan {items.length} dari {total} account — ketik kata kunci untuk mempersempit.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
