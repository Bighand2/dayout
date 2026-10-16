/**
 * Point d'accès UNIQUE aux activités.
 *
 * Le reste de l'application ne sait pas d'où viennent les données : il appelle
 * `loadActivities()`. En V1, on lit un fichier JSON statique ; en V2, il suffira
 * de remplacer l'URL par celle de l'API (ex. : '/api/activities').
 */
import { parseActivities } from './activitySchema.js';

// Chemin relatif à la page : fonctionne en local comme sur un hébergement statique.
const DEFAULT_SOURCE_URL = 'data/activities.json';

/**
 * Charge et valide le catalogue d'activités.
 * @param {{ url?: string, fetchFn?: typeof fetch }} [options]
 *   `fetchFn` permet d'injecter un faux `fetch` dans les tests.
 * @returns {Promise<object[]>} les activités valides
 * @throws {Error} si le catalogue est inaccessible ou illisible
 */
export async function loadActivities({ url = DEFAULT_SOURCE_URL, fetchFn = fetch } = {}) {
  let response;
  try {
    response = await fetchFn(url);
  } catch (error) {
    throw new Error('Impossible de contacter la source des activités.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Le catalogue des activités est indisponible (HTTP ${response.status}).`);
  }

  let rawList;
  try {
    rawList = await response.json();
  } catch (error) {
    throw new Error("Le catalogue des activités n'est pas un JSON valide.", { cause: error });
  }

  const { activities, rejected } = parseActivities(rawList);

  // Les erreurs de données sont destinées au développeur, pas à l'utilisateur.
  for (const item of rejected) {
    console.warn(`[DAYOUT] Activité ignorée (position ${item.index}, id ${String(item.id)}) :`, item.errors);
  }

  return activities;
}
