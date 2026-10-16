/**
 * Catégories d'activités.
 *
 * Le `code` est utilisé dans les données et dans le code (anglais, sans accent).
 * Le `label` et l'`emoji` servent uniquement à l'affichage : on peut les modifier
 * sans toucher au catalogue ni au générateur.
 */
export const CATEGORIES = [
  { code: 'food', label: 'Nourriture', emoji: '🍜' },
  { code: 'thrift', label: 'Friperies & shopping', emoji: '👕' },
  { code: 'gaming', label: 'Jeux vidéo & gaming', emoji: '🎮' },
  { code: 'culture', label: 'Culture & musées', emoji: '🏛️' },
  { code: 'sport', label: 'Sport & activités physiques', emoji: '🧗' },
  { code: 'cinema', label: 'Cinéma', emoji: '🎬' },
  { code: 'shows', label: 'Spectacles & stand-up', emoji: '🎤' },
  { code: 'nature', label: 'Nature & promenades', emoji: '🌳' },
];

/** Types de coût possibles pour une activité. */
export const COST_TYPES = [
  { code: 'free', label: 'Gratuit' },
  { code: 'ticket', label: 'Entrée payante' },
  { code: 'consumption', label: 'Consommation sur place' },
  { code: 'mixed', label: 'Entrée + consommation' },
];

/** Publics possibles (« avec qui je sors »). */
export const AUDIENCES = [
  { code: 'solo', label: 'Seul·e' },
  { code: 'couple', label: 'En couple' },
  { code: 'friends', label: 'Entre amis' },
];

// Listes de codes, pratiques pour les vérifications (ex. : CATEGORY_CODES.includes(x)).
export const CATEGORY_CODES = CATEGORIES.map((category) => category.code);
export const COST_TYPE_CODES = COST_TYPES.map((costType) => costType.code);
export const AUDIENCE_CODES = AUDIENCES.map((audience) => audience.code);
