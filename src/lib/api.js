// Client API ringan untuk backend Bumi Ventila — versi fe-crm.
// Hanya memuat authApi, crmApi, dan usersApi.me (profil).
// Base URL dibaca dari VITE_API_URL (lihat .env).

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Key SSO bersama — sama persis dengan fe-order-management agar token berlaku
// di kedua FE.
const TOKEN_KEY = 'bv-auth-token'

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* abaikan */
    }
  },
  clear: () => tokenStore.set(null),
}

// Error dengan info status + payload dari server.
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0, null)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data?.message ||
      (res.status === 404
        ? `Endpoint tidak ditemukan (HTTP 404) — pastikan backend versi terbaru sudah dijalankan ulang.`
        : `Permintaan gagal (HTTP ${res.status}).`)
    throw new ApiError(message, res.status, data)
  }
  return data
}

export const authApi = {
  // POST /api/auth/login → { user, token }
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  // GET /api/auth/me → { user }  (butuh token)
  me: () => request('/api/auth/me', { auth: true }),
}

// Profil pengguna (dipakai untuk restore sesi / guard). CRM tidak mengelola
// akun; hanya membaca profil sendiri.
export const usersApi = {
  me: () => request('/api/auth/me', { auth: true }),
}

// Order Management (baca saja) — dipakai Deal Detail untuk menautkan Deal ke
// Order resmi lintas domain (memilih Order.code yang sudah ada). Pembuatan &
// pelepasan tautan tetap melalui crmApi.createDealOrder/linkDealOrder/unlinkDealOrder.
export const orderApi = {
  list: () => request('/api/orders', { auth: true }),
  get: (code) => request(`/api/orders/${encodeURIComponent(code)}`, { auth: true }),
}

// Buang param kosong agar URL bersih.
function qs(params) {
  const sp = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') sp.set(k, v)
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// CRM — modul komersial internal. Semua endpoint auth + peran internal.
export const crmApi = {
  dashboard: () => request('/api/crm/dashboard', { auth: true }),

  // Accounts
  listAccounts: (params) => request(`/api/crm/accounts${qs(params)}`, { auth: true }),
  getAccount: (code) => request(`/api/crm/accounts/${encodeURIComponent(code)}`, { auth: true }),
  createAccount: (body) => request('/api/crm/accounts', { method: 'POST', body, auth: true }),
  updateAccount: (code, body) => request(`/api/crm/accounts/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeAccount: (code) => request(`/api/crm/accounts/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),
  duplicates: () => request('/api/crm/accounts/duplicates', { auth: true }),
  merge: (body) => request('/api/crm/accounts/merge', { method: 'POST', body, auth: true }),

  // Central Customer (identitas, M1)
  resolveIdentity: (npwp) => request('/api/crm/central-customer/resolve', { method: 'POST', body: { npwp }, auth: true }),
  registerIdentity: (body) => request('/api/crm/central-customer/register', { method: 'POST', body, auth: true }),

  // Contacts
  listContacts: (params) => request(`/api/crm/contacts${qs(params)}`, { auth: true }),
  createContact: (body) => request('/api/crm/contacts', { method: 'POST', body, auth: true }),
  updateContact: (code, body) => request(`/api/crm/contacts/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeContact: (code) => request(`/api/crm/contacts/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),

  // Leads
  listLeads: (params) => request(`/api/crm/leads${qs(params)}`, { auth: true }),
  getLead: (code) => request(`/api/crm/leads/${encodeURIComponent(code)}`, { auth: true }),
  createLead: (body) => request('/api/crm/leads', { method: 'POST', body, auth: true }),
  updateLead: (code, body) => request(`/api/crm/leads/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeLead: (code) => request(`/api/crm/leads/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),
  convertLead: (code, body) => request(`/api/crm/leads/${encodeURIComponent(code)}/convert`, { method: 'POST', body, auth: true }),
  // Pratinjau skor saat form diisi (server yang menghitung — rumus tidak diduplikasi di FE).
  previewLeadScore: (body) => request('/api/crm/leads/score-preview', { method: 'POST', body, auth: true }),

  // Deals & pipeline
  listDeals: (params) => request(`/api/crm/deals${qs(params)}`, { auth: true }),
  board: (pipeline) => request(`/api/crm/deals/board${qs({ pipeline })}`, { auth: true }),
  getDeal: (code) => request(`/api/crm/deals/${encodeURIComponent(code)}`, { auth: true }),
  createDeal: (body) => request('/api/crm/deals', { method: 'POST', body, auth: true }),
  updateDeal: (code, body) => request(`/api/crm/deals/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  moveDealStage: (code, body) => request(`/api/crm/deals/${encodeURIComponent(code)}/stage`, { method: 'POST', body, auth: true }),
  removeDeal: (code) => request(`/api/crm/deals/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),
  // Feasibility Gate (M4)
  saveFeasibility: (code, body) => request(`/api/crm/deals/${encodeURIComponent(code)}/feasibility`, { method: 'PUT', body, auth: true }),
  decideFeasibility: (code, body) => request(`/api/crm/deals/${encodeURIComponent(code)}/feasibility/decide`, { method: 'POST', body, auth: true }),

  // Tautan Deal ↔ Order Management (penawaran resmi)
  createDealOrder: (code, body) => request(`/api/crm/deals/${encodeURIComponent(code)}/order`, { method: 'POST', body, auth: true }),
  linkDealOrder: (code, orderCode) => request(`/api/crm/deals/${encodeURIComponent(code)}/order`, { method: 'PUT', body: { orderCode }, auth: true }),
  unlinkDealOrder: (code) => request(`/api/crm/deals/${encodeURIComponent(code)}/order`, { method: 'DELETE', auth: true }),

  // ---- Katalog, Harga, Quote & Order (M3) ----
  catalog: () => request('/api/crm/catalog', { auth: true }),
  // Price books
  listPriceBooks: () => request('/api/crm/price-books', { auth: true }),
  getPriceBook: (code) => request(`/api/crm/price-books/${encodeURIComponent(code)}`, { auth: true }),
  createPriceBook: (body) => request('/api/crm/price-books', { method: 'POST', body, auth: true }),
  updatePriceBook: (code, body) => request(`/api/crm/price-books/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  setPriceBookEntries: (code, entries) => request(`/api/crm/price-books/${encodeURIComponent(code)}/entries`, { method: 'PUT', body: { entries }, auth: true }),
  removePriceBook: (code) => request(`/api/crm/price-books/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),
  // Quotes
  listQuotes: (dealCode) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quotes`, { auth: true }),
  createQuote: (dealCode) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quotes`, { method: 'POST', auth: true }),
  getQuote: (code) => request(`/api/crm/quotes/${encodeURIComponent(code)}`, { auth: true }),
  saveQuote: (code, body) => request(`/api/crm/quotes/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  approveQuote: (code) => request(`/api/crm/quotes/${encodeURIComponent(code)}/approve`, { method: 'POST', auth: true }),
  sendQuote: (code) => request(`/api/crm/quotes/${encodeURIComponent(code)}/send`, { method: 'POST', auth: true }),
  decideQuote: (code, body) => request(`/api/crm/quotes/${encodeURIComponent(code)}/decide`, { method: 'POST', body, auth: true }),
  reviseQuote: (code) => request(`/api/crm/quotes/${encodeURIComponent(code)}/revise`, { method: 'POST', auth: true }),
  convertQuote: (code, body) => request(`/api/crm/quotes/${encodeURIComponent(code)}/convert`, { method: 'POST', body, auth: true }),
  // Penawaran unggahan (PDF disusun di luar sistem) — daftarnya juga ikut di getDeal.
  listQuoteFiles: (dealCode) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quote-files`, { auth: true }),
  uploadQuoteFile: (dealCode, body) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quote-files`, { method: 'POST', body, auth: true }),
  getQuoteFile: (dealCode, id) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quote-files/${encodeURIComponent(id)}`, { auth: true }),
  removeQuoteFile: (dealCode, id) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/quote-files/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
  // Orders
  listOrders: (dealCode) => request(`/api/crm/deals/${encodeURIComponent(dealCode)}/orders`, { auth: true }),
  updateOrderStatus: (code, body) => request(`/api/crm/orders/${encodeURIComponent(code)}/status`, { method: 'POST', body, auth: true }),

  // ---- Pipeline (multi-lini: lab, training, konsultansi) ----
  pipelines: (params) => request(`/api/crm/pipelines${qs(params)}`, { auth: true }),
  pipelineTemplates: () => request('/api/crm/pipeline-templates', { auth: true }),
  createPipeline: (body) => request('/api/crm/pipelines', { method: 'POST', body, auth: true }),
  addPipelineStage: (code, body) => request(`/api/crm/pipelines/${encodeURIComponent(code)}/stages`, { method: 'POST', body, auth: true }),

  // Scoring config (Settings)
  scoringConfig: () => request('/api/crm/scoring-config', { auth: true }),
  saveScoringConfig: (body) => request('/api/crm/scoring-config', { method: 'PUT', body, auth: true }),
  recomputeScores: () => request('/api/crm/scoring-config/recompute', { method: 'POST', auth: true }),

  // Activities
  listActivities: (params) => request(`/api/crm/activities${qs(params)}`, { auth: true }),
  createActivity: (body) => request('/api/crm/activities', { method: 'POST', body, auth: true }),
  updateActivity: (code, body) => request(`/api/crm/activities/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeActivity: (code) => request(`/api/crm/activities/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),

  // Meeting notes (notulen rapat rich-text pada Account)
  createMeetingNote: (accountCode, body) => request(`/api/crm/accounts/${encodeURIComponent(accountCode)}/meeting-notes`, { method: 'POST', body, auth: true }),
  updateMeetingNote: (code, body) => request(`/api/crm/meeting-notes/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeMeetingNote: (code) => request(`/api/crm/meeting-notes/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),

  // ---- Registry Kepatuhan (M2/M5) ----
  // Sites
  listAllSites: () => request('/api/crm/sites', { auth: true }),
  listSitesForAccount: (accountCode) => request(`/api/crm/accounts/${encodeURIComponent(accountCode)}/sites`, { auth: true }),
  getSite: (code) => request(`/api/crm/sites/${encodeURIComponent(code)}`, { auth: true }),
  createSite: (accountCode, body) => request(`/api/crm/accounts/${encodeURIComponent(accountCode)}/sites`, { method: 'POST', body, auth: true }),
  updateSite: (code, body) => request(`/api/crm/sites/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removeSite: (code) => request(`/api/crm/sites/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),

  // Sampling points
  listPoints: (params) => request(`/api/crm/sampling-points${qs(params)}`, { auth: true }),
  createPoint: (body) => request('/api/crm/sampling-points', { method: 'POST', body, auth: true }),
  updatePoint: (code, body) => request(`/api/crm/sampling-points/${encodeURIComponent(code)}`, { method: 'PUT', body, auth: true }),
  removePoint: (code) => request(`/api/crm/sampling-points/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),
  changeServedBy: (code, body) => request(`/api/crm/sampling-points/${encodeURIComponent(code)}/served-by`, { method: 'POST', body, auth: true }),
  importPoints: (body) => request('/api/crm/sampling-points/import', { method: 'POST', body, auth: true }),

  // Obligations
  listObligations: (siteCode) => request(`/api/crm/sites/${encodeURIComponent(siteCode)}/obligations`, { auth: true }),
  createObligation: (siteCode, body) => request(`/api/crm/sites/${encodeURIComponent(siteCode)}/obligations`, { method: 'POST', body, auth: true }),
  removeObligation: (code) => request(`/api/crm/obligations/${encodeURIComponent(code)}`, { method: 'DELETE', auth: true }),

  // Compliance calendar / scheduler / dashboard
  complianceCalendar: (params) => request(`/api/crm/compliance/calendar${qs(params)}`, { auth: true }),
  complianceDashboard: () => request('/api/crm/compliance/dashboard', { auth: true }),
  generateRecurringDeals: () => request('/api/crm/compliance/generate-recurring', { method: 'POST', auth: true }),
}

// Portal klien Trinovate (konsep-portal-klien.md §9) — READ-ONLY dari sisi CRM.
// Token yang dipakai sama: `requireKonsultan` di backend menerima sesi User CRM
// (peran internal), bukan akun portal. Balasannya { ada: false } bila deal ini
// belum melahirkan proyek — itu keadaan normal, bukan galat.
export const portalApi = {
  dealPanel: (dealCode) => request(`/api/portal/crm/deal/${encodeURIComponent(dealCode)}`, { auth: true }),
}
