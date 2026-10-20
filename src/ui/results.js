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
import { icon } from './icons.js';

/**
 * Remplace le contenu de `container` par le résultat du générateur.
 * @param {HTMLElement} container
 * @param {object} result valeur renvoyée par generateOuting()
 * @param {object} preferences préférences validées (nom de la ligne, messages d'échec)
 */
export function renderOutcome(container, result, preferences) {
  const blocks = result.ok ? renderOuting(result, preferences) : renderFailure(result, preferences);
  // filter(Boolean) : les blocs facultatifs valent `false` quand ils sont absents ;
  // replaceChildren() les afficherait sinon sous forme de texte « false ».
  container.replaceChildren(...blocks.filter(Boolean));
}

/** Message affiché si l'application elle-même rencontre un problème (catalogue, erreur inattendue). */
export function renderError(container, message) {
  container.replaceChildren(
    el('div', { className: 'alert alert--error', attrs: { role: 'alert' } }, [el('p', { text: message })]),
  );
}

// ---------------------------------------------------------------------------

function renderOuting({ steps, totals, notices }, preferences) {
  return [
    renderLineHeader(steps.length, preferences.arrondissement),
    renderTicket(steps.length, totals),
    notices.length > 0 &&
      el(
        'ul',
        { className: 'notices' },
        notices.map((notice) => el('li', { className: 'notice' }, [icon('info', { size: 18 }), describeNotice(notice)])),
      ),
    el('ol', { className: 'route' }, steps.map(renderStation)),
    el('p', {
      className: 'disclaimer',
      text: "Prix et durées estimés à titre indicatif. Pense à vérifier les horaires d'ouverture avant de te déplacer.",
    }),
  ];
}

/** « Ligne 11e · 3 stations », avec un rond façon numéro de ligne. */
function renderLineHeader(stepCount, arrondissement) {
  const lineName = arrondissement ? `Ligne ${formatArrondissement(arrondissement)}` : 'Ligne Paris';
  return el('p', { className: 'line-header' }, [
    el('span', { className: 'line-badge', text: arrondissement ? String(arrondissement) : 'P', attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'line-header__name', text: lineName }),
    el('span', { className: 'line-header__count', text: `${stepCount} station${stepCount > 1 ? 's' : ''}` }),
  ]);
}

/** Résumé présenté comme un ticket de métro. */
function renderTicket(stepCount, totals) {
  const budgetDetail =
    totals.transportCostEur > 0 ? `dont ${formatEuros(totals.transportCostEur)} de métro` : 'trajets à pied ou inclus';

  return el('dl', { className: 'ticket' }, [
    ticketItem('cost', 'Budget estimé', formatEuroRange(totals.costMinEur, totals.costMaxEur), budgetDetail),
    ticketItem(
      'duration',
      'Durée indicative',
      formatDurationRange(totals.durationMinMinutes, totals.durationMaxMinutes),
      'trajets compris',
    ),
    ticketItem('route', 'Étapes', String(stepCount), stepCount > 1 ? "dans l'ordre conseillé" : 'une seule étape'),
  ]);
}

function ticketItem(iconName, label, value, detail) {
  return el('div', { className: 'ticket__item' }, [
    el('dt', { className: 'ticket__label' }, [icon(iconName, { size: 16 }), label]),
    el('dd', { className: 'ticket__value', text: value }),
    el('dd', { className: 'ticket__detail', text: detail }),
  ]);
}

function renderStation({ number, activity, travelFromPrevious, isOutsideArea }, index) {
  const category = CATEGORIES.find((item) => item.code === activity.category);
  const place = activity.location.address ?? `Paris ${formatArrondissement(activity.location.arrondissement)}`;

  // Structure : [trajet depuis l'étape précédente] puis [arrêt = rond sur la ligne + carte].
  const station = el('li', { className: 'station', dataset: { category: activity.category } }, [
    travelFromPrevious && renderTravel(travelFromPrevious),
    el('div', { className: 'station__stop' }, [
      el('span', { className: 'station__dot', attrs: { 'aria-hidden': 'true' } }),
      el('article', { className: 'station__card' }, [
        el('header', { className: 'station__header' }, [
          el('span', { className: 'station__icon' }, [icon(activity.category, { size: 22 })]),
          el('p', { className: 'station__meta' }, [
            el('span', { className: 'station__number', text: `Étape ${number}` }),
            el('span', { className: 'station__category', text: category.label }),
          ]),
        ]),
        el('h3', { className: 'station__name', text: activity.name }),
        el('p', { className: 'station__description', text: activity.description }),
        el('ul', { className: 'station__facts' }, [
          fact('cost', formatCost(activity.cost)),
          fact('duration', formatDurationRange(activity.duration_minutes.min, activity.duration_minutes.max)),
          fact('place', place, isOutsideArea && el('span', { className: 'tag tag--warning', text: 'Hors du secteur choisi' })),
        ]),
        renderLinks(activity),
      ]),
    ]),
  ]);

  // --i (position de l'étape) décale l'animation d'apparition de chaque station.
  // style.setProperty plutôt qu'un attribut style="…" : compatible avec une politique CSP stricte.
  station.style.setProperty('--i', String(index));
  return station;
}

function renderTravel(travel) {
  return el('p', { className: 'station__travel' }, [icon(travel.mode, { size: 18 }), formatTravel(travel)]);
}

function renderLinks(activity) {
  // noopener : la page ouverte ne peut pas manipuler DAYOUT via window.opener ;
  // noreferrer : on ne transmet pas l'adresse de notre page au site visité.
  const external = { target: '_blank', rel: 'noopener noreferrer' };
  return el('p', { className: 'station__links' }, [
    el('a', { attrs: { href: mapUrl(activity.location), ...external } }, [icon('map', { size: 16 }), 'Voir sur la carte']),
    activity.info_url &&
      el('a', { attrs: { href: activity.info_url, ...external } }, [icon('external', { size: 16 }), "Plus d'infos"]),
    activity.is_fictional && el('span', { className: 'tag', text: 'Lieu fictif' }),
  ]);
}

function fact(iconName, text, extra = null) {
  return el('li', { className: 'station__fact' }, [icon(iconName, { size: 18 }), el('span', { text }), extra]);
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
