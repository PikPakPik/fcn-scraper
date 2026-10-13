import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { parseFrenchDays, type DayRange } from '../utils/date-parser.js';

const CALENDAR_URL = 'https://billetterie.fcnantes.com/fr/prochains-matchs/calendrier';
const MATCH_CARD = '[data-component="MatchCard"]';
// ponytail: UA figé ; à faire évoluer seulement si la billetterie se met à bloquer le scraping
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export interface Match {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  venue: string;
  dateText: string;
  /** Date et heure exactes, quand elles sont annoncées */
  kickoff: Date | null;
  /** Sinon, le ou les jours annoncés */
  days: DayRange | null;
}

/** Récupère les matchs depuis la billetterie (le calendrier est rendu en JS, d'où Puppeteer) */
export async function scrapeMatches(): Promise<Match[]> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(CALENDAR_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
    await page.waitForSelector(MATCH_CARD, { timeout: 10_000 });
    return parseMatches(await page.content());
  } finally {
    await browser.close();
  }
}

export function parseMatches(html: string): Match[] {
  const $ = cheerio.load(html);

  return $(MATCH_CARD).toArray().flatMap(el => {
    const card = $(el);
    const teams = card.find('.teamName--vertical').toArray().map(t => $(t).text().trim());
    if (teams.length !== 2) return [];

    // Le site ne met pas toujours l'équipe qui reçoit en premier : on remet Nantes à sa place
    const nantesIndex = teams.findIndex(t => t.toUpperCase().includes('NANTES'));
    if (nantesIndex !== -1 && card.hasClass('matchCard--away') === (nantesIndex === 0)) teams.reverse();

    const time = card.find('time[datetime]');
    const iso = time.attr('datetime');
    const dateText = (iso ? time : card.find('.matchMetaDate')).text().trim();

    return [{
      homeTeam: teams[0],
      awayTeam: teams[1],
      // "Match Amical • Match Amical" → "Match Amical"
      competition: [...new Set(card.find('.matchMetaCat').text().split('•').map(s => s.trim()))].join(' • '),
      venue: card.find('.matchMetaVenue').text().trim(),
      dateText,
      kickoff: iso ? new Date(iso) : null,
      days: iso ? null : parseFrenchDays(dateText)
    }];
  });
}
