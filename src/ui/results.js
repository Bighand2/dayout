/**
 * Affichage du résultat : une sortie présentée comme une ligne de métro
 * (chaque étape est une « station »), ou un message d'échec expliqué.
 */
import { CATEGORIES } from '../config/categories.js';
import {
  formatArrondissement,
  formatCost,
  formatDurationRange,
  formatEuroRange,
  formatEuros,
  formatTravel,
  mapUrl,
} from './format.js';
import { describeFailure, describeNotice } from './messages.js';
import { el } from './dom.js';

/**
 * Remplace le contenu de `container` par le résultat du générateur.
 * @param {HTMLElement} container
 * @param {object} result valeur renvoyée par generateOuting()
 * @param {object} preferences préférences validées (pour les messages d'échec)
 */
export function renderOutcome(container, result, preferences) {
  container.replaceChildren(...(result.ok ? renderOuting(result) : renderFailure(result, preferences)));
}

/** Message affiché si l'application elle-même rencontre un problème (catalogue, erreur inattendue). */
export function renderError(container, message) {
  container.replaceChildren(
    el('div', { className: 'alert alert--error', attrs: { role: 'alert' } }, [el('p', { text: message })]),
  );
}

// ---------------------------------------------------------------------------

function renderOuting({ steps, totals, notices }) {
  return [
    renderSummary(steps.length, totals),
    notices.length > 0 &&
      el(
        'ul',
        { className: 'notices' },
        notices.map((notice) => el('li', { className: 'notice', text: describeNotice(notice) })),
      ),
    el('ol', { className: 'route' }, steps.map(renderStation)),
    el('p', {
      className: 'disclaimer',
      text: "Prix et durées estimés à titre indicatif. Pense à vérifier les horaires d'ouverture avant de te déplacer.",
    }),
  ];
}

function renderSummary(stepCount, totals) {
  const budgetDetail =
    totals.transportCostEur > 0 ? `dont ${formatEuros(totals.transportCostEur)} de métro` : 'trajets à pied ou inclus';

  return el('dl', { className: 'summary' }, [
    summaryItem('Budget estimé', formatEuroRange(totals.costMinEur, totals.costMaxEur), budgetDetail),
    summaryItem(
      'Durée indicative',
      formatDurationRange(totals.durationMinMinutes, totals.durationMaxMinutes),
      'trajets compris',
    ),
    summaryItem('Étapes', String(stepCount), stepCount > 1 ? "dans l'ordre conseillé" : 'une seule étape'),
  ]);
}

function summaryItem(label, value, detail) {
  return el('div', { className: 'summary__item' }, [
    el('dt', { className: 'summary__label', text: label }),
    el('dd', { className: 'summary__value', text: value }),
    el('dd', { className: 'summary__detail', text: detail }),
  ]);
}

function renderStation({ number, activity, travelFromPrevious, isOutsideArea }) {
  const category = CATEGORIES.find((item) => item.code === activity.category);
  const place = activity.location.address ?? `Paris ${formatArrondissement(activity.location.arrondissement)}`;

  // Structure : [trajet depuis l'étape précédente] puis [arrêt = rond sur la ligne + carte].
  return el('li', { className: 'station', dataset: { category: activity.category } }, [
    travelFromPrevious && renderTravel(travelFromPrevious),
    el('div', { className: 'station__stop' }, [
      el('span', { className: 'station__dot', attrs: { 'aria-hidden': 'true' } }),
      el('article', { className: 'station__card' }, [
        el('p', { className: 'station__step' }, [
          el('span', { className: 'station__number', text: `Étape ${number}` }),
          el('span', { className: 'station__category' }, [
            el('span', { text: category.emoji, attrs: { 'aria-hidden': 'true' } }),
            ` ${category.label}`,
          ]),
        ]),
        el('h3', { className: 'station__name', text: activity.name }),
        el('p', { className: 'station__description', text: activity.description }),
        el('ul', { className: 'station__facts' }, [
          fact('💶', formatCost(activity.cost)),
          fact('⏱️', formatDurationRange(activity.duration_minutes.min, activity.duration_minutes.max)),
          fact('📍', place, isOutsideArea && el('span', { className: 'tag tag--warning', text: 'Hors du secteur choisi' })),
        ]),
        renderLinks(activity),
      ]),
    ]),
  ]);
}

function renderTravel(travel) {
  return el('p', { className: 'station__travel' }, [
    el('span', { text: travel.mode === 'walk' ? '🚶' : '🚇', attrs: { 'aria-hidden': 'true' } }),
    ` ${formatTravel(travel)}`,
  ]);
}

function renderLinks(activity) {
  // noopener : la page ouverte ne peut pas manipuler DAYOUT via window.opener ;
  // noreferrer : on ne transmet pas l'adresse de notre page au site visité.
  const external = { target: '_blank', rel: 'noopener noreferrer' };
  return el('p', { className: 'station__links' }, [
    el('a', { text: 'Voir sur la carte', attrs: { href: mapUrl(activity.location), ...external } }),
    activity.info_url && el('a', { text: "Plus d'infos", attrs: { href: activity.info_url, ...external } }),
    activity.is_fictional && el('span', { className: 'tag', text: 'Lieu fictif' }),
  ]);
}

function fact(icon, text, extra = null) {
  return el('li', { className: 'station__fact' }, [
    el('span', { className: 'station__fact-icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
    el('span', { text }),
    extra,
  ]);
}

function renderFailure(result, preferences) {
  const { title, hint } = describeFailure(result, preferences);
  return [
    el('div', { className: 'alert alert--empty', attrs: { role: 'status' } }, [
      el('p', { className: 'alert__title', text: title }),
      el('p', { text: hint }),
    ]),
  ];
}
