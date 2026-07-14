/**
 * @file capacitor-bridge.js
 * @description Bridge module between the web app and Capacitor native APIs.
 * Provides platform detection, native notification scheduling, haptic feedback,
 * status bar control, back-button handling, and safe persistent storage.
 *
 * This module gracefully degrades: if running in a browser without Capacitor,
 * all methods fall back to browser APIs or become no-ops.
 */

(function () {
  'use strict';

  // ─── Platform Detection ──────────────────────────────────────────

  /**
   * Returns true if running inside a Capacitor native container.
   * @returns {boolean}
   */
  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  /**
   * Returns the current platform: 'android', 'ios', or 'web'.
   * @returns {string}
   */
  function getPlatform() {
    if (window.Capacitor && window.Capacitor.getPlatform) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  // ─── Native Local Notifications ──────────────────────────────────

  /**
   * Requests notification permissions from the native platform.
   * @returns {Promise<boolean>} True if permission was granted.
   */
  async function requestNotificationPermission() {
    if (!isNative()) {
      // Fall back to browser Notification API
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
      return false;
    }

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.warn('[CapBridge] Failed to request notification permission:', e);
      return false;
    }
  }

  /**
   * Checks current notification permission status.
   * @returns {Promise<string>} 'granted', 'denied', or 'prompt'
   */
  async function checkNotificationPermission() {
    if (!isNative()) {
      if ('Notification' in window) {
        return Notification.permission === 'default' ? 'prompt' : Notification.permission;
      }
      return 'denied';
    }

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      const result = await LocalNotifications.checkPermissions();
      return result.display; // 'granted', 'denied', 'prompt'
    } catch (e) {
      console.warn('[CapBridge] Failed to check notification permission:', e);
      return 'denied';
    }
  }

  /**
   * Schedules a native local notification for a medication reminder.
   * @param {Object} options
   * @param {number} options.id - Unique notification ID.
   * @param {string} options.title - Notification title.
   * @param {string} options.body - Notification body text.
   * @param {Date} options.at - The Date/time to fire the notification.
   * @param {Object} [options.extra] - Extra data to pass (e.g., medId).
   * @returns {Promise<void>}
   */
  async function scheduleNotification(options) {
    if (!isNative()) {
      // Fall back to setTimeout + browser Notification
      const msUntil = options.at.getTime() - Date.now();
      if (msUntil > 0) {
        setTimeout(function () {
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(options.title || 'RubyPills 💗', {
                body: options.body,
                requireInteraction: true,
              });
            } catch (e) {
              console.warn('[CapBridge] Browser notification failed:', e);
            }
          }
          // Always show in-app notification
          if (window.Notifications && options.extra && options.extra.medId) {
            Notifications.showInAppNotification(
              options.extra.medName || 'Medication',
              options.extra.medId
            );
          }
        }, msUntil);
      }
      return;
    }

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id,
            title: options.title || 'RubyPills 💗',
            body: options.body || 'Time for your medication!',
            schedule: { at: options.at },
            sound: 'default',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'ic_launcher',
            extra: options.extra || {},
            channelId: 'medication-reminders',
          },
        ],
      });
    } catch (e) {
      console.warn('[CapBridge] Failed to schedule notification:', e);
    }
  }

  /**
   * Cancels all pending native notifications.
   * @returns {Promise<void>}
   */
  async function cancelAllNotifications() {
    if (!isNative()) return;

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      const pending = await LocalNotifications.getPending();
      if (pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch (e) {
      console.warn('[CapBridge] Failed to cancel notifications:', e);
    }
  }

  /**
   * Creates the notification channel for Android 8+.
   * Must be called once during app initialization.
   * @returns {Promise<void>}
   */
  async function createNotificationChannel() {
    if (!isNative() || getPlatform() !== 'android') return;

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      await LocalNotifications.createChannel({
        id: 'medication-reminders',
        name: 'Medication Reminders',
        description: 'Reminders to take your medications',
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#F48BA6',
      });
    } catch (e) {
      console.warn('[CapBridge] Failed to create notification channel:', e);
    }
  }

  /**
   * Registers a listener for notification actions (tap on notification).
   * @param {Function} callback - Called with the notification data when tapped.
   */
  function onNotificationAction(callback) {
    if (!isNative()) return;

    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      LocalNotifications.addListener('localNotificationActionPerformed', function (event) {
        if (typeof callback === 'function') {
          callback(event.notification.extra || {});
        }
      });
    } catch (e) {
      console.warn('[CapBridge] Failed to register notification listener:', e);
    }
  }

  // ─── Persistent Storage (Preferences) ────────────────────────────

  /**
   * Gets a value from native persistent storage.
   * Falls back to localStorage on web.
   * @param {string} key - The storage key.
   * @returns {Promise<string|null>} The stored value or null.
   */
  async function getPreference(key) {
    if (!isNative()) {
      return localStorage.getItem(key);
    }

    try {
      const { Preferences } = window.Capacitor.Plugins;
      const result = await Preferences.get({ key: key });
      return result.value;
    } catch (e) {
      console.warn('[CapBridge] Preferences.get failed, falling back to localStorage:', e);
      return localStorage.getItem(key);
    }
  }

  /**
   * Sets a value in native persistent storage.
   * Falls back to localStorage on web.
   * @param {string} key - The storage key.
   * @param {string} value - The value to store.
   * @returns {Promise<void>}
   */
  async function setPreference(key, value) {
    if (!isNative()) {
      localStorage.setItem(key, value);
      return;
    }

    try {
      const { Preferences } = window.Capacitor.Plugins;
      await Preferences.set({ key: key, value: value });
    } catch (e) {
      console.warn('[CapBridge] Preferences.set failed, falling back to localStorage:', e);
      localStorage.setItem(key, value);
    }
  }

  /**
   * Migrates data from localStorage to Capacitor Preferences.
   * Called once on first native launch to preserve existing user data.
   * @param {string[]} keys - Array of localStorage keys to migrate.
   * @returns {Promise<void>}
   */
  async function migrateFromLocalStorage(keys) {
    if (!isNative()) return;

    try {
      const { Preferences } = window.Capacitor.Plugins;

      // Check if we've already migrated
      const migrationFlag = await Preferences.get({ key: '_rubypills_migrated' });
      if (migrationFlag.value === 'true') return;

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var localValue = localStorage.getItem(key);
        if (localValue !== null) {
          await Preferences.set({ key: key, value: localValue });
          console.log('[CapBridge] Migrated key:', key);
        }
      }

      await Preferences.set({ key: '_rubypills_migrated', value: 'true' });
      console.log('[CapBridge] Migration complete');
    } catch (e) {
      console.warn('[CapBridge] Migration failed:', e);
    }
  }

  // ─── Haptic Feedback ─────────────────────────────────────────────

  /**
   * Triggers a light haptic impact (for button presses).
   * @returns {Promise<void>}
   */
  async function hapticLight() {
    if (!isNative()) return;

    try {
      var Haptics = window.Capacitor.Plugins.Haptics;
      await Haptics.impact({ style: 'LIGHT' });
    } catch (e) {
      // Silent fail — haptics are optional
    }
  }

  /**
   * Triggers a medium haptic impact (for confirmations).
   * @returns {Promise<void>}
   */
  async function hapticMedium() {
    if (!isNative()) return;

    try {
      var Haptics = window.Capacitor.Plugins.Haptics;
      await Haptics.impact({ style: 'MEDIUM' });
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Triggers a success haptic notification.
   * @returns {Promise<void>}
   */
  async function hapticSuccess() {
    if (!isNative()) return;

    try {
      var Haptics = window.Capacitor.Plugins.Haptics;
      await Haptics.notification({ type: 'SUCCESS' });
    } catch (e) {
      // Silent fail
    }
  }

  // ─── Status Bar ──────────────────────────────────────────────────

  /**
   * Configures the Android status bar to match the app theme.
   * @returns {Promise<void>}
   */
  async function configureStatusBar() {
    if (!isNative()) return;

    try {
      var StatusBar = window.Capacitor.Plugins.StatusBar;
      await StatusBar.setBackgroundColor({ color: '#FFF5F0' });
      await StatusBar.setStyle({ style: 'LIGHT' }); // Dark icons on light background
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn('[CapBridge] StatusBar configuration failed:', e);
    }
  }

  // ─── Back Button ─────────────────────────────────────────────────

  /**
   * Sets up Android hardware back button handling.
   * Navigates back to the Today screen, or prompts to exit if already on Today.
   */
  function setupBackButton() {
    if (!isNative()) return;

    try {
      var AppPlugin = window.Capacitor.Plugins.App;
      AppPlugin.addListener('backButton', function (event) {
        // If a modal is open, close it
        var modalOverlay = document.getElementById('med-modal-overlay');
        if (modalOverlay) {
          if (window.SettingsScreen && typeof SettingsScreen.closeModal === 'function') {
            SettingsScreen.closeModal();
          }
          return;
        }

        // If notification banner is visible, dismiss it
        var banner = document.querySelector('.notification-banner');
        if (banner) {
          if (window.Notifications && typeof Notifications.hideInAppNotification === 'function') {
            Notifications.hideInAppNotification();
          }
          return;
        }

        // If not on Today screen, navigate there
        if (window.App && typeof App.getCurrentScreen === 'function') {
          var currentScreen = App.getCurrentScreen();
          if (currentScreen !== 'today') {
            App.navigate('today');
            return;
          }
        }

        // On Today screen — minimize the app (don't exit)
        if (event.canGoBack) {
          window.history.back();
        } else {
          AppPlugin.minimizeApp();
        }
      });
    } catch (e) {
      console.warn('[CapBridge] Back button setup failed:', e);
    }
  }

  // ─── Splash Screen ───────────────────────────────────────────────

  /**
   * Hides the native splash screen after app initialization.
   * @returns {Promise<void>}
   */
  async function hideSplashScreen() {
    if (!isNative()) return;

    try {
      var SplashScreen = window.Capacitor.Plugins.SplashScreen;
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (e) {
      console.warn('[CapBridge] SplashScreen hide failed:', e);
    }
  }

  // ─── Full Initialization ─────────────────────────────────────────

  /**
   * Initializes all native capabilities. Called from app.js on DOMContentLoaded.
   * Safe to call on web — all methods gracefully degrade.
   * @returns {Promise<void>}
   */
  async function init() {
    if (!isNative()) {
      console.info('[CapBridge] Running on web — native features disabled');
      return;
    }

    console.info('[CapBridge] Running on', getPlatform(), '— initializing native features');

    // 1. Migrate localStorage → Preferences
    await migrateFromLocalStorage([
      'kawaiicare_medications',
      'kawaiicare_doses',
      'kawaiicare_settings',
    ]);

    // 2. Create notification channel (Android 8+)
    await createNotificationChannel();

    // 3. Configure status bar
    await configureStatusBar();

    // 4. Set up back button
    setupBackButton();

    // 5. Register notification tap handler
    onNotificationAction(function (extra) {
      if (extra.medId && window.App) {
        App.navigate('today');
        // Small delay to ensure screen is rendered
        setTimeout(function () {
          if (window.TodayScreen && typeof TodayScreen.handleMarkTaken === 'function') {
            // Scroll to the medication card
            var card = document.getElementById('med-card-' + extra.medId);
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 300);
      }
    });

    // 6. Hide splash screen
    await hideSplashScreen();
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.CapBridge = {
    // Platform
    isNative: isNative,
    getPlatform: getPlatform,

    // Notifications
    requestNotificationPermission: requestNotificationPermission,
    checkNotificationPermission: checkNotificationPermission,
    scheduleNotification: scheduleNotification,
    cancelAllNotifications: cancelAllNotifications,
    createNotificationChannel: createNotificationChannel,
    onNotificationAction: onNotificationAction,

    // Storage
    getPreference: getPreference,
    setPreference: setPreference,
    migrateFromLocalStorage: migrateFromLocalStorage,

    // Haptics
    hapticLight: hapticLight,
    hapticMedium: hapticMedium,
    hapticSuccess: hapticSuccess,

    // UI
    configureStatusBar: configureStatusBar,
    setupBackButton: setupBackButton,
    hideSplashScreen: hideSplashScreen,

    // Init
    init: init,
  };
})();
