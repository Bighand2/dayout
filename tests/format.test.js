import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEuros,
  formatEuroRange,
  formatCost,
  formatDuration,
  formatDurationRange,
  formatArrondissement,
  formatTravel,
  mapUrl,
} from '../src/ui/format.js';

const NBSP = ' '; // espace insécable utilisée entre un nombre et son unité

test('montants en euros, avec virgule décimale', () => {
  assert.equal(formatEuros(12), `12${NBSP}€`);
  assert.equal(formatEuros(2.55), `2,55${NBSP}€`);
  assert.equal(formatEuros(0), `0${NBSP}€`);
});

test('fourchettes de prix', () => {
  assert.equal(formatEuroRange(5, 12), `5 à 12${NBSP}€`);
  assert.equal(formatEuroRange(8, 8), `8${NBSP}€`);
});

test('prix d’une activité selon son type', () => {
  assert.equal(formatCost({ type: 'free', min_eur: 0, max_eur: 0 }), 'Gratuit');
  assert.equal(formatCost({ type: 'ticket', min_eur: 7, max_eur: 10 }), `Entrée : 7 à 10${NBSP}€`);
  assert.equal(formatCost({ type: 'consumption', min_eur: 5, max_eur: 12 }), `Conso. estimée : 5 à 12${NBSP}€`);
  assert.equal(formatCost({ type: 'ticket', min_eur: null, max_eur: null }), 'Prix inconnu');
});

test('durées', () => {
  assert.equal(formatDuration(45), `45${NBSP}min`);
  assert.equal(formatDuration(60), `1${NBSP}h`);
  assert.equal(formatDuration(90), `1${NBSP}h${NBSP}30`);
  assert.equal(formatDuration(125), `2${NBSP}h${NBSP}05`);
  assert.equal(formatDurationRange(60, 90), `1${NBSP}h à 1${NBSP}h${NBSP}30`);
});

test('arrondissements', () => {
  assert.equal(formatArrondissement(1), '1er');
  assert.equal(formatArrondissement(11), '11e');
});

test('trajets', () => {
  assert.equal(formatTravel({ mode: 'walk', minutes: 8, costEur: 0 }), `8${NBSP}min à pied`);
  assert.equal(formatTravel({ mode: 'metro', minutes: 18, costEur: 2.55 }), `≈ 18${NBSP}min en métro · 2,55${NBSP}€`);
  assert.equal(formatTravel({ mode: 'metro', minutes: 18, costEur: 0 }), `≈ 18${NBSP}min en métro · inclus dans ton pass`);
});

test('lien de carte construit à partir des coordonnées', () => {
  const url = new URL(mapUrl({ latitude: 48.857, longitude: 2.38 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'www.openstreetmap.org');
  assert.equal(url.searchParams.get('mlat'), '48.857');
});
