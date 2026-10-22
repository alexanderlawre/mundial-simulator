import ClubBadge from '../leagues/ClubBadge'
import CountryFlag from '../common/CountryFlag'
import { getNation } from '../../data/nations'

export function ClubCountryFlag({ club, size = 'xs', className = '' }) {
  const nation = club ? getNation(club.country) : null
  if (!nation) return null
  return <CountryFlag nation={nation} size={size} className={className} />
}

// Club crest + name on one line, with an optional small association flag.
export default function ClubLabel({ club, badgeSize = 'sm', flag = false, className = '', nameClassName = '' }) {
  if (!club) return null
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <ClubBadge club={club} size={badgeSize} />
      <span className={`truncate font-medium text-charcoal-900 dark:text-sand ${nameClassName}`}>{club.name}</span>
      {flag && <ClubCountryFlag club={club} />}
    </span>
  )
}
