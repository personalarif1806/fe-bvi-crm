import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, Bell, MessageSquare } from 'lucide-react'
import { notifications } from '../data/mockData.js'
import UserDropdown from './UserDropdown.jsx'

function IconButton({ icon: Icon, dot, onClick, label }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={label}
      className="relative rounded-xl border border-slate-200/70 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
    >
      <Icon className="h-5 w-5" />
      {dot && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
      )}
    </motion.button>
  )
}

export default function Navbar({ onMenuClick }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const unread = notifications.filter((n) => n.unread).length

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 glass">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything…"
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-11 pr-16 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <IconButton
              icon={Bell}
              dot={unread > 0}
              label="Notifications"
              onClick={() => setNotifOpen((o) => !o)}
            />
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-float"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Notifications
                    </p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {unread} new
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                            n.unread ? 'bg-brand-600' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <p className="text-sm text-slate-700">{n.title}</p>
                          <p className="text-xs text-slate-400">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full border-t border-slate-100 p-3 text-center text-sm font-medium text-brand-600 transition hover:bg-slate-50">
                    View all notifications
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messages */}
          <div className="hidden sm:block">
            <IconButton icon={MessageSquare} dot label="Messages" />
          </div>

          <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

          {/* User */}
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}
