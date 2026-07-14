import { useState } from 'react'

const SIZES = {
  xs: 'w-6 h-6 text-[8px]',
  sm: 'w-9 h-9 text-[11px]',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase()
}

// Club crest. Real crests render "bare" -- no filled/bordered frame box
// around them, just a drop-shadow for legibility against any background --
// since the source images are already self-contained badge artwork and a
// white card behind them just adds visual clutter/redundant chrome. Only
// the monogram (initials) fallback -- used when a club has no badgeUrl or
// its image fails to load -- keeps a solid colored circle background,
// since raw initials need *some* backing to stay legible and on-brand.
// crossOrigin="anonymous" is required for a clean html2canvas capture
// later even though the badge hosts already send open CORS headers.
export default function ClubBadge({ club, size = 'md', accent = '#12805C', className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!club) return null
  const sizeClass = SIZES[size] || SIZES.md
  const showImage = club.badgeUrl && !failed

  if (showImage) {
    return (
      <img
        src={club.badgeUrl}
        alt={club.name}
        crossOrigin="anonymous"
        className={`object-contain shrink-0 drop-shadow-md ${sizeClass} ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shadow-depth shrink-0 font-display font-bold text-white ${sizeClass} ${className}`}
      style={{ backgroundColor: accent }}
      title={club.name}
      aria-label={club.name}
    >
      {initials(club.name)}
    </span>
  )
}
