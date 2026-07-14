/**
 * @file notifications.js
 * @description Browser and in-app notification handler for Kawaii Care.
 * Manages native Notification API integration, in-app banner notifications,
 * and scheduled medication reminders.
 */

(function () {
  'use strict';

  /** Pool of warm notification body messages. */
  const NOTIFICATION_MESSAGES = [
    "Time for your {med}! You've got this 💗",
    "Hey! It's {med} time 🌸 Take care of yourself!",
    "Gentle reminder: {med} is waiting for you 🎀",
    "Your {med} is due! A little care goes a long way 💝",
    "Don't forget your {med}! You're doing amazing ⭐",
    "It's {med} o'clock! Self-care is important 🌷",
  ];

  /** Scheduled timeout IDs for cleanup. */
  let scheduledTimeouts = [];

  // ─── Core API ────────────────────────────────────────────────────

  /**
   * Initializes the notification system.
   * Checks browser support, reads user settings, and schedules reminders
   * for today if notifications are enabled.
   */
  function init() {
    if (!isSupported()) {
      console.info('[Notifications] Browser notifications not supported.');
      return;
    }

    const settings = Store.getSettings();
    if (settings.notificationsEnabled) {
      scheduleReminders();
    }
  }

  /**
   * Requests notification permission from the browser.
   * @returns {Promise<string>} Resolves to 'granted', 'denied', or 'default'.
   */
  function requestPermission() {
    // Use native bridge if available
    if (window.CapBridge && CapBridge.isNative()) {
      return CapBridge.requestNotificationPermission().then(function (granted) {
        return granted ? 'granted' : 'denied';
      });
    }
    if (!isSupported()) {
      return Promise.resolve('unsupported');
    }
    return Notification.requestPermission();
  }

  /**
   * Checks if the browser supports the Notification API.
   * @returns {boolean}
   */
  function isSupported() {
    return 'Notification' in window;
  }

  /**
   * Returns the current notification permission state.
   * @returns {string} 'granted' | 'denied' | 'default' | 'unsupported'
   */
  function getPermissionState() {
    return isSupported() ? Notification.permission : 'unsupported';
  }

  // ─── Browser Notifications ──────────────────────────────────────

  /**
   * Shows a native browser notification for a medication.
   * @param {string} medName - The medication name to include in the body.
   */
  function showBrowserNotification(medName) {
    if (!isSupported() || Notification.permission !== 'granted') return;

    const template =
      NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
    const body = template.replace('{med}', medName || 'your medication');

    try {
      new Notification('RubyPills 💗', {
        body: body,
        icon: undefined, // Could add a small icon later
        requireInteraction: true,
      });
    } catch (e) {
      console.warn('[Notifications] Failed to create notification:', e);
    }
  }

  // ─── In-App Notifications ──────────────────────────────────────

  /**
   * Shows a slide-down in-app notification banner at the top of the app.
   * Contains action buttons for "Taken" and "Snooze 10 min".
   * @param {string} medName - The medication name.
   * @param {string} medId - The medication id for action handlers.
   */
  function showInAppNotification(medName, medId) {
    // Remove existing banner first
    hideInAppNotification();

    const template =
      NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
    const messageText = template.replace('{med}', medName || 'your medication');

    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.innerHTML = `
      <div class="notification-banner__content">
        <span class="notification-banner__icon" aria-hidden="true">🔔</span>
        <span class="notification-banner__text">${escapeHtml(messageText)}</span>
      </div>
      <div class="notification-banner__actions">
        <button class="btn btn--primary btn--small notification-banner__taken"
                aria-label="Mark ${escapeHtml(medName)} as taken">
          ✓ Taken
        </button>
        <button class="btn btn--secondary btn--small notification-banner__snooze"
                aria-label="Snooze ${escapeHtml(medName)} for 10 minutes">
          Snooze 10 min
        </button>
      </div>
    `;

    // Bind action handlers
    const takenBtn = banner.querySelector('.notification-banner__taken');
    const snoozeBtn = banner.querySelector('.notification-banner__snooze');

    if (takenBtn) {
      takenBtn.addEventListener('click', function () {
        if (window.TodayScreen && typeof TodayScreen.handleMarkTaken === 'function') {
          TodayScreen.handleMarkTaken(medId);
        }
        hideInAppNotification();
      });
    }

    if (snoozeBtn) {
      snoozeBtn.addEventListener('click', function () {
        if (window.TodayScreen && typeof TodayScreen.handleSnooze === 'function') {
          TodayScreen.handleSnooze(medId);
        }
        hideInAppNotification();
      });
    }

    // Animate in
    document.body.appendChild(banner);
    requestAnimationFrame(() => {
      banner.classList.add('slide-down-enter');
    });
  }

  /**
   * Removes the in-app notification banner from the DOM.
   */
  function hideInAppNotification() {
    const existing = document.querySelector('.notification-banner');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  // ─── Scheduling ─────────────────────────────────────────────────

  /**
   * Schedules browser notifications for each pending medication today.
   * For each medication whose scheduled time is in the future, sets a
   * timeout to fire the notification at the right moment.
   */
  function scheduleReminders() {
    clearScheduled();

    const doses = Store.getTodayDoses();
    const meds = Store.getMedications();
    const now = Date.now();
    const useNative = window.CapBridge && CapBridge.isNative();

    // Cancel any pending native notifications first
    if (useNative) {
      CapBridge.cancelAllNotifications();
    }

    const NOTIFICATION_MESSAGES = [
      "Time for your {med}! You've got this 💗",
      "Hey! It's {med} time 🌸 Take care of yourself!",
      "Gentle reminder: {med} is waiting for you 🎀",
      "Your {med} is due! A little care goes a long way 💝",
    ];

    doses.forEach(function (dose, index) {
      if (dose.status !== 'pending' && dose.status !== 'snoozed') return;

      const parsed = Store.parseTime(dose.scheduledTime);
      const target = new Date();
      target.setHours(parsed.hours, parsed.minutes, 0, 0);

      const msUntil = target.getTime() - now;

      if (msUntil > 0) {
        const med = meds.find(function (m) {
          return m.id === dose.medId;
        });
        const medName = med ? med.name : 'Medication';
        const template = NOTIFICATION_MESSAGES[index % NOTIFICATION_MESSAGES.length];
        const body = template.replace('{med}', medName);

        if (useNative) {
          // Schedule via Capacitor Local Notifications
          CapBridge.scheduleNotification({
            id: index + 1,
            title: 'RubyPills 💗',
            body: body,
            at: target,
            extra: { medId: dose.medId, medName: medName },
          });
        } else {
          // Fall back to setTimeout + browser notification
          const tid = setTimeout(function () {
            showBrowserNotification(medName);
            showInAppNotification(medName, dose.medId);
          }, msUntil);

          scheduledTimeouts.push(tid);
        }
      }
    });
  }

  /**
   * Clears all scheduled notification timeouts.
   */
  function clearScheduled() {
    scheduledTimeouts.forEach(function (tid) {
      clearTimeout(tid);
    });
    scheduledTimeouts = [];
  }

  // ─── Utilities ──────────────────────────────────────────────────

  /**
   * Escapes HTML special characters to prevent XSS.
   * @param {string} str - Raw string.
   * @returns {string} Escaped string safe for innerHTML.
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.Notifications = {
    init,
    requestPermission,
    isSupported,
    getPermissionState,
    showBrowserNotification,
    showInAppNotification,
    hideInAppNotification,
    scheduleReminders,
    clearScheduled,
  };
})();
