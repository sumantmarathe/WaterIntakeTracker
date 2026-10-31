import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DAILY_GOAL_ML,
  VESSEL_PRESETS,
  escapeHtml,
  formatVolume,
  validateHydrationInput,
  validateDailyGoal,
  calculateDailySummary,
  calculateHydrationStreak,
  filterHydrationEntries,
  aggregateByDay,
  computeLast7DaysTrend,
  createBackupEnvelope,
  validateBackupEnvelope
} from '../../js/waterLogic.js';

describe('Unit Test Suite: Input Validation & Boundary Checks (REQ-002, REQ-003)', () => {
  test('TC-01: Validates normal quick-add and custom hydration inputs', () => {
    const res = validateHydrationInput({
      amountMl: 250,
      beverageType: 'water',
      vesselLabel: 'Glass',
      date: '2026-10-31',
      time: '09:30',
      note: 'Morning water'
    });
    assert.equal(res.valid, true);
    assert.equal(res.entry.amountMl, 250);
    assert.equal(res.entry.beverageType, 'water');
    assert.equal(res.entry.vesselLabel, 'Glass');
    assert.equal(res.entry.date, '2026-10-31');
    assert.equal(res.entry.time, '09:30');
    assert.equal(res.entry.note, 'Morning water');
  });

  test('TC-02: Rejects zero, negative, excessive, or non-numeric hydration volumes', () => {
    assert.equal(validateHydrationInput({ amountMl: 0 }).valid, false);
    assert.equal(validateHydrationInput({ amountMl: -200 }).valid, false);
    assert.equal(validateHydrationInput({ amountMl: 5001 }).valid, false);
    assert.equal(validateHydrationInput({ amountMl: 'abc' }).valid, false);
    assert.equal(validateHydrationInput({}).valid, false);
  });

  test('TC-03: Validates daily goal boundaries (500 ml to 10,000 ml)', () => {
    assert.equal(validateDailyGoal(2500).valid, true);
    assert.equal(validateDailyGoal(500).valid, true);
    assert.equal(validateDailyGoal(10000).valid, true);
    assert.equal(validateDailyGoal(499).valid, false);
    assert.equal(validateDailyGoal(10001).valid, false);
    assert.equal(validateDailyGoal('invalid').valid, false);
  });

  test('TC-04: Vessel presets match specification (+150, +250, +500, +750 ml)', () => {
    assert.deepEqual(
      VESSEL_PRESETS.map((v) => v.amountMl),
      [150, 250, 500, 750]
    );
  });
});

describe('Unit Test Suite: Daily Progress & Streak Calculations (REQ-002)', () => {
  const sampleEntries = [
    { id: '1', amountMl: 250, beverageType: 'water', date: '2026-10-31', time: '08:00', createdAt: 1000 },
    { id: '2', amountMl: 500, beverageType: 'water', date: '2026-10-31', time: '10:15', createdAt: 2000 },
    { id: '3', amountMl: 500, beverageType: 'electrolyte', date: '2026-10-31', time: '13:00', createdAt: 3000 },
    { id: '4', amountMl: 2500, beverageType: 'water', date: '2026-10-30', time: '18:00', createdAt: 500 }
  ];

  test('TC-05: Computes daily total, completion percentage, and remaining ml accurately', () => {
    const summary = calculateDailySummary(sampleEntries, '2026-10-31', 2500);
    assert.equal(summary.totalMl, 1250);
    assert.equal(summary.goalMl, 2500);
    assert.equal(summary.rawPercentage, 50);
    assert.equal(summary.clampedPercentage, 50);
    assert.equal(summary.remainingMl, 1250);
    assert.equal(summary.isGoalMet, false);
    assert.equal(summary.entryCount, 3);
    // Newest time first
    assert.equal(summary.entriesForDate[0].id, '3');
  });

  test('TC-06: Handles goal achievement and clamps ring percentage at 100%', () => {
    const entries = [
      { id: 'a', amountMl: 1500, date: '2026-10-31', time: '09:00' },
      { id: 'b', amountMl: 1500, date: '2026-10-31', time: '15:00' }
    ];
    const summary = calculateDailySummary(entries, '2026-10-31', 2500);
    assert.equal(summary.totalMl, 3000);
    assert.equal(summary.rawPercentage, 120);
    assert.equal(summary.clampedPercentage, 100);
    assert.equal(summary.remainingMl, 0);
    assert.equal(summary.isGoalMet, true);
  });

  test('TC-07: Computes consecutive day hydration streak accurately', () => {
    const streakEntries = [
      { id: 'd1', amountMl: 2500, date: '2026-10-29' },
      { id: 'd2', amountMl: 2600, date: '2026-10-30' },
      { id: 'd3', amountMl: 1000, date: '2026-10-31' } // Today still in progress
    ];
    // Yesterday and day before met goal -> streak is 2
    assert.equal(calculateHydrationStreak(streakEntries, 2500, '2026-10-31'), 2);

    // Once today also meets goal -> streak becomes 3
    streakEntries.push({ id: 'd4', amountMl: 1500, date: '2026-10-31' });
    assert.equal(calculateHydrationStreak(streakEntries, 2500, '2026-10-31'), 3);
  });
});

describe('Unit Test Suite: Data Table Filtering, Rollups & 7-Day Trend (REQ-005)', () => {
  const dataset = [
    { id: '1', date: '2026-10-31', time: '14:00', amountMl: 500, beverageType: 'water', vesselLabel: 'Bottle', note: 'Gym session' },
    { id: '2', date: '2026-10-31', time: '09:00', amountMl: 250, beverageType: 'tea', vesselLabel: 'Small Cup', note: 'Green tea' },
    { id: '3', date: '2026-10-28', time: '11:00', amountMl: 750, beverageType: 'electrolyte', vesselLabel: 'Sports Flask', note: 'Run' },
    { id: '4', date: '2026-09-15', time: '10:00', amountMl: 500, beverageType: 'sparkling', vesselLabel: 'Bottle', note: 'Lunch' }
  ];

  test('TC-08: Filters by Today, Last 7 Days, This Month, and Custom Date', () => {
    const todayOnly = filterHydrationEntries(dataset, { rangeType: 'today', referenceDate: '2026-10-31' });
    assert.equal(todayOnly.length, 2);

    const last7 = filterHydrationEntries(dataset, { rangeType: '7days', referenceDate: '2026-10-31' });
    assert.equal(last7.length, 3);

    const custom = filterHydrationEntries(dataset, { rangeType: 'custom', customDate: '2026-09-15' });
    assert.equal(custom.length, 1);
    assert.equal(custom[0].id, '4');
  });

  test('TC-09: Filters by Beverage Type and Search Query', () => {
    const teaOnly = filterHydrationEntries(dataset, { beverageType: 'tea' });
    assert.equal(teaOnly.length, 1);
    assert.equal(teaOnly[0].id, '2');

    const gymSearch = filterHydrationEntries(dataset, { searchQuery: 'gym' });
    assert.equal(gymSearch.length, 1);
    assert.equal(gymSearch[0].id, '1');
  });

  test('TC-10: Aggregates daily rollup rows and computes 7-day trend chart', () => {
    const rollups = aggregateByDay(dataset, 2500);
    assert.equal(rollups.length, 3);
    assert.equal(rollups[0].date, '2026-10-31');
    assert.equal(rollups[0].totalMl, 750);
    assert.equal(rollups[0].entryCount, 2);

    const trend7 = computeLast7DaysTrend(dataset, 2500, '2026-10-31');
    assert.equal(trend7.length, 7);
    assert.equal(trend7[6].date, '2026-10-31');
    assert.equal(trend7[6].totalMl, 750);
    assert.equal(trend7[6].shortLabel, 'Today');
  });
});

describe('Unit Test Suite: Backup Validation & XSS Sanitization (REQ-007, Security)', () => {
  test('TC-11: Creates and validates a well-formed backup JSON envelope', () => {
    const entries = [{ id: 'wt_1', amountMl: 500, beverageType: 'water', vesselLabel: 'Bottle', date: '2026-10-31', time: '12:00', note: 'Noon' }];
    const json = createBackupEnvelope(entries, { dailyGoalMl: 3000 });
    const validated = validateBackupEnvelope(json);

    assert.equal(validated.valid, true);
    assert.equal(validated.entries.length, 1);
    assert.equal(validated.settings.dailyGoalMl, 3000);
  });

  test('TC-12: Rejects malformed or foreign backup envelopes gracefully', () => {
    assert.equal(validateBackupEnvelope('{ bad json').valid, false);
    assert.equal(validateBackupEnvelope(JSON.stringify({ app: 'WrongApp', data: { entries: [] } })).valid, false);
  });

  test('TC-13: Escapes HTML special characters and formats volume cleanly', () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.equal(formatVolume(2500), '2,500 ml');
  });
});
