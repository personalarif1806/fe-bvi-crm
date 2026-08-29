// Cetak dokumen Penawaran milik Order Management dari dalam CRM. HTML-nya
// disusun BACKEND (backend/src/orders/quotation.doc.js), sama persis dengan
// yang dicetak dari aplikasi Order Management — di sini hanya membuka tab dan
// menulis hasilnya, lalu pengguna menekan "Cetak / Simpan PDF".
//
// Diambil lewat fetch ber-token, bukan dengan membuka URL endpoint langsung:
// rute dokumennya butuh login, dan tab baru tidak membawa Authorization.

import { crmApi } from './api.js'

function writeDoc(w, html) {
  w.document.open()
  w.document.write(html)
  w.document.close()
}

/**
 * Buka dokumen penawaran order di tab baru.
 * Tabnya HARUS dibuka sebelum await — dibuka setelahnya akan dianggap popup
 * dan diblokir browser.
 *
 * @returns pesan galat bila gagal, atau '' bila berhasil.
 */
export async function printOrderQuotation(orderCode) {
  const w = window.open('', '_blank', 'width=1000,height=800')
  if (!w) return 'Popup diblokir. Izinkan popup untuk membuka dokumen penawaran.'
  writeDoc(w, '<!doctype html><meta charset="utf-8"><title>Menyiapkan penawaran…</title>' +
    '<body style="font-family:Arial,sans-serif;color:#475569;padding:24px">Menyiapkan dokumen penawaran…</body>')
  try {
    const { html } = await crmApi.orderQuotationDocument(orderCode)
    writeDoc(w, html)
    return ''
  } catch (err) {
    w.close()
    return err?.message || 'Gagal menyiapkan dokumen penawaran.'
  }
}
