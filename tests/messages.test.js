import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeFailure, describeNotice } from '../src/ui/messages.js';
import { FAILURE_REASONS, NOTICE_CODES } from '../src/engine/generator.js';

const preferences = { budgetEur: 3, availableMinutes: 60, audience: 'couple', categories: ['gaming'] };

test("chaque code d'échec produit un titre et une piste", () => {
  for (const reason of Object.values(FAILURE_REASONS)) {
    const { title, hint } = describeFailure({ reason, details: { minimumBudgetEur: 12, minimumMinutes: 110 } }, preferences);
    assert.ok(title.length > 0 && hint.length > 0, reason);
  }
});

test('le message de budget trop faible indique le minimum nécessaire', () => {
  const { title, hint } = describeFailure(
    { reason: FAILURE_REASONS.BUDGET_TOO_LOW, details: { minimumBudgetEur: 12 } },
    preferences,
  );
  assert.match(title, /3 €/);
  assert.match(hint, /12 €/);
});

test('chaque remarque produit une phrase', () => {
  const samples = {
    [NOTICE_CODES.FEWER_STEPS_THAN_TARGET]: { stepCount: 1, targetMin: 3 },
    [NOTICE_CODES.OUTSIDE_SELECTED_AREA]: { arrondissement: 11 },
    [NOTICE_CODES.NO_MATCH_IN_AREA]: { arrondissement: 1 },
    [NOTICE_CODES.SOME_INTERESTS_MISSING]: { missingCategories: ['gaming', 'food'] },
  };
  for (const code of Object.values(NOTICE_CODES)) {
    assert.ok(describeNotice({ code, ...samples[code] }).length > 0, code);
  }
});

test('les remarques utilisent les libellés français', () => {
  assert.match(describeNotice({ code: NOTICE_CODES.NO_MATCH_IN_AREA, arrondissement: 1 }), /1er/);
  assert.match(
    describeNotice({ code: NOTICE_CODES.SOME_INTERESTS_MISSING, missingCategories: ['gaming'] }),
    /Jeux vidéo/,
  );
});
