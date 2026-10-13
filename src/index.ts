import { writeFileSync } from 'node:fs';
import { scrapeMatches } from './scrapers/fc-nantes.js';
import { generateICS } from './generators/ics-generator.js';

const OUTPUT_FILE = 'calendrier-fcnantes.ics';

console.log('🚀 Scraping du calendrier FC Nantes...');
const matches = await scrapeMatches();

for (const m of matches) {
  const status = m.kickoff ? '✅' : m.days ? '⏳' : '❌ (exclu)';
  const when = m.kickoff?.toISOString() ?? (m.dateText || 'pas de date');
  console.log(`${status} ${m.homeTeam} vs ${m.awayTeam} - ${m.competition} - ${when}`);
}

writeFileSync(OUTPUT_FILE, generateICS(matches));
console.log(`📅 ${OUTPUT_FILE} généré (${matches.length} matchs trouvés)`);
