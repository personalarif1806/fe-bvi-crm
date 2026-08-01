// Avatar berbasis inisial (tanpa foto). Warna latar diturunkan dari nama
// agar konsisten per pengguna.
const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
]

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Avatar({ name, className = '', title }) {
  return (
    <span
      title={title ?? name}
      className={`inline-flex select-none items-center justify-center rounded-full font-semibold text-white ${colorFor(
        name,
      )} ${className}`}
    >
      {getInitials(name)}
    </span>
  )
}
