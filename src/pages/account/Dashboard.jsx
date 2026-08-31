import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../lib/storage'
import { getNation } from '../../data/nations'
import CountryFlag from '../../components/common/CountryFlag'
import AppBackground from '../../components/common/AppBackground'
import Logo from '../../components/common/Logo'
import { useTranslation } from '../../lib/i18n'

const MODES = [
  {
    key: 'compete',
    titleKey: 'dashboard.competeTitle',
    descKey: 'dashboard.competeDesc',
    path: '/compete',
    accent: 'bg-gradient-to-r from-gold to-gold-light',
  },
  {
    key: 'leagues',
    titleKey: 'leagues.modeTitle',
    descKey: 'leagues.modeDesc',
    path: '/leagues',
    accent: 'bg-gradient-to-r from-[#3D195B] via-[#EE2523] to-[#008C45]',
  },
  {
    key: 'simulator',
    titleKey: 'dashboard.simulatorTitle',
    descKey: 'dashboard.simulatorDesc',
    path: '/tournaments',
    accent: 'bg-emerald',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { t, tn } = useTranslation()
  const profile = getProfile()
  const supported = profile ? getNation(profile.supportedCountry) : null

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <Logo className="h-8 w-auto sm:h-10 shrink-0" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-wide text-forest dark:text-mint">MUNDIAL</h1>
          </div>
          <p className="text-charcoal-600 dark:text-charcoal-300 text-xs sm:text-sm font-medium mt-2">
            {profile ? t('dashboard.welcomeName', { name: profile.name }) : t('dashboard.welcomeGeneric')}
          </p>
          {supported && (
            <p className="text-charcoal-600 dark:text-charcoal-300 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
              <CountryFlag nation={supported} size="xs" className="shrink-0" />
              {t('dashboard.supporting', { name: tn(supported.name) })}
            </p>
          )}
        </div>

        <div className="grid gap-5">
          {MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => navigate(mode.path)}
              className="rounded-2xl bg-white dark:bg-night-card shadow-depth-lg overflow-hidden hover:-translate-y-1 active:scale-[0.99] transition-all"
            >
              <div className={`h-2 ${mode.accent}`} />
              <div className="p-6 flex flex-col items-center text-center">
                <h2 className="font-display text-xl font-bold text-charcoal-900 dark:text-sand">{t(mode.titleKey)}</h2>
                <p className="text-charcoal-600 dark:text-charcoal-300 mt-1 text-sm">{t(mode.descKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
