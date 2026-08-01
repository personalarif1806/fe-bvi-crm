import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitMerge, AlertTriangle, CheckCircle2, Users, Wallet } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { CrmPage, PageHeader, ErrorBanner, LoadingBlock, EmptyState, PrimaryButton } from '../../components/crm/CrmUI.jsx'

// Halaman kandidat duplikat berdasarkan NPWP identik + aksi Merge (record utama
// menyerap kontak/deal/aktivitas milik yang digabung). Memenuhi M1 spec.
export default function AccountDuplicates() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    crmApi.duplicates()
      .then((r) => setGroups(r.groups))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <CrmPage>
      <Link to="/crm/accounts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Accounts</Link>
      <PageHeader title="Deteksi Duplikat" subtitle="Account dengan NPWP identik — kandidat untuk digabung (golden record)." />
      <ErrorBanner message={error} />

      {loading ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memindai duplikat…" /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
          <EmptyState icon={CheckCircle2} title="Tidak ada duplikat" description="Semua account memiliki NPWP unik. Bagus!" />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => <DuplicateGroup key={g.npwp} group={g} onMerged={load} />)}
        </div>
      )}
    </CrmPage>
  )
}

function DuplicateGroup({ group, onMerged }) {
  const [primary, setPrimary] = useState(group.accounts[0].id)
  const [merging, setMerging] = useState(false)
  const [err, setErr] = useState('')

  async function merge() {
    setMerging(true); setErr('')
    const mergeCodes = group.accounts.map((a) => a.id).filter((id) => id !== primary)
    const res = await runAction(crmApi.merge({ primaryCode: primary, mergeCodes }))
    setMerging(false)
    if (res.ok) onMerged()
    else setErr(res.error || 'Gagal menggabung account.')
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">NPWP <span className="font-mono">{group.npwp}</span></p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{group.accounts.length} account</span>
      </div>
      <div className="divide-y divide-slate-100">
        {group.accounts.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
            <input type="radio" name={`primary-${group.npwp}`} checked={primary === a.id} onChange={() => setPrimary(a.id)} className="h-4 w-4 text-brand-600 focus:ring-brand-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{a.name} {primary === a.id && <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">UTAMA</span>}</p>
              <p className="font-mono text-[11px] text-slate-400">{a.id} · {a.region || 'tanpa region'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{a.contactCount ?? 0}</span>
              <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />{a.dealCount ?? 0}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-500">Kontak, deal & aktivitas dari account lain akan dipindahkan ke <strong>account utama</strong>; sisanya di-soft-delete.</p>
        <div className="flex items-center gap-3">
          {err && <span className="text-xs text-rose-600">{err}</span>}
          <PrimaryButton onClick={merge} disabled={merging}><GitMerge className="h-4 w-4" /> Gabungkan</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
