import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateActivity, parseActivities, hasKnownPrice } from '../src/data/activitySchema.js';

/** Activité valide de référence ; chaque test en modifie une copie. */
function makeActivity(overrides = {}) {
  return {
    id: 'gaming-001',
    name: 'Pixel Zone',
    category: 'gaming',
    description: "Salle d'arcade.",
    cost: { type: 'consumption', min_eur: 5, max_eur: 12 },
    duration_minutes: { min: 60, max: 90 },
    location: { arrondissement: 11, address: null, latitude: 48.857, longitude: 2.38 },
    suitable_for: ['solo', 'couple', 'friends'],
    is_fictional: true,
    ...overrides,
  };
}

test('accepte une activité valide', () => {
  const result = validateActivity(makeActivity());
  assert.equal(result.valid, true);
  assert.equal(result.activity.id, 'gaming-001');
  assert.equal(result.activity.info_url, null);
});

test('ne conserve que les champs connus (liste blanche)', () => {
  const result = validateActivity(makeActivity({ isAdmin: true, rating: 5 }));
  assert.equal(result.valid, true);
  assert.equal('isAdmin' in result.activity, false);
  assert.equal('rating' in result.activity, false);
});

test('rejette une catégorie inconnue', () => {
  const result = validateActivity(makeActivity({ category: 'casino' }));
  assert.equal(result.valid, false);
});

test('rejette un prix négatif ou un min supérieur au max', () => {
  assert.equal(validateActivity(makeActivity({ cost: { type: 'ticket', min_eur: -1, max_eur: 5 } })).valid, false);
  assert.equal(validateActivity(makeActivity({ cost: { type: 'ticket', min_eur: 10, max_eur: 5 } })).valid, false);
});

test('une activité gratuite doit coûter 0', () => {
  const result = validateActivity(makeActivity({ cost: { type: 'free', min_eur: 0, max_eur: 3 } }));
  assert.equal(result.valid, false);
});

test('accepte un prix inconnu (null / null) et le signale', () => {
  const result = validateActivity(makeActivity({ cost: { type: 'ticket', min_eur: null, max_eur: null } }));
  assert.equal(result.valid, true);
  assert.equal(hasKnownPrice(result.activity), false);
});

test('rejette un prix à moitié renseigné', () => {
  const result = validateActivity(makeActivity({ cost: { type: 'ticket', min_eur: 5, max_eur: null } }));
  assert.equal(result.valid, false);
});

test('rejette des coordonnées hors de Paris', () => {
  const location = { arrondissement: 11, latitude: 45.76, longitude: 4.83 }; // Lyon
  assert.equal(validateActivity(makeActivity({ location })).valid, false);
});

test('rejette un arrondissement hors de 1 à 20', () => {
  const location = { arrondissement: 21, latitude: 48.857, longitude: 2.38 };
  assert.equal(validateActivity(makeActivity({ location })).valid, false);
});

test('rejette un public inconnu ou vide', () => {
  assert.equal(validateActivity(makeActivity({ suitable_for: [] })).valid, false);
  assert.equal(validateActivity(makeActivity({ suitable_for: ['family'] })).valid, false);
});

test('sécurité : refuse les URL non https (dont javascript:)', () => {
  for (const url of ['javascript:alert(1)', 'http://exemple.fr', 'data:text/html,<script>', 'pas une url']) {
    const result = validateActivity(makeActivity({ info_url: url }));
    assert.equal(result.valid, false, `l'URL « ${url} » aurait dû être refusée`);
  }
  assert.equal(validateActivity(makeActivity({ info_url: 'https://exemple.fr/page' })).valid, true);
});

test('parseActivities écarte les invalides et les doublons sans bloquer le reste', () => {
  const { activities, rejected } = parseActivities([
    makeActivity(),
    makeActivity(), // même id : doublon
    makeActivity({ id: 'food-001', category: 'casino' }), // invalide
    makeActivity({ id: 'food-002', category: 'food' }),
  ]);
  assert.deepEqual(activities.map((activity) => activity.id), ['gaming-001', 'food-002']);
  assert.equal(rejected.length, 2);
});

test("parseActivities refuse un catalogue qui n'est pas un tableau", () => {
  assert.throws(() => parseActivities({ activities: [] }), TypeError);
});
