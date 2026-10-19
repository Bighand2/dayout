import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseActivities } from '../src/data/activitySchema.js';
import { generateOuting, getStepTarget, FAILURE_REASONS, NOTICE_CODES } from '../src/engine/generator.js';
import { createSeededRandom } from '../src/engine/random.js';
import { CATEGORY_CODES } from '../src/config/categories.js';

const catalogUrl = new URL('../public/data/activities.json', import.meta.url);
const { activities: catalog } = parseActivities(JSON.parse(await readFile(catalogUrl, 'utf8')));

/** Préférences de base ; chaque test remplace ce qui l'intéresse. */
function makePreferences(overrides = {}) {
  return {
    budgetEur: 15,
    availableMinutes: 240,
    categories: ['thrift', 'gaming', 'food'],
    audience: 'solo',
    arrondissement: null,
    hasNavigo: false,
    ...overrides,
  };
}

/** Petite activité de test, placée par défaut dans le 11e. */
function makeActivity(id, category, { price = [0, 0], duration = [60, 60], at = [48.859, 2.38], arrondissement = 11, audience = ['solo', 'couple', 'friends'] } = {}) {
  return {
    id,
    name: id,
    category,
    description: 'Activité de test.',
    cost: { type: price[1] === 0 ? 'free' : 'ticket', min_eur: price[0], max_eur: price[1] },
    duration_minutes: { min: duration[0], max: duration[1] },
    location: { arrondissement, address: null, latitude: at[0], longitude: at[1] },
    suitable_for: audience,
    is_fictional: true,
    image_url: null,
    info_url: null,
  };
}

const ids = (result) => result.steps.map((step) => step.activity.id);

// ---------------------------------------------------------------------------
// Contraintes strictes, vérifiées sur de nombreux cas avec le vrai catalogue
// ---------------------------------------------------------------------------

test('ne dépasse jamais le budget ni le temps, sans doublon, sur 480 cas variés', () => {
  const budgets = [0, 5, 15, 30, 80];
  const durations = [45, 120, 240, 480];
  const categorySets = [['gaming'], ['food', 'thrift'], ['culture', 'nature', 'food'], CATEGORY_CODES];
  const audiences = ['solo', 'friends'];
  const arrondissements = [null, 11, 19];
  let checked = 0;
  let seed = 1;

  for (const budgetEur of budgets) {
    for (const availableMinutes of durations) {
      for (const categories of categorySets) {
        for (const audience of audiences) {
          for (const arrondissement of arrondissements) {
            const preferences = makePreferences({ budgetEur, availableMinutes, categories, audience, arrondissement });
            const result = generateOuting(catalog, preferences, { random: createSeededRandom(seed++) });
            if (!result.ok) continue;
            checked++;

            const { steps, totals } = result;
            const context = JSON.stringify(preferences);
            assert.ok(totals.costMaxEur <= budgetEur, `budget dépassé : ${context}`);
            assert.ok(totals.durationMinMinutes <= availableMinutes, `temps dépassé : ${context}`);
            assert.ok(steps.length >= 1 && steps.length <= 4, `nombre d'étapes : ${context}`);
            assert.equal(new Set(ids(result)).size, steps.length, `doublon : ${context}`);
            for (const { activity } of steps) {
              assert.ok(categories.includes(activity.category), `catégorie non choisie : ${context}`);
              assert.ok(activity.suitable_for.includes(audience), `public incompatible : ${context}`);
            }
          }
        }
      }
    }
  }
  assert.ok(checked > 300, `seulement ${checked} sorties générées : le catalogue ou le test est à revoir`);
});

test('les totaux affichés correspondent bien à la somme des étapes', () => {
  const result = generateOuting(catalog, makePreferences({ budgetEur: 40 }), { random: createSeededRandom(7) });
  assert.equal(result.ok, true);
  const activitiesMax = result.steps.reduce((total, step) => total + step.activity.cost.max_eur, 0);
  const transport = result.steps.reduce((total, step) => total + (step.travelFromPrevious?.costEur ?? 0), 0);
  assert.equal(result.totals.costMaxEur, Math.round((activitiesMax + transport) * 100) / 100);
  assert.equal(result.steps[0].travelFromPrevious, null);
});

// ---------------------------------------------------------------------------
// Règles métier
// ---------------------------------------------------------------------------

test('budget de 0 € : uniquement des activités gratuites et aucun ticket de métro', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const result = generateOuting(catalog, makePreferences({ budgetEur: 0 }), { random: createSeededRandom(seed) });
    assert.equal(result.ok, true);
    assert.equal(result.totals.costMaxEur, 0);
  }
});

test('avec le gaming seul, toutes les étapes sont du gaming', () => {
  const preferences = makePreferences({ categories: ['gaming'], budgetEur: 50, availableMinutes: 300 });
  const result = generateOuting(catalog, preferences, { random: createSeededRandom(3) });
  assert.ok(result.steps.every((step) => step.activity.category === 'gaming'));
});

test('quand la nourriture est cochée et possible, la sortie contient un repas', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const result = generateOuting(catalog, makePreferences(), { random: createSeededRandom(seed) });
    assert.ok(result.steps.some((step) => step.activity.category === 'food'), `seed ${seed}`);
  }
});

test('le repas est placé en dernière étape quand les trajets sont équivalents', () => {
  const activities = [makeActivity('repas', 'food'), makeActivity('friperie', 'thrift')]; // même lieu
  const result = generateOuting(activities, makePreferences({ categories: ['food', 'thrift'] }));
  assert.deepEqual(ids(result), ['friperie', 'repas']);
});

test("l'arrondissement choisi est privilégié", () => {
  const near = [48.859, 2.38]; // centre du 11e
  const far = [48.8925, 2.3484]; // centre du 18e
  const activities = [
    makeActivity('friperie-11', 'thrift', { at: near }),
    makeActivity('friperie-18', 'thrift', { at: far, arrondissement: 18 }),
    makeActivity('jeux-11', 'gaming', { at: near }),
    makeActivity('jeux-18', 'gaming', { at: far, arrondissement: 18 }),
  ];
  const preferences = makePreferences({ categories: ['thrift', 'gaming'], arrondissement: 11 });
  for (let seed = 1; seed <= 10; seed++) {
    const result = generateOuting(activities, preferences, { random: createSeededRandom(seed) });
    assert.deepEqual(ids(result).sort(), ['friperie-11', 'jeux-11']);
    assert.equal(result.notices.some((notice) => notice.code === NOTICE_CODES.OUTSIDE_SELECTED_AREA), false);
  }
});

test("signale les étapes hors de l'arrondissement quand il n'y a rien sur place", () => {
  const activities = [makeActivity('parc-18', 'nature', { at: [48.8925, 2.3484], arrondissement: 18 })];
  const result = generateOuting(activities, makePreferences({ categories: ['nature'], arrondissement: 11 }));
  assert.equal(result.steps[0].isOutsideArea, true);
  assert.ok(result.notices.some((notice) => notice.code === NOTICE_CODES.OUTSIDE_SELECTED_AREA));
});

test('le pass Navigo rend les trajets en métro gratuits', () => {
  const activities = [
    makeActivity('a', 'thrift', { at: [48.859, 2.38] }),
    makeActivity('b', 'gaming', { at: [48.8925, 2.3484], arrondissement: 18 }), // à ~4 km : métro
  ];
  const preferences = makePreferences({ categories: ['thrift', 'gaming'], budgetEur: 10 });
  const withoutPass = generateOuting(activities, preferences);
  const withPass = generateOuting(activities, { ...preferences, hasNavigo: true });
  assert.equal(withoutPass.steps[1].travelFromPrevious.mode, 'metro');
  assert.equal(withoutPass.totals.transportCostEur, 2.55);
  assert.equal(withPass.totals.transportCostEur, 0);
});

test('le coût du métro compte dans le budget', () => {
  const activities = [
    makeActivity('a', 'thrift', { at: [48.859, 2.38] }),
    makeActivity('b', 'gaming', { at: [48.8925, 2.3484], arrondissement: 18 }),
  ];
  // 2 € de budget : le ticket à 2,55 € empêche d'enchaîner les deux.
  const result = generateOuting(activities, makePreferences({ categories: ['thrift', 'gaming'], budgetEur: 2 }));
  assert.equal(result.steps.length, 1);
});

test('un total pile égal au budget est accepté malgré les arrondis des décimaux', () => {
  const activities = [
    makeActivity('a', 'thrift', { price: [7.45, 7.45], at: [48.859, 2.38] }),
    makeActivity('b', 'gaming', { price: [5, 5], at: [48.8925, 2.3484], arrondissement: 18 }),
  ];
  // 7,45 + 5 + 2,55 (métro) = 15 € exactement
  const result = generateOuting(activities, makePreferences({ categories: ['thrift', 'gaming'], budgetEur: 15 }));
  assert.equal(result.steps.length, 2);
  assert.equal(result.totals.costMaxEur, 15);
});

test("une sortie d'une seule étape est proposée et signalée si c'est la seule possibilité", () => {
  const activities = [makeActivity('cine', 'cinema', { duration: [120, 140] })];
  const result = generateOuting(activities, makePreferences({ categories: ['cinema'], availableMinutes: 300 }));
  assert.equal(result.ok, true);
  assert.equal(result.steps.length, 1);
  assert.ok(result.notices.some((notice) => notice.code === NOTICE_CODES.FEWER_STEPS_THAN_TARGET));
});

test("« Générer une autre sortie » propose d'autres activités quand c'est possible", () => {
  const preferences = makePreferences({ budgetEur: 30, categories: ['food', 'culture', 'nature'] });
  const first = generateOuting(catalog, preferences, { random: createSeededRandom(1) });
  const second = generateOuting(catalog, preferences, { random: createSeededRandom(2), previousActivityIds: ids(first) });
  assert.notDeepEqual(ids(second).sort(), ids(first).sort());
});

test('même graine, mêmes préférences : même sortie (résultat reproductible)', () => {
  const preferences = makePreferences({ budgetEur: 25 });
  const first = generateOuting(catalog, preferences, { random: createSeededRandom(42) });
  const second = generateOuting(catalog, preferences, { random: createSeededRandom(42) });
  assert.deepEqual(ids(first), ids(second));
});

// ---------------------------------------------------------------------------
// Échecs expliqués
// ---------------------------------------------------------------------------

test('budget trop faible : indique le budget minimum nécessaire', () => {
  const activities = [makeActivity('vr', 'gaming', { price: [18, 25] }), makeActivity('arcade', 'gaming', { price: [5, 12] })];
  const result = generateOuting(activities, makePreferences({ categories: ['gaming'], budgetEur: 3 }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, FAILURE_REASONS.BUDGET_TOO_LOW);
  assert.equal(result.details.minimumBudgetEur, 12);
});

test('temps trop court : indique la durée minimum nécessaire', () => {
  const activities = [makeActivity('cine', 'cinema', { duration: [110, 140] })];
  const result = generateOuting(activities, makePreferences({ categories: ['cinema'], availableMinutes: 60 }));
  assert.equal(result.reason, FAILURE_REASONS.TIME_TOO_SHORT);
  assert.equal(result.details.minimumMinutes, 110);
});

test('aucune activité pour ce public', () => {
  const activities = [makeActivity('bar-a-jeux', 'gaming', { audience: ['friends'] })];
  const result = generateOuting(activities, makePreferences({ categories: ['gaming'], audience: 'solo' }));
  assert.equal(result.reason, FAILURE_REASONS.NO_MATCHING_ACTIVITY);
});

test('les activités au prix inconnu sont écartées (budget impossible à garantir)', () => {
  const unknown = makeActivity('mystere', 'shows');
  unknown.cost = { type: 'ticket', min_eur: null, max_eur: null };
  const result = generateOuting([unknown], makePreferences({ categories: ['shows'] }));
  assert.equal(result.reason, FAILURE_REASONS.UNKNOWN_PRICES);
});

test('des préférences invalides lèvent une erreur', () => {
  assert.throws(() => generateOuting(catalog, makePreferences({ budgetEur: -5 })), TypeError);
});

test('nombre d’étapes visé selon le temps disponible', () => {
  assert.deepEqual(getStepTarget(90), { min: 1, max: 2 });
  assert.deepEqual(getStepTarget(240), { min: 2, max: 3 });
  assert.deepEqual(getStepTarget(300), { min: 3, max: 4 });
});
