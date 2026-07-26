import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import SambaButton from '../../components/common/SambaButton'
import AppBackground from '../../components/common/AppBackground'
import { useTranslation } from '../../lib/i18n'

// Email + password sign-in, with an inline "forgot password" mode that
// swaps the form for a single email field wired to Supabase's real
// password-reset email (AuthContext.sendPasswordReset) -- kept as a toggle
// on this same page rather than a separate route to avoid an extra
// near-empty page for what's just one field.
export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signIn, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleLogin() {
    if (!emailValid || password.length === 0 || submitting) return
    setSubmitting(true)
    setError('')
    const { error: signInError } = await signIn({ email: email.trim(), password })
    setSubmitting(false)
    if (signInError) {
      setError(signInError.message || t('login.genericError'))
      return
    }
    navigate('/dashboard')
  }

  async function handleForgot() {
    if (!emailValid || submitting) return
    setSubmitting(true)
    setError('')
    const { error: resetError } = await sendPasswordReset(email.trim())
    setSubmitting(false)
    if (resetError) {
      setError(resetError.message || t('login.genericError'))
      return
    }
    setResetSent(true)
  }

  return (
    <AppBackground>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-5xl tracking-wide text-forest dark:text-mint">MUNDIAL</h1>
        </div>

        <div className="bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-6 space-y-5">
          {mode === 'login' ? (
            <>
              <h2 className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">{t('login.title')}</h2>
              <div>
                <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.emailLabel')}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
                />
              </div>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError('') }}
                className="text-sm text-emerald hover:underline"
              >
                {t('login.forgotPassword')}
              </button>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <SambaButton
                variant="gold"
                size="lg"
                className="w-full"
                disabled={!emailValid || password.length === 0 || submitting}
                onClick={handleLogin}
              >
                {submitting ? t('login.submitting') : t('login.title')}
              </SambaButton>

              <p className="text-center text-sm text-charcoal-600 dark:text-charcoal-300">
                {t('login.noAccount')}{' '}
                <Link to="/" className="text-emerald font-semibold hover:underline">{t('login.signUp')}</Link>
              </p>
            </>
          ) : resetSent ? (
            <>
              <h2 className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">{t('login.checkEmailTitle')}</h2>
              <p className="text-charcoal-600 dark:text-charcoal-300 text-sm">{t('login.checkEmailBody', { email: email.trim() })}</p>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSent(false) }}
                className="text-sm text-emerald hover:underline"
              >
                {t('login.backToLogin')}
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">{t('login.forgotPassword')}</h2>
              <div>
                <label className="block font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('onboarding.emailLabel')}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand focus:outline-none focus:ring-2 focus:ring-emerald"
                />
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <SambaButton
                variant="gold"
                size="lg"
                className="w-full"
                disabled={!emailValid || submitting}
                onClick={handleForgot}
              >
                {submitting ? t('login.submitting') : t('login.sendResetLink')}
              </SambaButton>

              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="block mx-auto text-sm text-emerald hover:underline"
              >
                {t('login.backToLogin')}
              </button>
            </>
          )}
        </div>
      </div>
    </AppBackground>
  )
}
