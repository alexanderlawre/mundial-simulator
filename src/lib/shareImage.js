import html2canvas from 'html2canvas'

// Isolates all DOM-to-image capture and share/download mechanics for the
// league share cards, parallel to how tournamentEngine.js/matchEngine.js
// isolate other cross-cutting logic from components.

// Awaits every <img> inside `node` finishing decode before capture --
// freshly-mounted off-screen badges (rendered just before this runs) won't
// have loaded yet on the very first capture attempt otherwise. Any image
// that fails to decode (broken/blocked) resolves anyway rather than
// rejecting, so one bad badge never blocks the whole capture.
export async function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      if (typeof img.decode === 'function') return img.decode().catch(() => {})
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })
    })
  )
}

// Awaits the page's web fonts finishing load before capture. Without this,
// html2canvas can paint a card while the display font (Poppins/Inter) is
// still swapping in from its fallback, baking a ghosted/doubled-looking
// glyph outline into the exported JPEG. `document.fonts.ready` resolves as
// soon as all currently-requested fonts have settled -- guarded with a
// short timeout since it can theoretically hang on some engines, and a
// missing/undefined `document.fonts` (very old browsers) is skipped
// entirely rather than throwing.
async function waitForFonts() {
  if (!document.fonts || !document.fonts.ready) return
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])
}

// scale: 3 (not 2) -- extra resolution headroom for a crisp result even
// after share destinations (iMessage, WhatsApp, Instagram, etc.) apply
// their own re-compression on top of ours. Exported directly as a
// structured JPEG (quality 0.95) rather than PNG -- these cards are always
// an opaque, flat "poster" (no transparency needed), and JPEG is the
// universally expected format for downloading/sharing a photo-like image.
// `backgroundColor` only shows through the handful of anti-aliased pixels
// just outside the card's own rounded corners -- defaults to the original
// beige "paper" tone (still used by WorldCupShareCard's flat beige card),
// but callers whose card is a full-bleed color (like the league table
// card's brand gradient) can pass a matching color so those corner pixels
// blend seamlessly instead of showing a mismatched beige ring.
export async function captureNode(node, backgroundColor = '#F4EFE6') {
  await Promise.all([waitForImages(node), waitForFonts()])
  const canvas = await html2canvas(node, { useCORS: true, backgroundColor, scale: 3 })
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95))
}

// navigator.share({files}) on mobile (where supported), a blob: URL +
// synthetic <a download> click as the desktop fallback. This shares/
// downloads the user's own predicted-table content rendered locally -- not
// anything fetched from an external/untrusted source.
export async function shareOrDownload(blob, filename) {
  if (!blob) return
  const file = new File([blob], filename, { type: 'image/jpeg' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch {
      // fall through to download on cancel/failure
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
