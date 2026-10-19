import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, estimateTravel } from '../src/engine/geo.js';
import { TRANSPORT } from '../src/config/transport.js';

const notreDame = { latitude: 48.853, longitude: 2.3499 };
const eiffelTower = { latitude: 48.8584, longitude: 2.2945 };

test('distance à vol d’oiseau Notre-Dame → tour Eiffel ≈ 4,1 km', () => {
  const distance = distanceKm(notreDame, eiffelTower);
  assert.ok(Math.abs(distance - 4.1) < 0.1, `distance obtenue : ${distance}`);
});

test('la distance d’un point à lui-même est nulle', () => {
  assert.equal(distanceKm(notreDame, notreDame), 0);
});

test('trajet court : à pied et gratuit', () => {
  const nearby = { latitude: 48.8555, longitude: 2.3499 }; // ~280 m plus au nord
  const travel = estimateTravel(notreDame, nearby);
  assert.equal(travel.mode, 'walk');
  assert.equal(travel.costEur, 0);
  assert.ok(travel.minutes > 0 && travel.minutes < 10);
});

test('trajet long : métro, avec un ticket sauf pour un abonné Navigo', () => {
  const travel = estimateTravel(notreDame, eiffelTower);
  assert.equal(travel.mode, 'metro');
  assert.equal(travel.costEur, TRANSPORT.metroTicketEur);
  assert.equal(estimateTravel(notreDame, eiffelTower, { hasNavigo: true }).costEur, 0);
});
