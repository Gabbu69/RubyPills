/**
 * @file app.js
 * @description Main application controller and entry point for Kawaii Care.
 * Manages screen navigation via hash-based routing, initializes all subsystems
 * (accessibility, store, notifications), and checks for expired snoozes on startup.
 */

(function () {
  'use strict';

  /** The currently active screen name ('today' | 'calendar' | 'settings'). */
  let currentScreen = '';

  /** Map of screen names to their destroy functions (if available). */
  const SCREEN_MODULES = {
    today: function () { return window.TodayScreen; },
    calendar: function () { return window.CalendarScreen; },
    settings: function () { return window.SettingsScreen; },
  };

  // ─── Initialization ──────────────────────────────────────────────

  /**
   * Initializes the entire application. Called on DOMContentLoaded.
   *
   * 1. Initializes accessibility (live regions, motion classes)
   * 2. Generates today's doses from the medication list
   * 3. Sets up bottom navigation handlers
   * 4. Reads location.hash to determine initial screen
   * 5. Listens for hashchange events
   * 6. Initializes notifications if enabled
   * 7. Checks for any expired snoozes
   */
  function init() {
    // 1. Accessibility must init first (creates live regions, applies classes)
    Accessibility.init();

    // 2. Ensure today's doses exist
    Store.generateTodayDoses();

    // 3. Set up navigation
    setupNavigation();

    // 4. Navigate to initial screen from hash or default to 'today'
    const hash = location.hash.replace('#', '').trim();
    const initialScreen = hash && SCREEN_MODULES[hash] ? hash : 'today';
    navigate(initialScreen);

    // 5. Listen for hash changes (e.g., browser back/forward)
    window.addEventListener('hashchange', function () {
      const newHash = location.hash.replace('#', '').trim();
      if (newHash && SCREEN_MODULES[newHash] && newHash !== currentScreen) {
        navigate(newHash);
      }
    });

    // 6. Initialize notifications if enabled
    const settings = Store.getSettings();
    if (settings.notificationsEnabled && window.Notifications) {
      Notifications.init();
    }

    // 7. Check for expired snoozes
    checkExpiredSnoozes();

    // 8. Initialize Capacitor native bridge (no-op on web)
    if (window.CapBridge && typeof CapBridge.init === 'function') {
      CapBridge.init();
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────

  /**
   * Navigates to the given screen by name. Destroys the current screen,
   * swaps visibility classes, renders the new screen content, and
   * updates the bottom nav tab states.
   *
   * @param {string} screenName - One of 'today', 'calendar', 'settings'.
   */
  function navigate(screenName) {
    if (!SCREEN_MODULES[screenName]) {
      console.warn('[App] Unknown screen:', screenName);
      return;
    }

    // Destroy current screen if it has a destroy method
    if (currentScreen && SCREEN_MODULES[currentScreen]) {
      const mod = SCREEN_MODULES[currentScreen]();
      if (mod && typeof mod.destroy === 'function') {
        mod.destroy();
      }
    }

    // Hide all screens, show target
    const screens = document.querySelectorAll('.screen');
    screens.forEach(function (el) {
      el.classList.remove('screen--active');
    });

    const targetScreen = document.getElementById('screen-' + screenName);
    if (targetScreen) {
      targetScreen.classList.add('screen--active');
    }

    // Get the content container inside the screen
    const contentContainer = targetScreen
      ? targetScreen.querySelector('.screen__content')
      : null;

    // Render the screen content
    const module = SCREEN_MODULES[screenName]();
    if (module && contentContainer && typeof module.render === 'function') {
      module.render(contentContainer);
    }

    // Update nav tab active states
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
      tab.classList.toggle(
        'nav-tab--active',
        tab.getAttribute('data-screen') === screenName
      );
      tab.setAttribute(
        'aria-selected',
        tab.getAttribute('data-screen') === screenName ? 'true' : 'false'
      );
    });

    // Update hash without triggering hashchange handler
    location.hash = '#' + screenName;
    currentScreen = screenName;
  }

  /**
   * Sets up click event listeners on all .nav-tab elements.
   * Each tab navigates to its data-screen attribute value.
   */
  function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        const screen = tab.getAttribute('data-screen');
        if (screen) {
          navigate(screen);
        }
      });
    });
  }

  // ─── Snooze Expiry Check ────────────────────────────────────────

  /**
   * Checks today's doses for any snoozes that have already expired.
   * If found, clears the snooze, shows an in-app notification,
   * and triggers a re-render of the today screen.
   */
  function checkExpiredSnoozes() {
    const doses = Store.getTodayDoses();
    const meds = Store.getMedications();
    const now = Date.now();
    let hasExpired = false;

    doses.forEach(function (dose) {
      if (dose.status !== 'snoozed' || !dose.snoozeUntil) return;

      const snoozeEnd = new Date(dose.snoozeUntil).getTime();
      if (now >= snoozeEnd) {
        const med = meds.find(function (m) { return m.id === dose.medId; });
        Store.clearSnooze(dose.medId);

        if (med && window.Notifications) {
          Notifications.showInAppNotification(med.name, med.id);
        }

        hasExpired = true;
      }
    });

    // Re-render today screen if we're on it and snoozes expired
    if (hasExpired && currentScreen === 'today') {
      const targetScreen = document.getElementById('screen-today');
      const contentContainer = targetScreen
        ? targetScreen.querySelector('.screen__content')
        : null;
      if (contentContainer && window.TodayScreen) {
        TodayScreen.render(contentContainer);
      }
    }
  }

  /**
   * Returns the name of the currently active screen.
   * @returns {string} Current screen name.
   */
  function getCurrentScreen() {
    return currentScreen;
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.App = {
    init,
    navigate,
    setupNavigation,
    checkExpiredSnoozes,
    getCurrentScreen,
  };

  // ─── Bootstrap ──────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})();
