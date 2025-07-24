import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { Match, ScrapingConfig, ScrapingStats } from '../types/match.js';
import { DEFAULT_CONFIG, CSS_SELECTORS, PUPPETEER_ARGS } from '../utils/constants.js';
import { parseApproximateDate, isDefiniteDate } from '../utils/date-parser.js';
import { logger } from '../utils/logger.js';

/**
 * Scraper pour le site de billetterie du FC Nantes
 */
export class FCNantesScraper {
  private readonly config: ScrapingConfig;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Récupère tous les matchs depuis le site de billetterie
   * 
   * @returns Promise<Match[]> - Liste des matchs trouvés
   */
  async scrapeMatches(): Promise<Match[]> {
    logger.start('Démarrage du scraping...');

    const browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });

    try {
      const page = await browser.newPage();
      await this.configurePage(page);
      
      logger.progress('Navigation vers la page calendrier...');
      await page.goto(this.config.calendarUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      await page.waitForSelector(this.config.matchSelector, { timeout: 10000 });
      
      logger.progress('Récupération du contenu HTML...');
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

    logger.progress('Parsing des matchs...');

    $(this.config.matchSelector).each((index, element) => {
      try {
        const match = this.parseMatchCard($, $(element));
        if (match) {
          matches.push(match);
          logger.success(`${match.homeTeam} vs ${match.awayTeam} - ${match.competition}`);
        }
      } catch (error) {
        logger.error('Erreur lors du parsing d\'un match:', error);
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
      hasDefiniteDate: dateInfo.hasDefiniteDate,
      hasDefiniteTime: dateInfo.hasDefiniteTime
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
    hasDefiniteTime: boolean;
  } {
    const timeElement = $card.find(CSS_SELECTORS.dateTime);
    
    if (timeElement.length > 0) {
      // Date et heure précises disponibles
      const datetime = timeElement.attr('datetime');
      if (datetime) {
        return {
          dateTime: new Date(datetime),
          dateString: timeElement.text().trim(),
          hasDefiniteDate: true,
          hasDefiniteTime: true
        };
      }
    }

    // Date sans heure précise
    const dateText = $card.find(CSS_SELECTORS.dateText).text().trim();
    const approximateDate = parseApproximateDate(dateText);
    const isDefiniteDateText = isDefiniteDate(dateText);

    return {
      dateTime: approximateDate,
      dateString: dateText,
      hasDefiniteDate: isDefiniteDateText,
      hasDefiniteTime: false
    };
  }

  /**
   * Génère des statistiques de scraping
   */
  generateStats(matches: Match[]): ScrapingStats {
    const withDefiniteDateTime = matches.filter(m => m.hasDefiniteTime).length;
    const withDefiniteDate = matches.filter(m => m.hasDefiniteDate && !m.hasDefiniteTime).length;
    const withApproximateDate = matches.filter(m => !m.hasDefiniteDate && m.dateTime).length;
    const withAnyDate = matches.filter(m => m.dateTime).length;
    const excluded = matches.filter(m => !m.dateTime).length;

    return {
      total: matches.length,
      withDefiniteDateTime,
      withDefiniteDate,
      withApproximateDate,
      withAnyDate,
      excluded
    };
  }

  /**
   * Affiche les statistiques de scraping
   */
  displayStats(matches: Match[]): void {
    const stats = this.generateStats(matches);
    
    logger.summary(`Résumé: ${stats.total} matchs trouvés`, {
      'avec date et heure précises': stats.withDefiniteDateTime,
      'avec date précise (sans heure)': stats.withDefiniteDate,
      'avec date approximative': stats.withApproximateDate,
      'total avec date': stats.withAnyDate
    });

    // Afficher les matchs avec date précise mais sans heure
    const dateOnlyMatches = matches.filter(m => m.hasDefiniteDate && !m.hasDefiniteTime);
    if (dateOnlyMatches.length > 0) {
      logger.info('Matchs avec date précise (heure à confirmer):');
      dateOnlyMatches.forEach(match => {
        logger.info(`${match.homeTeam} vs ${match.awayTeam} (${match.date})`);
      });
    }

    // Afficher les matchs avec date approximative
    const approximateMatches = matches.filter(m => !m.hasDefiniteDate && m.dateTime);
    if (approximateMatches.length > 0) {
      logger.warn('Matchs avec date approximative:');
      approximateMatches.forEach(match => {
        logger.info(`${match.homeTeam} vs ${match.awayTeam} (${match.date})`);
      });
    }

    // Afficher les matchs exclus
    const excludedMatches = matches.filter(m => !m.dateTime);
    if (excludedMatches.length > 0) {
      logger.error('Matchs sans date (exclus du calendrier):');
      excludedMatches.forEach(match => {
        logger.error(`${match.homeTeam} vs ${match.awayTeam} (${match.date || 'Aucune date'})`);
      });
    }
  }
} 