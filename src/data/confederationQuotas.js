// Exact confederation quotas as specified for the custom simulator.
export const QUOTAS_48 = {
  UEFA: 16,
  CAF: 9,
  AFC: 8,
  CONMEBOL: 6,
  CONCACAF: 6,
  OFC: 1,
}

export const QUOTAS_32 = {
  UEFA: 13,
  CAF: 5,
  AFC: 5,
  CONMEBOL: 5,
  CONCACAF: 4,
  OFC: 0,
}

// 64-team format: each confederation's 48-team quota plus a flat bump
// (CONMEBOL +1, UEFA +4, AFC +4, CAF +3, CONCACAF +3, OFC +1 -- 16 extra
// direct slots total), keeping the same 2 intercontinental playoff slots as
// the 48-team format so the grand total is 46+16 direct + 2 playoff = 64,
// split evenly into 16 groups of 4.
export const QUOTAS_64 = {
  UEFA: 20,
  CAF: 12,
  AFC: 12,
  CONMEBOL: 7,
  CONCACAF: 9,
  OFC: 2,
}

// The 48- and 64-team formats' last 2 slots both come from the same pair of
// intercontinental playoff paths, not direct quotas (QUOTAS_48/64 above
// total 46/62, two short of 48/64). Each path is a 3-team mini knockout:
// legs[0] v legs[1] play a semifinal, winner faces legs[2] (the bye team) in
// the final; the final's winner takes the slot.
export const PLAYOFF_PATHS = [
  { id: 'path1', legs: ['OFC', 'CONCACAF', 'CAF'] },
  { id: 'path2', legs: ['CONMEBOL', 'CONCACAF', 'AFC'] },
]

// Team counts whose last 2 slots are decided by PLAYOFF_PATHS rather than
// being pure direct-quota picks.
export const PLAYOFF_TEAM_COUNTS = [48, 64]

const QUOTAS_BY_TEAM_COUNT = { 32: QUOTAS_32, 48: QUOTAS_48, 64: QUOTAS_64 }

export function getQuotas(teamCount) {
  return QUOTAS_BY_TEAM_COUNT[teamCount] || QUOTAS_32
}

export function totalFromQuotas(quotas) {
  return Object.values(quotas).reduce((a, b) => a + b, 0)
}
