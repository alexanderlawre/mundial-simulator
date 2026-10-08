// Current-day team strength ratings (0-99 scale), approximating relative
// footballing strength for World Cup simulation purposes. Not sourced from
// any live ranking feed -- built as reasonable, football-literate estimates.
// Nations not listed fall back to a confederation-tier default in getRating().

export const CURRENT_RATINGS = {
  // Elite tier -- reordered to reflect the post-Euro 2024 landscape: Spain's
  // deep young core (Yamal/Pedri/Nico Williams) is now the form side in the
  // world, France and Argentina remain top-tier but slightly ahead of a
  // resurgent England, and Brazil/Portugal/Netherlands round out the group.
  'Spain': 90, 'France': 89, 'Argentina': 89, 'England': 88, 'Brazil': 87,
  'Portugal': 87, 'Netherlands': 83, 'Germany': 82,

  // Strong tier -- note Italy and Belgium are deliberately kept out of the
  // elite/auto-qualifier tier here: both have real recent pedigree
  // (Belgium's "golden generation," Italy's 2020 Euros win) but have also
  // each missed a recent World Cup on current form/squad transition
  // (Italy missed 2018 & 2022; Belgium's core is aging past its peak), so
  // they compete in the same realistic, non-guaranteed band as
  // Croatia/Switzerland/Denmark rather than being auto-locks.
  'Italy': 81, 'Belgium': 78,
  'Croatia': 77, 'Uruguay': 80, 'Colombia': 81, 'Morocco': 79, 'Switzerland': 79,
  'Japan': 78, 'United States': 77, 'Mexico': 74, 'Denmark': 77, 'Senegal': 78,
  'Austria': 75, 'Ecuador': 76, 'South Korea': 76, 'Ukraine': 71,
  'Serbia': 74, 'Poland': 75, 'Wales': 75, 'Iran': 74, 'Australia': 73,
  'Canada': 74, 'Türkiye': 74, 'Sweden': 75, 'Egypt': 74, 'Tunisia': 72,
  'Peru': 72, 'Chile': 75, 'Nigeria': 72, 'Algeria': 74, "Côte d'Ivoire": 75,
  'Ghana': 72, 'Cameroon': 73, 'Scotland': 73, 'Norway': 74, 'Hungary': 73,

  // Mid tier
  'Costa Rica': 70, 'Panama': 68, 'Jamaica': 66, 'Venezuela': 70, 'Paraguay': 70,
  'Bolivia': 63, 'South Africa': 68, 'Qatar': 68, 'Saudi Arabia': 61, 'Iraq': 67,
  'Jordan': 65, 'Uzbekistan': 68, 'New Zealand': 63, 'Curacao': 62,
  'Cabo Verde': 66, 'DR Congo': 66, 'Guinea': 65, 'Mali': 66, 'Burkina Faso': 65,
  'Republic of Ireland': 72, 'Slovakia': 70, 'Slovenia': 69, 'Romania': 66,
  'Czechia': 68, 'Finland': 68, 'Israel': 69, 'Bosnia and Herzegovina': 71,
  'North Macedonia': 63, 'Georgia': 66, 'Albania': 66, 'Northern Ireland': 69,
  'Greece': 73, 'Iceland': 69, 'Kosovo': 65, 'Gabon': 62, 'Zambia': 64,
  'Mozambique': 60, 'Benin': 61, 'Uganda': 61, 'Equatorial Guinea': 60,
  'India': 58, 'Thailand': 58, 'Vietnam': 58, 'China': 59,
  'Syria': 63, 'Bahrain': 60, 'United Arab Emirates': 65, 'Kuwait': 60,
  'Oman': 61, 'Lebanon': 58, 'Kyrgyzstan': 60, 'Tajikistan': 59, 'Turkmenistan': 57,
  'Palestine': 57, 'North Korea': 62, 'Hong Kong': 52,

  // -- October 2026 international break -----------------------------------
  // Adjustments below react to the UEFA Nations League matchdays 3-4
  // (1-6 Oct) and the CONMEBOL/other-confederation friendly window (6 Oct):
  //   England 7-0 away at Croatia, then 3-0 over Czechia -- a statement
  //     double, Croatia correspondingly drops hard after also losing 1-2 at
  //     home to Spain in the same window.
  //   Portugal 4-2 away at Denmark + 2-1 over Norway; Norway also lost an
  //     upset 1-2 at Wales, so its post-Euro bump is pulled back.
  //   Netherlands/Germany both held scoreless/drawn by Greece (2-2, 0-0),
  //     while Greece itself jumps for two strong results against elite
  //     opposition. Hungary/Northern Ireland/Bosnia/Kosovo/Wales all pick up
  //     notable wins or draws against higher-rated sides (Northern Ireland
  //     3-0 over Ukraine in particular); Ukraine, Romania (lost 0-6 to
  //     Poland then 0-1 to Sweden), Serbia, Türkiye, and North Macedonia
  //     drop after difficult windows.
  //   Elsewhere: Chile beat Mexico 2-0, Colombia beat Peru 2-0, China lost
  //     0-1 to Tajikistan, and Nigeria were held 3-3 by a lower-rated Russia
  //     side.
  // Nations not covered by a specific result above are unchanged.

  // Developing tier defaults handled by getRating()
}

const CONFEDERATION_DEFAULTS = {
  UEFA: 66,
  CONMEBOL: 68,
  CAF: 60,
  AFC: 56,
  CONCACAF: 58,
  OFC: 48,
}

export function getRating(nationName, confederation) {
  if (CURRENT_RATINGS[nationName] != null) return CURRENT_RATINGS[nationName]
  return CONFEDERATION_DEFAULTS[confederation] ?? 55
}
