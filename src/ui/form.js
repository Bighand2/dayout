/**
 * Formulaire de personnalisation.
 *
 * Rôles : générer les boutons à partir de la configuration, lire les choix,
 * les convertir (texte → nombres), les faire valider par validatePreferences()
 * et afficher les erreurs à côté du bon champ.
 */
import { CATEGORIES, AUDIENCES } from '../config/categories.js';
import {
  BUDGET_OPTIONS_EUR,
  DEFAULT_BUDGET_EUR,
  DURATION_OPTIONS_MINUTES,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_AUDIENCE,
} from '../config/formOptions.js';
import { validatePreferences } from '../engine/preferences.js';
import { formatArrondissement, formatDuration, formatEuros } from './format.js';
import { el } from './dom.js';

const CUSTOM_BUDGET = 'custom';

/**
 * Prépare le formulaire et appelle `onValidSubmit(preferences)` à chaque envoi valide.
 * @param {HTMLFormElement} form
 * @param {{ onValidSubmit: (preferences: object) => void }} callbacks
 */
export function setupForm(form, { onValidSubmit }) {
  renderOptions(form);

  // Le champ « montant libre » n'apparaît que si « Autre » est choisi.
  const customBudget = form.querySelector('#budget-custom');
  form.addEventListener('change', (event) => {
    if (event.target.name === 'budget') {
      const isCustom = event.target.value === CUSTOM_BUDGET;
      customBudget.hidden = !isCustom;
      if (isCustom) customBudget.querySelector('input').focus();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // pas de rechargement de page : tout se passe dans le navigateur
    const validation = validatePreferences(readPreferences(form));
    showErrors(form, validation.valid ? {} : validation.errors);
    if (validation.valid) onValidSubmit(validation.preferences);
  });
}

/** Lit le formulaire et convertit les valeurs texte dans les types attendus par le générateur. */
export function readPreferences(form) {
  const data = new FormData(form);
  const budgetChoice = data.get('budget');
  const arrondissement = data.get('arrondissement');

  return {
    budgetEur: budgetChoice === CUSTOM_BUDGET ? parseEuros(data.get('budgetCustom')) : Number(budgetChoice),
    availableMinutes: Number(data.get('duration')),
    categories: data.getAll('categories'),
    audience: data.get('audience'),
    arrondissement: arrondissement ? Number(arrondissement) : null,
    hasNavigo: data.get('hasNavigo') === 'on',
  };
}

/** « 12,50 » → 12.5 ; champ vide ou invalide → NaN (refusé ensuite par la validation). */
function parseEuros(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  return text === '' ? NaN : Number(text);
}

// ---------------------------------------------------------------------------
// Génération des choix
// ---------------------------------------------------------------------------

function renderOptions(form) {
  form.querySelector('[data-options="budget"]').replaceChildren(
    ...BUDGET_OPTIONS_EUR.map((amount) =>
      chip('radio', 'budget', amount, amount === 0 ? 'Gratuit' : formatEuros(amount), amount === DEFAULT_BUDGET_EUR),
    ),
    chip('radio', 'budget', CUSTOM_BUDGET, 'Autre', false),
  );

  form.querySelector('[data-options="duration"]').replaceChildren(
    ...DURATION_OPTIONS_MINUTES.map((minutes) =>
      chip('radio', 'duration', minutes, formatDuration(minutes), minutes === DEFAULT_DURATION_MINUTES),
    ),
  );

  form.querySelector('[data-options="categories"]').replaceChildren(
    ...CATEGORIES.map(({ code, label, emoji }) =>
      el('label', { className: 'category-card', dataset: { category: code } }, [
        el('input', { attrs: { type: 'checkbox', name: 'categories', value: code } }),
        el('span', { className: 'category-card__body' }, [
          el('span', { className: 'category-card__emoji', text: emoji, attrs: { 'aria-hidden': 'true' } }),
          el('span', { className: 'category-card__label', text: label }),
        ]),
      ]),
    ),
  );

  form.querySelector('[data-options="audience"]').replaceChildren(
    ...AUDIENCES.map(({ code, label }) => chip('radio', 'audience', code, label, code === DEFAULT_AUDIENCE)),
  );

  form.querySelector('#arrondissement').replaceChildren(
    el('option', { text: 'Peu importe', attrs: { value: '' } }),
    ...Array.from({ length: 20 }, (_, index) =>
      el('option', { text: `Paris ${formatArrondissement(index + 1)}`, attrs: { value: index + 1 } }),
    ),
  );
}

/** Bouton de choix (radio ou case à cocher) stylé en « pastille ». */
function chip(type, name, value, label, checked) {
  return el('label', { className: 'chip' }, [
    el('input', { attrs: { type, name, value, checked } }),
    el('span', { className: 'chip__label', text: label }),
  ]);
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/**
 * Affiche chaque message sous le groupe de champs concerné (attribut data-field)
 * et place le focus sur le premier groupe en erreur.
 * @param {Record<string, string>} errors champ → message
 */
function showErrors(form, errors) {
  let firstInvalidGroup = null;

  for (const group of form.querySelectorAll('[data-field]')) {
    const message = errors[group.dataset.field];
    const errorElement = group.querySelector('.field-error');
    errorElement.textContent = message ?? '';
    errorElement.hidden = !message;
    group.classList.toggle('is-invalid', Boolean(message));
    if (message && !firstInvalidGroup) firstInvalidGroup = group;
  }

  if (firstInvalidGroup) {
    // Priorité : le champ libre s'il est affiché, sinon le choix coché, sinon le premier champ.
    const target =
      firstInvalidGroup.querySelector('.custom-input:not([hidden]) input') ??
      firstInvalidGroup.querySelector('input:checked') ??
      firstInvalidGroup.querySelector('input, select');
    target?.focus();
  }
}
