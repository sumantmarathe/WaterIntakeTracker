/**
 * js/storage.js
 * 100% Local-First Zero-Knowledge Persistence Layer (IndexedDB + LocalStorage Fallback).
 * Zero external network calls. Works identically in Web Browser PWA and Android WebView.
 */

import {
  DEFAULT_DAILY_GOAL_ML,
  validateHydrationInput,
  validateDailyGoal,
  sortEntriesNewestFirst,
  createBackupEnvelope,
  validateBackupEnvelope
} from './waterLogic.js';

const DB_NAME = 'WaterIntakeTrackerDB';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_SETTINGS = 'settings';

const LS_ENTRIES_KEY = 'aquapulse_entries_v1';
const LS_SETTINGS_KEY = 'aquapulse_settings_v1';

export class WaterStorageService {
  constructor(customLocalStorage = null) {
    this.db = null;
    this.useFallback = false;
    this.localStorage = customLocalStorage || (typeof window !== 'undefined' ? window.localStorage : null);
  }

  /**
   * Initializes IndexedDB connection or falls back cleanly to LocalStorage.
   */
  async init() {
    if (this.db || this.useFallback) return;

    if (typeof indexedDB === 'undefined') {
      this.useFallback = true;
      this._syncToFallbackCache(await this.getAllEntries(), await this.getSettings());
      return;
    }

    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
            const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      this.useFallback = true;
    }
  }

  _readFallbackEntries() {
    if (!this.localStorage) return [];
    try {
      const raw = this.localStorage.getItem(LS_ENTRIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? sortEntriesNewestFirst(parsed) : [];
    } catch {
      return [];
    }
  }

  _writeFallbackEntries(entries) {
    if (!this.localStorage) return;
    try {
      this.localStorage.setItem(LS_ENTRIES_KEY, JSON.stringify(sortEntriesNewestFirst(entries)));
    } catch {
      // Ignore quota errors in fallback mirror
    }
  }

  _readFallbackSettings() {
    const defaultSettings = { dailyGoalMl: DEFAULT_DAILY_GOAL_ML, unit: 'ml' };
    if (!this.localStorage) return defaultSettings;
    try {
      const raw = this.localStorage.getItem(LS_SETTINGS_KEY);
      if (!raw) return defaultSettings;
      const parsed = JSON.parse(raw);
      return {
        dailyGoalMl: Number(parsed?.dailyGoalMl) || DEFAULT_DAILY_GOAL_ML,
        unit: 'ml'
      };
    } catch {
      return defaultSettings;
    }
  }

  _writeFallbackSettings(settings) {
    if (!this.localStorage) return;
    try {
      this.localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota errors in fallback mirror
    }
  }

  _syncToFallbackCache(entries, settings) {
    if (entries) this._writeFallbackEntries(entries);
    if (settings) this._writeFallbackSettings(settings);
  }

  /**
   * Retrieves all hydration entries sorted newest first.
   * @returns {Promise<Array>}
   */
  async getAllEntries() {
    await this.init();
    if (this.useFallback || !this.db) {
      return this._readFallbackEntries();
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([STORE_ENTRIES], 'readonly');
        const store = tx.objectStore(STORE_ENTRIES);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = Array.isArray(req.result) ? req.result : [];
          if (items.length === 0) {
            const fallbackItems = this._readFallbackEntries();
            resolve(fallbackItems);
          } else {
            const sorted = sortEntriesNewestFirst(items);
            this._writeFallbackEntries(sorted);
            resolve(sorted);
          }
        };
        req.onerror = () => resolve(this._readFallbackEntries());
      } catch {
        resolve(this._readFallbackEntries());
      }
    });
  }

  /**
   * Validates and persists a hydration entry.
   * @param {object} input
   * @returns {Promise<object>}
   */
  async addEntry(input) {
    await this.init();
    const validation = validateHydrationInput(input);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const entry = validation.entry;
    const current = await this.getAllEntries();
    const updated = sortEntriesNewestFirst([entry, ...current.filter(e => e.id !== entry.id)]);
    this._writeFallbackEntries(updated);

    if (!this.useFallback && this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_ENTRIES], 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return entry;
  }

  /**
   * Deletes an entry by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteEntry(id) {
    await this.init();
    const current = await this.getAllEntries();
    const filtered = current.filter(e => e.id !== id);
    this._writeFallbackEntries(filtered);

    if (!this.useFallback && this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_ENTRIES], 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return filtered.length !== current.length;
  }

  /**
   * Removes the most recently created entry (Undo Last).
   * @returns {Promise<object|null>} The removed entry or null if none exist.
   */
  async undoLastEntry() {
    const entries = await this.getAllEntries();
    if (entries.length === 0) return null;

    // Pick entry with highest createdAt timestamp (or first in newest-sorted list)
    const byCreated = [...entries].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    const latest = byCreated[0];
    await this.deleteEntry(latest.id);
    return latest;
  }

  /**
   * Clears all hydration entries from storage.
   * @returns {Promise<void>}
   */
  async clearAllEntries() {
    await this.init();
    this._writeFallbackEntries([]);

    if (!this.useFallback && this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_ENTRIES], 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  /**
   * Gets user settings (dailyGoalMl).
   * @returns {Promise<{ dailyGoalMl: number, unit: string }>}
   */
  async getSettings() {
    await this.init();
    if (this.useFallback || !this.db) {
      return this._readFallbackSettings();
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([STORE_SETTINGS], 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get('user_preferences');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            this._writeFallbackSettings(req.result.value);
            resolve(req.result.value);
          } else {
            resolve(this._readFallbackSettings());
          }
        };
        req.onerror = () => resolve(this._readFallbackSettings());
      } catch {
        resolve(this._readFallbackSettings());
      }
    });
  }

  /**
   * Saves user settings (dailyGoalMl).
   * @param {object} newSettings
   * @returns {Promise<{ dailyGoalMl: number, unit: string }>}
   */
  async saveSettings(newSettings = {}) {
    await this.init();
    const check = validateDailyGoal(newSettings.dailyGoalMl);
    if (!check.valid) {
      throw new Error(check.error);
    }

    const cleanSettings = {
      dailyGoalMl: check.dailyGoalMl,
      unit: 'ml',
      updatedAt: Date.now()
    };

    this._writeFallbackSettings(cleanSettings);

    if (!this.useFallback && this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_SETTINGS], 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        store.put({ key: 'user_preferences', value: cleanSettings });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return cleanSettings;
  }

  /**
   * Exports all entries and settings as a formatted JSON backup string.
   * @returns {Promise<string>}
   */
  async exportBackupJson() {
    const [entries, settings] = await Promise.all([
      this.getAllEntries(),
      this.getSettings()
    ]);
    return createBackupEnvelope(entries, settings);
  }

  /**
   * Imports a JSON backup string, replacing or merging records.
   * @param {string} jsonString
   * @returns {Promise<{ count: number, dailyGoalMl: number }>}
   */
  async importBackupJson(jsonString) {
    const check = validateBackupEnvelope(jsonString);
    if (!check.valid) {
      throw new Error(check.error);
    }

    await this.clearAllEntries();
    await this.saveSettings(check.settings);

    for (const entry of check.entries) {
      await this.addEntry(entry);
    }

    return {
      count: check.entries.length,
      dailyGoalMl: check.settings.dailyGoalMl
    };
  }
}
