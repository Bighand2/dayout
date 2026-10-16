/**
 * Validation d'une activité du catalogue.
 *
 * Pourquoi valider des données qui viennent de NOTRE propre fichier JSON ?
 * - une faute de frappe (prix négatif, catégorie inconnue…) ferait produire des
 *   résultats faux au générateur, sans erreur visible ;
 * - demain, ces données viendront d'une base ou d'une API : on prend dès maintenant
 *   l'habitude de ne jamais faire confiance à une donnée externe.
 *
 * Principe « liste blanche » : on construit un NOUVEL objet ne contenant que les
 * champs connus et vérifiés. Tout champ inattendu est ignoré.
 *
 * Fonctions pures (pas de DOM, pas de réseau) : elles sont testables avec Node.
 */
import { CATEGORY_CODES, COST_TYPE_CODES, AUDIENCE_CODES } from '../config/categories.js';
import { PARIS_BOUNDS } from '../config/paris.js';

const ID_PATTERN = /^[a-z0-9-]{1,50}$/;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_PRICE_EUR = 1000;
const MAX_DURATION_MINUTES = 600;

/**
 * Vérifie une activité brute.
 * @param {unknown} raw - un élément du tableau JSON
 * @returns {{ valid: true, activity: object } | { valid: false, errors: string[] }}
 */
export function validateActivity(raw) {
  if (!isPlainObject(raw)) {
    return { valid: false, errors: ["l'activité doit être un objet JSON"] };
  }

  const errors = [];

  if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id)) {
    errors.push('id invalide (minuscules, chiffres et tirets uniquement)');
  }
  checkText(raw.name, 'name', MAX_NAME_LENGTH, errors);
  checkText(raw.description, 'description', MAX_DESCRIPTION_LENGTH, errors);

  if (!CATEGORY_CODES.includes(raw.category)) {
    errors.push(`category inconnue : ${String(raw.category)}`);
  }

  checkCost(raw.cost, errors);
  checkDuration(raw.duration_minutes, errors);
  checkLocation(raw.location, errors);
  checkAudience(raw.suitable_for, errors);

  if (typeof raw.is_fictional !== 'boolean') {
    errors.push('is_fictional doit valoir true ou false');
  }

  const imageUrl = checkOptionalHttpsUrl(raw.image_url, 'image_url', errors);
  const infoUrl = checkOptionalHttpsUrl(raw.info_url, 'info_url', errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Objet « propre » : uniquement les champs connus, valeurs absentes → null.
  return {
    valid: true,
    activity: {
      id: raw.id,
      name: raw.name.trim(),
      category: raw.category,
      description: raw.description.trim(),
      cost: {
        type: raw.cost.type,
        min_eur: raw.cost.min_eur,
        max_eur: raw.cost.max_eur,
      },
      duration_minutes: {
        min: raw.duration_minutes.min,
        max: raw.duration_minutes.max,
      },
      location: {
        arrondissement: raw.location.arrondissement,
        address: raw.location.address?.trim() || null,
        latitude: raw.location.latitude,
        longitude: raw.location.longitude,
      },
      suitable_for: [...raw.suitable_for],
      is_fictional: raw.is_fictional,
      image_url: imageUrl,
      info_url: infoUrl,
    },
  };
}

/**
 * Valide un catalogue complet.
 * Les activités invalides ou en double sont écartées (et listées dans `rejected`)
 * plutôt que de faire échouer tout le chargement.
 * @param {unknown} rawList - le contenu JSON du catalogue
 * @returns {{ activities: object[], rejected: { index: number, id: unknown, errors: string[] }[] }}
 */
export function parseActivities(rawList) {
  if (!Array.isArray(rawList)) {
    throw new TypeError('Le catalogue doit être un tableau JSON.');
  }

  const activities = [];
  const rejected = [];
  const seenIds = new Set();

  rawList.forEach((raw, index) => {
    const result = validateActivity(raw);
    const id = isPlainObject(raw) ? raw.id : undefined;

    if (!result.valid) {
      rejected.push({ index, id, errors: result.errors });
    } else if (seenIds.has(result.activity.id)) {
      rejected.push({ index, id, errors: [`id en double : ${id}`] });
    } else {
      seenIds.add(result.activity.id);
      activities.push(result.activity);
    }
  });

  return { activities, rejected };
}

/** Un prix est « connu » si min et max sont renseignés (null = inconnu). */
export function hasKnownPrice(activity) {
  return activity.cost.min_eur !== null && activity.cost.max_eur !== null;
}

// ---------------------------------------------------------------------------
// Vérifications détaillées (chaque fonction ajoute ses erreurs dans `errors`)
// ---------------------------------------------------------------------------

function checkText(value, fieldName, maxLength, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${fieldName} est obligatoire`);
  } else if (value.length > maxLength) {
    errors.push(`${fieldName} dépasse ${maxLength} caractères`);
  }
}

function checkCost(cost, errors) {
  if (!isPlainObject(cost)) {
    errors.push('cost est obligatoire');
    return;
  }
  if (!COST_TYPE_CODES.includes(cost.type)) {
    errors.push(`cost.type inconnu : ${String(cost.type)}`);
  }

  const { min_eur: min, max_eur: max } = cost;

  // Prix inconnu : les deux valeurs doivent être null (pas l'une sans l'autre).
  if (min === null && max === null) {
    if (cost.type === 'free') errors.push('une activité gratuite a un prix connu : 0');
    return;
  }
  if (!isNumberInRange(min, 0, MAX_PRICE_EUR) || !isNumberInRange(max, 0, MAX_PRICE_EUR)) {
    errors.push(`cost.min_eur et cost.max_eur doivent être entre 0 et ${MAX_PRICE_EUR} (ou tous deux null)`);
    return;
  }
  if (min > max) {
    errors.push('cost.min_eur ne peut pas dépasser cost.max_eur');
  }
  if (cost.type === 'free' && max !== 0) {
    errors.push('une activité gratuite doit avoir un prix de 0');
  }
}

function checkDuration(duration, errors) {
  if (!isPlainObject(duration)) {
    errors.push('duration_minutes est obligatoire');
    return;
  }
  const { min, max } = duration;
  if (!isIntegerInRange(min, 1, MAX_DURATION_MINUTES) || !isIntegerInRange(max, 1, MAX_DURATION_MINUTES)) {
    errors.push(`duration_minutes.min et .max doivent être des entiers entre 1 et ${MAX_DURATION_MINUTES}`);
  } else if (min > max) {
    errors.push('duration_minutes.min ne peut pas dépasser duration_minutes.max');
  }
}

function checkLocation(location, errors) {
  if (!isPlainObject(location)) {
    errors.push('location est obligatoire');
    return;
  }
  if (!isIntegerInRange(location.arrondissement, 1, 20)) {
    errors.push('location.arrondissement doit être un entier entre 1 et 20');
  }
  if (location.address !== undefined && location.address !== null && typeof location.address !== 'string') {
    errors.push('location.address doit être un texte ou null');
  }
  const { minLatitude, maxLatitude, minLongitude, maxLongitude } = PARIS_BOUNDS;
  if (!isNumberInRange(location.latitude, minLatitude, maxLatitude)) {
    errors.push('location.latitude absente ou hors de Paris');
  }
  if (!isNumberInRange(location.longitude, minLongitude, maxLongitude)) {
    errors.push('location.longitude absente ou hors de Paris');
  }
}

function checkAudience(audience, errors) {
  if (!Array.isArray(audience) || audience.length === 0) {
    errors.push('suitable_for doit contenir au moins un public');
    return;
  }
  const unknown = audience.filter((code) => !AUDIENCE_CODES.includes(code));
  if (unknown.length > 0) {
    errors.push(`suitable_for contient des valeurs inconnues : ${unknown.join(', ')}`);
  }
  if (new Set(audience).size !== audience.length) {
    errors.push('suitable_for contient des doublons');
  }
}

/**
 * Une URL facultative doit être en https.
 * Sécurité : sans ce contrôle, une valeur comme « javascript:alert(1) » placée
 * dans un lien <a href> exécuterait du code au clic (faille XSS).
 * @returns {string | null} l'URL normalisée, ou null si absente / invalide
 */
function checkOptionalHttpsUrl(value, fieldName, errors) {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') return url.href;
    } catch {
      // URL mal formée : traitée comme les autres valeurs invalides ci-dessous.
    }
  }
  errors.push(`${fieldName} doit être une URL https valide`);
  return null;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
