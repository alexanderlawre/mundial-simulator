import { useRef, useState } from 'react'
import WorldCupShareCard from './WorldCupShareCard'
import SambaButton from '../common/SambaButton'
import { captureNode, shareOrDownload } from '../../lib/shareImage'
import { useTranslation } from '../../lib/i18n'

// Mirrors LeagueShareModal.jsx's off-screen-render + capture/share pattern
// exactly: the card is rendered off-screen at a fixed pixel width (real
// layout/paint required for html2canvas) and previewed in-modal via a
// scaled-down copy of the same node.
export default function WorldCupShareModal({ title, hostLabel, champion, runnerUp, thirdPlace, fourthPlace, teamsByName, onClose }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const cardRef = useRef(null)

  async function handleExport() {
    if (!cardRef.current || busy) return
    setBusy(true)
    try {
      const blob = await captureNode(cardRef.current)
      await shareOrDownload(blob, `mundial-${(champion || 'champion').toLowerCase().replace(/\s+/g, '-')}-world-cup.png`)
    } finally {
      setBusy(false)
    }
  }

  const cardProps = { title, hostLabel, champion, runnerUp, thirdPlace, fourthPlace, teamsByName }

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
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-charcoal-900/10 dark:border-white/10 max-h-[60vh] overflow-y-auto flex justify-center bg-charcoal-900/5 dark:bg-black/20">
            <div className="origin-top" style={{ transform: 'scale(0.5)', width: 720, height: 'fit-content', margin: '-8px 0' }}>
              <WorldCupShareCard {...cardProps} />
            </div>
          </div>

          <div className="flex gap-2">
            <SambaButton variant="outline" className="flex-1" onClick={onClose}>
              {t('leagues.close', null, 'Close')}
            </SambaButton>
            <SambaButton variant="gold" className="flex-1" onClick={handleExport} disabled={busy}>
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
          <WorldCupShareCard {...cardProps} />
        </div>
      </div>
    </div>
  )
}
