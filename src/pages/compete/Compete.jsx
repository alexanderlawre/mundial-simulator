import { useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'

// "Coming soon" mode-select cards, matching the disabled-card visual
// language already used for UPCOMING_COMPETITIONS on the Leagues Hub.
const COMING_SOON_CARDS = [
  { key: 'create', titleKey: 'compete.createTitle', descKey: 'compete.createDesc', colors: { from: '#0A1428', to: '#1E3A8A' } },
  { key: 'join', titleKey: 'compete.joinTitle', descKey: 'compete.joinDesc', colors: { from: '#00A651', to: '#0A3D24' } },
]

export default function Compete() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('compete.title')} subtitle={t('compete.subtitle')} />
        </div>

        {!user ? (
          <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth-lg p-8 text-center space-y-4">
            <p className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">
              {t('compete.signUpPromptTitle')}
            </p>
            <p className="text-charcoal-600 dark:text-charcoal-300 text-sm max-w-md mx-auto">
              {t('compete.signUpPromptDesc')}
            </p>
            <SambaButton variant="gold" onClick={() => navigate('/')}>
              {t('compete.createAccount')}
            </SambaButton>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {COMING_SOON_CARDS.map((card) => (
              <div
                key={card.key}
                className="text-left rounded-2xl shadow-depth-lg overflow-hidden opacity-60 cursor-not-allowed"
              >
                <div
                  className="p-5 text-white"
                  style={{ background: `linear-gradient(135deg, ${card.colors.from}, ${card.colors.to})` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5">
                      {t('leagues.comingSoon')}
                    </span>
                  </div>
                  <p className="font-display text-2xl font-extrabold">{t(card.titleKey)}</p>
                  <p className="text-white/80 text-xs mt-1">{t(card.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppBackground>
  )
}
