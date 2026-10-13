const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const MONTH_RE = new RegExp(`\\b(${MONTHS.join('|')})\\b`, 'g');

/** Jours annoncés pour un match, fin incluse */
export interface DayRange {
  start: Date;
  end: Date;
}

/**
 * Lit les dates sans heure de la billetterie :
 * - "Samedi 16 mai 2026" → un seul jour
 * - "Week-end du 12, 13 & 14 septembre 2025" → du 12 au 14
 * - "Week-end du 27, 28 janvier & 1er février 2026" → du 27/01 au 01/02
 *
 * Premier jour/mois cité = début, dernier jour/mois cité = fin.
 */
export function parseFrenchDays(text: string): DayRange | null {
  const t = text.toLowerCase().replace(/(\d)er\b/g, '$1');
  const year = Number(t.match(/(\d{4})$/)?.[1]);
  const months = [...t.matchAll(MONTH_RE)].map(m => MONTHS.indexOf(m[1]));
  const days = [...t.matchAll(/\b\d{1,2}\b/g)].map(m => Number(m[0]));
  if (!year || months.length === 0 || days.length === 0) return null;

  const start = new Date(year, months[0], days[0]);
  const end = new Date(year, months.at(-1)!, days.at(-1)!);
  // "Week-end du 30, 31 décembre & 1er janvier 2027" : l'année citée est celle de la fin
  if (start > end) start.setFullYear(year - 1);
  return { start, end };
}
