import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferences } from '../src/engine/preferences.js';

function makePreferences(overrides = {}) {
  return {
    budgetEur: 15,
    availableMinutes: 240,
    categories: ['food', 'gaming'],
    audience: 'solo',
    arrondissement: 11,
    hasNavigo: false,
    ...overrides,
  };
}

test('accepte des préférences valides', () => {
  const result = validatePreferences(makePreferences());
  assert.equal(result.valid, true);
});

test('accepte un budget de 0 € (sortie gratuite)', () => {
  assert.equal(validatePreferences(makePreferences({ budgetEur: 0 })).valid, true);
});

test('« peu importe » l’arrondissement : null, et pass Navigo facultatif', () => {
  const result = validatePreferences(makePreferences({ arrondissement: null, hasNavigo: undefined }));
  assert.equal(result.valid, true);
  assert.equal(result.preferences.arrondissement, null);
  assert.equal(result.preferences.hasNavigo, false);
});

test('rejette un budget négatif, trop élevé ou sous forme de texte', () => {
  for (const budgetEur of [-1, 10_000, '15', NaN, Infinity]) {
    const result = validatePreferences(makePreferences({ budgetEur }));
    assert.equal(result.valid, false, `budget ${String(budgetEur)}`);
    assert.ok(result.errors.budgetEur);
  }
});

test('rejette un temps disponible hors limites ou non entier', () => {
  for (const availableMinutes of [0, 10, 1000, 90.5]) {
    assert.equal(validatePreferences(makePreferences({ availableMinutes })).valid, false);
  }
});

test('exige au moins une catégorie connue', () => {
  assert.ok(validatePreferences(makePreferences({ categories: [] })).errors.categories);
  assert.ok(validatePreferences(makePreferences({ categories: ['casino'] })).errors.categories);
});

test('supprime les catégories en double', () => {
  const result = validatePreferences(makePreferences({ categories: ['food', 'food'] }));
  assert.deepEqual(result.preferences.categories, ['food']);
});

test('rejette un public ou un arrondissement inconnu', () => {
  assert.ok(validatePreferences(makePreferences({ audience: 'family' })).errors.audience);
  assert.ok(validatePreferences(makePreferences({ arrondissement: 21 })).errors.arrondissement);
});

test('renvoie toutes les erreurs en une fois (pour les afficher dans le formulaire)', () => {
  const result = validatePreferences(makePreferences({ budgetEur: -1, categories: [], audience: '' }));
  assert.deepEqual(Object.keys(result.errors).sort(), ['audience', 'budgetEur', 'categories']);
});
