/**
 * Générateur de sorties DAYOUT.
 *
 * Fonction pure : elle reçoit le catalogue et les préférences, et renvoie une
 * sortie (ou la raison de l'échec). Pas de DOM, pas de réseau : elle peut tourner
 * dans le navigateur aujourd'hui et sur un serveur Node.js demain.
 *
 * Étapes de l'algorithme :
 *   1. FILTRER    les activités compatibles (envies, public, budget, temps) ;
 *   2. RÉDUIRE    à un « vivier » d'activités, les plus proches du secteur choisi ;
 *   3. ÉNUMÉRER   toutes les combinaisons de 1 à 4 activités qui tiennent dans
 *                 le budget et le temps (avant trajets) ;
 *   4. ORDONNER   chaque combinaison : on garde l'ordre au trajet le plus court
 *                 (repas de préférence en fin de parcours) qui respecte encore
 *                 budget et temps, trajets compris ;
 *   5. NOTER      chaque sortie (nombre d'étapes, variété, temps utilisé, trajets…) ;
 *   6. CHOISIR    par tirage pondéré parmi les meilleures, pour varier les propositions.
 *
 * Le générateur renvoie des CODES et des DONNÉES, jamais de phrases :
 * c'est l'interface qui rédige les messages (séparation des responsabilités).
 */
import { hasKnownPrice } from '../data/activitySchema.js';
import { ARRONDISSEMENT_CENTERS } from '../config/paris.js';
import { distanceKm, estimateTravel } from './geo.js';
import { validatePreferences } from './preferences.js';
import { shuffle, pickWeighted } from './random.js';

export const GENERATOR_SETTINGS = {
  maxSteps: 4,
  // Taille visée du vivier. 16 activités → au plus 1 820 combinaisons de 4 : rapide.
  poolSize: 16,
  // Nombre minimum d'activités gardées par catégorie choisie, pour qu'aucune envie ne disparaisse.
  minPerCategory: 2,
  // Tirage final : parmi les 5 meilleures sorties, à 8 points maximum de la meilleure.
  topChoices: 5,
  scoreMargin: 8,
  // Bonus d'ordre (en minutes de trajet) pour un repas placé en dernière étape.
  foodLateBonusMinutes: 10,
};

/** Poids de la note d'une sortie. Les modifier change les priorités du générateur. */
export const SCORE_WEIGHTS = {
  missingStep: 40, // par étape manquante sous le minimum visé
  missingInterest: 15, // par envie non servie alors qu'il y avait la place pour elle
  timeUsage: 30, // × part du temps disponible occupée (maximum à 100 %)
  travelMinute: 0.4, // par minute de trajet
  areaKm: 8, // par km d'éloignement moyen du centre de l'arrondissement choisi
  alreadyShown: 15, // par activité déjà présente dans la sortie précédente
};

/** Codes d'échec possibles (l'interface leur associe un message). */
export const FAILURE_REASONS = {
  NO_MATCHING_ACTIVITY: 'NO_MATCHING_ACTIVITY',
  UNKNOWN_PRICES: 'UNKNOWN_PRICES',
  BUDGET_TOO_LOW: 'BUDGET_TOO_LOW',
  TIME_TOO_SHORT: 'TIME_TOO_SHORT',
};

/** Codes des remarques jointes à une sortie réussie. */
export const NOTICE_CODES = {
  FEWER_STEPS_THAN_TARGET: 'FEWER_STEPS_THAN_TARGET',
  OUTSIDE_SELECTED_AREA: 'OUTSIDE_SELECTED_AREA', // une partie des étapes est hors de l'arrondissement
  NO_MATCH_IN_AREA: 'NO_MATCH_IN_AREA', // l'arrondissement n'a aucune activité compatible : tout est à côté
  SOME_INTERESTS_MISSING: 'SOME_INTERESTS_MISSING',
};

/** Nombre d'étapes visé selon le temps disponible. */
export function getStepTarget(availableMinutes) {
  if (availableMinutes < 120) return { min: 1, max: 2 };
  if (availableMinutes <= 240) return { min: 2, max: 3 };
  return { min: 3, max: GENERATOR_SETTINGS.maxSteps };
}

/**
 * Génère une sortie.
 * @param {object[]} activities catalogue validé (voir activitySchema.js)
 * @param {object} rawPreferences voir preferences.js
 * @param {{ random?: () => number, previousActivityIds?: string[] }} [options]
 *   `random` : source de hasard (injectable pour les tests) ;
 *   `previousActivityIds` : activités de la sortie précédente, à éviter si possible.
 * @returns {object} `{ ok: true, steps, totals, stepTarget, notices }` ou `{ ok: false, reason, details }`
 * @throws {TypeError} si les préférences sont invalides (l'interface doit les valider avant)
 */
export function generateOuting(activities, rawPreferences, { random = Math.random, previousActivityIds = [] } = {}) {
  const validation = validatePreferences(rawPreferences);
  if (!validation.valid) {
    throw new TypeError(`Préférences invalides : ${Object.values(validation.errors).join(' ')}`);
  }
  const preferences = validation.preferences;

  // 1. Filtrer
  const selection = selectCandidates(activities, preferences);
  if (!selection.ok) return selection;

  // 2. Réduire au vivier
  const areaCenter = preferences.arrondissement ? ARRONDISSEMENT_CENTERS[preferences.arrondissement] : null;
  const pool = buildPool(selection.candidates, preferences.categories, areaCenter, random);
  const areaHasMatch = selection.candidates.some(
    (activity) => activity.location.arrondissement === preferences.arrondissement,
  );

  // 3. Énumérer les combinaisons (élagage : budget et temps hors trajets)
  const stepTarget = getStepTarget(preferences.availableMinutes);
  const combinations = enumerateCombinations(pool, stepTarget.max, preferences);

  // 4. Ordonner chaque combinaison et ne garder que celles qui tiennent, trajets compris
  const travelMatrix = buildTravelMatrix(pool, preferences.hasNavigo);
  let outings = combinations
    .map((combination) => planBestRoute(combination, pool, travelMatrix, preferences))
    .filter((outing) => outing !== null);

  // Règle métier : si « nourriture » est cochée et qu'un repas est possible, il est inclus.
  if (preferences.categories.includes('food')) {
    const withFood = outings.filter((outing) => outing.activities.some((activity) => activity.category === 'food'));
    if (withFood.length > 0) outings = withFood;
  }

  // 5. Noter. (Une activité seule passe toujours le filtre de l'étape 1 :
  //    `outings` contient donc au moins une sortie à ce stade.)
  const context = { preferences, stepTarget, areaCenter, areaHasMatch, previousIds: new Set(previousActivityIds) };
  const ranked = outings
    .map((outing) => ({ outing, score: scoreOuting(outing, context) }))
    .sort((a, b) => b.score - a.score);

  // 6. Choisir au hasard parmi les meilleures
  const bestScore = ranked[0].score;
  const finalists = ranked
    .slice(0, GENERATOR_SETTINGS.topChoices)
    .filter((entry) => entry.score >= bestScore - GENERATOR_SETTINGS.scoreMargin);

  // Tirage pondéré : la meilleure a le plus de chances, une finaliste moins bien notée peut sortir.
  // Poids au carré : la meilleure sort environ 2 fois sur 3, ce qui garde de la variété sans
  // proposer trop souvent une sortie nettement moins bonne.
  const chosen = pickWeighted(
    finalists,
    (entry) => (1 + GENERATOR_SETTINGS.scoreMargin - (bestScore - entry.score)) ** 2,
    random,
  );
  return buildResult(chosen.outing, context);
}

// ---------------------------------------------------------------------------
// 1. Filtrage, avec un diagnostic précis en cas d'échec
// ---------------------------------------------------------------------------

function selectCandidates(activities, { categories, audience, budgetEur, availableMinutes }) {
  const matching = activities.filter(
    (activity) => categories.includes(activity.category) && activity.suitable_for.includes(audience),
  );
  if (matching.length === 0) {
    return failure(FAILURE_REASONS.NO_MATCHING_ACTIVITY);
  }

  const priced = matching.filter(hasKnownPrice);
  if (priced.length === 0) {
    return failure(FAILURE_REASONS.UNKNOWN_PRICES);
  }

  const affordable = priced.filter((activity) => activity.cost.max_eur <= budgetEur);
  if (affordable.length === 0) {
    const minimumBudgetEur = Math.min(...priced.map((activity) => activity.cost.max_eur));
    return failure(FAILURE_REASONS.BUDGET_TOO_LOW, { minimumBudgetEur });
  }

  const fitting = affordable.filter((activity) => activity.duration_minutes.min <= availableMinutes);
  if (fitting.length === 0) {
    const minimumMinutes = Math.min(...affordable.map((activity) => activity.duration_minutes.min));
    return failure(FAILURE_REASONS.TIME_TOO_SHORT, { minimumMinutes });
  }

  return { ok: true, candidates: fitting };
}

function failure(reason, details = {}) {
  return { ok: false, reason, details };
}

// ---------------------------------------------------------------------------
// 2. Vivier : on limite le nombre d'activités pour garder un calcul rapide
// ---------------------------------------------------------------------------

function buildPool(candidates, categories, areaCenter, random) {
  // Avec un secteur : de la plus proche à la plus éloignée.
  // Sans secteur : ordre aléatoire, pour varier les sorties d'une génération à l'autre.
  const ordered = areaCenter
    ? [...candidates].sort(
        (a, b) => distanceKm(areaCenter, a.location) - distanceKm(areaCenter, b.location),
      )
    : shuffle(candidates, random);

  const perCategory = Math.max(
    GENERATOR_SETTINGS.minPerCategory,
    Math.floor(GENERATOR_SETTINGS.poolSize / categories.length),
  );

  // Chaque envie est représentée par ses meilleures activités…
  const pool = new Set();
  for (const category of categories) {
    ordered
      .filter((activity) => activity.category === category)
      .slice(0, perCategory)
      .forEach((activity) => pool.add(activity));
  }
  // … puis on complète avec les suivantes jusqu'à la taille visée.
  for (const activity of ordered) {
    if (pool.size >= GENERATOR_SETTINGS.poolSize) break;
    pool.add(activity);
  }
  return [...pool];
}

// ---------------------------------------------------------------------------
// 3. Énumération des combinaisons (sans doublon par construction)
// ---------------------------------------------------------------------------

/**
 * Liste toutes les combinaisons de 1 à `maxSize` activités du vivier.
 * Une combinaison est un tableau de POSITIONS dans le vivier (ex. : [0, 3, 7]).
 * Chaque position n'est prise qu'une fois (on avance toujours dans le tableau),
 * donc une sortie ne peut pas contenir deux fois la même activité.
 * Élagage : on transporte les totaux en cours ; si une combinaison dépasse déjà
 * le budget ou le temps, inutile de l'agrandir.
 */
function enumerateCombinations(pool, maxSize, { budgetEur, availableMinutes }) {
  const results = [];
  const current = [];

  function explore(startIndex, costMax, durationMin) {
    for (let index = startIndex; index < pool.length; index++) {
      const activity = pool[index];
      const nextCostMax = costMax + activity.cost.max_eur;
      const nextDurationMin = durationMin + activity.duration_minutes.min;
      if (roundCents(nextCostMax) > budgetEur || nextDurationMin > availableMinutes) continue;

      current.push(index);
      results.push([...current]);
      if (current.length < maxSize) explore(index + 1, nextCostMax, nextDurationMin);
      current.pop();
    }
  }

  explore(0, 0, 0);
  return results;
}

// ---------------------------------------------------------------------------
// 4. Ordre des étapes
// ---------------------------------------------------------------------------

/**
 * Table des trajets entre toutes les activités du vivier : travelMatrix[i][j]
 * est le trajet de la i-ème à la j-ème. Calculée une fois (16 × 16 = 256 trajets),
 * puis relue des dizaines de milliers de fois pendant la recherche du meilleur ordre.
 */
function buildTravelMatrix(pool, hasNavigo) {
  return pool.map((from) => pool.map((to) => estimateTravel(from.location, to.location, { hasNavigo })));
}

/**
 * Tous les ordres possibles de 1, 2, 3 ou 4 étapes, calculés une seule fois au
 * chargement du module : INDEX_PERMUTATIONS[2] contient les 6 ordres de [0, 1, 2].
 */
const INDEX_PERMUTATIONS = Array.from({ length: GENERATOR_SETTINGS.maxSteps }, (_, index) =>
  permutations([...Array(index + 1).keys()]),
);

/**
 * Teste tous les ordres possibles (au plus 4! = 24) et garde le meilleur qui
 * respecte les contraintes, trajets compris. Renvoie null si aucun ordre ne convient.
 * @param {number[]} combination positions des activités dans le vivier
 */
function planBestRoute(combination, pool, travelMatrix, { budgetEur, availableMinutes }) {
  // Ces totaux ne dépendent pas de l'ordre : on les calcule une seule fois.
  const activitiesCostMax = sum(combination, (index) => pool[index].cost.max_eur);
  const activitiesDurationMin = sum(combination, (index) => pool[index].duration_minutes.min);
  const lastStep = combination.length - 1;

  let bestOrder = null;
  let bestOrderCost = Infinity;

  for (const permutation of INDEX_PERMUTATIONS[lastStep]) {
    const order = permutation.map((position) => combination[position]);

    let travelMinutes = 0;
    let transportCostEur = 0;
    let foodBonus = 0;
    for (let step = 0; step < order.length; step++) {
      if (step > 0) {
        const leg = travelMatrix[order[step - 1]][order[step]];
        travelMinutes += leg.minutes;
        transportCostEur += leg.costEur;
      }
      // Plus un repas est placé tard, plus le bonus est grand (maximum en dernière étape).
      if (lastStep > 0 && pool[order[step]].category === 'food') {
        foodBonus += (GENERATOR_SETTINGS.foodLateBonusMinutes * step) / lastStep;
      }
    }

    const fitsBudget = roundCents(activitiesCostMax + transportCostEur) <= budgetEur;
    const fitsTime = activitiesDurationMin + travelMinutes <= availableMinutes;
    if (!fitsBudget || !fitsTime) continue;

    const orderCost = travelMinutes - foodBonus;
    if (orderCost < bestOrderCost) {
      bestOrder = order;
      bestOrderCost = orderCost;
    }
  }

  return bestOrder === null ? null : describeRoute(bestOrder, pool, travelMatrix);
}

/** Construit la description complète d'une sortie à partir de l'ordre retenu (positions dans le vivier). */
function describeRoute(orderIndices, pool, travelMatrix) {
  const order = orderIndices.map((index) => pool[index]);
  const legs = orderIndices.map((index, step) => (step === 0 ? null : travelMatrix[orderIndices[step - 1]][index]));
  const travelMinutes = sum(legs, (leg) => leg?.minutes ?? 0);
  const transportCostEur = roundCents(sum(legs, (leg) => leg?.costEur ?? 0));
  const activitiesCostMinEur = sum(order, (activity) => activity.cost.min_eur);
  const activitiesCostMaxEur = sum(order, (activity) => activity.cost.max_eur);

  return {
    activities: order,
    legs,
    travelMinutes,
    transportCostEur,
    activitiesCostMinEur,
    activitiesCostMaxEur,
    costMinEur: roundCents(activitiesCostMinEur + transportCostEur),
    costMaxEur: roundCents(activitiesCostMaxEur + transportCostEur),
    durationMinMinutes: sum(order, (activity) => activity.duration_minutes.min) + travelMinutes,
    durationMaxMinutes: sum(order, (activity) => activity.duration_minutes.max) + travelMinutes,
  };
}

/** Tous les ordres possibles d'un petit tableau (récursif : chaque élément en tête, puis les ordres du reste). */
function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    return permutations(rest).map((permutation) => [item, ...permutation]);
  });
}

// ---------------------------------------------------------------------------
// 5. Note d'une sortie (plus elle est haute, mieux c'est)
// ---------------------------------------------------------------------------

function scoreOuting(outing, { preferences, stepTarget, areaCenter, previousIds }) {
  const { activities } = outing;
  const stepCount = activities.length;
  let score = 0;

  // Assez d'étapes ?
  if (stepCount < stepTarget.min) {
    score -= SCORE_WEIGHTS.missingStep * (stepTarget.min - stepCount);
  }

  // Variété : on compare le nombre d'envies servies au nombre d'envies qu'une sortie
  // de taille maximale pourrait servir. Avec 3 envies et 3 étapes possibles, chaque
  // envie absente coûte des points ; avec une seule envie (ex. : gaming seul),
  // enchaîner deux activités de la même catégorie n'est pas pénalisé.
  const distinctCategories = new Set(activities.map((activity) => activity.category)).size;
  const servableInterests = Math.min(preferences.categories.length, stepTarget.max);
  score -= SCORE_WEIGHTS.missingInterest * Math.max(0, servableInterests - distinctCategories);

  // Temps bien utilisé : durée « typique » (milieu des fourchettes) comparée au temps disponible.
  // Le score est maximal à 100 % et redescend si la sortie risque de déborder.
  const typicalMinutes =
    sum(activities, (activity) => (activity.duration_minutes.min + activity.duration_minutes.max) / 2) +
    outing.travelMinutes;
  const usage = typicalMinutes / preferences.availableMinutes;
  score += SCORE_WEIGHTS.timeUsage * (usage <= 1 ? usage : Math.max(0, 2 - usage));

  // Trajets courts.
  score -= SCORE_WEIGHTS.travelMinute * outing.travelMinutes;

  // Proximité du secteur choisi.
  if (areaCenter) {
    const averageKm = sum(activities, (activity) => distanceKm(areaCenter, activity.location)) / stepCount;
    score -= SCORE_WEIGHTS.areaKm * averageKm;
  }

  // « Générer une autre sortie » : on évite de reproposer les mêmes activités.
  const alreadyShown = activities.filter((activity) => previousIds.has(activity.id)).length;
  score -= SCORE_WEIGHTS.alreadyShown * alreadyShown;

  return score;
}

// ---------------------------------------------------------------------------
// 6. Résultat
// ---------------------------------------------------------------------------

function buildResult(outing, { preferences, stepTarget, areaHasMatch }) {
  const { arrondissement, categories, availableMinutes } = preferences;

  const steps = outing.activities.map((activity, index) => ({
    number: index + 1,
    activity,
    travelFromPrevious: outing.legs[index], // null pour la première étape
    isOutsideArea: arrondissement !== null && activity.location.arrondissement !== arrondissement,
  }));

  const notices = [];
  if (steps.length < stepTarget.min) {
    notices.push({ code: NOTICE_CODES.FEWER_STEPS_THAN_TARGET, stepCount: steps.length, targetMin: stepTarget.min });
  }
  // Deux cas distincts, pour un message plus clair :
  // rien de compatible dans l'arrondissement, ou seulement une partie des étapes ailleurs.
  if (arrondissement !== null && !areaHasMatch) {
    notices.push({ code: NOTICE_CODES.NO_MATCH_IN_AREA, arrondissement });
  } else if (steps.some((step) => step.isOutsideArea)) {
    notices.push({ code: NOTICE_CODES.OUTSIDE_SELECTED_AREA, arrondissement });
  }
  const coveredCategories = new Set(outing.activities.map((activity) => activity.category));
  const missingCategories = categories.filter((category) => !coveredCategories.has(category));
  if (missingCategories.length > 0) {
    notices.push({ code: NOTICE_CODES.SOME_INTERESTS_MISSING, missingCategories });
  }

  return {
    ok: true,
    steps,
    totals: {
      activitiesCostMinEur: outing.activitiesCostMinEur,
      activitiesCostMaxEur: outing.activitiesCostMaxEur,
      transportCostEur: outing.transportCostEur,
      costMinEur: outing.costMinEur,
      costMaxEur: outing.costMaxEur,
      travelMinutes: outing.travelMinutes,
      durationMinMinutes: outing.durationMinMinutes,
      // Indicatif : on ne dépasse pas le temps disponible, l'utilisateur ajuste la durée de chaque étape.
      durationMaxMinutes: Math.min(outing.durationMaxMinutes, availableMinutes),
    },
    stepTarget,
    notices,
  };
}

// ---------------------------------------------------------------------------
// Petits utilitaires
// ---------------------------------------------------------------------------

function sum(items, getValue) {
  return items.reduce((total, item, index) => total + getValue(item, index), 0);
}

/**
 * Arrondit au centime. Indispensable avec des nombres décimaux :
 * en JavaScript, 2.55 + 2.55 + 2.55 vaut 7.6499999999999995 et non 7.65.
 * Sans arrondi, un total « juste au budget » pourrait être refusé (ou accepté) à tort.
 */
function roundCents(value) {
  return Math.round(value * 100) / 100;
}
