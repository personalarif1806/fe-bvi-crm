import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X, LogOut } from 'lucide-react'
import { navItems } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Visibilitas menu berdasarkan peran internal.
  const role = user?.role
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role))

  // Kelompokkan menu per seksi (mempertahankan urutan)
  const groups = []
  for (const item of visibleItems) {
    const last = groups[groups.length - 1]
    if (last && last.section === item.section) last.items.push(item)
    else groups.push({ section: item.section, items: [item] })
  }

  // Aplikasi CRM tidak memiliki badge pending-accounts (itu milik Order Management).
  const badgeFor = (item) => item.badge

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  const content = (
    <div className="flex h-full flex-col bg-white">
      {/* Logo / header */}
      <div className="flex h-16 flex-none items-center justify-between px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 via-brand-600 to-steel-500 shadow-lg shadow-brand-600/30">
            <span className="text-base font-extrabold text-white">B</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden leading-tight"
              >
                <p className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900">Bumi Ventila</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">Lab Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Desktop collapse */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:block ${collapsed ? 'mx-auto' : ''}`}
        >
          <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {groups.map((group, gi) => (
          <div key={group.section ?? gi} className="pt-2">
            {/* Label seksi / pemisah saat collapsed */}
            {!collapsed ? (
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {group.section}
              </p>
            ) : (
              gi > 0 && <div className="mx-auto my-2 h-px w-7 bg-slate-100" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const badge = badgeFor(item)
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === '/dashboard' || item.exact}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      } ${collapsed ? 'lg:justify-center' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-600/30"
                            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                          />
                        )}
                        <Icon className="relative z-10 h-5 w-5 flex-none" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="relative z-10 flex-1 whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Badge */}
                        {badge != null && (
                          collapsed ? (
                            <span className="absolute right-1.5 top-1.5 z-10 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                          ) : (
                            <span
                              className={`relative z-10 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {badge}
                            </span>
                          )
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-none border-t border-slate-100 p-3">
        <div className={`flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50 ${collapsed ? 'lg:justify-center' : ''}`}>
          <div className="relative flex-none">
            <Avatar name={user.name} className="h-9 w-9 text-sm ring-2 ring-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="flex-none rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 268 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="sticky top-0 hidden h-screen flex-none border-r border-slate-200/70 bg-white lg:block"
      >
        {content}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 z-50 h-screen w-[268px] border-r border-slate-200/70 bg-white lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
