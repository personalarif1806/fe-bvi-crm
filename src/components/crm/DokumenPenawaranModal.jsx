import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, Printer, AlertTriangle } from 'lucide-react'
import Modal from '../Modal.jsx'
import { crmApi } from '../../lib/api.js'
import { blobDariDataUrl, unduhUrl } from '../../lib/berkas.js'
import { PrimaryButton, GhostButton } from './CrmUI.jsx'

// Pratinjau dokumen penawaran di dalam aplikasi — dipakai daftar deal (dan bisa
// dipakai ulang di detail deal) supaya klik pada kolom Penawaran membuka
// pratinjau lebih dulu, bukan langsung mengunduh berkasnya.
//
// Dua jenis dokumen, dua sumber isi:
//   { jenis: 'berkas', dealCode, fileId, fileName } → PDF unggahan (dataUrl base64)
//   { jenis: 'order',  orderCode }                  → HTML render backend
// Keduanya ditampilkan lewat blob URL: PDF dirender viewer bawaan browser, dan
// blob same-origin membuat iframe-nya masih bisa di-print() untuk Simpan PDF.

async function muatDokumen(dok) {
  if (dok.jenis === 'berkas') {
    const res = await crmApi.getQuoteFile(dok.dealCode, dok.fileId)
    return blobDariDataUrl(res.dataUrl)
  }
  const { html } = await crmApi.orderQuotationDocument(dok.orderCode)
  return new Blob([html], { type: 'text/html' })
}

export default function DokumenPenawaranModal({ open, dokumen, onClose }) {
  const [status, setStatus] = useState('memuat') // memuat | siap | galat
  const [url, setUrl] = useState('')
  const [galat, setGalat] = useState('')
  const frameRef = useRef(null)

  // Kunci efek pada identitas dokumen, bukan objeknya, supaya render ulang
  // induk tidak menarik berkasnya berulang kali.
  const kunci = !open || !dokumen ? '' : dokumen.jenis === 'berkas'
    ? `berkas:${dokumen.dealCode}:${dokumen.fileId}`
    : `order:${dokumen.orderCode}`

  useEffect(() => {
    if (!kunci) return undefined
    let batal = false
    let dibuat = ''
    setStatus('memuat')
    setGalat('')
    setUrl('')
    muatDokumen(dokumen)
      .then((blob) => {
        if (batal) return
        dibuat = URL.createObjectURL(blob)
        setUrl(dibuat)
        setStatus('siap')
      })
      .catch((err) => {
        if (batal) return
        setGalat(err?.message || 'Gagal memuat dokumen penawaran.')
        setStatus('galat')
      })
    // Blob dicabut saat modal ditutup / ganti dokumen — bukan lewat timer,
    // karena pratinjaunya bisa dibiarkan terbuka lama.
    return () => { batal = true; if (dibuat) URL.revokeObjectURL(dibuat) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci])

  const isPdf = dokumen?.jenis === 'berkas'

  function cetak() {
    const w = frameRef.current?.contentWindow
    if (!w) return
    w.focus()
    w.print()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dokumen?.judul || 'Dokumen Penawaran'}
      subtitle={dokumen?.subjudul}
      maxWidth="max-w-5xl"
    >
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {status === 'memuat' && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Memuat dokumen…</div>
        )}
        {status === 'galat' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
            <p className="text-sm text-slate-600">{galat}</p>
          </div>
        )}
        {status === 'siap' && (
          <iframe ref={frameRef} src={url} title="Pratinjau penawaran" className="h-full w-full bg-white" />
        )}
      </div>

      {/* Sebagian browser (Safari iOS) tidak merender PDF di dalam iframe —
          "Buka di tab baru" selalu tersedia sebagai jalan keluarnya. */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <GhostButton onClick={onClose}>Tutup</GhostButton>
        <GhostButton onClick={() => window.open(url, '_blank', 'noopener')} disabled={status !== 'siap'}>
          <ExternalLink className="h-4 w-4" /> Buka di tab baru
        </GhostButton>
        {isPdf ? (
          <PrimaryButton onClick={() => unduhUrl(url, dokumen.fileName)} disabled={status !== 'siap'}>
            <Download className="h-4 w-4" /> Unduh PDF
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={cetak} disabled={status !== 'siap'}>
            <Printer className="h-4 w-4" /> Cetak / Simpan PDF
          </PrimaryButton>
        )}
      </div>
    </Modal>
  )
}
