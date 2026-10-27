import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { areaCode, planTaskNumbers, taskRef } from '../src/lib/taskRef';

describe('areaCode', () => {
  test('Nairobi, its estates and its main roads are NRB', () => {
    for (const loc of ['Kilimani, Nairobi', 'Westlands', 'Apt 4B, Yaya Centre, Argwings Kodhek Rd', 'South B', 'Mombasa Road', 'Garden City Mall, Thika Rd', 'Nairobi, Kenya', '']) {
      assert.equal(areaCode(loc), 'NRB', loc);
    }
  });
  test('other towns get their own code', () => {
    assert.equal(areaCode('Nyali, Mombasa'), 'MSA');
    assert.equal(areaCode('Milimani, Kisumu'), 'KSM');
    assert.equal(areaCode('Ruiru'), 'KBU');
    assert.equal(areaCode('Syokimau'), 'MKS');
    assert.equal(areaCode('Kitengela'), 'KJD');
  });
  test('unknown places fall back to KE', () => {
    assert.equal(areaCode('Somewhere unknown'), 'KE');
  });
});

describe('taskRef', () => {
  test('number plus area', () => {
    assert.equal(taskRef({ taskNumber: 128, location: 'Kilimani, Nairobi' }), 'task_128_NRB');
    assert.equal(taskRef({ taskNumber: 7, location: 'Nyali, Mombasa' }), 'task_7_MSA');
  });
  test('no number yet', () => {
    assert.equal(taskRef({ location: 'Nairobi' }), null);
    assert.equal(taskRef({ taskNumber: 0 }), null);
  });
});

describe('planTaskNumbers', () => {
  const d = (day: number) => new Date(2026, 9, day);
  test('numbers unnumbered requests after the highest, oldest first', () => {
    const plan = planTaskNumbers([
      { id: 'c', createdAt: d(5) },
      { id: 'a', taskNumber: 3, createdAt: d(1) },
      { id: 'b', createdAt: d(2) },
      { id: 'x', createdAt: null },
    ]);
    assert.deepEqual(plan, [
      { id: 'x', taskNumber: 4 },
      { id: 'b', taskNumber: 5 },
      { id: 'c', taskNumber: 6 },
    ]);
  });
  test('starts at 1 and does nothing when all are numbered', () => {
    assert.deepEqual(planTaskNumbers([{ id: 'a', createdAt: d(1) }]), [{ id: 'a', taskNumber: 1 }]);
    assert.deepEqual(planTaskNumbers([{ id: 'a', taskNumber: 1, createdAt: d(1) }]), []);
  });
});
