import { FRENCH_MONTHS } from './constants.js';

/**
 * Parse une date approximative française en objet Date
 * 
 * Gère différents formats comme :
 * - "Week-end du 12, 13 & 14 septembre 2025"
 * - "Samedi 16 mai 2026"
 * - "Dimanche 30 novembre 2025"
 * - "Week-end du 1er, 2 & 3 mai 2026"
 * 
 * @param dateText - Texte de la date en français
 * @returns Date parsée ou null si impossible à parser
 */
export function parseApproximateDate(dateText: string): Date | null {
  // Normaliser le texte
  const text = dateText.replace(/1er/g, '1'); // "1er" -> "1"
  
  // Extraire l'année (toujours à la fin)
  const yearMatch = text.match(/(\d{4})$/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  // Extraire le mois (chercher tous les mois français dans le texte)
  let monthNumber = -1;
  for (const [monthName, monthNum] of Object.entries(FRENCH_MONTHS)) {
    if (text.toLowerCase().includes(monthName)) {
      monthNumber = monthNum;
      break;
    }
  }
  
  if (monthNumber === -1) return null;

  // Extraire le premier jour mentionné dans le texte
  const dayMatch = text.match(/\b(\d{1,2})\b/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1]);

  // Vérifier que la date est valide
  if (day < 1 || day > 31 || monthNumber < 1 || monthNumber > 12) return null;

  return new Date(year, monthNumber - 1, day);
}

/**
 * Formate une date pour un événement ICS avec heure
 * 
 * @param date - Date à formater
 * @returns Tuple [année, mois, jour, heure, minute]
 */
export function formatDateTime(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ];
}

/**
 * Formate une date pour un événement ICS toute la journée
 * 
 * @param date - Date à formater
 * @returns Tuple [année, mois, jour]
 */
export function formatDateOnly(date: Date): [number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ];
} 