/**
 * @file accessibility.js
 * @description Accessibility manager for Kawaii Care. Manages reduced-motion
 * and reduced-decoration preferences, creates ARIA live regions for screen
 * reader announcements, and provides a focus-trapping utility for modals.
 */

(function () {
  'use strict';

  /** Selector for all naturally focusable elements inside a container. */
  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  /** References to the ARIA live-region elements. */
  let politeRegion = null;
  let assertiveRegion = null;

  // ─── Initialization ──────────────────────────────────────────────

  /**
   * Initializes the accessibility module.
   * Reads stored settings and OS media queries, applies appropriate classes
   * to document.body, and creates ARIA live regions.
   */
  function init() {
    createLiveRegions();

    const settings = Store.getSettings();
    const osPrefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (settings.reducedMotion || osPrefersReduced) {
      document.body.classList.add('reduced-motion');
    }

    if (settings.reducedDecorations) {
      document.body.classList.add('reduced-decorations');
    }

    // Listen for OS preference changes
    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      try {
        mql.addEventListener('change', (e) => {
          if (e.matches) {
            document.body.classList.add('reduced-motion');
          }
        });
      } catch (_) {
        // Fallback for older browsers
        mql.addListener((e) => {
          if (e.matches) {
            document.body.classList.add('reduced-motion');
          }
        });
      }
    }
  }

  // ─── Live Regions ────────────────────────────────────────────────

  /**
   * Creates two screen-reader-only ARIA live regions (polite & assertive)
   * and appends them to document.body.
   */
  function createLiveRegions() {
    // Avoid duplicates
    if (document.getElementById('aria-live-polite')) return;

    politeRegion = document.createElement('div');
    politeRegion.id = 'aria-live-polite';
    politeRegion.className = 'sr-only';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.setAttribute('role', 'status');
    document.body.appendChild(politeRegion);

    assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'aria-live-assertive';
    assertiveRegion.className = 'sr-only';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.setAttribute('role', 'alert');
    document.body.appendChild(assertiveRegion);
  }

  // ─── Announcements ───────────────────────────────────────────────

  /**
   * Announces a message to screen readers via the polite live region.
   * @param {string} message - The message to announce.
   */
  function announceToScreenReader(message) {
    if (!politeRegion) {
      politeRegion = document.getElementById('aria-live-polite');
    }
    if (politeRegion) {
      // Clear first to ensure re-announcement of identical messages
      politeRegion.textContent = '';
      requestAnimationFrame(() => {
        politeRegion.textContent = message || '';
      });
    }
  }

  /**
   * Announces an urgent message via the assertive live region.
   * @param {string} message - The urgent message to announce.
   */
  function announceUrgent(message) {
    if (!assertiveRegion) {
      assertiveRegion = document.getElementById('aria-live-assertive');
    }
    if (assertiveRegion) {
      assertiveRegion.textContent = '';
      requestAnimationFrame(() => {
        assertiveRegion.textContent = message || '';
      });
    }
  }

  // ─── Preference Toggles ──────────────────────────────────────────

  /**
   * Toggles the reduced-motion class on body and persists the setting.
   * @param {boolean} enabled - Whether to enable reduced motion.
   */
  function setReducedMotion(enabled) {
    document.body.classList.toggle('reduced-motion', !!enabled);
    Store.saveSettings({ reducedMotion: !!enabled });
  }

  /**
   * Toggles the reduced-decorations class on body and persists the setting.
   * @param {boolean} enabled - Whether to enable reduced decorations.
   */
  function setReducedDecorations(enabled) {
    document.body.classList.toggle('reduced-decorations', !!enabled);
    Store.saveSettings({ reducedDecorations: !!enabled });
  }

  /**
   * Returns true if motion should be reduced (either user setting or OS preference).
   * @returns {boolean}
   */
  function getMotionPreference() {
    const osPrefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const userPrefersReduced = Store.getSettings().reducedMotion;
    return osPrefersReduced || userPrefersReduced;
  }

  // ─── Focus Trap ──────────────────────────────────────────────────

  /**
   * Traps keyboard focus within the given element. Useful for modals and dialogs.
   * Handles Tab and Shift+Tab to cycle through focusable children.
   *
   * @param {HTMLElement} element - The container to trap focus within.
   * @returns {{release: Function}} An object with a release() method to remove the trap.
   */
  function trapFocus(element) {
    if (!element) {
      return { release: function () {} };
    }

    /**
     * Keydown handler that constrains Tab navigation within the element.
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;

      const focusable = element.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element immediately
    const initialFocusable = element.querySelectorAll(FOCUSABLE_SELECTOR);
    if (initialFocusable.length > 0) {
      initialFocusable[0].focus();
    }

    return {
      /** Removes the focus trap event listener. */
      release: function () {
        element.removeEventListener('keydown', handleKeyDown);
      },
    };
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.Accessibility = {
    init,
    setReducedMotion,
    setReducedDecorations,
    announceToScreenReader,
    announceUrgent,
    trapFocus,
    getMotionPreference,
    createLiveRegions,
  };
})();
