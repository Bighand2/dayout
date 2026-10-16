import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadActivities } from '../src/data/activityRepository.js';

/** Faux `fetch` : renvoie la réponse demandée sans passer par le réseau. */
function fakeFetch({ ok = true, status = 200, body = [], invalidJson = false } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => {
      if (invalidJson) throw new SyntaxError('Unexpected token');
      return body;
    },
  });
}

const validActivity = {
  id: 'nature-001',
  name: 'Parc',
  category: 'nature',
  description: 'Un parc.',
  cost: { type: 'free', min_eur: 0, max_eur: 0 },
  duration_minutes: { min: 30, max: 60 },
  location: { arrondissement: 19, latitude: 48.88, longitude: 2.382 },
  suitable_for: ['solo'],
  is_fictional: true,
};

test('renvoie les activités valides et signale les invalides', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const activities = await loadActivities({
    fetchFn: fakeFetch({ body: [validActivity, { id: 'cassé' }] }),
  });
  assert.equal(activities.length, 1);
  assert.equal(warn.mock.callCount(), 1);
});

test('lève une erreur claire si le serveur répond une erreur HTTP', async () => {
  await assert.rejects(loadActivities({ fetchFn: fakeFetch({ ok: false, status: 500 }) }), /HTTP 500/);
});

test("lève une erreur claire si le JSON est illisible", async () => {
  await assert.rejects(loadActivities({ fetchFn: fakeFetch({ invalidJson: true }) }), /JSON valide/);
});

test('lève une erreur claire si le réseau est indisponible', async () => {
  const failingFetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(loadActivities({ fetchFn: failingFetch }), /contacter/);
});
