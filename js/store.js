/**
 * @file store.js
 * @description LocalStorage-based data layer for Kawaii Care medication reminder.
 * Provides CRUD operations for medications, dose tracking, settings, and history.
 * All data is persisted in localStorage under namespaced keys.
 */

(function () {
  'use strict';

  // ─── Storage Keys ────────────────────────────────────────────────
  const KEYS = {
    MEDICATIONS: 'kawaiicare_medications',
    DOSES: 'kawaiicare_doses',
    SETTINGS: 'kawaiicare_settings',
  };

  // ─── Default Data ────────────────────────────────────────────────

  /** @type {Array<{id: string, name: string, dosage: string, time: string, notes: string}>} */
  const DEFAULT_MEDICATIONS = [
    {
      id: 'med1',
      name: 'Levothyroxine',
      dosage: '50mcg',
      time: '08:00',
      notes: 'Take on empty stomach',
    },
  ];

  /** @type {{reducedMotion: boolean, reducedDecorations: boolean, notificationsEnabled: boolean}} */
  const DEFAULT_SETTINGS = {
    reducedMotion: false,
    reducedDecorations: false,
    notificationsEnabled: false,
  };

  // ─── Helpers ─────────────────────────────────────────────────────

  /**
   * Returns today's date formatted as 'YYYY-MM-DD'.
   * @returns {string} Date key string.
   */
  function getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a Date object to 'h:mm AM/PM'.
   * @param {Date} date - The date to format.
   * @returns {string} Formatted time string.
   */
  function formatTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  /**
   * Parses an 'HH:MM' time string into hours and minutes.
   * @param {string} timeStr - Time in 'HH:MM' format.
   * @returns {{hours: number, minutes: number}} Parsed time components.
   */
  function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return { hours: 0, minutes: 0 };
    }
    const parts = timeStr.split(':');
    return {
      hours: parseInt(parts[0], 10) || 0,
      minutes: parseInt(parts[1], 10) || 0,
    };
  }

  /**
   * Safely reads and parses JSON from localStorage.
   * @param {string} key - The localStorage key.
   * @returns {*} Parsed data or null.
   */
  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[Store] Failed to read "${key}" from localStorage:`, e);
      return null;
    }
  }

  /**
   * Safely writes JSON to localStorage.
   * @param {string} key - The localStorage key.
   * @param {*} data - Data to serialize and store.
   */
  function writeStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[Store] Failed to write "${key}" to localStorage:`, e);
    }
  }

  // ─── Medication CRUD ─────────────────────────────────────────────

  /**
   * Retrieves all medications from storage.
   * Returns sample data if nothing is stored.
   * @returns {Array<{id: string, name: string, dosage: string, time: string, notes: string}>}
   */
  function getMedications() {
    const meds = readStorage(KEYS.MEDICATIONS);
    if (Array.isArray(meds) && meds.length > 0) {
      return meds;
    }
    // Seed with default data on first run
    writeStorage(KEYS.MEDICATIONS, DEFAULT_MEDICATIONS);
    return [...DEFAULT_MEDICATIONS];
  }

  /**
   * Saves the full medications array to storage.
   * @param {Array} meds - Medication array to persist.
   */
  function saveMedications(meds) {
    writeStorage(KEYS.MEDICATIONS, Array.isArray(meds) ? meds : []);
  }

  /**
   * Adds a new medication. Generates a unique id from Date.now().toString(36).
   * @param {{name: string, dosage: string, time: string, notes: string}} med - Medication data.
   * @returns {{id: string, name: string, dosage: string, time: string, notes: string}} The created medication.
   */
  function addMedication(med) {
    const meds = getMedications();
    const newMed = {
      id: Date.now().toString(36),
      name: med.name || '',
      dosage: med.dosage || '',
      time: med.time || '08:00',
      notes: med.notes || '',
    };
    meds.push(newMed);
    saveMedications(meds);
    return newMed;
  }

  /**
   * Updates an existing medication by id.
   * @param {string} id - Medication id to update.
   * @param {Object} updates - Fields to merge into the medication.
   */
  function updateMedication(id, updates) {
    const meds = getMedications();
    const idx = meds.findIndex((m) => m.id === id);
    if (idx !== -1) {
      meds[idx] = { ...meds[idx], ...updates };
      saveMedications(meds);
    }
  }

  /**
   * Deletes a medication by id.
   * @param {string} id - Medication id to remove.
   */
  function deleteMedication(id) {
    const meds = getMedications().filter((m) => m.id !== id);
    saveMedications(meds);
  }

  // ─── Dose Tracking ───────────────────────────────────────────────

  /**
   * Retrieves the full doses object from storage.
   * @returns {Object} Doses keyed by 'YYYY-MM-DD'.
   */
  function getAllDoses() {
    return readStorage(KEYS.DOSES) || {};
  }

  /**
   * Saves the full doses object back to storage.
   * @param {Object} doses - Doses object keyed by date string.
   */
  function saveAllDoses(doses) {
    writeStorage(KEYS.DOSES, doses || {});
  }

  /**
   * Generates today's dose entries from the medication list.
   * Only creates entries if today doesn't already have them.
   */
  function generateTodayDoses() {
    const key = getTodayKey();
    const allDoses = getAllDoses();

    if (allDoses[key] && Array.isArray(allDoses[key]) && allDoses[key].length > 0) {
      return; // Already generated for today
    }

    const meds = getMedications();
    allDoses[key] = meds.map((med) => ({
      medId: med.id,
      scheduledTime: med.time,
      takenAt: null,
      status: 'pending',
      snoozeUntil: null,
    }));

    saveAllDoses(allDoses);
  }

  /**
   * Returns today's dose array, auto-creating from medications if missing.
   * @returns {Array<{medId: string, scheduledTime: string, takenAt: string|null, status: string, snoozeUntil: string|null}>}
   */
  function getTodayDoses() {
    generateTodayDoses();
    const allDoses = getAllDoses();
    return allDoses[getTodayKey()] || [];
  }

  /**
   * Marks a dose as taken for today. Sets takenAt to the current formatted time.
   * If taken more than 30 minutes after the scheduled time, status becomes 'late'.
   * @param {string} medId - The medication id.
   * @returns {Object|null} The updated dose entry, or null if not found.
   */
  function markDoseTaken(medId) {
    const key = getTodayKey();
    const allDoses = getAllDoses();
    const todayDoses = allDoses[key] || [];

    const dose = todayDoses.find((d) => d.medId === medId);
    if (!dose) {
      console.warn(`[Store] Dose not found for medId: ${medId}`);
      return null;
    }

    const now = new Date();
    dose.takenAt = formatTime(now);

    // Determine if late (> 30 minutes after scheduled)
    const scheduled = parseTime(dose.scheduledTime);
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduled.hours, scheduled.minutes, 0, 0);
    const diffMs = now.getTime() - scheduledDate.getTime();
    const THIRTY_MINUTES = 30 * 60 * 1000;

    dose.status = diffMs > THIRTY_MINUTES ? 'late' : 'taken';
    dose.snoozeUntil = null;

    allDoses[key] = todayDoses;
    saveAllDoses(allDoses);
    return dose;
  }

  /**
   * Snoozes a dose for the given number of minutes.
   * @param {string} medId - The medication id.
   * @param {number} minutes - Minutes to snooze.
   */
  function snoozeDose(medId, minutes) {
    const key = getTodayKey();
    const allDoses = getAllDoses();
    const todayDoses = allDoses[key] || [];

    const dose = todayDoses.find((d) => d.medId === medId);
    if (!dose) {
      console.warn(`[Store] Dose not found for snooze, medId: ${medId}`);
      return;
    }

    const snoozeTime = new Date(Date.now() + (minutes || 10) * 60 * 1000);
    dose.status = 'snoozed';
    dose.snoozeUntil = snoozeTime.toISOString();

    allDoses[key] = todayDoses;
    saveAllDoses(allDoses);
  }

  /**
   * Clears snooze for a dose and resets it to pending.
   * @param {string} medId - The medication id.
   */
  function clearSnooze(medId) {
    const key = getTodayKey();
    const allDoses = getAllDoses();
    const todayDoses = allDoses[key] || [];

    const dose = todayDoses.find((d) => d.medId === medId);
    if (dose) {
      dose.status = 'pending';
      dose.snoozeUntil = null;
      allDoses[key] = todayDoses;
      saveAllDoses(allDoses);
    }
  }

  /**
   * Returns dose data for an entire month.
   * @param {number} year - Full year (e.g. 2025).
   * @param {number} month - Zero-based month index (0 = January).
   * @returns {Object} Dose data keyed by 'YYYY-MM-DD' for the requested month.
   */
  function getHistory(year, month) {
    const allDoses = getAllDoses();
    const monthStr = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const result = {};

    Object.keys(allDoses).forEach((dateKey) => {
      if (dateKey.startsWith(prefix)) {
        result[dateKey] = allDoses[dateKey];
      }
    });

    return result;
  }

  // ─── Settings ────────────────────────────────────────────────────

  /**
   * Retrieves user settings, merged with defaults.
   * @returns {{reducedMotion: boolean, reducedDecorations: boolean, notificationsEnabled: boolean}}
   */
  function getSettings() {
    const stored = readStorage(KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  }

  /**
   * Saves user settings to storage.
   * @param {{reducedMotion?: boolean, reducedDecorations?: boolean, notificationsEnabled?: boolean}} settings
   */
  function saveSettings(settings) {
    const current = getSettings();
    writeStorage(KEYS.SETTINGS, { ...current, ...settings });
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.Store = {
    // Medications
    getMedications,
    saveMedications,
    addMedication,
    updateMedication,
    deleteMedication,

    // Doses
    getTodayDoses,
    markDoseTaken,
    snoozeDose,
    clearSnooze,
    generateTodayDoses,

    // History
    getHistory,

    // Settings
    getSettings,
    saveSettings,

    // Helpers
    getTodayKey,
    formatTime,
    parseTime,
  };
})();
