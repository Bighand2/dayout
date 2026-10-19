/**
 * Vérifie le VRAI fichier de démonstration : si quelqu'un modifie le catalogue
 * et introduit une erreur, `npm test` le signale immédiatement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseActivities } from '../src/data/activitySchema.js';
import { CATEGORY_CODES } from '../src/config/categories.js';

const catalogUrl = new URL('../public/data/activities.json', import.meta.url);
const rawList = JSON.parse(await readFile(catalogUrl, 'utf8'));
const { activities, rejected } = parseActivities(rawList);

test('toutes les activités du catalogue sont valides', () => {
  assert.deepEqual(rejected, []);
});

test('chaque catégorie possède au moins 3 activités', () => {
  for (const category of CATEGORY_CODES) {
    const count = activities.filter((activity) => activity.category === category).length;
    assert.ok(count >= 3, `catégorie « ${category} » : ${count} activité(s) seulement`);
  }
});

test('le catalogue de démonstration est entièrement marqué comme fictif', () => {
  assert.ok(activities.every((activity) => activity.is_fictional === true));
});

test('chaque arrondissement possède au moins 4 activités, dont une gratuite', () => {
  for (let arrondissement = 1; arrondissement <= 20; arrondissement++) {
    const local = activities.filter((activity) => activity.location.arrondissement === arrondissement);
    assert.ok(local.length >= 4, `${arrondissement}e : ${local.length} activité(s) seulement`);
    assert.ok(local.some((activity) => activity.cost.max_eur === 0), `${arrondissement}e : aucune activité gratuite`);
  }
});

test("le catalogue contient assez d'activités gratuites pour les petits budgets", () => {
  const freeCount = activities.filter((activity) => activity.cost.max_eur === 0).length;
  assert.ok(freeCount >= 8, `${freeCount} activité(s) gratuite(s) seulement`);
});
