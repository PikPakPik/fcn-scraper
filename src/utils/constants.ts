import { ScrapingConfig, CSSSelectors } from '../types/match.js';

/**
 * Configuration par défaut du scraper FC Nantes
 */
export const DEFAULT_CONFIG: ScrapingConfig = {
  baseUrl: 'https://billetterie.fcnantes.com',
  calendarUrl: 'https://billetterie.fcnantes.com/fr/prochains-matchs/calendrier',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  timeout: 30000,
  matchSelector: '[data-component="MatchCard"]'
};

/**
 * Sélecteurs CSS pour extraire les données des matchs
 */
export const CSS_SELECTORS: CSSSelectors = {
  teams: '.teamName--vertical',
  competition: '.matchMetaCat',
  venue: '.matchMetaVenue',
  dateTime: 'time[datetime]',
  dateText: '.matchMetaDate'
};

/**
 * Arguments Puppeteer pour l'environnement CI/CD
 */
export const PUPPETEER_ARGS: string[] = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
];

/**
 * Mapping des mois français vers leurs numéros
 */
export const FRENCH_MONTHS: Record<string, number> = {
  'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
  'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
  'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
};

/**
 * Adresse complète du stade de la Beaujoire
 */
export const BEAUJOIRE_ADDRESS = 'Stade de la Beaujoire, 330 Route de Saint-Joseph, 44300 Nantes, France';

/**
 * Durée estimée d'un match en heures
 */
export const MATCH_DURATION_HOURS = 2;

/**
 * Couleurs officielles du FC Nantes
 */
export const FC_NANTES_COLORS = '#FFE000';

/**
 * Durée des événements approximatifs en jours (week-end)
 */
export const APPROXIMATE_EVENT_DURATION_DAYS = 3; 