import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Settings, CreditCard, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'

const menu = [
  { label: 'My Profile', icon: User },
  { label: 'Billing', icon: CreditCard },
  { label: 'Settings', icon: Settings },
]

export default function UserDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100"
      >
        <Avatar
          name={user.name}
          className="h-9 w-9 text-sm ring-2 ring-white"
        />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-slate-800">
            {user.name}
          </p>
          <p className="text-xs leading-tight text-slate-400">{user.role}</p>
        </div>
        <ChevronDown
          className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-float"
          >
            <div className="border-b border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
            <div className="p-1.5">
              {menu.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.label}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {m.label}
                  </button>
                )
              })}
            </div>
            <div className="border-t border-slate-100 p-1.5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
