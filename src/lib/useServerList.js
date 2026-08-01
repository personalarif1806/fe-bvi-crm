import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from './api.js'
import { useAuth } from '../context/AuthContext.jsx'

// Hook daftar server-side generik: search + filter + sort + pagination, dengan
// race-guard (abaikan hasil usang) & debounce untuk ketikan pencarian. Meniru
// pola ServiceCatalogContext agar konsisten, tapi reusable lintas objek CRM.
//
//   const list = useServerList(crmApi.listLeads, DEFAULT_QUERY)
//   list.items, list.pagination, list.summary, list.loading, list.error,
//   list.query, list.setQuery({ ... }), list.refresh()
export function useServerList(fetcher, defaultQuery, { debounceKey = 'search' } = {}) {
  const { isAuthenticated } = useAuth()
  const [query, setQueryState] = useState(defaultQuery)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 })
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reqRef = useRef(0)

  const fetchList = useCallback(async (q) => {
    const id = ++reqRef.current
    setLoading(true)
    setError('')
    try {
      const res = await fetcher(q)
      if (id !== reqRef.current) return
      setItems(res.data || [])
      if (res.pagination) setPagination(res.pagination)
      setSummary(res.summary || {})
    } catch (err) {
      if (id !== reqRef.current) return
      setItems([])
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data.')
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const t = setTimeout(() => fetchList(query), query[debounceKey] ? 300 : 0)
    return () => clearTimeout(t)
  }, [query, fetchList, isAuthenticated, debounceKey])

  // Perubahan filter/sort mereset ke halaman 1; ganti halaman saja tidak.
  const setQuery = useCallback((patch) => {
    setQueryState((prev) => {
      const isPageOnly = Object.keys(patch).length === 1 && 'page' in patch
      return { ...prev, ...patch, page: isPageOnly ? patch.page : 1 }
    })
  }, [])

  const refresh = useCallback(() => fetchList(query), [fetchList, query])

  return useMemo(
    () => ({ items, pagination, summary, loading, error, query, setQuery, refresh, setItems }),
    [items, pagination, summary, loading, error, query, setQuery, refresh],
  )
}

// Bungkus aksi mutasi → { ok, error?, fields? } (seragam dengan context lain).
export async function runAction(promise) {
  try {
    const data = await promise
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message, fields: err.data?.fields }
  }
}
