// Formatter & konstanta bersama modul CRM (gaya mengikuti serviceCatalogData.js).

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatCurrency(n) {
  return idr.format(Number(n) || 0)
}

// Uang ringkas (mis. Rp 45,0 jt) untuk kartu/kolom sempit.
export function formatCompactCurrency(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (v >= 1_000) return `Rp ${(v / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  return formatCurrency(v)
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Input <input type="datetime-local"> butuh format "YYYY-MM-DDTHH:mm" waktu lokal.
export function toLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Separator ribuan untuk input uang (mis. 250000 → 250.000).
export function formatThousands(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('')
}

// ---- Lead ----
// Alur status ala Zoho: Baru → Dihubungi → Diproses → Terkualifikasi/Tidak Layak → Terkonversi.
export const LEAD_STATUS = ['NEW', 'CONTACTED', 'WORKING', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']
export const LEAD_STATUS_META = {
  NEW: { label: 'Baru', cls: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500' },
  CONTACTED: { label: 'Dihubungi', cls: 'bg-cyan-100 text-cyan-700', bar: 'bg-cyan-500' },
  WORKING: { label: 'Diproses', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  QUALIFIED: { label: 'Terkualifikasi', cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  UNQUALIFIED: { label: 'Tidak Layak', cls: 'bg-slate-100 text-slate-500', bar: 'bg-slate-400' },
  CONVERTED: { label: 'Terkonversi', cls: 'bg-brand-100 text-brand-700', bar: 'bg-brand-500' },
}
export const LEAD_SOURCES = ['Web Form', 'Referral', 'Campaign', 'Partner', 'API', 'Import', 'Manual']

// Rating (Hot/Warm/Cold) — otomatis dari skor, bisa di-override manual.
export const RATINGS = ['HOT', 'WARM', 'COLD']
export const RATING_META = {
  HOT: { label: 'Hot', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  WARM: { label: 'Warm', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  COLD: { label: 'Cold', cls: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
}

// Warna badge skor berdasarkan rentang (selaras ambang rating default backend: 70/40).
export function scoreTone(score) {
  if (score >= 70) return 'bg-rose-100 text-rose-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

// ---- Dimensi scoring lead (model 7 blok — lihat backend crm/scoring.js) ----
// Urutan array = urutan tampil di form & halaman pengaturan skor.
export const CONTACT_LEVELS = [
  ['DECISION_MAKER', 'Decision-maker (Manajer/QHSE/Project Leader/Direktur)'],
  ['STAFF', 'Staf teknis / PIC'],
  ['UNKNOWN', 'Tidak jelas / kosong'],
]
export const LEAD_SEGMENTS = [
  ['KORPORASI', 'Korporasi'],
  ['PEMERINTAH', 'Pemerintah'],
  ['KONSULTAN', 'Konsultan'],
  ['LAB', 'Sesama lab'],
  ['KAMPUS', 'Kampus'],
  ['LAINNYA', 'Lainnya'],
]
export const CUSTOMER_STATUSES = [
  ['SUBSCRIPTION', 'Langganan tahunan aktif'],
  ['REPEAT', 'Repeat (<1 th)'],
  ['PAST', 'Pernah, >1 th lalu'],
  ['REFERRAL', 'Referral klien existing'],
  ['NEW', 'Baru'],
]
export const RFQ_STAGES = [
  ['RFQ', 'Minta RFQ / penawaran resmi'],
  ['SPECIFIC', 'Tanya harga / parameter spesifik'],
  ['GENERAL', 'Tanya harga umum'],
  ['NONE', 'Belum bicara harga'],
]

export const INDUSTRIES = [
  'Manufaktur', 'Kimia', 'Farmasi', 'Pangan', 'Tekstil', 'Energi', 'Pertambangan',
  'Konsultan Lingkungan', 'Pemerintahan', 'Kesehatan', 'Lainnya',
]

// ---- Deal ----
export const DEAL_STATUS_META = {
  OPEN: { label: 'Terbuka', cls: 'bg-sky-100 text-sky-700' },
  WON: { label: 'Menang', cls: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'Kalah', cls: 'bg-rose-100 text-rose-700' },
}

// ---- Alasan kalah baku (PRD LostReason, US-DL-02) ----
export const LOST_REASONS = [
  'PRICE', 'TURNAROUND_TIME', 'SCOPE_NOT_ACCREDITED', 'INCUMBENT_COMPETITOR',
  'DISTANCE_LOGISTICS', 'PROJECT_CANCELLED', 'VENDOR_REQUIREMENT', 'NO_RESPONSE', 'OTHER',
]
export const LOST_REASON_LABEL = {
  PRICE: 'Harga', TURNAROUND_TIME: 'Waktu Pengerjaan', SCOPE_NOT_ACCREDITED: 'Di Luar Ruang Lingkup Akreditasi',
  INCUMBENT_COMPETITOR: 'Kompetitor Eksisting', DISTANCE_LOGISTICS: 'Jarak / Logistik',
  PROJECT_CANCELLED: 'Proyek Dibatalkan', VENDOR_REQUIREMENT: 'Syarat Vendor', NO_RESPONSE: 'Tidak Ada Respons', OTHER: 'Lainnya',
}

// ---- Feasibility Gate (PRD FeasibilityStatus, US-FG-01) ----
export const FEASIBILITY_META = {
  NOT_REQUIRED: { label: 'Tidak Diperlukan', cls: 'bg-slate-100 text-slate-500' },
  PENDING: { label: 'Menunggu Kaji Ulang', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  APPROVED_WITH_SUBCONTRACT: { label: 'Disetujui (Subkontrak)', cls: 'bg-sky-100 text-sky-700' },
  REJECTED: { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' },
}

// ============================================================================
// Lini layanan (service line) — Bumi Ventila menjual pengujian lab, pelatihan,
// dan konsultansi. Lini diturunkan dari `type` pipeline (lihat backend
// crm/pipeline.constants.js), tidak disimpan terpisah di Deal.
// ============================================================================
export const SERVICE_LINES = ['LAB', 'TRAINING', 'CONSULTING']
export const SERVICE_LINE_META = {
  LAB: { label: 'Laboratorium', short: 'Lab', cls: 'bg-brand-100 text-brand-700', bar: 'bg-brand-500', desc: 'Pengujian & sampling terakreditasi ISO/IEC 17025' },
  TRAINING: { label: 'Training', short: 'Training', cls: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500', desc: 'Pelatihan publik & in-house, sertifikasi kompetensi' },
  CONSULTING: { label: 'Konsultansi', short: 'Konsultan', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', desc: 'Dokumen lingkungan & pendampingan sistem manajemen' },
  OTHER: { label: 'Umum', short: 'Umum', cls: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400', desc: 'Pipeline lintas lini / belum ditentukan' },
}
// Fallback aman: pipeline tanpa lini (type GENERIC) tampil sebagai "Umum".
export function serviceLineMeta(line) {
  return SERVICE_LINE_META[line] || SERVICE_LINE_META.OTHER
}

export const PIPELINE_TYPE_META = {
  GENERIC: { label: 'Umum', serviceLine: null },
  COMPLIANCE_ACQUISITION: { label: 'Akuisisi Kepatuhan', serviceLine: 'LAB' },
  COMPLIANCE_RECURRING: { label: 'Rebooking Kepatuhan', serviceLine: 'LAB' },
  PROJECT: { label: 'Proyek', serviceLine: 'LAB' },
  SUBCONTRACT: { label: 'Subkontrak', serviceLine: 'LAB' },
  TRAINING: { label: 'Akuisisi Training', serviceLine: 'TRAINING' },
  TRAINING_RECURRING: { label: 'Refresher & Re-sertifikasi', serviceLine: 'TRAINING' },
  CONSULTING: { label: 'Akuisisi Konsultansi', serviceLine: 'CONSULTING' },
}

// ---- Label checklist kelayakan per lini -------------------------------------
// Model datanya sama (CrmFeasibilityReview) karena pertanyaannya sejenis —
// "sanggupkah kita mengerjakan ini?" — hanya istilahnya berbeda per lini.
// LAB memakai kata-kata asli (ISO 17025 klausul 7.1); jangan diubah.
const LAB_FEASIBILITY_LABELS = {
  title: 'Feasibility Gate',
  caption: '(kaji ulang teknis — ISO 17025 klausul 7.1)',
  modalSubtitle: 'Kaji ulang kemampuan & sumber daya sebelum penawaran (klausul 7.1).',
  scopeAccredited: 'Ruang lingkup terakreditasi',
  capacityAvailable: 'Kapasitas tersedia',
  samplerAvailable: 'Sampler tersedia',
  requiresSubcontract: 'Butuh subkontrak',
  subcontractName: 'Nama Lab Subkontrak',
  subcontractPlaceholder: 'Lab Mitra Terakreditasi',
  subcontractLabel: 'Lab subkontrak',
  consent: 'Pelanggan menyetujui subkontrak (wajib — klausul 6.6 / BR-12)',
  outOfScope: 'Parameter di luar ruang lingkup',
  outOfScopeField: 'Parameter di Luar Ruang Lingkup',
  outOfScopePlaceholder: 'Dioksin;Merkuri',
  gateHint: 'Gate: butuh Feasibility APPROVED untuk lanjut ke Penawaran',
}

export const FEASIBILITY_LABELS = {
  LAB: LAB_FEASIBILITY_LABELS,
  TRAINING: {
    title: 'Kaji Ulang Kesiapan',
    caption: '(kompetensi trainer & ketersediaan jadwal)',
    modalSubtitle: 'Pastikan trainer berkompeten dan jadwal tersedia sebelum proposal dikirim.',
    scopeAccredited: 'Materi sesuai kompetensi/lisensi trainer',
    capacityAvailable: 'Kuota & kelas tersedia',
    samplerAvailable: 'Trainer tersedia pada jadwal diminta',
    requiresSubcontract: 'Butuh trainer associate eksternal',
    subcontractName: 'Nama Trainer / Lembaga Associate',
    subcontractPlaceholder: 'mis. Lembaga Sertifikasi Mitra',
    subcontractLabel: 'Associate',
    consent: 'Pelanggan menyetujui penggunaan trainer associate',
    outOfScope: 'Topik di luar kompetensi internal',
    outOfScopeField: 'Topik di Luar Kompetensi Internal',
    outOfScopePlaceholder: 'Kalibrasi lanjutan;Audit internal',
    gateHint: 'Gate: butuh kaji ulang kesiapan DISETUJUI untuk lanjut ke Proposal',
  },
  CONSULTING: {
    title: 'Kaji Ulang Kesiapan',
    caption: '(kualifikasi konsultan & beban tim)',
    modalSubtitle: 'Pastikan konsultan dengan kualifikasi yang diminta tersedia sebelum proposal dikirim.',
    scopeAccredited: 'Lingkup sesuai kualifikasi/sertifikasi tim',
    capacityAvailable: 'Kapasitas man-day tersedia',
    samplerAvailable: 'Konsultan penanggung jawab tersedia',
    requiresSubcontract: 'Butuh tenaga ahli eksternal',
    subcontractName: 'Nama Tenaga Ahli / Mitra',
    subcontractPlaceholder: 'mis. Ahli AMDAL bersertifikat',
    subcontractLabel: 'Tenaga ahli eksternal',
    consent: 'Pelanggan menyetujui penggunaan tenaga ahli eksternal',
    outOfScope: 'Lingkup di luar kemampuan internal',
    outOfScopeField: 'Lingkup di Luar Kemampuan Internal',
    outOfScopePlaceholder: 'Pemodelan dispersi;Kajian risiko kuantitatif',
    gateHint: 'Gate: butuh kaji ulang kesiapan DISETUJUI untuk lanjut ke Proposal',
  },
}

export function feasibilityLabels(serviceLine) {
  return FEASIBILITY_LABELS[serviceLine] || LAB_FEASIBILITY_LABELS
}

// ---- Quote & Order (M3) ----
export const QUOTE_STATUS_META = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  PENDING_APPROVAL: { label: 'Menunggu Approval', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Disetujui', cls: 'bg-sky-100 text-sky-700' },
  SENT: { label: 'Terkirim', cls: 'bg-violet-100 text-violet-700' },
  ACCEPTED: { label: 'Diterima', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' },
  EXPIRED: { label: 'Kedaluwarsa', cls: 'bg-slate-100 text-slate-500' },
}
export const ORDER_STATUSES = ['CONFIRMED', 'SCHEDULED', 'SAMPLING_DONE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
export const ORDER_STATUS_META = {
  CONFIRMED: { label: 'Dikonfirmasi', cls: 'bg-sky-100 text-sky-700' },
  SCHEDULED: { label: 'Terjadwal', cls: 'bg-violet-100 text-violet-700' },
  SAMPLING_DONE: { label: 'Sampling Selesai', cls: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'Dikerjakan', cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-rose-100 text-rose-700' },
}
export const DISCOUNT_APPROVAL_THRESHOLD = 15

// ---- Activity ----
export const ACTIVITY_TYPES = ['TASK', 'CALL', 'MEETING', 'EMAIL']
export const ACTIVITY_TYPE_META = {
  TASK: { label: 'Tugas', cls: 'bg-violet-100 text-violet-700' },
  CALL: { label: 'Panggilan', cls: 'bg-sky-100 text-sky-700' },
  MEETING: { label: 'Rapat', cls: 'bg-amber-100 text-amber-700' },
  EMAIL: { label: 'Email', cls: 'bg-emerald-100 text-emerald-700' },
}

export const TIERS = ['A', 'B', 'C']

// ---- Segmentasi pelanggan (PRD §2.2) ----
export const CUSTOMER_TYPES = ['COMPLIANCE_OWNER', 'INTERMEDIARY', 'SUBCONTRACT_LAB', 'GOVERNMENT', 'AD_HOC']
export const CUSTOMER_TYPE_META = {
  COMPLIANCE_OWNER: { label: 'A · Compliance Owner', short: 'A', cls: 'bg-brand-100 text-brand-700', desc: 'Industri pemilik izin lingkungan' },
  INTERMEDIARY: { label: 'B · Intermediary', short: 'B', cls: 'bg-violet-100 text-violet-700', desc: 'Konsultan / AMDAL / EPC' },
  SUBCONTRACT_LAB: { label: 'C · Subcontracting Lab', short: 'C', cls: 'bg-amber-100 text-amber-700', desc: 'Lab lain yang mensubkontrakkan' },
  GOVERNMENT: { label: 'D · Pemerintah', short: 'D', cls: 'bg-emerald-100 text-emerald-700', desc: 'Instansi pemerintah' },
  AD_HOC: { label: 'E · Ad-hoc', short: 'E', cls: 'bg-slate-100 text-slate-600', desc: 'Walk-in / riset / tender' },
}

// ---- Matriks (jenis contoh uji, PRD SampleMatrix) ----
export const MATRICES = [
  'WASTEWATER', 'STACK_EMISSION', 'AMBIENT_AIR', 'WORKPLACE_AIR', 'SURFACE_WATER',
  'GROUNDWATER', 'CLEAN_WATER', 'SOIL', 'SLUDGE_WASTE', 'NOISE', 'VIBRATION',
  'ODOR', 'ILLUMINATION', 'HEAT_STRESS', 'OTHER',
]
export const MATRIX_LABEL = {
  WASTEWATER: 'Air Limbah', STACK_EMISSION: 'Emisi Cerobong', AMBIENT_AIR: 'Udara Ambien',
  WORKPLACE_AIR: 'Udara Ruang Kerja', SURFACE_WATER: 'Air Permukaan', GROUNDWATER: 'Air Tanah',
  CLEAN_WATER: 'Air Bersih', SOIL: 'Tanah', SLUDGE_WASTE: 'Sludge / Limbah', NOISE: 'Kebisingan',
  VIBRATION: 'Getaran', ODOR: 'Kebauan', ILLUMINATION: 'Pencahayaan', HEAT_STRESS: 'Iklim Kerja', OTHER: 'Lainnya',
}

// ---- Frekuensi (PRD Frequency) ----
export const FREQUENCIES = ['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'ONE_TIME', 'CONTINUOUS', 'CUSTOM']
export const FREQUENCY_LABEL = {
  MONTHLY: 'Bulanan', BIMONTHLY: 'Dua Bulanan', QUARTERLY: 'Triwulan', SEMIANNUAL: 'Semesteran',
  ANNUAL: 'Tahunan', ONE_TIME: 'Sekali', CONTINUOUS: 'Kontinu', CUSTOM: 'Kustom',
}

// ---- Status layanan titik (PRD ServedBy / ServedVia) ----
export const SERVED_BY = ['BUMI_VENTILA', 'COMPETITOR', 'NOT_TESTED', 'UNKNOWN']
export const SERVED_BY_META = {
  BUMI_VENTILA: { label: 'Bumi Ventila', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  COMPETITOR: { label: 'Kompetitor', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  NOT_TESTED: { label: 'Belum Diuji', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  UNKNOWN: { label: 'Tidak Diketahui', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}
export const SERVED_VIA = ['DIRECT', 'CONSULTANT', 'SUBCONTRACT']
export const SERVED_VIA_LABEL = { DIRECT: 'Langsung', CONSULTANT: 'Via Konsultan', SUBCONTRACT: 'Subkontrak' }

// Jumlah hari sampai jatuh tempo → nada warna (dekat = merah).
export function dueTone(nextDueDate) {
  if (!nextDueDate) return 'bg-slate-100 text-slate-500'
  const days = Math.ceil((new Date(nextDueDate) - new Date()) / 86400000)
  if (days < 0) return 'bg-rose-100 text-rose-700'
  if (days <= 30) return 'bg-amber-100 text-amber-700'
  if (days <= 90) return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-600'
}

export function daysUntil(date) {
  if (!date) return null
  return Math.ceil((new Date(date) - new Date()) / 86400000)
}
