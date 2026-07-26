// Dark/light mode preference, persisted to localStorage and applied via a
// `dark` class on <html>, matching Tailwind's `darkMode: 'class'` strategy.
//
// Dark mode is the app's default: a first-time visitor with no stored
// preference gets dark mode regardless of system preference. Users can
// still switch to light mode, and that explicit choice is persisted.

const THEME_KEY = 'mundial.theme'

export function getTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable -- fall through to default
  }
  return 'dark'
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // best-effort persistence only
  }
  applyTheme(theme)
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

// Called once on app boot so the correct class is present before first
// paint (avoids a light-mode flash for users who've chosen dark).
export function initTheme() {
  applyTheme(getTheme())
}
