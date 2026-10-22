/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#0B3D2E',
        emerald: '#12805C',
        olive: '#3E5C3A',
        mint: '#CFF5E1',
        gold: {
          DEFAULT: '#D4AF37',
          light: '#EFD98B',
        },
        charcoal: {
          900: '#1E2422',
          600: '#5B6660',
          // Lighter secondary-text shade used only in dark mode (dark:text-charcoal-300)
          300: '#B7C2BC',
        },
        sand: '#F4EFE6',
        // Dark-mode surface colors -- forest-tinted near-black rather than
        // pure black/gray, to stay on-brand with the rest of the palette.
        night: '#0B100D',
        'night-card': '#151F1A',
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        title: ['"Anton"', '"Poppins"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        depth: '0 8px 24px rgba(11,61,46,0.25), 0 2px 6px rgba(11,61,46,0.15)',
        'depth-lg': '0 14px 34px rgba(11,61,46,0.32), 0 4px 10px rgba(11,61,46,0.2)',
        'depth-gold': '0 8px 24px rgba(212,175,55,0.35)',
      },
      borderRadius: {
        xl2: '20px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(4%, 6%) scale(1.08)' },
          '66%': { transform: 'translate(-3%, -4%) scale(0.96)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-5%, 5%) scale(1.06)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '60%': { opacity: '1', transform: 'scale(1.12)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0.9' },
        },
        'trophy-shine': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.55' },
        },
        'kickoff-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        float: 'float 22s ease-in-out infinite',
        'float-slow': 'float-slow 30s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 16s ease-in-out infinite',
        'pop-in': 'pop-in 0.45s ease-out both',
        'slide-up': 'slide-up 0.4s ease-out both',
        'confetti-fall': 'confetti-fall 4.5s linear infinite',
        'trophy-shine': 'trophy-shine 2.4s ease-in-out infinite',
        'kickoff-pulse': 'kickoff-pulse 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
