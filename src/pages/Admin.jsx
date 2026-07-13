import { useMemo, useState } from 'react'
import { fetchAdminData } from '../lib/storage'
import { NATIONS } from '../data/nations'
import { breakdown } from '../lib/adminBreakdown'
import AppBackground from '../components/AppBackground'
import CountryFlag from '../components/CountryFlag'
import SambaButton from '../components/SambaButton'

const NATIONS_BY_NAME = Object.fromEntries(NATIONS.map((n) => [n.name, n]))

export const ADMIN_CACHE_KEY = 'mundial.adminDataCache'

const TOP_N = 9
const SIGNUPS_PREVIEW_N = 9

function BreakdownTable({ title, rows, viewAllHref }) {
  const visibleRows = rows.slice(0, TOP_N)
  const hasMore = rows.length > TOP_N

  return (
    <div className="rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <div className="px-3 py-2 bg-forest text-white font-display font-semibold text-sm">{title}</div>
      {rows.length === 0 ? (
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300 p-3 italic">No data yet.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-charcoal-600 dark:text-charcoal-300 text-xs uppercase tracking-wide border-b border-charcoal-900/10 dark:border-white/10">
                <th className="text-left py-1.5 pl-3">Team</th>
                <th className="py-1.5 text-right pr-2">Count</th>
                <th className="py-1.5 text-right pr-3">%</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const team = NATIONS_BY_NAME[r.team]
                return (
                  <tr key={r.team} className="border-b last:border-0 border-charcoal-900/5 dark:border-white/5">
                    <td className="py-1.5 pl-3 flex items-center gap-2">
                      {team && <CountryFlag nation={team} size="sm" />}
                      <span className="truncate">{r.team}</span>
                    </td>
                    <td className="py-1.5 text-right pr-2 tabular-nums">{r.count}</td>
                    <td className="py-1.5 text-right pr-3 tabular-nums">{r.pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {hasMore && viewAllHref && (
            <a
              href={viewAllHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-xs font-semibold text-forest dark:text-mint py-1.5 border-t border-charcoal-900/10 dark:border-white/10 hover:bg-sand dark:hover:bg-night transition-colors flex items-center justify-center gap-1"
            >
              View All ({rows.length})
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7M17 7H8M17 7V16" />
              </svg>
            </a>
          )}
        </>
      )}
    </div>
  )
}

function SignupsTable({ signups }) {
  const [expanded, setExpanded] = useState(false)
  const ordered = [...signups].reverse()
  const visible = expanded ? ordered : ordered.slice(0, SIGNUPS_PREVIEW_N)
  const hasMore = ordered.length > SIGNUPS_PREVIEW_N

  return (
    <div className="rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden overflow-x-auto">
      <div className="px-3 py-2 bg-forest text-white font-display font-semibold text-sm">
        Signups ({signups.length})
      </div>
      {signups.length === 0 ? (
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300 p-3 italic">No signups yet.</p>
      ) : (
        <>
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-charcoal-600 dark:text-charcoal-300 text-xs uppercase tracking-wide border-b border-charcoal-900/10 dark:border-white/10">
                <th className="text-left py-1.5 pl-3">Name</th>
                <th className="text-left py-1.5">Email</th>
                <th className="text-left py-1.5">Supports</th>
                <th className="text-left py-1.5 pr-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => (
                <tr key={i} className="border-b last:border-0 border-charcoal-900/5 dark:border-white/5">
                  <td className="py-1.5 pl-3 truncate">{s.name}</td>
                  <td className="py-1.5 truncate">{s.email}</td>
                  <td className="py-1.5 truncate">{s.supportedCountry}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                    {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full text-xs font-semibold text-forest dark:text-mint py-1.5 border-t border-charcoal-900/10 dark:border-white/10 hover:bg-sand dark:hover:bg-night transition-colors flex items-center justify-center gap-1"
            >
              {expanded ? 'Show Recent Only' : `View More (${ordered.length})`}
              <svg
                viewBox="0 0 24 24"
                className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  )
}

function HistoricRunsTable({ entries }) {
  const counts = {}
  entries.forEach((e) => {
    const year = e.descriptor
    counts[year] = (counts[year] || 0) + 1
  })
  const rows = Object.entries(counts)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => Number(b.year) - Number(a.year))

  return (
    <div className="rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <div className="px-3 py-2 bg-forest text-white font-display font-semibold text-sm">
        Historic World Cups Run ({entries.length} total)
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300 p-3 italic">No historic cups run yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-charcoal-600 dark:text-charcoal-300 text-xs uppercase tracking-wide border-b border-charcoal-900/10 dark:border-white/10">
              <th className="text-left py-1.5 pl-3">Year</th>
              <th className="text-right py-1.5 pr-3">Times Run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b last:border-0 border-charcoal-900/5 dark:border-white/5">
                <td className="py-1.5 pl-3">{r.year}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CustomTeamCountTable({ entries }) {
  const counts = {}
  entries.forEach((e) => {
    const n = e.descriptor
    counts[n] = (counts[n] || 0) + 1
  })
  const rows = Object.entries(counts)
    .map(([teamCount, count]) => ({ teamCount, count }))
    .sort((a, b) => Number(a.teamCount) - Number(b.teamCount))

  return (
    <div className="rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <div className="px-3 py-2 bg-forest text-white font-display font-semibold text-sm">Runs by Team Count</div>
      {rows.length === 0 ? (
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300 p-3 italic">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-charcoal-600 dark:text-charcoal-300 text-xs uppercase tracking-wide border-b border-charcoal-900/10 dark:border-white/10">
              <th className="text-left py-1.5 pl-3">Team Count</th>
              <th className="text-right py-1.5 pr-3">Times Run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamCount} className="border-b last:border-0 border-charcoal-900/5 dark:border-white/5">
                <td className="py-1.5 pl-3">{r.teamCount}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function detailHref(mode, field, title) {
  const params = new URLSearchParams({ mode, field, title })
  return `/admin/detail?${params.toString()}`
}

function Dashboard({ signups, log, onRefresh, refreshing }) {
  const wc2026Entries = useMemo(() => log.filter((e) => e.mode === 'wc2026'), [log])
  const customEntries = useMemo(() => log.filter((e) => e.mode === 'custom'), [log])
  const historicEntries = useMemo(() => log.filter((e) => e.mode === 'historic'), [log])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center">
        <h1 className="font-display font-bold text-4xl tracking-wide text-forest dark:text-mint">Mundial Admin</h1>
        <p className="text-charcoal-600 dark:text-charcoal-300 text-sm mt-1">
          Shared usage log across every visitor. Only visible here, behind the admin password.
        </p>
        <SambaButton variant="outline" size="sm" className="mt-3" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh Data'}
        </SambaButton>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-charcoal-900 dark:text-sand text-lg">Signups</h2>
        <SignupsTable signups={signups} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-charcoal-900 dark:text-sand text-lg">World Cup 2026 Simulations ({wc2026Entries.length})</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <BreakdownTable
            title="Winners"
            rows={breakdown(wc2026Entries, 'winner')}
            viewAllHref={detailHref('wc2026', 'winner', 'WC2026 Winners')}
          />
          <BreakdownTable
            title="Runners-up"
            rows={breakdown(wc2026Entries, 'runnerUp')}
            viewAllHref={detailHref('wc2026', 'runnerUp', 'WC2026 Runners-up')}
          />
          <BreakdownTable
            title="Third Place"
            rows={breakdown(wc2026Entries, 'third')}
            viewAllHref={detailHref('wc2026', 'third', 'WC2026 Third Place')}
          />
          <BreakdownTable
            title="Fourth Place"
            rows={breakdown(wc2026Entries, 'fourth')}
            viewAllHref={detailHref('wc2026', 'fourth', 'WC2026 Fourth Place')}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-charcoal-900 dark:text-sand text-lg">Created World Cups ({customEntries.length})</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <BreakdownTable
            title="Winners"
            rows={breakdown(customEntries, 'winner')}
            viewAllHref={detailHref('custom', 'winner', 'Created World Cups Winners')}
          />
          <BreakdownTable
            title="Runners-up"
            rows={breakdown(customEntries, 'runnerUp')}
            viewAllHref={detailHref('custom', 'runnerUp', 'Created World Cups Runners-up')}
          />
          <BreakdownTable
            title="Third Place"
            rows={breakdown(customEntries, 'third')}
            viewAllHref={detailHref('custom', 'third', 'Created World Cups Third Place')}
          />
          <BreakdownTable
            title="Fourth Place"
            rows={breakdown(customEntries, 'fourth')}
            viewAllHref={detailHref('custom', 'fourth', 'Created World Cups Fourth Place')}
          />
          <CustomTeamCountTable entries={customEntries} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-charcoal-900 dark:text-sand text-lg">Historic World Cups</h2>
        <HistoricRunsTable entries={historicEntries} />
      </section>
    </div>
  )
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ signups: [], simulations: [] })

  function cacheData(signups, simulations) {
    try {
      localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ signups, simulations, cachedAt: Date.now() }))
    } catch {
      // localStorage unavailable/full — the live dashboard still works, only the
      // new-tab "View All" detail pages depend on this cache.
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const result = await fetchAdminData(password)
    setLoading(false)
    if (result.ok) {
      setData({ signups: result.signups, simulations: result.simulations })
      cacheData(result.signups, result.simulations)
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  async function handleRefresh() {
    setLoading(true)
    const result = await fetchAdminData(password)
    setLoading(false)
    if (result.ok) {
      setData({ signups: result.signups, simulations: result.simulations })
      cacheData(result.signups, result.simulations)
    }
  }

  if (!unlocked) {
    return (
      <AppBackground>
        <div className="max-w-sm mx-auto px-4 py-24">
          <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-6 space-y-4">
            <h1 className="font-display font-bold text-2xl tracking-wide text-forest dark:text-mint text-center">Admin Access</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-charcoal-900/15 dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-emerald"
            />
            {error && <p className="text-sm text-red-500 text-center">Incorrect password.</p>}
            <SambaButton type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Checking…' : 'Unlock'}
            </SambaButton>
          </form>
        </div>
      </AppBackground>
    )
  }

  return (
    <AppBackground>
      <Dashboard signups={data.signups} log={data.simulations} onRefresh={handleRefresh} refreshing={loading} />
    </AppBackground>
  )
}
