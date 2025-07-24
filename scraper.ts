import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { createEvents, EventAttributes } from 'ics';
import moment from 'moment';
import { writeFileSync } from 'fs';

// Interface pour représenter un match
interface Match {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string | null;
  dateTime: Date | null;
  venue: string;
  isHome: boolean;
  hasDefiniteDate: boolean;
  ticketLink?: string;
  priority?: string;
}

// Configuration locale française pour moment
moment.locale('fr');

class FCNantesScraper {
  private readonly baseUrl = 'https://billetterie.fcnantes.com';
  private readonly calendarUrl = 'https://billetterie.fcnantes.com/fr/prochains-matchs/calendrier';

  async scrapeMatches(): Promise<Match[]> {
    console.log('🚀 Démarrage du scraping...');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Configuration pour éviter la détection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log('📱 Navigation vers la page calendrier...');
      await page.goto(this.calendarUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Attendre que les cards de matchs soient chargées
      await page.waitForSelector('[data-component="MatchCard"]', { timeout: 10000 });
      
      console.log('📄 Récupération du contenu HTML...');
      const content = await page.content();
      
      return this.parseMatches(content);
    } finally {
      await browser.close();
    }
  }

  private parseMatches(html: string): Match[] {
    const $ = cheerio.load(html);
    const matches: Match[] = [];
    
    console.log('🔍 Parsing des matchs...');
    
    $('[data-component="MatchCard"]').each((index, element) => {
      try {
        const $card = $(element);
        
        // Extraction des équipes
        const teams = $card.find('.teamName--vertical').map((i, el) => $(el).text().trim()).get();
        if (teams.length !== 2) return;
        
        const [team1, team2] = teams;
        
        // Déterminer si Nantes joue à domicile ou à l'extérieur
        const isHome = $card.hasClass('matchCard--home');
        const homeTeam = isHome ? team1 : team2;
        const awayTeam = isHome ? team2 : team1;
        
        // Extraction de la compétition
        let competition = $card.find('.matchMetaCat').text().trim();
        
        // Nettoyer la compétition en cas de duplication (ex: "Match Amical • Match Amical")
        const competitionParts = competition.split('•').map(part => part.trim());
        if (competitionParts.length === 2 && competitionParts[0] === competitionParts[1]) {
          competition = competitionParts[0];
        }
        
        // Extraction du lieu
        const venue = $card.find('.matchMetaVenue').text().trim();
        
        // Extraction de la date
        const timeElement = $card.find('time[datetime]');
        let dateTime: Date | null = null;
        let dateString: string | null = null;
        let hasDefiniteDate = false;
        
        if (timeElement.length > 0) {
          // Match avec date précise
          const datetime = timeElement.attr('datetime');
          if (datetime) {
            dateTime = new Date(datetime);
            hasDefiniteDate = true;
            dateString = timeElement.text().trim();
          }
        } else {
          // Match avec date approximative
          const dateText = $card.find('.matchMetaDate').text().trim();
          dateString = dateText;
          
          // Essayer d'extraire une date approximative
          if (dateText.includes('Week-end')) {
            const dateMatch = dateText.match(/(\d{1,2}),?\s*(\d{1,2})?\s*&?\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
            if (dateMatch) {
              const [, day1, day2, day3, month, year] = dateMatch;
              // Prendre le premier jour du week-end comme date approximative
              const monthNumber = this.getMonthNumber(month);
              if (monthNumber !== -1) {
                dateTime = new Date(parseInt(year), monthNumber - 1, parseInt(day1));
              }
            }
          }
        }
        
        // Extraction du lien de réservation
        let ticketLink: string | undefined;
        const reservationLink = $card.find('a[href*="/catalogue/"]');
        if (reservationLink.length > 0) {
          const href = reservationLink.attr('href');
          if (href) {
            ticketLink = href.startsWith('http') ? href : this.baseUrl + href;
          }
        }
        
        // Extraction de la priorité
        const priority = $card.find('.matchCardFlag').text().trim() || undefined;
        
        const match: Match = {
          homeTeam,
          awayTeam,
          competition,
          date: dateString,
          dateTime,
          venue,
          isHome,
          hasDefiniteDate,
          ticketLink,
          priority
        };
        
        matches.push(match);
        
        console.log(`✅ Match trouvé: ${homeTeam} vs ${awayTeam} - ${competition} - ${dateString || 'Date TBD'}`);
        
      } catch (error) {
        console.error('❌ Erreur lors du parsing d\'un match:', error);
      }
    });
    
    return matches;
  }

  private getMonthNumber(monthName: string): number {
    const months: { [key: string]: number } = {
      'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
      'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
    };
    return months[monthName.toLowerCase()] || -1;
  }

  async generateICSFile(matches: Match[], filename = 'calendrier-fcnantes.ics'): Promise<void> {
    console.log('📅 Génération du fichier ICS...');
    
    const events: EventAttributes[] = matches
      .filter(match => match.dateTime) // Exclure les matchs sans date
      .map(match => {
        const startDate = match.dateTime!;
        
        // Durée estimée d'un match (2h)
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        
        const title = `${match.homeTeam} vs ${match.awayTeam}`;
        const description = `Compétition: ${match.competition}`;
        
        // Convertir le lieu en adresse complète si c'est la Beaujoire
        let location = match.venue;
        if (match.venue && match.venue.toUpperCase().includes('BEAUJOIRE')) {
          location = '333 Rte de Saint-Joseph, 44300 Nantes';
        }
        
        return {
          title,
          description,
          start: [
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes()
          ] as [number, number, number, number, number],
          end: [
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate(),
            endDate.getHours(),
            endDate.getMinutes()
          ] as [number, number, number, number, number],
          location,
          categories: [match.competition],
          status: 'CONFIRMED',
          organizer: { name: 'FC Nantes', email: 'contact@fcnantes.com' }
        };
      });
    
    if (events.length === 0) {
      console.log('⚠️  Aucun événement avec date définie trouvé');
      return;
    }
    
    const { error, value } = createEvents(events);
    
    if (error) {
      console.error('❌ Erreur lors de la génération du fichier ICS:', error);
      return;
    }
    
    writeFileSync(filename, value!);
    console.log(`✅ Fichier ICS généré: ${filename}`);
    console.log(`📊 ${events.length} événements ajoutés au calendrier`);
  }

  async run(): Promise<void> {
    try {
      const matches = await this.scrapeMatches();
      
      console.log(`\n📋 Résumé: ${matches.length} matchs trouvés`);
      
      // Afficher les statistiques
      const withDate = matches.filter(m => m.hasDefiniteDate).length;
      const withoutDate = matches.filter(m => !m.hasDefiniteDate).length;
      
      console.log(`   - ${withDate} avec date précise`);
      console.log(`   - ${withoutDate} avec date approximative`);
      
      // Afficher les matchs sans date précise
      const matchesWithoutDate = matches.filter(m => !m.hasDefiniteDate);
      if (matchesWithoutDate.length > 0) {
        console.log('\n⏰ Matchs avec date à confirmer:');
        matchesWithoutDate.forEach(match => {
          console.log(`   - ${match.homeTeam} vs ${match.awayTeam} (${match.date})`);
        });
      }
      
      await this.generateICSFile(matches);
      
    } catch (error) {
      console.error('❌ Erreur générale:', error);
    }
  }
}

// Exécution du script
if (require.main === module) {
  const scraper = new FCNantesScraper();
  scraper.run();
}

export default FCNantesScraper;
