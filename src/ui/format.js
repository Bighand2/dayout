/**
 * Mise en forme des valeurs affichées (prix, durées, lieux).
 * Fonctions pures : elles ne touchent pas à la page et sont testées avec Node.
 */

// Espace insécable : « 12 € » ou « 1 h 30 » ne seront jamais coupés en fin de ligne.
const NBSP = ' ';

const COST_LABELS = {
  ticket: 'Entrée',
  consumption: 'Conso. estimée',
  mixed: 'Entrée + conso.',
};

/** 12 → « 12 € », 2.55 → « 2,55 € » */
export function formatEuros(amount) {
  return `${formatAmount(amount)}${NBSP}€`;
}

/** (5, 12) → « 5 à 12 € », (8, 8) → « 8 € » */
export function formatEuroRange(min, max) {
  return min === max ? formatEuros(max) : `${formatAmount(min)} à ${formatEuros(max)}`;
}

/** Prix d'une activité, avec la nature du coût : « Entrée : 7 à 10 € », « Gratuit »… */
export function formatCost({ type, min_eur: min, max_eur: max }) {
  if (min === null || max === null) return 'Prix inconnu';
  if (max === 0) return 'Gratuit';
  return `${COST_LABELS[type] ?? 'Prix'} : ${formatEuroRange(min, max)}`;
}

/** 45 → « 45 min », 60 → « 1 h », 90 → « 1 h 30 » */
export function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}${NBSP}min`;
  if (minutes === 0) return `${hours}${NBSP}h`;
  return `${hours}${NBSP}h${NBSP}${String(minutes).padStart(2, '0')}`;
}

/** (60, 90) → « 1 h à 1 h 30 » */
export function formatDurationRange(min, max) {
  return min === max ? formatDuration(min) : `${formatDuration(min)} à ${formatDuration(max)}`;
}

/** 1 → « 1er », 11 → « 11e » */
export function formatArrondissement(number) {
  return number === 1 ? '1er' : `${number}e`;
}

/** Trajet entre deux étapes : « 8 min à pied », « ≈ 18 min en métro · 2,55 € ». */
export function formatTravel({ mode, minutes, costEur }) {
  if (mode === 'walk') return `${minutes}${NBSP}min à pied`;
  const cost = costEur > 0 ? formatEuros(costEur) : 'inclus dans ton pass';
  return `≈ ${minutes}${NBSP}min en métro · ${cost}`;
}

/**
 * Lien OpenStreetMap centré sur un lieu.
 * Construit uniquement à partir de nombres déjà validés : aucun texte libre n'entre dans l'URL.
 */
export function mapUrl({ latitude, longitude }) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
}

function formatAmount(amount) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace('.', ',');
}
