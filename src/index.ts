import moment from 'moment';
import { FCNantesScraper } from './scrapers/fc-nantes.js';
import { ICSGenerator } from './generators/ics-generator.js';
import { logger } from './utils/logger.js';

/**
 * Application principale - Scraper automatisé pour le calendrier FC Nantes
 */
class FCNantesCalendarApp {
  private readonly scraper: FCNantesScraper;
  private readonly generator: ICSGenerator;

  constructor() {
    // Configurer moment.js en français
    moment.locale('fr');
    
    // Initialiser les modules
    this.scraper = new FCNantesScraper();
    this.generator = new ICSGenerator();
  }

  /**
   * Lance l'application complète
   */
  async run(): Promise<void> {
    try {
      logger.title('FC Nantes Calendar Scraper');

      // Étape 1: Scraper les matchs
      const matches = await this.scraper.scrapeMatches();
      
      // Étape 2: Afficher les statistiques
      this.scraper.displayStats(matches);
      
      // Étape 3: Générer le fichier ICS
      await this.generator.generateICSFile(matches);

      logger.success('Processus terminé avec succès !');

    } catch (error) {
      logger.error('Erreur générale de l\'application:', error);
      throw error;
    }
  }
}

/**
 * Point d'entrée du script
 */
async function main(): Promise<void> {
  const app = new FCNantesCalendarApp();
  await app.run();
}

// Exécuter seulement si ce fichier est lancé directement
// Note: Pour ES modules, on pourrait utiliser import.meta.url
// Ici on utilise une approche compatible avec le setup actuel
if (process.argv[1] && process.argv[1].endsWith('index.ts') || process.argv[1] && process.argv[1].endsWith('index.js')) {
  main().catch((error) => {
    logger.error('Erreur fatale:', error);
    process.exit(1);
  });
}

// Exports pour utilisation en tant que module
export { FCNantesCalendarApp };
export { FCNantesScraper } from './scrapers/fc-nantes.js';
export { ICSGenerator } from './generators/ics-generator.js';
export * from './types/match.js';
export * from './utils/constants.js';
export * from './utils/date-parser.js';
export * from './utils/logger.js'; 