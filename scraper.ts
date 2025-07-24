import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { createEvents, EventAttributes } from 'ics';
import moment from 'moment';
import { writeFileSync } from 'fs';

// ===========================
// TYPES & INTERFACES
// ===========================

interface Match {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string | null;
  dateTime: Date | null;
  venue: string;
  isHome: boolean;
  hasDefiniteDate: boolean;
}

interface ScrapingConfig {
  baseUrl: string;
  calendarUrl: string;
  userAgent: string;
  timeout: number;
  matchSelector: string;
}

// ===========================
// CONSTANTS
// ===========================

const CONFIG: ScrapingConfig = {
  baseUrl: 'https://billetterie.fcnantes.com',
  calendarUrl: 'https://billetterie.fcnantes.com/fr/prochains-matchs/calendrier',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  timeout: 30000,
  matchSelector: '[data-component="MatchCard"]'
};

const CSS_SELECTORS = {
  teams: '.teamName--vertical',
  competition: '.matchMetaCat',
  venue: '.matchMetaVenue',
  dateTime: 'time[datetime]',
  dateText: '.matchMetaDate'
};

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
];

const FRENCH_MONTHS: Record<string, number> = {
  'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
  'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
  'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
};

const BEAUJOIRE_ADDRESS = 'Stade de la Beaujoire, 330 Route de Saint-Joseph, 44300 Nantes, France';
const MATCH_DURATION_HOURS = 2;
const FC_NANTES_COLORS = '#FFE000';

// ===========================
// MAIN CLASS
// ===========================

/**
 * Scraper automatisé pour le calendrier des matchs du FC Nantes
 * Génère un fichier .ics compatible avec tous les clients de calendrier
 */
class FCNantesScraper {
  private readonly config: ScrapingConfig;

  constructor(config: ScrapingConfig = CONFIG) {
    this.config = config;
    moment.locale('fr');
  }

  /**
   * Point d'entrée principal - Lance le scraping et génère le fichier ICS
   */
  async run(): Promise<void> {
    try {
      console.log('🏈 FC Nantes Calendar Scraper');
      console.log('='.repeat(40));

      const matches = await this.scrapeMatches();
      this.displaySummary(matches);
      await this.generateICSFile(matches);

    } catch (error) {
      console.error('❌ Erreur générale:', error);
      throw error;
    }
  }

  /**
   * Récupère les matchs depuis le site de billetterie
   */
  private async scrapeMatches(): Promise<Match[]> {
    console.log('🚀 Démarrage du scraping...');

    const browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });

    try {
      const page = await browser.newPage();
      await this.configurePage(page);
      
      console.log('📱 Navigation vers la page calendrier...');
      await page.goto(this.config.calendarUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      await page.waitForSelector(this.config.matchSelector, { timeout: 10000 });
      
      console.log('📄 Récupération du contenu HTML...');
      const content = await page.content();
      
      return this.parseMatches(content);
    } finally {
      await browser.close();
    }
  }

  /**
   * Configure la page Puppeteer pour éviter la détection
   */
  private async configurePage(page: any): Promise<void> {
    await page.setUserAgent(this.config.userAgent);
  }

  /**
   * Parse le HTML et extrait les informations des matchs
   */
  private parseMatches(html: string): Match[] {
    const $ = cheerio.load(html);
    const matches: Match[] = [];

    console.log('🔍 Parsing des matchs...');

    $(this.config.matchSelector).each((index, element) => {
      try {
        const match = this.parseMatchCard($, $(element));
        if (match) {
          matches.push(match);
          console.log(`✅ ${match.homeTeam} vs ${match.awayTeam} - ${match.competition}`);
        }
      } catch (error) {
        console.error('❌ Erreur lors du parsing d\'un match:', error);
      }
    });

    return matches;
  }

  /**
   * Parse une carte de match individuelle
   */
  private parseMatchCard($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): Match | null {
    const teams = this.extractTeams($, $card);
    if (!teams) return null;

    const { homeTeam, awayTeam, isHome } = teams;
    const competition = this.extractCompetition($card);
    const venue = this.extractVenue($card);
    const dateInfo = this.extractDateInfo($card);

    return {
      homeTeam,
      awayTeam,
      competition,
      date: dateInfo.dateString,
      dateTime: dateInfo.dateTime,
      venue,
      isHome,
      hasDefiniteDate: dateInfo.hasDefiniteDate
    };
  }

  /**
   * Extrait les noms des équipes et détermine qui joue à domicile
   */
  private extractTeams($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>): { homeTeam: string; awayTeam: string; isHome: boolean } | null {
    const teams = $card.find(CSS_SELECTORS.teams)
      .map((i: number, el: any) => $(el).text().trim())
      .get();

    if (teams.length !== 2) return null;

    const [team1, team2] = teams;
    
    // Vérifier si c'est un match à domicile ou à l'extérieur
    const isHome = $card.hasClass('matchCard--home');
    const isAway = $card.hasClass('matchCard--away');
    
    // Déterminer si Nantes joue à domicile en cherchant "NANTES" dans les noms
    const nantesIsFirst = team1.toUpperCase().includes('NANTES');
    const nantesIsSecond = team2.toUpperCase().includes('NANTES');
    
    let homeTeam: string;
    let awayTeam: string;
    let finalIsHome: boolean;
    
    if (nantesIsFirst) {
      // NANTES est la première équipe
      if (isHome || (!isHome && !isAway)) {
        // Match à domicile : NANTES vs ADVERSAIRE
        homeTeam = team1; // NANTES
        awayTeam = team2; // ADVERSAIRE
        finalIsHome = true;
      } else {
        // Match à l'extérieur : ADVERSAIRE vs NANTES (on inverse)
        homeTeam = team2; // ADVERSAIRE
        awayTeam = team1; // NANTES
        finalIsHome = false;
      }
    } else if (nantesIsSecond) {
      // NANTES est la deuxième équipe
      if (isAway) {
        // Match à l'extérieur : ADVERSAIRE vs NANTES
        homeTeam = team1; // ADVERSAIRE
        awayTeam = team2; // NANTES
        finalIsHome = false;
      } else {
        // Match à domicile : NANTES vs ADVERSAIRE (on inverse)
        homeTeam = team2; // NANTES
        awayTeam = team1; // ADVERSAIRE
        finalIsHome = true;
      }
    } else {
      // Fallback si NANTES n'est pas trouvé
      homeTeam = team1;
      awayTeam = team2;
      finalIsHome = isHome;
    }

    return {
      homeTeam,
      awayTeam,
      isHome: finalIsHome
    };
  }

  /**
   * Extrait et nettoie le nom de la compétition
   */
  private extractCompetition($card: cheerio.Cheerio<any>): string {
    let competition = $card.find(CSS_SELECTORS.competition).text().trim();

    // Nettoyer les doublons (ex: "Match Amical • Match Amical")
    const parts = competition.split('•').map((part: string) => part.trim());
    if (parts.length === 2 && parts[0] === parts[1]) {
      competition = parts[0];
    }

    return competition;
  }

  /**
   * Extrait le lieu du match
   */
  private extractVenue($card: cheerio.Cheerio<any>): string {
    return $card.find(CSS_SELECTORS.venue).text().trim();
  }

  /**
   * Extrait les informations de date du match
   */
  private extractDateInfo($card: cheerio.Cheerio<any>): {
    dateTime: Date | null;
    dateString: string | null;
    hasDefiniteDate: boolean;
  } {
    const timeElement = $card.find(CSS_SELECTORS.dateTime);
    
    if (timeElement.length > 0) {
      // Date précise disponible
      const datetime = timeElement.attr('datetime');
      if (datetime) {
        return {
          dateTime: new Date(datetime),
          dateString: timeElement.text().trim(),
          hasDefiniteDate: true
        };
      }
    }

    // Date approximative seulement
    const dateText = $card.find(CSS_SELECTORS.dateText).text().trim();
    const approximateDate = this.parseApproximateDate(dateText);

    return {
      dateTime: approximateDate,
      dateString: dateText,
      hasDefiniteDate: false
    };
  }

  /**
   * Parse une date approximative (ex: "Week-end du 12, 13 & 14 septembre 2025")
   */
  private parseApproximateDate(dateText: string): Date | null {
    if (!dateText.includes('Week-end')) return null;

    const match = dateText.match(/(\d{1,2}),?\s*(\d{1,2})?\s*&?\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (!match) return null;

    const [, day1, , , month, year] = match;
    const monthNumber = FRENCH_MONTHS[month.toLowerCase()];
    
    if (monthNumber === undefined) return null;

    return new Date(parseInt(year), monthNumber - 1, parseInt(day1));
  }



  /**
   * Génère le fichier ICS avec les matchs
   */
  private async generateICSFile(matches: Match[], filename = 'calendrier-fcnantes.ics'): Promise<void> {
    console.log('\n📅 Génération du fichier ICS...');

    const events = this.convertMatchesToEvents(matches);
    
    if (events.length === 0) {
      console.log('⚠️  Aucun événement avec date définie trouvé');
      return;
    }

    const { error, value } = createEvents(events);
    
    if (error) {
      console.error('❌ Erreur lors de la génération du fichier ICS:', error);
      return;
    }

    const enhancedContent = this.enhanceICSContent(value!);
    writeFileSync(filename, enhancedContent);
    
    this.displayICSInfo(filename, events.length);
  }

  /**
   * Convertit les matchs en événements ICS
   */
  private convertMatchesToEvents(matches: Match[]): EventAttributes[] {
    return matches
      .filter(match => match.dateTime) // Inclure tous les matchs avec une date (précise ou approximative)
      .map(match => this.createEventFromMatch(match));
  }

  /**
   * Crée un événement ICS à partir d'un match
   */
  private createEventFromMatch(match: Match): EventAttributes {
    const startDate = match.dateTime!;
    
    // Le titre est déjà formaté correctement selon domicile/extérieur
    // Domicile: NANTES vs ADVERSAIRE | Extérieur: ADVERSAIRE vs NANTES
    const title = `${match.homeTeam} vs ${match.awayTeam}`;
    
    const location = this.formatLocation(match.venue);
    const description = this.formatDescription(match, location);
    const uid = this.generateUID(match, startDate);

    // Déterminer le type d'événement selon la précision de la date
    let endDate: Date;
    let isAllDay = false;

    if (match.hasDefiniteDate) {
      // Date et heure précises -> événement de 2h
      endDate = new Date(startDate.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    } else {
      // Date approximative -> événement de 3 jours (week-end)
      isAllDay = true;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3); // 3 jours pour couvrir le week-end
    }

    if (isAllDay) {
      // Événement toute la journée (ou plusieurs jours) - pas d'alerte
      return {
        title,
        description,
        start: this.formatDateOnly(startDate),
        end: this.formatDateOnly(endDate),
        location,
        categories: [match.competition, 'Sport', 'Football'],
        uid,
        productId: 'fcnantes-scraper//FC Nantes Calendar//FR',
        url: 'https://www.fcnantes.com/'
      } as EventAttributes;
    } else {
      // Événement avec heure précise - avec alerte 1h30 avant
      return {
        title,
        description,
        start: this.formatDateTime(startDate),
        end: this.formatDateTime(endDate),
        location,
        categories: [match.competition, 'Sport', 'Football'],
        uid,
        productId: 'fcnantes-scraper//FC Nantes Calendar//FR',
        url: 'https://www.fcnantes.com/',
        alarms: [
          {
            action: 'display',
            description: `🏈 Match dans 1h30 : ${title}`,
            trigger: { minutes: 90, before: true }
          }
        ]
      } as EventAttributes;
    }
  }

  /**
   * Formate l'adresse du lieu
   */
  private formatLocation(venue: string): string {
    if (venue && venue.toUpperCase().includes('BEAUJOIRE')) {
      return BEAUJOIRE_ADDRESS;
    }
    return venue;
  }

  /**
   * Formate la description de l'événement
   */
  private formatDescription(match: Match, location: string): string {
    const parts = [match.competition];
    
    if (location && !location.toUpperCase().includes('BEAUJOIRE')) {
      parts.push(location);
    }
    
    return parts.join(' • ');
  }

  /**
   * Génère un UID unique pour l'événement
   */
  private generateUID(match: Match, startDate: Date): string {
    const homeTeam = match.homeTeam.toLowerCase().replace(/\s+/g, '');
    const awayTeam = match.awayTeam.toLowerCase().replace(/\s+/g, '');
    const timestamp = startDate.getTime();
    
    return `fcn-${homeTeam}-vs-${awayTeam}-${timestamp}@fcnantes.com`;
  }

  /**
   * Formate une date pour ICS
   */
  private formatDateTime(date: Date): [number, number, number, number, number] {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    ];
  }

  /**
   * Formate une date pour un événement toute la journée (sans heure)
   */
  private formatDateOnly(date: Date): [number, number, number] {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    ];
  }

  /**
   * Améliore le contenu ICS avec des métadonnées pour tous les clients
   */
  private enhanceICSContent(content: string): string {
    return content.replace(
      'BEGIN:VCALENDAR',
      `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FC Nantes Scraper//FC Nantes Calendar//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:FC Nantes - Calendrier des matchs
X-WR-CALDESC:Calendrier automatique des matchs du FC Nantes
X-WR-TIMEZONE:Europe/Paris
X-PUBLISHED-TTL:PT1H
NAME:FC Nantes - Calendrier des matchs
DESCRIPTION:Calendrier automatique des matchs du FC Nantes
COLOR:${FC_NANTES_COLORS}
X-APPLE-CALENDAR-COLOR:${FC_NANTES_COLORS}
X-OUTLOOK-COLOR:${FC_NANTES_COLORS}
REFRESH-INTERVAL:PT1H
X-WR-RELCALID:fcnantes-calendar
SOURCE;VALUE=URI:https://raw.githubusercontent.com/[USERNAME]/[REPOSITORY]/main/calendrier-fcnantes.ics`
    );
  }

  /**
   * Affiche le résumé des matchs trouvés
   */
  private displaySummary(matches: Match[]): void {
    console.log(`\n📋 Résumé: ${matches.length} matchs trouvés`);

    const withDate = matches.filter(m => m.hasDefiniteDate).length;
    const withoutDate = matches.filter(m => !m.hasDefiniteDate).length;

    console.log(`   - ${withDate} avec date précise`);
    console.log(`   - ${withoutDate} avec date approximative`);

    const pendingMatches = matches.filter(m => !m.hasDefiniteDate);
    if (pendingMatches.length > 0) {
      console.log('\n⏰ Matchs avec date à confirmer:');
      pendingMatches.forEach(match => {
        console.log(`   - ${match.homeTeam} vs ${match.awayTeam} (${match.date})`);
      });
    }
  }

  /**
   * Affiche les informations sur le fichier ICS généré
   */
  private displayICSInfo(filename: string, eventCount: number): void {
    console.log(`✅ Fichier ICS généré: ${filename}`);
    console.log(`📊 ${eventCount} événements ajoutés au calendrier`);
    console.log(`🔄 Compatibilité optimisée pour:`);
    console.log(`   📱 Apple Calendar (iPhone/iPad/Mac)`);
    console.log(`   🌐 Google Calendar`);
    console.log(`   💼 Microsoft Outlook`);
    console.log(`   📅 Autres clients CalDAV/ICS`);
  }
}

// ===========================
// EXECUTION
// ===========================

if (require.main === module) {
  const scraper = new FCNantesScraper();
  scraper.run().catch(console.error);
}

export default FCNantesScraper;
