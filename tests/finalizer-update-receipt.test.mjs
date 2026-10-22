import assert from 'node:assert/strict';
import test from 'node:test';
import { updateReasonFromFinalizeReceipt } from '../scripts/finalizer-update-receipt.mjs';

test('reads a disabled update reason from the full receipt when the compact receipt omits unavailable updates', () => {
  const compactReceipt = {
    evidence: { receipt: '/tmp/request-route.finalize.json' },
  };

  assert.equal(
    updateReasonFromFinalizeReceipt(compactReceipt, (file) => {
      assert.equal(file, '/tmp/request-route.finalize.json');
      return { update: { status: 'unavailable', reason: 'disabled' } };
    }),
    'disabled',
  );
});
