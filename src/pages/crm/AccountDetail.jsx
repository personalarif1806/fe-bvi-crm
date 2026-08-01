import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Pencil, Plus, Users, Wallet, Star, History, Globe, Phone, MapPin, Hash } from 'lucide-react'
import { crmApi } from '../../lib/api.js'
import { runAction } from '../../lib/useServerList.js'
import { CrmPage, ErrorBanner, LoadingBlock, Badge, PrimaryButton, GhostButton } from '../../components/crm/CrmUI.jsx'
import { ActivityTimeline, ActivityFormModal } from '../../components/crm/ActivityTimeline.jsx'
import { MeetingNotesList, MeetingNoteFormModal, DeleteMeetingNoteDialog } from '../../components/crm/MeetingNotes.jsx'
import { AccountFormModal, accountLocation } from './Accounts.jsx'
import { ContactFormModal } from './Contacts.jsx'
import { DEAL_STATUS_META, formatCurrency, formatDateTime } from '../../data/crmData.js'

const TABS = [
  { key: 'overview', label: 'Ringkasan' },
  { key: 'contacts', label: 'Kontak' },
  { key: 'deals', label: 'Deal' },
  { key: 'activities', label: 'Aktivitas' },
  { key: 'meetings', label: 'Catatan Meeting' },
]

export default function AccountDetail() {
  const { code } = useParams()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [deletingNote, setDeletingNote] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    crmApi.getAccount(code)
      .then(setAccount)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [code])

  useEffect(() => { load() }, [load])

  async function toggleActivity(a) {
    await runAction(crmApi.updateActivity(a.id, { status: a.status === 'DONE' ? 'OPEN' : 'DONE' }))
    load()
  }

  function openNewNote() { setEditingNote(null); setMeetingOpen(true) }
  function openEditNote(n) { setEditingNote(n); setMeetingOpen(true) }
  async function confirmDeleteNote() {
    if (!deletingNote) return
    await runAction(crmApi.removeMeetingNote(deletingNote.id))
    setDeletingNote(null)
    load()
  }

  if (loading && !account) {
    return <CrmPage><div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft"><LoadingBlock label="Memuat account…" /></div></CrmPage>
  }
  if (!account) {
    return <CrmPage><ErrorBanner message={error || 'Account tidak ditemukan.'} /><Link to="/crm/accounts" className="text-sm text-brand-600">← Kembali ke Accounts</Link></CrmPage>
  }

  return (
    <CrmPage>
      <Link to="/crm/accounts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Accounts</Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50"><Building2 className="h-6 w-6 text-brand-600" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{account.name}</h1>
                {account.tier && <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{account.tier}</span>}
              </div>
              <p className="font-mono text-xs text-slate-400">{account.id}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {account.npwp && <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {account.npwp}</span>}
                {account.industry && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {account.industry}</span>}
                {accountLocation(account) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {accountLocation(account)}</span>}
                {account.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {account.phone}</span>}
                {account.website && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {account.website}</span>}
              </div>
            </div>
          </div>
          <GhostButton onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</GhostButton>
        </div>

        {/* Mini stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat icon={Users} label="Kontak" value={account.contacts.length} />
          <MiniStat icon={Wallet} label="Deal" value={account.deals.length} />
          <MiniStat icon={Wallet} label="Nilai Deal" value={formatCurrency(account.deals.reduce((s, d) => s + d.amount, 0))} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const count = t.key === 'contacts' ? account.contacts.length : t.key === 'deals' ? account.deals.length : t.key === 'activities' ? account.activities.length : t.key === 'meetings' ? (account.meetingNotes?.length || 0) : null
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}{count != null && <span className="ml-1.5 text-xs text-slate-400">{count}</span>}
              {tab === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-slate-800">Informasi</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Pemilik" value={account.ownerName} />
              <Row label="Dibuat oleh" value={account.createdBy} />
              <Row label="Dibuat" value={formatDateTime(account.createdAt)} />
              <Row label="Diperbarui" value={formatDateTime(account.updatedAt)} />
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><History className="h-4 w-4 text-slate-400" /> Jejak Audit</h3>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {account.audit.length === 0 ? <p className="text-sm text-slate-400">Belum ada jejak.</p> : account.audit.map((a) => (
                <div key={a.id} className="text-xs">
                  <p className="text-slate-600"><span className="font-semibold">{a.action}</span> · {a.detail}</p>
                  <p className="text-slate-400">{a.actor} — {formatDateTime(a.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Kontak Terkait</h3>
            <PrimaryButton onClick={() => setContactOpen(true)}><Plus className="h-4 w-4" /> Tambah Kontak</PrimaryButton>
          </div>
          {account.contacts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada kontak untuk account ini.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {account.contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">{c.firstName} {c.lastName}{c.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</p>
                    <p className="text-xs text-slate-500">{c.title || '—'} · {c.email || 'tanpa email'}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{c.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'deals' && (
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-5 py-3"><h3 className="text-sm font-semibold text-slate-800">Deal Terkait</h3></div>
          {account.deals.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada deal untuk account ini.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {account.deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link to={`/crm/deals/${d.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">{d.name}</Link>
                    <p className="text-xs text-slate-500">{d.stageName} · {formatCurrency(d.amount)}</p>
                  </div>
                  <Badge meta={DEAL_STATUS_META[d.status]} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'activities' && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Lini Masa Aktivitas</h3>
            <PrimaryButton onClick={() => setActivityOpen(true)}><Plus className="h-4 w-4" /> Aktivitas</PrimaryButton>
          </div>
          <ActivityTimeline activities={account.activities} onToggle={toggleActivity} />
        </div>
      )}

      {tab === 'meetings' && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Catatan Meeting</h3>
            <PrimaryButton onClick={openNewNote}><Plus className="h-4 w-4" /> Catatan Meeting</PrimaryButton>
          </div>
          <MeetingNotesList notes={account.meetingNotes || []} onEdit={openEditNote} onDelete={setDeletingNote} />
        </div>
      )}

      <AccountFormModal open={editOpen} onClose={() => setEditOpen(false)} editing={account} onSaved={load} />
      <ContactFormModal open={contactOpen} onClose={() => setContactOpen(false)} lockedAccount={{ id: account.id, name: account.name }} onSaved={load} />
      <ActivityFormModal open={activityOpen} onClose={() => setActivityOpen(false)} preset={{ relatedType: 'account', relatedCode: account.id, label: `Untuk ${account.name}` }} onSaved={load} />
      <MeetingNoteFormModal open={meetingOpen} onClose={() => setMeetingOpen(false)} accountCode={account.id} accountName={account.name} editing={editingNote} onSaved={load} />
      <DeleteMeetingNoteDialog note={deletingNote} onClose={() => setDeletingNote(null)} onConfirm={confirmDeleteNote} />
    </CrmPage>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}
