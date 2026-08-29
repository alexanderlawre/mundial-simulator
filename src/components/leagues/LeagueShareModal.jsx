import { useEffect, useRef, useState } from 'react'
import LeagueShareCard from './LeagueShareCard'
import SambaButton from '../common/SambaButton'
import { captureNode, shareOrDownload } from '../../lib/shareImage'
import { useTranslation } from '../../lib/i18n'

// The card itself is rendered off-screen (fixed pixel width, positioned
// far outside the viewport rather than display:none, since html2canvas
// needs real layout/paint to capture from) so captures are
// resolution-consistent regardless of the viewport size that triggered
// them. As soon as the modal mounts, that off-screen node is captured
// once into a real JPEG blob -- the *actual* exported file -- and shown
// as a genuine <img> in the preview (rather than a scaled-down live copy
// of the DOM). Real <img> elements support the browser's native drag
// gesture, so on desktop the user can literally drag the picture straight
// onto their Desktop/Finder to save it, in addition to the explicit
// Download button (still needed for the mobile share-sheet path, and as a
// fallback anywhere drag-out isn't available).
export default function LeagueShareModal({ league, order, clubs, nation, onClose }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(true)
  const [blob, setBlob] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const cardRef = useRef(null)
  const filename = `mundial-${league.key}-table.jpg`

  useEffect(() => {
    let cancelled = false
    let url = null
    async function generate() {
      if (!cardRef.current) return
      setBusy(true)
      const b = await captureNode(cardRef.current, league.colors.from)
      if (cancelled) return
      if (b) {
        url = URL.createObjectURL(b)
        setBlob(b)
        setImageUrl(url)
      }
      setBusy(false)
    }
    generate()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.key])

  async function handleDownload() {
    if (!blob) return
    await shareOrDownload(blob, filename)
  }

  // The 'DownloadURL' drag data format is what Gmail/Google Photos/etc use
  // to let a plain <img> be dragged straight out to the OS as a saved file
  // -- format is "mimeType:filename:url" and Chromium-based browsers turn
  // that into an actual file drop wherever the user releases it (Finder,
  // desktop, another app's drop zone). Safari/Firefox fall back to their
  // own default image-drag behavior, which still saves a file, just
  // without our chosen filename.
  function handleDragStart(e) {
    if (!imageUrl) return
    e.dataTransfer.setData('DownloadURL', `image/jpeg:${filename}:${imageUrl}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-night-card rounded-3xl shadow-depth-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900 dark:text-sand">{t('leagues.shareModalTitle')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-900/5 dark:hover:bg-white/10"
              aria-label={t('leagues.close', null, 'Close')}
            >
              ✕
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-charcoal-900/10 dark:border-white/10 max-h-[60vh] overflow-y-auto flex justify-center items-center p-3 bg-charcoal-900/5 dark:bg-black/20">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={t('leagues.shareModalTitle')}
                draggable="true"
                onDragStart={handleDragStart}
                className="max-w-full h-auto rounded-xl shadow-depth cursor-grab active:cursor-grabbing select-none"
              />
            ) : (
              <p className="py-16 text-sm text-charcoal-600 dark:text-charcoal-300">{t('leagues.loading')}</p>
            )}
          </div>

          {imageUrl && (
            <p className="text-xs text-center text-charcoal-600 dark:text-charcoal-300">
              {t('leagues.shareDragHint')}
            </p>
          )}

          <div className="flex gap-2">
            <SambaButton variant="outline" className="flex-1" onClick={onClose}>
              {t('leagues.close', null, 'Close')}
            </SambaButton>
            <SambaButton variant="gold" className="flex-1" onClick={handleDownload} disabled={busy || !blob}>
              {t('leagues.downloadImage')}
            </SambaButton>
          </div>
        </div>
      </div>

      {/* Off-screen full-resolution render used for the actual capture --
          kept far outside the viewport (not display:none) so html2canvas
          has real, painted layout to read from. */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div ref={cardRef}>
          <LeagueShareCard league={league} nation={nation} clubs={clubs} order={order} />
        </div>
      </div>
    </div>
  )
}
