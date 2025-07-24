import { FRENCH_MONTHS } from './constants.js';

/**
 * Parse une date française en objet Date avec gestion des événements multi-mois
 * 
 * Gère différents formats comme :
 * - "Week-end du 12, 13 & 14 septembre 2025" (approximative)
 * - "Week-end du 27, 28 janvier & 1er février 2026" (traverse deux mois)
 * - "Samedi 16 mai 2026" (précise sans heure)
 * - "Dimanche 30 novembre 2025" (précise sans heure)
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

  // Cas spécial : événement qui traverse deux mois
  // Ex: "Week-end du 27, 28 janvier & 1er février 2026"
  const multiMonthMatch = text.match(/(\d{1,2}),?\s*(\d{1,2})\s+(\w+)\s*&\s*(\d{1,2})\s+(\w+)\s+\d{4}/);
  if (multiMonthMatch) {
    const [, day1, day2, month1, day3, month2] = multiMonthMatch;
    const month1Number = FRENCH_MONTHS[month1.toLowerCase()];
    const month2Number = FRENCH_MONTHS[month2.toLowerCase()];
    
    if (month1Number && month2Number) {
      // Prendre la date du premier mois comme date de début
      return new Date(year, month1Number - 1, parseInt(day1));
    }
  }

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
 * Détermine si une chaîne de date représente une date précise ou approximative
 * 
 * @param dateText - Texte de la date en français
 * @returns true si c'est une date précise (un jour spécifique), false si approximative
 */
export function isDefiniteDate(dateText: string): boolean {
  // Dates précises : "Dimanche 30 novembre 2025", "Samedi 16 mai 2026"
  const definiteDatePatterns = [
    /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+\d{1,2}\s+\w+\s+\d{4}$/i
  ];
  
  // Dates approximatives : "Week-end du...", "Mardi X, mercredi Y ou jeudi Z..."
  const approximateDatePatterns = [
    /Week[- ]end du/i,
    /,.*ou.*\w+/i, // Contient ", ... ou ..."
    /&/i // Contient "&" pour plusieurs jours
  ];
  
  // Vérifier si c'est une date précise
  for (const pattern of definiteDatePatterns) {
    if (pattern.test(dateText.trim())) {
      return true;
    }
  }
  
  // Vérifier si c'est explicitement approximatif
  for (const pattern of approximateDatePatterns) {
    if (pattern.test(dateText)) {
      return false;
    }
  }
  
  // Par défaut, considérer comme approximatif si incertain
  return false;
}

/**
 * Calcule la durée en jours d'un événement basé sur le texte de date
 * 
 * @param dateText - Texte de la date en français
 * @param startDate - Date de début de l'événement
 * @returns Nombre de jours que devrait durer l'événement
 */
export function calculateEventDuration(dateText: string, startDate: Date): number {
  const text = dateText.replace(/1er/g, '1'); // "1er" -> "1"
  
  // Cas spécial : événement qui traverse deux mois
  // Ex: "Week-end du 27, 28 janvier & 1er février 2026"
  const multiMonthMatch = text.match(/(\d{1,2}),?\s*(\d{1,2})\s+(\w+)\s*&\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (multiMonthMatch) {
    const [, day1, day2, month1, day3, month2, year] = multiMonthMatch;
    const month1Number = FRENCH_MONTHS[month1.toLowerCase()];
    const month2Number = FRENCH_MONTHS[month2.toLowerCase()];
    
    if (month1Number && month2Number) {
      // Calculer la date de fin (dernier jour mentionné dans le second mois)
      const endDate = new Date(parseInt(year), month2Number - 1, parseInt(day3));
      
      // Calculer la différence en jours + 1 pour inclure le jour de fin
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return diffDays;
    }
  }
  
  // Cas par défaut : événement de week-end (3 jours)
  return 3;
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