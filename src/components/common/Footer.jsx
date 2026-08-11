import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useTranslation } from '../../lib/i18n'

// Sitewide legal links, rendered at the bottom of every page via
// AppBackground. Kept small/unobtrusive — this is a simulator, not a page
// where legal text needs to be front-and-center, but it should always be
// reachable per the site's Privacy Policy / Terms / Cookie Policy.
export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="relative mt-auto pt-10 pb-6 px-4 flex flex-col items-center gap-3">
      <Logo className="h-6 w-auto opacity-80" />
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-charcoal-600 dark:text-charcoal-300 border-t border-charcoal-900/10 dark:border-white/10 pt-4">
        <span>© {new Date().getFullYear()} Mundial</span>
        <Link to="/privacy" className="hover:text-forest dark:hover:text-mint hover:underline">{t('common.privacyPolicy')}</Link>
        <Link to="/terms" className="hover:text-forest dark:hover:text-mint hover:underline">{t('common.termsOfService')}</Link>
        <Link to="/cookies" className="hover:text-forest dark:hover:text-mint hover:underline">{t('common.cookiePolicy')}</Link>
      </div>
    </footer>
  )
}
