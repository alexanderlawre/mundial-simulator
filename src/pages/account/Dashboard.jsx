import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../lib/storage'
import { getNation } from '../../data/nations'
import CountryFlag from '../../components/common/CountryFlag'
import AppBackground from '../../components/common/AppBackground'
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
    path: '/simulator/setup',
    accent: 'bg-emerald',
  },
  {
    key: 'historic',
    titleKey: 'dashboard.historicTitle',
    descKey: 'dashboard.historicDesc',
    path: '/historic',
    accent: 'bg-olive',
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
        <div className="flex items-center gap-3 mb-8">
          {supported && <CountryFlag nation={supported} size="lg" />}
          <div>
            <h1 className="font-display font-bold text-3xl tracking-wide text-forest dark:text-mint">MUNDIAL</h1>
            <p className="text-charcoal-600 dark:text-charcoal-300 text-sm font-medium">
              {profile ? t('dashboard.welcomeName', { name: profile.name }) : t('dashboard.welcomeGeneric')}
            </p>
            {supported && <p className="text-charcoal-600 dark:text-charcoal-300 text-sm">{t('dashboard.supporting', { name: tn(supported.name) })}</p>}
          </div>
        </div>

        <div className="grid gap-5">
          {MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => navigate(mode.path)}
              className="text-left rounded-2xl bg-white dark:bg-night-card shadow-depth-lg overflow-hidden hover:-translate-y-1 active:scale-[0.99] transition-all"
            >
              <div className={`h-2 ${mode.accent}`} />
              <div className="p-6">
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
