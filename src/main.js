/**
 * Point d'entrée : relie les données, le formulaire, le générateur et l'affichage.
 * Aucune logique métier ici, seulement l'enchaînement des étapes et l'état de la page.
 */
// Police des titres, hébergée avec le site (aucune requête vers un service tiers).
import '@fontsource-variable/bricolage-grotesque';
import { loadActivities } from './data/activityRepository.js';
import { generateOuting } from './engine/generator.js';
import { setupForm } from './ui/form.js';
import { renderOutcome, renderError } from './ui/results.js';
import { addStaticIcons } from './ui/icons.js';

const form = document.querySelector('#outing-form');
const submitButton = form.querySelector('button[type="submit"]');
const loadStatus = document.querySelector('#load-status');
const resultsSection = document.querySelector('#results');
const resultsTitle = document.querySelector('#results-title');
const resultsContent = document.querySelector('#results-content');
const regenerateButton = document.querySelector('#regenerate');
const editButton = document.querySelector('#edit-criteria');

/** État de la page : le catalogue, les derniers critères et les activités déjà proposées. */
const state = {
  activities: [],
  preferences: null,
  shownActivityIds: [],
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

addStaticIcons();
setupForm(form, {
  onValidSubmit(preferences) {
    state.preferences = preferences;
    state.shownActivityIds = []; // nouveaux critères : on repart de zéro
    showNewOuting();
  },
});

regenerateButton.addEventListener('click', showNewOuting);

editButton.addEventListener('click', () => {
  form.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  form.querySelector('input:checked, input')?.focus({ preventScroll: true });
});

// Chargement du catalogue : le bouton reste désactivé tant que les données ne sont pas là.
try {
  state.activities = await loadActivities();
  submitButton.disabled = false;
  loadStatus.hidden = true;
} catch (error) {
  console.error(error);
  loadStatus.textContent = 'Impossible de charger les activités. Recharge la page dans un instant.';
  loadStatus.classList.add('alert', 'alert--error');
}

/** Génère une sortie en évitant celles déjà proposées, puis l'affiche. */
function showNewOuting() {
  let result;
  try {
    result = generateOuting(state.activities, state.preferences, { previousActivityIds: state.shownActivityIds });
  } catch (error) {
    // Erreur inattendue : détail technique dans la console, message simple à l'écran.
    console.error(error);
    renderError(resultsContent, 'Une erreur est survenue pendant la génération. Réessaie ou modifie tes critères.');
    revealResults(false);
    return;
  }

  if (result.ok) {
    state.shownActivityIds.push(...result.steps.map((step) => step.activity.id));
  }
  renderOutcome(resultsContent, result, state.preferences);
  revealResults(result.ok);
}

function revealResults(canRegenerate) {
  resultsSection.hidden = false;
  regenerateButton.hidden = !canRegenerate;
  resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  // Le focus sur le titre fait annoncer le nouveau contenu par les lecteurs d'écran.
  resultsTitle.focus({ preventScroll: true });
}
