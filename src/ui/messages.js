/**
 * Traduction des codes renvoyés par le générateur en phrases pour l'utilisateur.
 * Le générateur ne connaît que des codes : tous les textes sont ici.
 */
import { FAILURE_REASONS, NOTICE_CODES } from '../engine/generator.js';
import { CATEGORIES, AUDIENCES } from '../config/categories.js';
import { formatArrondissement, formatDuration, formatEuros } from './format.js';

/**
 * Message d'échec : un titre (ce qui bloque) et une piste (ce que l'on peut changer).
 * @returns {{ title: string, hint: string }}
 */
export function describeFailure({ reason, details }, preferences) {
  switch (reason) {
    case FAILURE_REASONS.NO_MATCHING_ACTIVITY: {
      const audience = AUDIENCES.find((item) => item.code === preferences.audience)?.label.toLowerCase() ?? '';
      return {
        title: `Aucune activité ne correspond à ces envies pour une sortie ${audience}.`,
        hint: "Ajoute d'autres envies ou change le type de sortie.",
      };
    }
    case FAILURE_REASONS.UNKNOWN_PRICES:
      return {
        title: "Les activités correspondantes n'ont pas encore de prix connu : impossible de garantir ton budget.",
        hint: "Ajoute d'autres envies.",
      };
    case FAILURE_REASONS.BUDGET_TOO_LOW:
      return {
        title: `Aucune activité ne tient dans un budget de ${formatEuros(preferences.budgetEur)}.`,
        hint: `Avec ces envies, prévois au moins ${formatEuros(details.minimumBudgetEur)} par personne.`,
      };
    case FAILURE_REASONS.TIME_TOO_SHORT:
      return {
        title: `Aucune activité ne tient en ${formatDuration(preferences.availableMinutes)}.`,
        hint: `Avec ces envies, prévois au moins ${formatDuration(details.minimumMinutes)}.`,
      };
    default:
      return { title: "Impossible de composer une sortie avec ces critères.", hint: 'Essaie de modifier tes critères.' };
  }
}

/** Phrase associée à une remarque jointe à une sortie réussie. */
export function describeNotice(notice) {
  switch (notice.code) {
    case NOTICE_CODES.FEWER_STEPS_THAN_TARGET:
      return notice.stepCount === 1
        ? 'Une seule étape tient dans ton budget et ton temps.'
        : `Seules ${notice.stepCount} étapes tiennent dans ton budget et ton temps.`;
    case NOTICE_CODES.NO_MATCH_IN_AREA:
      return `Pas encore d'activité correspondant à tes critères dans le ${formatArrondissement(notice.arrondissement)} : voici les plus proches.`;
    case NOTICE_CODES.OUTSIDE_SELECTED_AREA:
      return `Certaines étapes se trouvent hors du ${formatArrondissement(notice.arrondissement)} : elles sont signalées sur le parcours.`;
    case NOTICE_CODES.SOME_INTERESTS_MISSING: {
      const labels = notice.missingCategories.map(
        (code) => CATEGORIES.find((category) => category.code === code)?.label ?? code,
      );
      return `Pas de place cette fois pour : ${labels.join(', ')}. Génère une autre sortie ou augmente ton budget ou ton temps.`;
    }
    default:
      return '';
  }
}
