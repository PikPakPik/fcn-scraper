const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
];

/** Jours annoncés pour un match, fin incluse */
export interface DayRange {
  start: Date;
  end: Date;
}

/** "janv." / "fev." / "févr." / "mar." / "décembre" → index du mois (accents et point ignorés) */
function monthIndex(word: string): number {
  const w = word.replace(/\.$/, '');
  if (w.length < 3) return -1;
  return MONTHS.findIndex(m => m.startsWith(w));
}

/**
 * Lit les dates sans heure de la billetterie :
 * - "Samedi 16 mai 2026" → un seul jour
 * - "Week-end du 12, 13 & 14 septembre 2025" → du 12 au 14
 * - "Week-end du 27, 28 janvier & 1er février 2026" → du 27/01 au 01/02
 * - "Ven. 15, Sam. 16 ou Lun. 18 jan. 2027, date & heure à confirmer" → du 15 au 18
 * - "Ven. 30 avr., Sam. 1 ou Lun. 3 mai 2027, date & heure à confirmer" → du 30/04 au 03/05
 *
 * Premier jour/mois cité = début, dernier jour/mois cité = fin.
 * Un mois n'est reconnu que juste après un numéro de jour, pour ne pas
 * confondre "Mar." (mardi) avec mars.
 */
export function parseFrenchDays(text: string): DayRange | null {
  const t = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const year = Number(t.match(/\b(\d{4})\b/)?.[1]);

  const days: number[] = [];
  const months: number[] = [];
  // Numéros de jour (1-2 chiffres, hors heures "19:00"), éventuellement suivis d'un mois
  for (const [, day, word] of t.matchAll(/(?<![\d:])(\d{1,2})(?:er)?(?![\d:])(?:\s+([a-z]+\.?))?/g)) {
    days.push(Number(day));
    const month = word ? monthIndex(word) : -1;
    if (month !== -1) months.push(month);
  }
  if (!year || months.length === 0 || days.length === 0) return null;

  const start = new Date(year, months[0], days[0]);
  const end = new Date(year, months.at(-1)!, days.at(-1)!);
  // "Week-end du 30, 31 décembre & 1er janvier 2027" : l'année citée est celle de la fin
  if (start > end) start.setFullYear(year - 1);
  return { start, end };
}
