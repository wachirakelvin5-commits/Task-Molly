/**
 * Unit tests for the admin dashboard metrics (no emulator needed).
 * Run with: npm run test:metrics
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminRequest,
  exportRows,
  formatDuration,
  getStage,
  liveSummary,
  makePeriod,
  median,
  money,
  normalizeRequest,
  performance,
  previousPeriod,
  toCSV,
  todaySummary,
} from '../src/lib/adminMetrics';

const NOW = new Date(2026, 9, 12, 15, 0); // 12 Oct 2026, 15:00 local
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

let seq = 0;
function req(data: Record<string, any>): AdminRequest {
  return normalizeRequest(`r${++seq}`, {
    clientId: 'client1',
    serviceType: 'Blocked Drain & Toilet Unclogging',
    serviceCategory: 'Plumbing & Water',
    budget: 2000,
    clientPrice: 2000,
    providerPrice: 1700,
    status: 'pending',
    createdAt: ago(HOUR),
    postedAt: ago(HOUR),
    ...data,
  });
}

describe('normalizeRequest', () => {
  test('uses providerPrice for payout and the difference as commission', () => {
    const r = req({});
    assert.equal(r.price, 2000);
    assert.equal(r.payout, 1700);
    assert.equal(r.commission, 300);
  });

  test('falls back to an 85/15 split and budget when prices are missing', () => {
    const r = req({ clientPrice: undefined, providerPrice: undefined, budget: '3,000' });
    assert.equal(r.price, 3000);
    assert.equal(r.payout, 2550);
    assert.equal(r.commission, 450);
  });

  test('derives a category from the service name when it is missing', () => {
    const r = req({ serviceCategory: undefined, serviceType: 'House Cleaning' });
    assert.equal(r.category, 'Cleaning & Domestic');
  });

  test('accepts Firestore-style timestamps', () => {
    const r = req({ createdAt: { toDate: () => ago(DAY) } });
    assert.equal(r.createdAt?.getTime(), ago(DAY).getTime());
  });
});

describe('getStage', () => {
  const now = NOW.getTime();
  test('pending requests are open, expiring or expired by age', () => {
    assert.equal(getStage(req({ postedAt: ago(HOUR) }), now), 'open');
    assert.equal(getStage(req({ postedAt: ago(2 * HOUR + 40 * MIN) }), now), 'expiring');
    assert.equal(getStage(req({ postedAt: ago(4 * HOUR) }), now), 'expired');
  });

  test('a reported issue overrides awaiting sign-off', () => {
    assert.equal(getStage(req({ status: 'awaiting-confirmation' }), now), 'awaiting-confirmation');
    assert.equal(getStage(req({ status: 'awaiting-confirmation', issueReportedAt: ago(MIN) }), now), 'issue');
  });
});

describe('liveSummary', () => {
  const rows = [
    req({ postedAt: ago(30 * MIN) }),
    req({ postedAt: ago(2 * HOUR) }),
    req({ postedAt: ago(5 * HOUR) }),
    req({ status: 'accepted', acceptedAt: ago(10 * MIN) }),
    req({ status: 'in-progress', startedAt: ago(HOUR), clientPrice: 5000 }),
    req({ status: 'awaiting-confirmation', providerCompletedAt: ago(HOUR), issueReportedAt: ago(5 * MIN) }),
    req({ status: 'completed', completedAt: ago(DAY) }),
    req({ status: 'cancelled', cancelledAt: ago(DAY) }),
  ];
  const s = liveSummary(rows, NOW.getTime());

  test('counts each stage and excludes finished jobs from the active list', () => {
    assert.equal(s.counts.open, 2);
    assert.equal(s.counts.expired, 1);
    assert.equal(s.counts.accepted, 1);
    assert.equal(s.counts['in-progress'], 1);
    assert.equal(s.counts.issue, 1);
    assert.equal(s.counts.completed, 1);
    assert.equal(s.activeTotal, 6);
  });

  test('sorts issues and expired requests to the top', () => {
    assert.deepEqual(s.rows.slice(0, 2).map((r) => r.stage), ['issue', 'expired']);
  });

  test('tracks value in flight and the oldest open request', () => {
    assert.equal(s.valueInFlight, 5000 + 2000);
    assert.equal(s.oldestOpenMs, 2 * HOUR);
  });
});

describe('performance', () => {
  const rows = [
    // Completed in the last 7 days
    req({ status: 'completed', createdAt: ago(3 * DAY), acceptedAt: ago(3 * DAY - 20 * MIN), startedAt: ago(2 * DAY), completedAt: ago(2 * DAY - 2 * HOUR) }),
    req({ status: 'completed', createdAt: ago(2 * DAY), acceptedAt: ago(2 * DAY - 40 * MIN), startedAt: ago(DAY), completedAt: ago(DAY - 4 * HOUR) }),
    req({ status: 'completed', serviceCategory: 'Cleaning & Domestic', createdAt: ago(DAY), acceptedAt: ago(DAY - 10 * MIN), startedAt: ago(20 * HOUR), completedAt: ago(18 * HOUR) }),
    // Cancelled in the last 7 days
    req({ status: 'cancelled', createdAt: ago(2 * DAY), cancelledAt: ago(2 * DAY - HOUR) }),
    // Expired 3 days ago, still pending
    req({ createdAt: ago(3 * DAY), postedAt: ago(3 * DAY) }),
    // Completed long ago: outside the period
    req({ status: 'completed', createdAt: ago(60 * DAY), completedAt: ago(59 * DAY) }),
  ];
  const p = performance(rows, makePeriod('7d', NOW));

  test('counts outcomes inside the period only', () => {
    assert.equal(p.completed, 3);
    assert.equal(p.cancelled, 1);
    assert.equal(p.expired, 1);
    assert.equal(p.completionRate, 3 / 5);
  });

  test('ranks categories by completed jobs', () => {
    assert.equal(p.byCategory[0].category, 'Plumbing & Water');
    assert.equal(p.byCategory[0].completed, 2);
    assert.equal(p.byCategory[0].expired, 1);
    assert.equal(p.byCategory[1].category, 'Cleaning & Domestic');
  });

  test('reports median speeds', () => {
    const accept = p.speed.find((s) => s.label === 'Time to accept')!;
    assert.equal(accept.medianMs, 20 * MIN);
    assert.equal(accept.samples, 3);
    const finish = p.speed.find((s) => s.label === 'Time to finish')!;
    assert.equal(finish.medianMs, 2 * HOUR);
  });

  test('builds one daily bucket per day of the period', () => {
    assert.equal(p.trend.length, 7);
    assert.equal(p.trend.reduce((s, t) => s + t.completed, 0), 3);
    assert.equal(p.trend.reduce((s, t) => s + t.expired, 0), 1);
  });
});

describe('money', () => {
  const rows = [
    req({ status: 'completed', completedAt: ago(DAY), clientPrice: 4000, providerPrice: 3400 }),
    req({ status: 'completed', completedAt: ago(2 * DAY), serviceCategory: 'Electrical & Solar', clientPrice: 10000, providerPrice: 8500 }),
    req({ status: 'in-progress', clientPrice: 9999 }),
    req({ status: 'completed', completedAt: ago(40 * DAY), clientPrice: 1000 }),
  ];

  test('sums agreed value, commission and payouts of signed-off jobs in the period', () => {
    const m = money(rows, makePeriod('30d', NOW));
    assert.equal(m.jobs, 2);
    assert.equal(m.gross, 14000);
    assert.equal(m.commission, 600 + 1500);
    assert.equal(m.payouts, 3400 + 8500);
    assert.equal(m.average, 7000);
    assert.equal(m.byCategory[0].category, 'Electrical & Solar');
  });

  test('all time includes older jobs and buckets by week', () => {
    const m = money(rows, makePeriod('all', NOW));
    assert.equal(m.jobs, 3);
    assert.ok(m.trend[0].label.startsWith('Wk of'));
    assert.equal(m.trend.reduce((s, t) => s + t.gross, 0), 15000);
  });
});

describe('todaySummary', () => {
  test('counts only today for money, completed and cancelled, and right now for active jobs', () => {
    const rs = [
      req({ status: 'completed', completedAt: ago(2 * HOUR) }), // today: 2000, commission 300
      req({ status: 'completed', completedAt: ago(DAY) }), // yesterday: not counted
      req({ status: 'cancelled', cancelledAt: ago(HOUR) }),
      req({ status: 'cancelled', cancelledAt: ago(2 * DAY) }),
      req({ status: 'assigned', acceptedAt: ago(3 * DAY), confirmedAt: ago(3 * DAY) }), // assigned days ago, still counts
      req({ status: 'in-progress', startedAt: ago(30 * MIN) }),
      req({ status: 'in-progress', startedAt: ago(DAY) }),
      req({ status: 'pending' }),
    ];
    const t = todaySummary(rs, NOW.getTime());
    assert.equal(t.gross, 2000);
    assert.equal(t.commission, 300);
    assert.equal(t.completed, 1);
    assert.equal(t.cancelled, 1);
    assert.equal(t.assigned, 1);
    assert.equal(t.inProgress, 2);
  });
});

describe('helpers', () => {
  test('median', () => {
    assert.equal(median([]), null);
    assert.equal(median([5, 1, 3]), 3);
    assert.equal(median([1, 2, 3, 4]), 2.5);
  });

  test('previousPeriod covers the same length just before', () => {
    const p = makePeriod('7d', NOW);
    const prev = previousPeriod(p)!;
    assert.equal(prev.end.getTime(), p.start!.getTime());
    assert.equal(p.start!.getTime() - prev.start!.getTime(), p.end.getTime() - p.start!.getTime());
    assert.equal(previousPeriod(makePeriod('all', NOW)), null);
  });

  test('formatDuration', () => {
    assert.equal(formatDuration(null), '—');
    assert.equal(formatDuration(25 * MIN), '25 min');
    assert.equal(formatDuration(3 * HOUR), '3.0 h');
    assert.equal(formatDuration(3 * DAY), '3.0 days');
  });

  test('CSV export escapes commas and quotes', () => {
    const csv = toCSV(exportRows([req({ location: 'Kilimani, Nairobi', serviceType: 'Fix "big" leak' })], NOW.getTime()));
    const [header, line] = csv.split('\n');
    assert.ok(header.startsWith('Task,Request ID,Stage,Service'));
    assert.ok(line.includes('"Kilimani, Nairobi"'));
    assert.ok(line.includes('"Fix ""big"" leak"'));
  });
});
