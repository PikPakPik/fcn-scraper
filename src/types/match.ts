/**
 * Représente un match de football
 */
export interface Match {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string | null;
  dateTime: Date | null;
  venue: string;
  isHome: boolean;
  hasDefiniteDate: boolean;
  hasDefiniteTime: boolean; // Nouvelle propriété pour distinguer date précise avec/sans heure
}

/**
 * Configuration du scraper
 */
export interface ScrapingConfig {
  baseUrl: string;
  calendarUrl: string;
  userAgent: string;
  timeout: number;
  matchSelector: string;
}

/**
 * Options pour la génération du fichier ICS
 */
export interface ICSGenerationOptions {
  filename?: string;
  timezone?: string;
  calendarName?: string;
  calendarDescription?: string;
  colors?: string;
}

/**
 * Sélecteurs CSS pour le scraping
 */
export interface CSSSelectors {
  teams: string;
  competition: string;
  venue: string;
  dateTime: string;
  dateText: string;
}

/**
 * Statistiques du scraping
 */
export interface ScrapingStats {
  total: number;
  withDefiniteDateTime: number; // Date + heure précises
  withDefiniteDate: number; // Date précise sans heure
  withApproximateDate: number; // Date approximative
  withAnyDate: number;
  excluded: number;
} 