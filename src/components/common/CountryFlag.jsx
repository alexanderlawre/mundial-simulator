import { useTranslation } from '../../lib/i18n'

// Flags are rounded rectangles in the real 4:3 flag-icons proportions (not
// circles), so wide flags like Germany's or Canada's keep their true shape.
const SIZES = {
  xs: 'w-5 h-[15px] rounded-[4px]',
  sm: 'w-7 h-[21px] rounded-md',
  md: 'w-10 h-[30px] rounded-md',
  lg: 'w-16 h-12 rounded-lg',
  xl: 'w-24 h-[72px] rounded-xl',
}

export default function CountryFlag({ nation, size = 'md', className = '' }) {
  const { tn } = useTranslation()
  if (!nation) return null
  const sizeClass = SIZES[size] || SIZES.md
  const Custom = nation.customFlag
  const iso = (nation.iso2 || '').toLowerCase()
  const displayName = tn(nation.name)

  return (
    <span
      className={`inline-flex items-center justify-center bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 overflow-hidden shrink-0 ${sizeClass} ${className}`}
      title={displayName}
      aria-label={displayName}
    >
      {Custom ? (
        <Custom className="w-full h-full" />
      ) : iso ? (
        <span className={`fi fi-${iso} block !w-full !h-full bg-cover bg-center`} />
      ) : (
        <span className="w-full h-full bg-charcoal-100" />
      )}
    </span>
  )
}
