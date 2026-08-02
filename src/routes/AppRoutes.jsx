import { Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth, canAccessCrm } from '../context/AuthContext.jsx'
import CrmDashboard from '../pages/crm/CrmDashboard.jsx'
import Leads from '../pages/crm/Leads.jsx'
import LeadDetail from '../pages/crm/LeadDetail.jsx'
import Accounts from '../pages/crm/Accounts.jsx'
import AccountDetail from '../pages/crm/AccountDetail.jsx'
import AccountDuplicates from '../pages/crm/AccountDuplicates.jsx'
import Contacts from '../pages/crm/Contacts.jsx'
import Deals from '../pages/crm/Deals.jsx'
import DealDetail from '../pages/crm/DealDetail.jsx'
import Pipelines from '../pages/crm/Pipelines.jsx'
import Activities from '../pages/crm/Activities.jsx'
import SamplingPoints from '../pages/crm/SamplingPoints.jsx'
import ComplianceCalendar from '../pages/crm/ComplianceCalendar.jsx'
import PriceBooks from '../pages/crm/PriceBooks.jsx'
import QuoteBuilder from '../pages/crm/QuoteBuilder.jsx'
import ScoringSettings from '../pages/crm/ScoringSettings.jsx'
import Login from '../pages/Login.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// fe-crm khusus peran internal. Pengguna Customer ditolak (redirect ke /forbidden).
// Otorisasi sebenarnya tetap di backend (requireRole menolak Customer dengan 403).
function InternalOnly() {
  const { user } = useAuth()
  if (!canAccessCrm(user?.role)) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

function Forbidden() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Akses ditolak</h1>
      <p className="max-w-md text-sm text-slate-500">
        Aplikasi CRM ini khusus untuk pengguna internal. Akun Anda
        {user?.role ? ` (${user.role})` : ''} tidak memiliki akses. Silakan gunakan
        portal Order Management, atau masuk dengan akun internal.
      </p>
      <div className="flex gap-3">
        <Link to="/login" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500">
          Masuk akun lain
        </Link>
        <button
          onClick={logout}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Keluar
        </button>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  const location = useLocation()
  const { isAuthenticated, initializing, user } = useAuth()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            isAuthenticated && canAccessCrm(user?.role) ? (
              <Navigate to="/crm" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/forbidden" element={<Forbidden />} />

        {/* Semua rute CRM terproteksi + khusus peran internal */}
        <Route
          element={
            <ProtectedRoute>
              <InternalOnly />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminLayout />}>
            <Route path="/crm" element={<CrmDashboard />} />
            <Route path="/crm/leads" element={<Leads />} />
            <Route path="/crm/leads/:code" element={<LeadDetail />} />
            <Route path="/crm/accounts" element={<Accounts />} />
            <Route path="/crm/accounts/duplicates" element={<AccountDuplicates />} />
            <Route path="/crm/accounts/:code" element={<AccountDetail />} />
            <Route path="/crm/contacts" element={<Contacts />} />
            <Route path="/crm/deals" element={<Deals />} />
            <Route path="/crm/deals/:code" element={<DealDetail />} />
            <Route path="/crm/pipelines" element={<Pipelines />} />
            <Route path="/crm/quotes/:code" element={<QuoteBuilder />} />
            <Route path="/crm/price-books" element={<PriceBooks />} />
            {/* Sites & Import Titik dikelola sebagai modal di dalam Titik Sampling
                (SitesManagerModal & ImportPointsModal), mengikuti implementasi asli. */}
            <Route path="/crm/sampling-points" element={<SamplingPoints />} />
            <Route path="/crm/compliance" element={<ComplianceCalendar />} />
            <Route path="/crm/activities" element={<Activities />} />
            <Route path="/crm/settings/scoring" element={<ScoringSettings />} />
          </Route>
        </Route>

        {/* Default → dashboard CRM (guard menangani non-internal) */}
        <Route path="*" element={<Navigate to="/crm" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
