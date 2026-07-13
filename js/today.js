/**
 * @file today.js
 * @description Today screen renderer for Kawaii Care. Displays the current
 * date, a greeting with mascot, medication dose cards with interactive
 * take/snooze actions, snooze countdown timers, and celebration effects.
 */

(function () {
  'use strict';

  /** Active interval and timeout IDs for snooze timers and re-renders. */
  let activeIntervals = [];
  let activeTimeouts = [];

  /** Reference to the currently rendered container for re-renders. */
  let currentContainer = null;

  // ─── Mascot SVG ──────────────────────────────────────────────────

  /**
   * Returns an inline SVG string of a cute kawaii cat mascot.
   * Original design — round white head, pointy ears with pink inners,
   * dot eyes, a 'ω' mouth, blush marks, and a small bow on the right ear.
   *
   * @param {number} size - Width and height in pixels.
   * @returns {string} SVG markup string.
   */
  function getMascotSVG(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true" role="img">
      <!-- Left Ear -->
      <polygon points="25,45 15,10 45,30" fill="white" stroke="#3D1F28" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="27,42 19,16 41,29" fill="#FFD6E0" opacity="0.6"/>

      <!-- Right Ear -->
      <polygon points="95,45 105,10 75,30" fill="white" stroke="#3D1F28" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="93,42 101,16 79,29" fill="#FFD6E0" opacity="0.6"/>

      <!-- Head (classic wide Hello Kitty oval shape) -->
      <ellipse cx="60" cy="65" rx="44" ry="36" fill="white" stroke="#3D1F28" stroke-width="2.5"/>

      <!-- Eyes (widely spaced black/brown oval eyes) -->
      <ellipse cx="38" cy="63" rx="3.5" ry="4.5" fill="#3D1F28"/>
      <ellipse cx="82" cy="63" rx="3.5" ry="4.5" fill="#3D1F28"/>

      <!-- Nose (classic horizontal yellow oval) -->
      <ellipse cx="60" cy="71" rx="4.5" ry="3.5" fill="#FFD700" stroke="#3D1F28" stroke-width="1.5"/>

      <!-- NO MOUTH — Hello Kitty is famous for having no mouth -->

      <!-- Whiskers (3 thin classic whiskers on each cheek) -->
      <!-- Left Whiskers -->
      <line x1="22" y1="58" x2="8" y2="56" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="65" x2="6" y2="65" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>
      <line x1="22" y1="72" x2="8" y2="74" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>
      
      <!-- Right Whiskers -->
      <line x1="98" y1="58" x2="112" y2="56" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>
      <line x1="100" y1="65" x2="114" y2="65" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>
      <line x1="98" y1="72" x2="112" y2="74" stroke="#3D1F28" stroke-width="2" stroke-linecap="round"/>

      <!-- Soft Pink Cheek Blush -->
      <circle cx="28" cy="71" r="5" fill="#FFB8C6" opacity="0.4"/>
      <circle cx="92" cy="71" r="5" fill="#FFB8C6" opacity="0.4"/>

      <!-- Iconic Red Bow on Left Ear (Viewer's Left, Kitty's Right - technically Hello Kitty wears it on her left ear, which is viewer's left) -->
      <g transform="translate(30, 25)">
        <!-- Left loop -->
        <ellipse cx="-12" cy="0" rx="13" ry="10" fill="#E4002B" stroke="#3D1F28" stroke-width="2.5" transform="rotate(-15 -12 0)"/>
        <!-- Right loop -->
        <ellipse cx="12" cy="0" rx="13" ry="10" fill="#E4002B" stroke="#3D1F28" stroke-width="2.5" transform="rotate(15 12 0)"/>
        <!-- Bow Center Ribbon Knot -->
        <circle cx="0" cy="0" r="7.5" fill="#E4002B" stroke="#3D1F28" stroke-width="2.5"/>
      </g>
    </svg>`;
  }

  // ─── Rendering ──────────────────────────────────────────────────

  /**
   * Renders the full Today screen into the given container.
   * Includes date display, greeting with mascot, medication cards, and
   * an all-done section when every dose has been handled.
   *
   * @param {HTMLElement} container - The DOM element to render into.
   */
  function render(container) {
    if (!container) return;
    destroy(); // Clean up previous timers
    currentContainer = container;
    container.innerHTML = '';

    const now = new Date();
    const doses = Store.getTodayDoses();
    const meds = Store.getMedications();

    // ── Date Display ──
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const dateEl = document.createElement('p');
    dateEl.className = 'today-date';
    dateEl.textContent = dateStr;
    container.appendChild(dateEl);

    // ── Greeting Section ──
    const greetingSection = document.createElement('div');
    greetingSection.className = 'greeting-section';

    const mascotDiv = document.createElement('div');
    mascotDiv.className = 'greeting-section__mascot';
    mascotDiv.innerHTML = getMascotSVG(80);

    const greetingText = document.createElement('div');
    greetingText.className = 'greeting-section__text';

    const greetingH1 = document.createElement('h1');
    greetingH1.className = 'greeting-section__title';
    greetingH1.textContent = 'Hello Kitty! 🎀';

    const hour = now.getHours();
    let subtextStr;
    if (hour < 12) {
      subtextStr = 'Good morning! ☀️';
    } else if (hour < 17) {
      subtextStr = 'Good afternoon! 🌸';
    } else {
      subtextStr = 'Good evening! 🌙';
    }
    const subtext = document.createElement('p');
    subtext.className = 'greeting-section__subtext';
    subtext.textContent = subtextStr;

    greetingText.appendChild(greetingH1);
    greetingText.appendChild(subtext);
    greetingSection.appendChild(mascotDiv);
    greetingSection.appendChild(greetingText);
    container.appendChild(greetingSection);

    // ── Medication Cards ──
    const allCompleted = doses.length > 0 && doses.every(function (d) {
      return d.status === 'taken' || d.status === 'late';
    });

    doses.forEach(function (dose) {
      const med = meds.find(function (m) { return m.id === dose.medId; });
      if (!med) return;

      const card = createMedCard(med, dose);
      container.appendChild(card);
    });

    // ── All Done Section ──
    if (allCompleted && doses.length > 0) {
      const allDone = document.createElement('div');
      allDone.className = 'all-done-section';

      const messages = [
        'Great job taking care of yourself! 💗',
        'A little care goes a long way! 🌸',
        "You're doing amazing! ⭐",
        'Self-care champion! 💝',
        'One step at a time! 🌷',
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];

      allDone.innerHTML = `
        <div class="all-done-section__icon" aria-hidden="true">🎀</div>
        <h2 class="all-done-section__title">All done for today! 🎀</h2>
        <p class="all-done-section__message">${escapeHtml(randomMsg)}</p>
      `;
      container.appendChild(allDone);
    }

    // ── Encouraging Message Container ──
    const encourageContainer = document.createElement('div');
    encourageContainer.className = 'encouraging-container';
    encourageContainer.id = 'encourage-container';
    container.appendChild(encourageContainer);

    // Start snooze timers if any doses are snoozed
    startSnoozeTimers();
  }

  /**
   * Creates a medication card DOM element based on the dose status.
   *
   * @param {Object} med - Medication data { id, name, dosage, time, notes }.
   * @param {Object} dose - Dose data { medId, scheduledTime, takenAt, status, snoozeUntil }.
   * @returns {HTMLElement} The card element.
   */
  function createMedCard(med, dose) {
    const card = document.createElement('div');
    card.className = 'med-card';
    card.id = `med-card-${med.id}`;

    const parsed = Store.parseTime(med.time);
    const timeDate = new Date();
    timeDate.setHours(parsed.hours, parsed.minutes, 0, 0);
    const displayTime = Store.formatTime(timeDate);

    if (dose.status === 'taken') {
      card.classList.add('med-card--taken');
      card.setAttribute('aria-label', `${med.name} - taken at ${dose.takenAt}`);
      card.innerHTML = `
        <div class="med-card__status-icon med-card__status-icon--taken" aria-hidden="true">✓</div>
        <div class="med-card__info">
          <h3 class="med-card__name">${escapeHtml(med.name)} 🎀</h3>
          <p class="med-card__detail">${escapeHtml(med.dosage)}</p>
          <p class="med-card__time med-card__time--completed">Taken at ${escapeHtml(dose.takenAt)}</p>
        </div>
      `;
    } else if (dose.status === 'late') {
      card.classList.add('med-card--late');
      card.setAttribute('aria-label', `${med.name} - taken late at ${dose.takenAt}`);
      card.innerHTML = `
        <div class="med-card__status-icon med-card__status-icon--late" aria-hidden="true">🕐</div>
        <div class="med-card__info">
          <h3 class="med-card__name">${escapeHtml(med.name)}</h3>
          <p class="med-card__detail">${escapeHtml(med.dosage)}</p>
          <p class="med-card__time med-card__time--late">Taken late at ${escapeHtml(dose.takenAt)}</p>
        </div>
      `;
    } else if (dose.status === 'snoozed') {
      card.classList.add('med-card--snoozed');
      card.setAttribute('aria-label', `${med.name} - snoozed, reminder coming soon`);
      card.innerHTML = `
        <div class="med-card__icon" aria-hidden="true">💊</div>
        <div class="med-card__info">
          <h3 class="med-card__name">${escapeHtml(med.name)}</h3>
          <p class="med-card__detail">${escapeHtml(med.dosage)} · ${displayTime}</p>
          ${med.notes ? `<p class="med-card__notes">${escapeHtml(med.notes)}</p>` : ''}
          <p class="med-card__snooze-timer" id="snooze-timer-${med.id}">
            ⏰ Snoozed — calculating...
          </p>
        </div>
        <div class="med-card__actions">
          <button class="btn btn--primary btn--full"
                  aria-label="Mark ${escapeHtml(med.name)} as taken"
                  onclick="TodayScreen.handleMarkTaken('${med.id}')">
            ✓ I Took It
          </button>
          <button class="btn btn--secondary btn--full btn--small"
                  aria-label="Snooze ${escapeHtml(med.name)} for 10 more minutes"
                  onclick="TodayScreen.handleSnooze('${med.id}')">
            ⏰ Remind Me Later
          </button>
        </div>
      `;
    } else {
      // Pending
      card.setAttribute('aria-label', `${med.name} - ${med.dosage} at ${displayTime}, pending`);
      card.innerHTML = `
        <div class="med-card__icon" aria-hidden="true">💊</div>
        <div class="med-card__info">
          <h3 class="med-card__name">${escapeHtml(med.name)}</h3>
          <p class="med-card__detail">${escapeHtml(med.dosage)} · ${displayTime}</p>
          ${med.notes ? `<p class="med-card__notes">${escapeHtml(med.notes)}</p>` : ''}
        </div>
        <div class="med-card__actions">
          <button class="btn btn--primary btn--full"
                  aria-label="Mark ${escapeHtml(med.name)} as taken"
                  onclick="TodayScreen.handleMarkTaken('${med.id}')">
            ✓ I Took It
          </button>
          <button class="btn btn--secondary btn--full btn--small"
                  aria-label="Snooze ${escapeHtml(med.name)} for 10 minutes"
                  onclick="TodayScreen.handleSnooze('${med.id}')">
            ⏰ Remind Me Later
          </button>
        </div>
      `;
    }

    return card;
  }

  // ─── Action Handlers ────────────────────────────────────────────

  /**
   * Handles marking a medication dose as taken.
   * Triggers celebration animation, announces to screen reader,
   * and re-renders after a short delay.
   *
   * @param {string} medId - The medication id to mark as taken.
   */
  function handleMarkTaken(medId) {
    const dose = Store.markDoseTaken(medId);
    if (!dose) return;

    const meds = Store.getMedications();
    const med = meds.find(function (m) { return m.id === medId; });
    const medName = med ? med.name : 'Medication';

    // Celebrate on the card
    const cardEl = document.getElementById('med-card-' + medId);
    if (cardEl) {
      Animations.celebrateDose(cardEl);
    }

    // Screen reader announcement
    Accessibility.announceToScreenReader(medName + ' marked as taken');

    // Re-render after celebration
    const tid = setTimeout(function () {
      if (currentContainer) {
        render(currentContainer);
      }
    }, 800);
    activeTimeouts.push(tid);
  }

  /**
   * Handles snoozing a medication dose for 10 minutes.
   * Announces to screen reader, re-renders, and starts snooze timers.
   *
   * @param {string} medId - The medication id to snooze.
   */
  function handleSnooze(medId) {
    Store.snoozeDose(medId, 10);

    const meds = Store.getMedications();
    const med = meds.find(function (m) { return m.id === medId; });
    const medName = med ? med.name : 'Medication';

    Accessibility.announceToScreenReader(medName + ' snoozed for 10 minutes');

    if (currentContainer) {
      render(currentContainer);
    }
  }

  // ─── Snooze Timers ──────────────────────────────────────────────

  /**
   * Starts countdown timers for any snoozed doses. Updates the display
   * every second and fires a notification when the snooze expires.
   */
  function startSnoozeTimers() {
    const doses = Store.getTodayDoses();
    const meds = Store.getMedications();

    doses.forEach(function (dose) {
      if (dose.status !== 'snoozed' || !dose.snoozeUntil) return;

      const med = meds.find(function (m) { return m.id === dose.medId; });
      if (!med) return;

      const snoozeEnd = new Date(dose.snoozeUntil).getTime();

      const intervalId = setInterval(function () {
        const remaining = snoozeEnd - Date.now();
        const timerEl = document.getElementById('snooze-timer-' + med.id);

        if (remaining <= 0) {
          clearInterval(intervalId);

          // Snooze expired
          Store.clearSnooze(med.id);

          if (window.Notifications) {
            Notifications.showInAppNotification(med.name, med.id);
          }

          if (currentContainer) {
            render(currentContainer);
          }
          return;
        }

        // Update countdown display
        if (timerEl) {
          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          timerEl.textContent = '⏰ Snoozed — ' + mins + ':' + String(secs).padStart(2, '0') + ' remaining';
        }
      }, 1000);

      activeIntervals.push(intervalId);
    });
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  /**
   * Clears all active timers and intervals managed by this module.
   */
  function destroy() {
    activeIntervals.forEach(function (id) {
      clearInterval(id);
    });
    activeTimeouts.forEach(function (id) {
      clearTimeout(id);
    });
    activeIntervals = [];
    activeTimeouts = [];
  }

  // ─── Utilities ──────────────────────────────────────────────────

  /**
   * Escapes HTML to prevent XSS.
   * @param {string} str - Raw string.
   * @returns {string} Safe HTML string.
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.TodayScreen = {
    render,
    getMascotSVG,
    handleMarkTaken,
    handleSnooze,
    startSnoozeTimers,
    destroy,
  };
})();
