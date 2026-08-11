// Brand mark: the trophy + laurel wreath icon (the same artwork used for
// the browser favicon) recolored to brand gold, for anywhere the app needs
// an actual logo mark rather than just the "MUNDIAL" wordmark -- the
// Dashboard header lockup, the sitewide footer, and the shareable image
// cards. `logo-gold.png` is a solid-gold recolor of favicon.svg's exact
// artwork with the original alpha/silhouette preserved pixel-for-pixel, so
// it's a real transparent PNG (not a CSS filter approximation) that
// captures cleanly via html2canvas on the share cards too.
export default function Logo({ className = 'h-8 w-auto', alt = 'Mundial' }) {
  return (
    <img
      src="/logo-gold.png"
      alt={alt}
      draggable="false"
      className={`${className} object-contain shrink-0 select-none`}
    />
  )
}
