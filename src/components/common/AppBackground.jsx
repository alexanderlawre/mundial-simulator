// Soft-edged, slowly drifting gradient blobs in the brand palette (forest/
// emerald/gold), giving the app a sense of depth and movement without being
// distracting. Kept low-opacity and blurred, behind all foreground content.

import Footer from './Footer'
import HeaderControls from './HeaderControls'

function Blob({ className, color }) {
  return (
    <div
      className={`pointer-events-none fixed rounded-full blur-3xl ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}

export default function AppBackground({ children }) {
  return (
    <div className="relative min-h-screen w-full bg-sand dark:bg-night overflow-x-hidden flex flex-col transition-colors">
      {/* Slowly panning gradient wash in the brand greens/darks, sitting
          beneath the drifting blobs -- gives the whole background a sense
          of continuous motion rather than static color, in both themes. */}
      <div
        className="pointer-events-none fixed inset-0 bg-[length:300%_300%] animate-gradient-shift bg-gradient-to-br from-mint/70 via-sand to-emerald/25 dark:from-forest dark:via-night dark:to-night-card"
        aria-hidden="true"
      />
      <Blob className="-top-24 -right-24 w-[32rem] h-[32rem] opacity-30 dark:opacity-20 animate-float" color="#12805C" />
      <Blob className="top-1/3 -left-32 w-[28rem] h-[28rem] opacity-25 dark:opacity-15 animate-float-slow" color="#D4AF37" />
      <Blob className="bottom-[-10rem] right-1/4 w-[26rem] h-[26rem] opacity-25 dark:opacity-15 animate-float" color="#0B3D2E" />
      <Blob className="bottom-0 -left-16 w-72 h-72 opacity-20 dark:opacity-10 animate-float-slow" color="#3E5C3A" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-sand/30 to-sand dark:via-night/30 dark:to-night" />
      <HeaderControls />
      {/* Every page renders its own header content right at the top of this
          wrapper (via NavBar or a custom h1), so it needs to clear
          HeaderControls' fixed top-right icon row -- which sits outside
          document flow at `safe-area + 1rem` and is `w-9 h-9` (2.25rem)
          tall -- rather than sharing its vertical band. Padding this single
          shared wrapper (instead of patching every page's own header) is
          what guarantees every page gets the same clearance, including ones
          with a custom header instead of NavBar. */}
      <div
        className="relative z-10 flex-1"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' }}
      >
        {children}
      </div>
      <Footer />
    </div>
  )
}
