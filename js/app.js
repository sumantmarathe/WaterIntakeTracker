/**
 * js/app.js
 * Main Application Controller for AquaPulse Water Intake Tracker.
 * Coordinates View 1 (Focused Hydration Logger) and View 2 (Water Intake Data Table & History).
 */

import {
  BEVERAGE_TYPES,
  escapeHtml,
  formatVolume,
  getLocalDateString,
  getLocalTimeString,
  calculateDailySummary,
  calculateHydrationStreak,
  filterHydrationEntries,
  aggregateByDay,
  computeLast7DaysTrend
} from './waterLogic.js';
import { WaterStorageService } from './storage.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 92; // 578.05

class AquaPulseController {
  constructor() {
    this.storage = new WaterStorageService();
    this.activeView = 'logger'; // 'logger' | 'history'
    this.entries = [];
    this.settings = { dailyGoalMl: 2500, unit: 'ml' };
    this.deferredInstallPrompt = null;
    this.toastTimer = null;
  }

  async init() {
    await this.storage.init();
    await this.refreshData();
    this.initDefaultFormDateTime();
    this.bindEvents();
    this.registerServiceWorker();
    this.renderAll();
  }

  async refreshData() {
    const [entries, settings] = await Promise.all([
      this.storage.getAllEntries(),
      this.storage.getSettings()
    ]);
    this.entries = entries;
    this.settings = settings;
  }

  initDefaultFormDateTime() {
    const dateInput = document.getElementById('input-date');
    const timeInput = document.getElementById('input-time');
    if (dateInput) dateInput.value = getLocalDateString();
    if (timeInput) timeInput.value = getLocalTimeString();
  }

  bindEvents() {
    // Segmented Navigation Tabs
    const tabLogger = document.getElementById('nav-tab-logger');
    const tabHistory = document.getElementById('nav-tab-history');
    tabLogger?.addEventListener('click', () => this.switchView('logger'));
    tabHistory?.addEventListener('click', () => this.switchView('history'));

    // Bridge Link from Logger -> Full Data Table
    const btnLinkToTable = document.getElementById('btn-link-to-table');
    btnLinkToTable?.addEventListener('click', () => this.switchView('history'));

    // Back Button from Data Table -> Logger
    const btnBackToLogger = document.getElementById('btn-back-to-logger');
    btnBackToLogger?.addEventListener('click', () => this.switchView('logger'));

    // Browser / Android Hardware Back Button Support
    window.addEventListener('popstate', (event) => {
      const targetView = event.state?.view || 'logger';
      this.switchView(targetView, false);
    });

    // 1-Tap Vessel Quick-Add Buttons
    const vesselButtons = document.querySelectorAll('.vessel-btn');
    vesselButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const amountMl = Number(btn.getAttribute('data-preset-ml'));
        const vesselLabel = btn.getAttribute('data-vessel') || 'Quick Add';
        await this.handleQuickLog(amountMl, vesselLabel);
      });
    });

    // Undo Last Button
    const btnUndo = document.getElementById('btn-undo-last');
    btnUndo?.addEventListener('click', () => this.handleUndoLast());

    // Custom Hydration Entry Form
    const customForm = document.getElementById('custom-entry-form');
    customForm?.addEventListener('submit', (e) => this.handleCustomFormSubmit(e));

    // Daily Goal Modal
    const btnOpenGoal = document.getElementById('btn-open-goal-modal');
    const btnInlineGoal = document.getElementById('btn-inline-edit-goal');
    const btnCloseGoal = document.getElementById('btn-close-goal-modal');
    const btnCancelGoal = document.getElementById('btn-cancel-goal');
    const formGoal = document.getElementById('form-goal-settings');

    btnOpenGoal?.addEventListener('click', () => this.openGoalModal());
    btnInlineGoal?.addEventListener('click', () => this.openGoalModal());
    btnCloseGoal?.addEventListener('click', () => this.closeGoalModal());
    btnCancelGoal?.addEventListener('click', () => this.closeGoalModal());

    document.querySelectorAll('.goal-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const inputGoal = document.getElementById('input-goal-ml');
        if (inputGoal) inputGoal.value = chip.getAttribute('data-goal') || '2500';
      });
    });

    formGoal?.addEventListener('submit', (e) => this.handleSaveGoal(e));

    // Filter Controls in Data Table View
    const filterRange = document.getElementById('filter-range-type');
    const filterCustomDate = document.getElementById('filter-custom-date');
    const filterBeverage = document.getElementById('filter-beverage-type');
    const filterSearch = document.getElementById('filter-search-query');

    filterRange?.addEventListener('change', () => {
      const customWrap = document.getElementById('filter-custom-date-wrap');
      if (filterRange.value === 'custom') {
        customWrap?.classList.remove('hidden');
        if (filterCustomDate && !filterCustomDate.value) {
          filterCustomDate.value = getLocalDateString();
        }
      } else {
        customWrap?.classList.add('hidden');
      }
      this.renderHistoryView();
    });

    filterCustomDate?.addEventListener('change', () => this.renderHistoryView());
    filterBeverage?.addEventListener('change', () => this.renderHistoryView());
    filterSearch?.addEventListener('input', () => this.renderHistoryView());

    // Delete Row Delegation in Water Intake Data Table
    const waterTbody = document.getElementById('water-intake-tbody');
    waterTbody?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-delete-id]');
      if (!btn) return;
      const id = btn.getAttribute('data-delete-id');
      if (id) {
        await this.storage.deleteEntry(id);
        await this.refreshData();
        this.renderAll();
        this.showToast('Entry deleted from hydration log');
      }
    });

    // Export JSON Backup
    const btnExport = document.getElementById('btn-export-backup');
    btnExport?.addEventListener('click', () => this.handleExportBackup());

    // Import JSON Backup
    const inputImport = document.getElementById('input-import-backup');
    inputImport?.addEventListener('change', (e) => this.handleImportBackup(e));

    // Purge Modal
    const btnOpenPurge = document.getElementById('btn-open-purge-modal');
    const btnClosePurge = document.getElementById('btn-close-purge-modal');
    const btnCancelPurge = document.getElementById('btn-cancel-purge');
    const btnConfirmPurge = document.getElementById('btn-confirm-purge');

    btnOpenPurge?.addEventListener('click', () => {
      document.getElementById('modal-purge')?.classList.remove('hidden');
    });
    btnClosePurge?.addEventListener('click', () => {
      document.getElementById('modal-purge')?.classList.add('hidden');
    });
    btnCancelPurge?.addEventListener('click', () => {
      document.getElementById('modal-purge')?.classList.add('hidden');
    });
    btnConfirmPurge?.addEventListener('click', async () => {
      await this.storage.clearAllEntries();
      await this.refreshData();
      document.getElementById('modal-purge')?.classList.add('hidden');
      this.renderAll();
      this.showToast('All hydration logs cleared');
    });

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      document.getElementById('btn-install-pwa')?.classList.remove('hidden');
    });

    document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
      if (!this.deferredInstallPrompt) return;
      this.deferredInstallPrompt.prompt();
      await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      document.getElementById('btn-install-pwa')?.classList.add('hidden');
    });
  }

  /**
   * Switches active screen between Focused Hydration Logger and Data Table & History.
   * @param {'logger'|'history'} viewName
   * @param {boolean} [pushHistory]
   */
  switchView(viewName, pushHistory = true) {
    this.activeView = viewName === 'history' ? 'history' : 'logger';

    const loggerPanel = document.getElementById('view-logger');
    const historyPanel = document.getElementById('view-history');
    const tabLogger = document.getElementById('nav-tab-logger');
    const tabHistory = document.getElementById('nav-tab-history');

    if (this.activeView === 'history') {
      loggerPanel?.classList.add('hidden');
      loggerPanel?.classList.remove('active');
      historyPanel?.classList.remove('hidden');
      historyPanel?.classList.add('active');
      tabLogger?.classList.remove('active');
      tabLogger?.setAttribute('aria-selected', 'false');
      tabHistory?.classList.add('active');
      tabHistory?.setAttribute('aria-selected', 'true');
      this.renderHistoryView();
    } else {
      historyPanel?.classList.add('hidden');
      historyPanel?.classList.remove('active');
      loggerPanel?.classList.remove('hidden');
      loggerPanel?.classList.add('active');
      tabHistory?.classList.remove('active');
      tabHistory?.setAttribute('aria-selected', 'false');
      tabLogger?.classList.add('active');
      tabLogger?.setAttribute('aria-selected', 'true');
      this.renderLoggerView();
    }

    if (pushHistory && typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState({ view: this.activeView }, '', `#${this.activeView}`);
    }
  }

  /**
   * Called by Android native back-button bridge if on history screen.
   * @returns {boolean} True if handled in-app (navigated back to logger), false if already on logger.
   */
  handleHardwareBack() {
    if (this.activeView === 'history') {
      this.switchView('logger', false);
      return true;
    }
    return false;
  }

  async handleQuickLog(amountMl, vesselLabel) {
    try {
      await this.storage.addEntry({
        amountMl,
        beverageType: 'water',
        vesselLabel,
        date: getLocalDateString(),
        time: getLocalTimeString(),
        note: ''
      });
      await this.refreshData();
      this.initDefaultFormDateTime();
      this.renderAll();
      this.showToast(`Logged +${amountMl} ml (${vesselLabel})`);
    } catch (err) {
      this.showToast(err.message || 'Could not log water intake');
    }
  }

  async handleUndoLast() {
    const removed = await this.storage.undoLastEntry();
    if (!removed) return;
    await this.refreshData();
    this.renderAll();
    this.showToast(`Undid ${removed.amountMl} ml (${removed.vesselLabel})`);
  }

  async handleCustomFormSubmit(event) {
    event.preventDefault();
    const amountInput = document.getElementById('input-amount-ml');
    const bevSelect = document.getElementById('input-beverage-type');
    const dateInput = document.getElementById('input-date');
    const timeInput = document.getElementById('input-time');
    const noteInput = document.getElementById('input-note');

    try {
      const bevType = bevSelect?.value || 'water';
      const bevLabel = BEVERAGE_TYPES[bevType]?.label || 'Custom Drink';

      const created = await this.storage.addEntry({
        amountMl: amountInput?.value,
        beverageType: bevType,
        vesselLabel: 'Custom Entry',
        date: dateInput?.value || getLocalDateString(),
        time: timeInput?.value || getLocalTimeString(),
        note: noteInput?.value || ''
      });

      if (amountInput) amountInput.value = '';
      if (noteInput) noteInput.value = '';
      this.initDefaultFormDateTime();

      await this.refreshData();
      this.renderAll();
      this.showToast(`Logged +${created.amountMl} ml ${bevLabel}`);
    } catch (err) {
      this.showToast(err.message || 'Please enter a valid volume (1 - 5000 ml)');
    }
  }

  openGoalModal() {
    const inputGoal = document.getElementById('input-goal-ml');
    if (inputGoal) inputGoal.value = String(this.settings.dailyGoalMl || 2500);
    document.getElementById('modal-goal')?.classList.remove('hidden');
  }

  closeGoalModal() {
    document.getElementById('modal-goal')?.classList.add('hidden');
  }

  async handleSaveGoal(event) {
    event.preventDefault();
    const inputGoal = document.getElementById('input-goal-ml');
    try {
      await this.storage.saveSettings({ dailyGoalMl: inputGoal?.value });
      await this.refreshData();
      this.closeGoalModal();
      this.renderAll();
      this.showToast(`Daily target updated to ${formatVolume(this.settings.dailyGoalMl)}`);
    } catch (err) {
      this.showToast(err.message || 'Invalid goal value');
    }
  }

  async handleExportBackup() {
    try {
      const jsonStr = await this.storage.exportBackupJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aquapulse-water-backup-${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.showToast('Hydration backup JSON exported');
    } catch (err) {
      this.showToast(err.message || 'Export failed');
    }
  }

  async handleImportBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await this.storage.importBackupJson(text);
      await this.refreshData();
      this.renderAll();
      this.showToast(`Restored ${result.count} hydration entries`);
    } catch (err) {
      this.showToast(err.message || 'Invalid backup file');
    } finally {
      event.target.value = '';
    }
  }

  renderAll() {
    const goalText = formatVolume(this.settings.dailyGoalMl);
    const headerGoal = document.getElementById('header-goal-label');
    const headerGoalMobile = document.getElementById('header-goal-label-mobile');
    const navBadge = document.getElementById('nav-entry-badge');

    if (headerGoal) headerGoal.textContent = goalText;
    if (headerGoalMobile) headerGoalMobile.textContent = goalText;
    if (navBadge) navBadge.textContent = String(this.entries.length);

    this.renderLoggerView();
    this.renderHistoryView();
  }

  renderLoggerView() {
    const todayStr = getLocalDateString();
    const summary = calculateDailySummary(this.entries, todayStr, this.settings.dailyGoalMl);
    const streak = calculateHydrationStreak(this.entries, this.settings.dailyGoalMl, todayStr);

    // Date & Streak
    const todayDateLabel = document.getElementById('today-date-label');
    if (todayDateLabel) todayDateLabel.textContent = `Today • ${todayStr}`;

    const streakText = document.getElementById('streak-count-text');
    if (streakText) {
      streakText.textContent = `${streak} ${streak === 1 ? 'Day' : 'Days'} Streak`;
    }

    // Ring Progress SVG
    const ringCircle = document.getElementById('ring-progress-circle');
    if (ringCircle) {
      const offset = RING_CIRCUMFERENCE - (summary.clampedPercentage / 100) * RING_CIRCUMFERENCE;
      ringCircle.style.strokeDashoffset = String(offset.toFixed(2));
    }

    const pctEl = document.getElementById('ring-percentage-text');
    const curMlEl = document.getElementById('ring-current-ml');
    const goalMlEl = document.getElementById('ring-goal-ml');
    const statusPill = document.getElementById('ring-status-pill');

    if (pctEl) pctEl.textContent = `${summary.rawPercentage}%`;
    if (curMlEl) curMlEl.textContent = summary.totalMl.toLocaleString('en-US');
    if (goalMlEl) goalMlEl.textContent = summary.goalMl.toLocaleString('en-US');

    if (statusPill) {
      if (summary.isGoalMet) {
        statusPill.textContent = '🎉 Daily Goal Reached!';
        statusPill.classList.add('goal-complete');
      } else {
        statusPill.textContent = `${summary.remainingMl.toLocaleString('en-US')} ml remaining`;
        statusPill.classList.remove('goal-complete');
      }
    }

    // Mini stats
    const statCount = document.getElementById('stat-today-count');
    const statLastTime = document.getElementById('stat-last-time');
    const statGoalVal = document.getElementById('stat-goal-val');

    if (statCount) statCount.textContent = String(summary.entryCount);
    if (statLastTime) {
      statLastTime.textContent = summary.entriesForDate.length > 0 ? summary.entriesForDate[0].time : '—';
    }
    if (statGoalVal) statGoalVal.textContent = formatVolume(summary.goalMl);

    // Undo button state
    const btnUndo = document.getElementById('btn-undo-last');
    if (btnUndo) {
      btnUndo.disabled = this.entries.length === 0;
    }

    // Today's recent pills & Bridge link summary
    const recentContainer = document.getElementById('recent-pills-container');
    const recentSubtitle = document.getElementById('recent-preview-subtitle');
    const bridgeSummary = document.getElementById('bridge-record-summary');

    if (recentContainer) {
      const recentThree = summary.entriesForDate.slice(0, 3);
      if (recentThree.length === 0) {
        recentContainer.innerHTML = `<span class="recent-empty">No entries logged yet today — tap a vessel above to start!</span>`;
      } else {
        recentContainer.innerHTML = recentThree.map((item) => {
          const bev = BEVERAGE_TYPES[item.beverageType]?.label || 'Water';
          return `<span class="recent-pill"><strong>+${item.amountMl} ml</strong> ${escapeHtml(bev)} • ${escapeHtml(item.time)}</span>`;
        }).join('');
      }
    }

    if (recentSubtitle) {
      recentSubtitle.textContent = summary.entryCount > 0
        ? `${summary.entryCount} drink${summary.entryCount === 1 ? '' : 's'} logged today (${formatVolume(summary.totalMl)})`
        : 'Your latest entries today appear here';
    }

    if (bridgeSummary) {
      const dayGroups = aggregateByDay(this.entries, this.settings.dailyGoalMl);
      bridgeSummary.textContent = `${this.entries.length} total record${this.entries.length === 1 ? '' : 's'} across ${dayGroups.length} day${dayGroups.length === 1 ? '' : 's'} — view table, filters & 7-day chart`;
    }
  }

  renderHistoryView() {
    const todayStr = getLocalDateString();
    const rangeType = document.getElementById('filter-range-type')?.value || 'all';
    const customDate = document.getElementById('filter-custom-date')?.value || '';
    const beverageType = document.getElementById('filter-beverage-type')?.value || 'all';
    const searchQuery = document.getElementById('filter-search-query')?.value || '';

    const filteredEntries = filterHydrationEntries(this.entries, {
      rangeType,
      referenceDate: todayStr,
      customDate,
      beverageType,
      searchQuery
    });

    const dayRollups = aggregateByDay(filteredEntries, this.settings.dailyGoalMl);
    const totalVolume = filteredEntries.reduce((sum, e) => sum + (Number(e.amountMl) || 0), 0);
    const dailyAvg = dayRollups.length > 0 ? Math.round(totalVolume / dayRollups.length) : 0;
    const goalMetDays = dayRollups.filter((d) => d.isGoalMet).length;

    // Update KPI Cards
    const kpiVol = document.getElementById('kpi-total-volume');
    const kpiAvg = document.getElementById('kpi-daily-avg');
    const kpiGoalDays = document.getElementById('kpi-goal-days');
    const kpiCount = document.getElementById('kpi-entry-count');

    if (kpiVol) kpiVol.textContent = formatVolume(totalVolume);
    if (kpiAvg) kpiAvg.textContent = formatVolume(dailyAvg);
    if (kpiGoalDays) kpiGoalDays.textContent = `${goalMetDays} ${goalMetDays === 1 ? 'day' : 'days'}`;
    if (kpiCount) kpiCount.textContent = String(filteredEntries.length);

    // Render 7-Day Trend Chart
    const chartGoalInd = document.getElementById('chart-goal-indicator');
    if (chartGoalInd) chartGoalInd.textContent = formatVolume(this.settings.dailyGoalMl);

    const trendBarsEl = document.getElementById('trend-chart-bars');
    if (trendBarsEl) {
      const trend7 = computeLast7DaysTrend(this.entries, this.settings.dailyGoalMl, todayStr);
      trendBarsEl.innerHTML = trend7.map((day) => `
        <div class="trend-col" title="${day.date}: ${day.totalMl} ml (${day.percentage}%)">
          <span class="trend-val-top">${day.totalMl > 0 ? `${day.totalMl}` : '0'}</span>
          <div class="trend-bar-track">
            <div class="trend-bar-fill ${day.isGoalMet ? 'goal-met' : ''}" style="height: ${day.barHeightPercent}%;"></div>
          </div>
          <span class="trend-day-label">${escapeHtml(day.shortLabel)}</span>
        </div>
      `).join('');
    }

    // Render Daily Rollup Table
    const rollupTbody = document.getElementById('daily-rollup-tbody');
    if (rollupTbody) {
      if (dayRollups.length === 0) {
        rollupTbody.innerHTML = `<tr><td colspan="5" class="empty-table-cell">No daily records match the current filter.</td></tr>`;
      } else {
        rollupTbody.innerHTML = dayRollups.map((d) => `
          <tr>
            <td><strong>${escapeHtml(d.date)}</strong></td>
            <td>${d.entryCount} ${d.entryCount === 1 ? 'entry' : 'entries'}</td>
            <td><strong>${formatVolume(d.totalMl)}</strong></td>
            <td>${formatVolume(d.goalMl)}</td>
            <td>
              <span class="status-chip ${d.isGoalMet ? 'met' : 'progress'}">
                ${d.isGoalMet ? '✓ Goal Met' : 'In Progress'} (${d.percentage}%)
              </span>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Detailed Water Intake Data Table per Time & Day
    const waterTbody = document.getElementById('water-intake-tbody');
    if (waterTbody) {
      if (filteredEntries.length === 0) {
        waterTbody.innerHTML = `<tr><td colspan="7" class="empty-table-cell">No water intake entries found. Log your first drink in the Hydration Logger!</td></tr>`;
      } else {
        waterTbody.innerHTML = filteredEntries.map((item) => {
          const bevMeta = BEVERAGE_TYPES[item.beverageType] || BEVERAGE_TYPES.water;
          const sharePct = Math.round(((Number(item.amountMl) || 0) / (this.settings.dailyGoalMl || 2500)) * 100);
          const vesselAndNote = item.note
            ? `${escapeHtml(item.vesselLabel)} — <span style="color: var(--text-secondary)">${escapeHtml(item.note)}</span>`
            : escapeHtml(item.vesselLabel);

          return `
            <tr>
              <td>${escapeHtml(item.date)}</td>
              <td><strong>${escapeHtml(item.time)}</strong></td>
              <td><span class="bev-badge ${bevMeta.badgeClass}">${escapeHtml(bevMeta.label)}</span></td>
              <td>${vesselAndNote}</td>
              <td><strong>+${Number(item.amountMl).toLocaleString('en-US')} ml</strong></td>
              <td>${sharePct}%</td>
              <td class="text-right">
                <button type="button" class="btn-delete-row" data-delete-id="${escapeHtml(item.id)}" title="Delete entry">
                  Delete
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast-container');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2600);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Silent in environments where SW is restricted
      });
    }
  }
}

// Initialize on DOMContentLoaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new AquaPulseController();
    window.aquaPulseApp = app;
    app.init();
  });
}
