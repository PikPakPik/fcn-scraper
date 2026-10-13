import { createEvents, type DateArray, type EventAttributes } from 'ics';
import type { Match } from '../scrapers/fc-nantes.js';

const BEAUJOIRE_ADDRESS = 'Stade de la Beaujoire, 330 Route de Saint-Joseph, 44300 Nantes, France';
// ponytail: durée estimée, le site ne donne pas l'heure de fin
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

// En-têtes que la lib ics ne sait pas écrire elle-même
const EXTRA_HEADERS = [
  'X-WR-CALDESC:Calendrier automatique des matchs du FC Nantes',
  'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  'X-APPLE-CALENDAR-COLOR:#FFE000'
];

export function generateICS(matches: Match[]): string {
  const events = matches.flatMap(match => toEvent(match) ?? []);
  // Mieux vaut un job en échec qu'un calendrier vidé si le site change de structure
  if (events.length === 0) throw new Error('Aucun match daté trouvé');

  const { error, value } = createEvents(events, {
    productId: 'fcnantes-scraper//FC Nantes Calendar//FR',
    calName: 'FC Nantes - Calendrier des matchs'
  });
  if (error || !value) throw error ?? new Error('Génération ICS vide');

  return value.replace('BEGIN:VCALENDAR\r\n', `BEGIN:VCALENDAR\r\n${EXTRA_HEADERS.join('\r\n')}\r\n`);
}

function toEvent(match: Match): EventAttributes | null {
  const title = `${match.homeTeam} vs ${match.awayTeam}`;
  const atBeaujoire = match.venue.toUpperCase().includes('BEAUJOIRE');
  const event = {
    title,
    description: atBeaujoire || !match.venue ? match.competition : `${match.competition} • ${match.venue}`,
    location: atBeaujoire ? BEAUJOIRE_ADDRESS : match.venue,
    categories: [match.competition, 'Sport', 'Football'],
    url: 'https://www.fcnantes.com/'
  };

  if (match.kickoff) {
    return {
      ...event,
      uid: uid(match, match.kickoff),
      start: match.kickoff.getTime(),
      end: match.kickoff.getTime() + MATCH_DURATION_MS,
      alarms: [{ action: 'display', description: `🏈 Match dans 1h30 : ${title}`, trigger: { minutes: 90, before: true } }]
    };
  }

  if (match.days) {
    // Événement « journée entière » : la fin ICS est exclusive
    const end = new Date(match.days.end);
    end.setDate(end.getDate() + 1);
    return { ...event, uid: uid(match, match.days.start), start: dateOnly(match.days.start), end: dateOnly(end) };
  }

  return null;
}

function uid(match: Match, start: Date): string {
  const slug = (team: string) => team.toLowerCase().replace(/\s+/g, '');
  return `fcn-${slug(match.homeTeam)}-vs-${slug(match.awayTeam)}-${start.getTime()}@fcnantes.com`;
}

function dateOnly(date: Date): DateArray {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}
