// Utilitas berkas hasil unduhan API (dataUrl base64) — dipakai daftar deal dan
// detail deal untuk membuka / mengunduh PDF penawaran.

// data:…;base64 → Blob. PDF dibuka lewat blob URL, bukan data URL: Chrome
// memblokir navigasi tab ke data: URL, jadi "Lihat" akan gagal diam-diam.
export function blobDariDataUrl(dataUrl) {
  const koma = dataUrl.indexOf(',')
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'))
  const bin = atob(dataUrl.slice(koma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// Blob URL sementara. Pemanggil yang membuka tab masih memegang URL ini setelah
// fungsi selesai, jadi pencabutannya ditunda — bukan seketika.
export function objectUrlSementara(dataUrl, umurMs = 60000) {
  const url = URL.createObjectURL(blobDariDataUrl(dataUrl))
  setTimeout(() => URL.revokeObjectURL(url), umurMs)
  return url
}

export function unduhUrl(url, fileName) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
}
