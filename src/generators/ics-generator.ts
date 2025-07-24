import { createEvents, EventAttributes } from 'ics';
import { writeFileSync } from 'fs';
import { Match, ICSGenerationOptions } from '../types/match.js';
import { BEAUJOIRE_ADDRESS, MATCH_DURATION_HOURS, FC_NANTES_COLORS, APPROXIMATE_EVENT_DURATION_DAYS } from '../utils/constants.js';
import { formatDateTime, formatDateOnly, calculateEventDuration } from '../utils/date-parser.js';
import { logger } from '../utils/logger.js';

/**
 * Générateur de fichiers ICS pour les matchs du FC Nantes
 */
export class ICSGenerator {
  private readonly options: Required<ICSGenerationOptions>;

  constructor(options: ICSGenerationOptions = {}) {
    this.options = {
      filename: 'calendrier-fcnantes.ics',
      timezone: 'Europe/Paris',
      calendarName: 'FC Nantes - Calendrier des matchs',
      calendarDescription: 'Calendrier automatique des matchs du FC Nantes',
      colors: FC_NANTES_COLORS,
      ...options
    };
  }

  /**
   * Génère le fichier ICS avec les matchs fournis
   * 
   * @param matches - Liste des matchs à inclure
   * @returns Promise<void>
   */
  async generateICSFile(matches: Match[]): Promise<void> {
    logger.progress('Génération du fichier ICS...');

    const events = this.convertMatchesToEvents(matches);
    
    if (events.length === 0) {
      logger.warn('Aucun événement avec date définie trouvé');
      return;
    }

    const { error, value } = createEvents(events);
    
    if (error) {
      logger.error('Erreur lors de la génération du fichier ICS:', error);
      return;
    }

    const enhancedContent = this.enhanceICSContent(value!);
    writeFileSync(this.options.filename, enhancedContent);
    
    this.displayGenerationInfo(events.length);
  }

  /**
   * Convertit les matchs en événements ICS
   */
  private convertMatchesToEvents(matches: Match[]): EventAttributes[] {
    return matches
      .filter(match => match.dateTime) // Inclure tous les matchs avec une date
      .map(match => this.createEventFromMatch(match));
  }

  /**
   * Crée un événement ICS à partir d'un match
   */
  private createEventFromMatch(match: Match): EventAttributes {
    const startDate = match.dateTime!;
    
    // Le titre respecte le format domicile/extérieur
    const title = `${match.homeTeam} vs ${match.awayTeam}`;
    
    const location = this.formatLocation(match.venue);
    const description = this.formatDescription(match, location);
    const uid = this.generateUID(match, startDate);

    // Déterminer le type d'événement selon la précision de la date
    let endDate: Date;
    let isAllDay = false;

    if (match.hasDefiniteTime) {
      // Date et heure précises -> événement de 2h
      endDate = new Date(startDate.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    } else if (match.hasDefiniteDate) {
      // Date précise sans heure -> événement toute la journée (1 jour)
      isAllDay = true;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1); // 1 jour seulement
    } else {
      // Date approximative -> calculer la durée selon le texte de date
      isAllDay = true;
      endDate = new Date(startDate);
      const duration = calculateEventDuration(match.date || '', startDate);
      endDate.setDate(endDate.getDate() + duration);
    }

    const baseEvent = {
      title,
      description,
      location,
      categories: [match.competition, 'Sport', 'Football'],
      uid,
      productId: 'fcnantes-scraper//FC Nantes Calendar//FR',
      url: 'https://www.fcnantes.com/'
    };

    if (isAllDay) {
      // Événement toute la journée (ou plusieurs jours) - pas d'alerte
      return {
        ...baseEvent,
        start: formatDateOnly(startDate),
        end: formatDateOnly(endDate)
      } as EventAttributes;
    } else {
      // Événement avec heure précise - avec alerte 1h30 avant
      return {
        ...baseEvent,
        start: formatDateTime(startDate),
        end: formatDateTime(endDate),
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
X-WR-CALNAME:${this.options.calendarName}
X-WR-CALDESC:${this.options.calendarDescription}
X-WR-TIMEZONE:${this.options.timezone}
X-PUBLISHED-TTL:PT1H
NAME:${this.options.calendarName}
DESCRIPTION:${this.options.calendarDescription}
COLOR:${this.options.colors}
X-APPLE-CALENDAR-COLOR:${this.options.colors}
X-OUTLOOK-COLOR:${this.options.colors}
REFRESH-INTERVAL:PT1H
X-WR-RELCALID:fcnantes-calendar
SOURCE;VALUE=URI:https://raw.githubusercontent.com/PikPakPik/fcn-scraper/main/calendrier-fcnantes.ics`
    );
  }

  /**
   * Affiche les informations sur le fichier ICS généré
   */
  private displayGenerationInfo(eventCount: number): void {
    logger.success(`Fichier ICS généré: ${this.options.filename}`);
    logger.info(`${eventCount} événements ajoutés au calendrier`);
    
    logger.info('Compatibilité optimisée pour:');
    logger.info('📱 Apple Calendar (iPhone/iPad/Mac)');
    logger.info('🌐 Google Calendar');
    logger.info('💼 Microsoft Outlook');
    logger.info('📅 Autres clients CalDAV/ICS');
  }
} 