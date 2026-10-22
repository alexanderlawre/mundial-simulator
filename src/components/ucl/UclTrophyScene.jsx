import { useMemo } from 'react'
import ClubBadge from '../leagues/ClubBadge'
import SambaButton from '../common/SambaButton'
import { useTranslation } from '../../lib/i18n'

const CONFETTI = ['#D4AF37', '#EFD98B', '#12805C', '#CFF5E1', '#1E3A8A', '#ffffff']

function TrophySvg() {
  return (
    <svg viewBox="0 0 120 160" className="w-40 h-52 sm:w-48 sm:h-64 drop-shadow-[0_10px_24px_rgba(212,175,55,0.55)]" aria-hidden="true">
      <defs>
        <linearGradient id="ucl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7E7A0" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#9C7A12" />
        </linearGradient>
      </defs>
      <path d="M28 20 C4 20 4 56 34 62" fill="none" stroke="url(#ucl-gold)" strokeWidth="7" strokeLinecap="round" />
      <path d="M92 20 C116 20 116 56 86 62" fill="none" stroke="url(#ucl-gold)" strokeWidth="7" strokeLinecap="round" />
      <path d="M28 8 H92 V52 C92 76 76 90 60 94 C44 90 28 76 28 52 Z" fill="url(#ucl-gold)" />
      <path d="M38 14 H50 V54 C50 70 46 78 40 80 C36 72 34 62 34 52 Z" fill="#fff" className="animate-trophy-shine" />
      <rect x="53" y="94" width="14" height="28" rx="3" fill="url(#ucl-gold)" />
      <ellipse cx="60" cy="108" rx="13" ry="5" fill="url(#ucl-gold)" />
      <path d="M36 124 H84 L92 148 H28 Z" fill="url(#ucl-gold)" />
      <rect x="24" y="148" width="72" height="10" rx="4" fill="#9C7A12" />
    </svg>
  )
}

// Full-screen celebration shown once the final has been decided.
export default function UclTrophyScene({ champion, runnerUp, finalResult, onClose, onPlayAgain }) {
  const { t } = useTranslation()
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 3.5 + Math.random() * 3,
        color: CONFETTI[i % CONFETTI.length],
        size: 6 + Math.random() * 6,
      })),
    []
  )
  const aWins = finalResult.winner === finalResult.teamA
  const scoreLine = `${finalResult.goalsA}–${finalResult.goalsB}`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#06122E] via-[#0A1F5C] to-[#06122E] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 block animate-confetti-fall rounded-sm"
            style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, backgroundColor: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      <div className="relative min-h-full flex flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <p className="font-display text-sm tracking-[0.3em] uppercase text-gold-light animate-slide-up">{t('ucl.name')}</p>
        <div className="animate-pop-in">
          <TrophySvg />
        </div>
        <div className="flex items-center gap-3 animate-slide-up">
          <ClubBadge club={champion} size="xl" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold animate-slide-up">{champion.name}</h2>
        <p className="font-display text-lg text-gold-light animate-slide-up">{t('ucl.championsTitle')}</p>
        <p className="text-white/80 text-sm animate-slide-up">
          {t('ucl.finalScoreLine', {
            winner: champion.name,
            loser: runnerUp.name,
            score: aWins ? scoreLine : `${finalResult.goalsB}–${finalResult.goalsA}`,
          })}
          {finalResult.pens ? ` (${t('ucl.penaltyShootout', { a: aWins ? finalResult.pens.penA : finalResult.pens.penB, b: aWins ? finalResult.pens.penB : finalResult.pens.penA })})` : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2 animate-slide-up">
          <SambaButton variant="outline" onClick={onClose}>{t('ucl.viewBracket')}</SambaButton>
          <SambaButton variant="gold" onClick={onPlayAgain}>{t('ucl.playAgain')}</SambaButton>
        </div>
      </div>
    </div>
  )
}
