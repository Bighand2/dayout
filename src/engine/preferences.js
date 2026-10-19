/**
 * Validation des préférences de l'utilisateur (le « contrat » d'entrée du générateur).
 *
 * Elle sera appelée par le formulaire (pour afficher les erreurs) ET, en V2, par
 * le serveur : côté serveur, on revalide toujours, car une requête HTTP peut être
 * fabriquée à la main sans passer par le formulaire.
 *
 * On attend des valeurs déjà converties (nombres, booléens). La conversion depuis
 * les champs texte du formulaire est faite par l'interface.
 */
import { CATEGORY_CODES, AUDIENCE_CODES } from '../config/categories.js';

export const PREFERENCE_LIMITS = {
  budgetEur: { min: 0, max: 200 },
  availableMinutes: { min: 30, max: 720 },
};

/**
 * @param {unknown} raw
 * @returns {{ valid: true, preferences: object } | { valid: false, errors: Record<string, string> }}
 *   `errors` associe chaque champ invalide à un message affichable.
 */
export function validatePreferences(raw) {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: { form: 'Préférences manquantes.' } };
  }

  const errors = {};
  const { budgetEur, availableMinutes } = PREFERENCE_LIMITS;

  if (typeof raw.budgetEur !== 'number' || !Number.isFinite(raw.budgetEur)) {
    errors.budgetEur = 'Indique un budget en euros.';
  } else if (raw.budgetEur < budgetEur.min || raw.budgetEur > budgetEur.max) {
    errors.budgetEur = `Le budget doit être compris entre ${budgetEur.min} et ${budgetEur.max} €.`;
  }

  if (!Number.isInteger(raw.availableMinutes)) {
    errors.availableMinutes = 'Indique le temps dont tu disposes.';
  } else if (raw.availableMinutes < availableMinutes.min || raw.availableMinutes > availableMinutes.max) {
    errors.availableMinutes = `Le temps disponible doit être compris entre ${availableMinutes.min / 60} h et ${availableMinutes.max / 60} h.`;
  }

  const categories = Array.isArray(raw.categories) ? [...new Set(raw.categories)] : [];
  if (categories.length === 0) {
    errors.categories = 'Choisis au moins un centre d’intérêt.';
  } else if (categories.some((code) => !CATEGORY_CODES.includes(code))) {
    errors.categories = 'Un centre d’intérêt sélectionné est inconnu.';
  }

  if (!AUDIENCE_CODES.includes(raw.audience)) {
    errors.audience = 'Indique avec qui tu sors.';
  }

  const arrondissement = raw.arrondissement ?? null;
  if (arrondissement !== null && !(Number.isInteger(arrondissement) && arrondissement >= 1 && arrondissement <= 20)) {
    errors.arrondissement = 'Choisis un arrondissement entre 1 et 20, ou « peu importe ».';
  }

  if (raw.hasNavigo !== undefined && typeof raw.hasNavigo !== 'boolean') {
    errors.hasNavigo = 'Valeur du pass Navigo invalide.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    preferences: {
      budgetEur: raw.budgetEur,
      availableMinutes: raw.availableMinutes,
      categories,
      audience: raw.audience,
      arrondissement,
      hasNavigo: raw.hasNavigo ?? false,
    },
  };
}
