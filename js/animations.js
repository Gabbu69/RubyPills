/**
 * @file animations.js
 * @description Animation controller for Kawaii Care. Handles particle effects,
 * celebration sequences, and encouraging messages. Fully respects reduced-motion
 * preferences from both the OS and user settings.
 */

(function () {
  'use strict';

  /** Pool of encouraging messages shown after marking a dose as taken. */
  const ENCOURAGING_MESSAGES = [
    'Great job taking care of yourself! 💗',
    'All done for today! 🎀',
    'A little care goes a long way! 🌸',
    "You're doing amazing! ⭐",
    'Self-care champion! 💝',
    'One step at a time! 🌷',
  ];

  /**
   * Checks whether motion/animations are allowed.
   * Returns true only if NEITHER the OS prefers-reduced-motion NOR the user
   * setting is active.
   * @returns {boolean} True if animations should play.
   */
  function isMotionAllowed() {
    const osPrefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const userPrefersReduced =
      window.Store && typeof Store.getSettings === 'function'
        ? Store.getSettings().reducedMotion
        : false;
    return !osPrefersReduced && !userPrefersReduced;
  }

  /**
   * Spawns floating heart particles inside a container.
   * @param {HTMLElement} container - Parent element to append hearts into.
   * @param {number} [count=6] - Number of heart particles to create.
   */
  function spawnHearts(container, count) {
    if (!container) return;
    count = typeof count === 'number' ? count : 6;

    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.className = 'particle-heart';
      heart.textContent = '💗';
      heart.setAttribute('aria-hidden', 'true');

      // Random horizontal position 10–90%
      const left = 10 + Math.random() * 80;
      // Random size 16–32px
      const size = 16 + Math.random() * 16;
      // Staggered delay 0–0.5s
      const delay = Math.random() * 0.5;

      heart.style.left = `${left}%`;
      heart.style.fontSize = `${size}px`;
      heart.style.animationDelay = `${delay}s`;

      container.style.position = container.style.position || 'relative';
      container.appendChild(heart);

      // Cleanup after animation completes
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, 2000 + delay * 1000);
    }
  }

  /**
   * Spawns floating star particles inside a container.
   * @param {HTMLElement} container - Parent element to append stars into.
   * @param {number} [count=4] - Number of star particles to create.
   */
  function spawnStars(container, count) {
    if (!container) return;
    count = typeof count === 'number' ? count : 4;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'particle-heart'; // Reuses the same float-up animation
      star.textContent = '⭐';
      star.setAttribute('aria-hidden', 'true');

      const left = 10 + Math.random() * 80;
      const size = 16 + Math.random() * 16;
      const delay = Math.random() * 0.5;

      star.style.left = `${left}%`;
      star.style.fontSize = `${size}px`;
      star.style.animationDelay = `${delay}s`;

      container.style.position = container.style.position || 'relative';
      container.appendChild(star);

      setTimeout(() => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, 2000 + delay * 1000);
    }
  }

  /**
   * Triggers a bounce animation on a bow/element by toggling a CSS class.
   * @param {HTMLElement} element - The element to bounce.
   */
  function bounceBow(element) {
    if (!element) return;
    element.classList.add('bounce-bow');
    setTimeout(() => {
      element.classList.remove('bounce-bow');
    }, 600);
  }

  /**
   * Picks a random encouraging message from the pool.
   * @returns {string} A random encouragement string.
   */
  function getRandomEncouragement() {
    return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
  }

  /**
   * Shows an encouraging message inside a container. Creates or reuses the
   * .encouraging-message element. Fades in after 50ms and auto-hides after 4s.
   * @param {HTMLElement} container - The container to show the message in.
   * @param {string} message - The message text.
   */
  function showEncouragingMessage(container, message) {
    if (!container) return;

    let msgEl = container.querySelector('.encouraging-message');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'encouraging-message';
      msgEl.setAttribute('aria-live', 'polite');
      container.appendChild(msgEl);
    }

    msgEl.textContent = message;
    msgEl.classList.remove('encouraging-message--visible');

    // Trigger reflow so the class toggle re-fires the transition
    void msgEl.offsetWidth;

    setTimeout(() => {
      msgEl.classList.add('encouraging-message--visible');
    }, 50);

    setTimeout(() => {
      msgEl.classList.remove('encouraging-message--visible');
    }, 4000);
  }

  /**
   * Runs the full celebration sequence for a completed dose.
   * If motion is allowed: spawns heart particles on the card, then shows
   * an encouraging message after a short delay.
   * If motion is disabled: shows only the encouraging message immediately.
   * @param {HTMLElement} cardElement - The medication card element.
   */
  function celebrateDose(cardElement) {
    if (!cardElement) return;

    const message = getRandomEncouragement();

    if (isMotionAllowed()) {
      spawnHearts(cardElement);
      setTimeout(() => {
        showEncouragingMessage(cardElement, message);
      }, 300);
    } else {
      showEncouragingMessage(cardElement, message);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.Animations = {
    spawnHearts,
    spawnStars,
    bounceBow,
    celebrateDose,
    showEncouragingMessage,
    isMotionAllowed,
  };
})();
