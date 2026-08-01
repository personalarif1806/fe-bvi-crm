import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth, homePathFor, canAccessCrm } from '../context/AuthContext.jsx'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function Login() {
  const { loginWithCredentials, logout } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Verifikasi kredensial ke database (backend). Tidak ada jalur demo/offline.
    const res = await loginWithCredentials(email.trim().toLowerCase(), password)
    setLoading(false)
    if (res.ok) {
      // CRM khusus peran internal — Customer ditolak walau kredensial benar.
      if (!canAccessCrm(res.user?.role)) {
        logout()
        setError('Akun ini bukan pengguna internal. CRM hanya untuk tim internal.')
        return
      }
      navigate(homePathFor(res.user?.role), { replace: true })
      return
    }
    setError(res.error)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-md">
          <motion.div variants={item} className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-card sm:p-10">
            {/* Logo */}
            <motion.div variants={item} className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-brand-600 to-steel-500 shadow-lg shadow-brand-600/30">
                <span className="text-lg font-extrabold text-white">B</span>
              </div>
              <span className="text-lg font-bold leading-tight tracking-tight text-slate-900">Bumi Ventila — CRM</span>
            </motion.div>

            <motion.h1 variants={item} className="text-2xl font-bold tracking-tight text-slate-900">Masuk CRM</motion.h1>
            <motion.p variants={item} className="mt-2 text-sm text-slate-500">Portal internal tim komersial.</motion.p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Email */}
              <motion.div variants={item}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    required
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={item}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </motion.div>

              {/* Remember */}
              <motion.div variants={item} className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  Ingat saya
                </label>
                <a href="#" className="text-sm font-medium text-brand-600 transition hover:text-brand-700">Lupa password?</a>
              </motion.div>

              {/* Submit */}
              <motion.button
                variants={item}
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-70"
              >
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>) : (<>Masuk <ArrowRight className="h-4 w-4" /></>)}
              </motion.button>
            </form>
          </motion.div>

          <motion.p variants={item} className="mt-6 text-center text-xs text-slate-400">
            Hanya untuk pengguna internal Bumi Ventila.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
