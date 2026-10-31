import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WaterStorageService } from '../../js/storage.js';

class MockLocalStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

describe('Integration Test Suite: Local-First Storage, Undo & Backup Round-Trip (REQ-004, REQ-006, REQ-007)', () => {
  let storage;
  let mockLs;

  beforeEach(async () => {
    mockLs = new MockLocalStorage();
    storage = new WaterStorageService(mockLs);
    await storage.init();
  });

  test('IT-01: Persists multiple hydration entries and retrieves them sorted newest-first', async () => {
    await storage.addEntry({ amountMl: 250, beverageType: 'water', vesselLabel: 'Glass', date: '2026-10-30', time: '09:00', createdAt: 100 });
    await storage.addEntry({ amountMl: 500, beverageType: 'electrolyte', vesselLabel: 'Bottle', date: '2026-10-31', time: '08:00', createdAt: 200 });
    await storage.addEntry({ amountMl: 750, beverageType: 'water', vesselLabel: 'Sports Flask', date: '2026-10-31', time: '14:30', createdAt: 300 });

    const all = await storage.getAllEntries();
    assert.equal(all.length, 3);
    assert.equal(all[0].amountMl, 750);
    assert.equal(all[1].amountMl, 500);
    assert.equal(all[2].amountMl, 250);
  });

  test('IT-02: Undo Last removes the most recently created entry accurately', async () => {
    await storage.addEntry({ id: 'first', amountMl: 250, date: '2026-10-31', time: '09:00', createdAt: 1000 });
    await storage.addEntry({ id: 'second', amountMl: 500, date: '2026-10-31', time: '10:00', createdAt: 2000 });

    const removed = await storage.undoLastEntry();
    assert.ok(removed);
    assert.equal(removed.id, 'second');

    const remaining = await storage.getAllEntries();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'first');
  });

  test('IT-03: Persists custom Daily Hydration Goal settings', async () => {
    const initial = await storage.getSettings();
    assert.equal(initial.dailyGoalMl, 2500);

    await storage.saveSettings({ dailyGoalMl: 3200 });
    const updated = await storage.getSettings();
    assert.equal(updated.dailyGoalMl, 3200);
  });

  test('IT-04: Full Export -> Purge -> Import round-trip preserves 100% of entries and settings', async () => {
    await storage.saveSettings({ dailyGoalMl: 3000 });
    await storage.addEntry({ id: 'e1', amountMl: 250, beverageType: 'water', vesselLabel: 'Glass', date: '2026-10-31', time: '08:15', note: 'Wake up' });
    await storage.addEntry({ id: 'e2', amountMl: 500, beverageType: 'tea', vesselLabel: 'Bottle', date: '2026-10-31', time: '11:45', note: 'Herbal' });

    const exportedJson = await storage.exportBackupJson();
    assert.match(exportedJson, /AquaPulse-WaterIntakeTracker/);

    await storage.clearAllEntries();
    await storage.saveSettings({ dailyGoalMl: 2000 });
    assert.equal((await storage.getAllEntries()).length, 0);

    const restored = await storage.importBackupJson(exportedJson);
    assert.equal(restored.count, 2);
    assert.equal(restored.dailyGoalMl, 3000);

    const rehydratedEntries = await storage.getAllEntries();
    const rehydratedSettings = await storage.getSettings();
    assert.equal(rehydratedEntries.length, 2);
    assert.equal(rehydratedSettings.dailyGoalMl, 3000);
  });
});
