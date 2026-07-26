import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import SambaButton from '../../components/common/SambaButton'
import AppBackground from '../../components/common/AppBackground'
import { useTranslation } from '../../lib/i18n'

// Landing page for the link in Supabase's password-reset email. Supabase's
// client library auto-detects the recovery token in the URL fragment and
// establishes a temporary "recovery" session on load (handled entirely by
// supabase-js / AuthContext's onAuthStateChange -- nothing extra needed
// here), so by the time this renders, `updateUser({ password })` is
// already authorized to set the new password for that account.
export default function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const passwordValid = password.length >= 8
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canSubmit = passwordValid && passwordsMatch

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message || t('login.genericError'))
      return
    }
    setDone(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  return (
    <AppBackground>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-5xl tracking-wide text-forest dark:text-mint">MUNDIAL</h1>
        </div>

        <div className="bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-6 space-y-5">
          {done ? (
            <p className="text-center text-charcoal-900 dark:text-sand font-medium">{t('resetPassword.success')}</p>
          ) : (
            <>
              <h2 className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">{t('resetPassword.title')}</h2>
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

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <SambaButton
                variant="gold"
                size="lg"
                className="w-full"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                {submitting ? t('login.submitting') : t('resetPassword.submit')}
              </SambaButton>
            </>
          )}
        </div>
      </div>
    </AppBackground>
  )
}
