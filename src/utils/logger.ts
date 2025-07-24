/**
 * Niveaux de log disponibles
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Configuration du logger
 */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

/**
 * Logger simple et configurable
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.config = config;
  }

  /**
   * Log un message d'erreur
   */
  error(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.ERROR) {
      console.error(`❌ ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message d'avertissement
   */
  warn(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.WARN) {
      console.warn(`⚠️  ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message d'information
   */
  info(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`ℹ️  ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message de succès
   */
  success(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`✅ ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message de démarrage d'action
   */
  start(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`🚀 ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message de progression
   */
  progress(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`📱 ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Log un message de debug
   */
  debug(message: string, ...args: any[]): void {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(`🔍 ${this.formatMessage(message)}`, ...args);
    }
  }

  /**
   * Affiche un titre/section
   */
  title(message: string): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`\n🏈 ${message}`);
      console.log('='.repeat(40));
    }
  }

  /**
   * Affiche un résumé avec des statistiques
   */
  summary(title: string, stats: Record<string, number | string>): void {
    if (this.config.level >= LogLevel.INFO) {
      console.log(`\n📋 ${title}`);
      Object.entries(stats).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value}`);
      });
    }
  }

  /**
   * Formate un message avec le préfixe si configuré
   */
  private formatMessage(message: string): string {
    return this.config.prefix ? `[${this.config.prefix}] ${message}` : message;
  }
}

/**
 * Instance globale du logger
 */
export const logger = new Logger({ level: LogLevel.INFO, prefix: 'FCN-Scraper' });

/**
 * Crée un logger avec une configuration personnalisée
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
} 