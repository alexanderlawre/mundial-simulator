import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NATIONS, CONFEDERATIONS } from '../../data/nations'
import { logSignup } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import CountryFlag from '../../components/common/CountryFlag'
import SambaButton from '../../components/common/SambaButton'
import AppBackground from '../../components/common/AppBackground'
import { useTranslation } from '../../lib/i18n'

function NationPicker({ label, value, onChange }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [confFilter, setConfFilter] = useState('ALL')

  const filtered = useMemo(() => {
    return NATIONS.filter((n) => {
      const matchesQuery = n.name.toLowerCase().includes(query.toLowerCase())
      const matchesConf = confFilter === 'ALL' || n.confederation === confFilter
      return matchesQuery && matchesConf
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [query, confFilter])

  return (
    <div>
      <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{label}</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('onboarding.searchPlaceholder')}
        className="w-full mb-2 px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card focus:outline-none focus:ring-2 focus:ring-emerald"
      />
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button
          onClick={() => setConfFilter('ALL')}
          className={`px-3 py-1 text-xs rounded-full border ${confFilter === 'ALL' ? 'bg-emerald text-white border-emerald' : 'border-charcoal-900/15 dark:border-white/15 text-charcoal-600 dark:text-charcoal-300'}`}
        >
          {t('onboarding.all')}
        </button>
        {CONFEDERATIONS.map((c) => (
          <button
            key={c}
            onClick={() => setConfFilter(c)}
            className={`px-3 py-1 text-xs rounded-full border ${confFilter === c ? 'bg-emerald text-white border-emerald' : 'border-charcoal-900/15 dark:border-white/15 text-charcoal-600 dark:text-charcoal-300'}`}
          >
            {c}
          </button>
        ))}
      </div>
      {value && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-gold/15 border border-gold">
          <CountryFlag nation={value} size="sm" />
          <span className="text-sm font-medium text-charcoal-900 dark:text-sand">{value.name}</span>
          <span className="text-xs text-charcoal-600 dark:text-charcoal-300 ml-auto">{t('onboarding.selected')}</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 rounded-xl border border-charcoal-900/10 dark:border-white/10 bg-white/60 dark:bg-night-card/60">
        {filtered.map((n) => (
          <button
            key={n.name}
            onClick={() => onChange(n)}
            className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-all hover:bg-mint/50
              ${value?.name === n.name ? 'bg-mint ring-2 ring-emerald' : ''}`}
          >
            <CountryFlag nation={n} size="sm" />
            <span className="truncate text-charcoal-900 dark:text-sand">{n.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-charcoal-600 dark:text-charcoal-300 py-4">{t('onboarding.noMatch')}</p>
        )}
      </div>
    </div>
  )
}

// Sign-up form: name, email, password + retype, favorite team (reuses the
// existing NationPicker -- "favorite team" and "country you support" are
// treated as the same field, since that's the only such concept already
// built and used elsewhere in the app), and a required Terms/Privacy
// checkbox. Unlike the old localStorage-only version, this creates a real
// Supabase auth account and requires email confirmation before login --
// see AuthContext.signUp / Supabase's own confirmation email. No profile is
// saved locally here; AuthContext mirrors the `profiles` row into
// localStorage automatically once the account is confirmed and logged in.
export default function Onboarding() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [supportedCountry, setSupportedCountry] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = password.length >= 8
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canContinue = name.trim().length > 0 && emailValid && passwordValid && passwordsMatch && supportedCountry && agreed

  async function handleContinue() {
    if (!canContinue || submitting) return
    setSubmitting(true)
    setError('')
    const { data, error: signUpError } = await signUp({
      email: email.trim(),
      password,
      name: name.trim(),
      favoriteTeam: supportedCountry.name,
    })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message || t('onboarding.genericError'))
      return
    }
    logSignup({ name: name.trim(), email: email.trim(), supportedCountry: supportedCountry.name })
    // With email confirmation required, signUp() does not return an active
    // session -- show a "check your email" screen instead of navigating in.
    if (data?.session) {
      navigate('/dashboard')
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <AppBackground>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="font-display font-bold text-4xl tracking-wide text-forest dark:text-mint mb-4">MUNDIAL</h1>
          <div className="bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-8 space-y-3">
            <h2 className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">{t('onboarding.checkEmailTitle')}</h2>
            <p className="text-charcoal-600 dark:text-charcoal-300 text-sm">{t('onboarding.checkEmailBody', { email: email.trim() })}</p>
            <Link to="/login" className="inline-block mt-2 text-emerald font-semibold hover:underline">{t('onboarding.goToLogin')}</Link>
          </div>
        </div>
      </AppBackground>
    )
  }

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-6xl tracking-wide text-forest dark:text-mint">MUNDIAL</h1>
          <p className="text-charcoal-600 dark:text-charcoal-300 mt-1">{t('onboarding.subtitle')}</p>
        </div>

        <div className="bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.nameLabel')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onboarding.namePlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
              />
            </div>
            <div>
              <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.emailLabel')}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('onboarding.emailPlaceholder')}
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
              />
            </div>
            <div>
              <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.passwordLabel')}</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
              />
              {password.length > 0 && !passwordValid && (
                <p className="text-xs text-red-500 mt-1">{t('onboarding.passwordTooShort')}</p>
              )}
            </div>
            <div>
              <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.confirmPasswordLabel')}</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">{t('onboarding.passwordsDontMatch')}</p>
              )}
            </div>
          </div>

          <NationPicker label={t('onboarding.favoriteTeamLabel')} value={supportedCountry} onChange={setSupportedCountry} />

          <label className="flex items-start gap-2.5 text-sm text-charcoal-600 dark:text-charcoal-300 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-emerald"
            />
            <span>
              {t('onboarding.agreePrefix')}{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald font-medium hover:underline">{t('onboarding.termsLink')}</a>
              {' '}{t('onboarding.agreeAnd')}{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald font-medium hover:underline">{t('onboarding.privacyLink')}</a>
            </span>
          </label>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <SambaButton
            variant="gold"
            size="lg"
            className="w-full"
            disabled={!canContinue || submitting}
            onClick={handleContinue}
          >
            {submitting ? t('onboarding.submitting') : t('onboarding.enter')}
          </SambaButton>

          <p className="text-center text-sm text-charcoal-600 dark:text-charcoal-300">
            {t('onboarding.haveAccount')}{' '}
            <Link to="/login" className="text-emerald font-semibold hover:underline">{t('onboarding.logIn')}</Link>
          </p>
        </div>
      </div>
    </AppBackground>
  )
}
