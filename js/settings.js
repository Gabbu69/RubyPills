/**
 * @file settings.js
 * @description Settings screen for Kawaii Care. Provides medication management
 * (add, edit, delete), accessibility toggles (reduced motion, reduced decorations),
 * notification preferences, and an about section. Includes modal forms with
 * focus trapping for medication editing.
 */

(function () {
  'use strict';

  /** Currently active focus trap release function. */
  let focusTrapRelease = null;

  /** Reference to the currently rendered container for re-renders. */
  let currentContainer = null;

  // ─── Main Render ────────────────────────────────────────────────

  /**
   * Renders the full Settings screen into the given container.
   * Includes medication list, accessibility toggles, notification settings,
   * and an about section.
   *
   * @param {HTMLElement} container - The DOM element to render into.
   */
  function render(container) {
    if (!container) return;
    currentContainer = container;
    container.innerHTML = '';

    const settings = Store.getSettings();
    const meds = Store.getMedications();

    // ── Section Title ──
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Settings ⚙️';
    container.appendChild(title);

    // ── Medications Group ──
    const medGroup = createSettingsGroup('💊 My Medications');

    const medList = document.createElement('div');
    medList.className = 'med-list';

    meds.forEach(function (med) {
      const parsed = Store.parseTime(med.time);
      const timeDate = new Date();
      timeDate.setHours(parsed.hours, parsed.minutes, 0, 0);
      const displayTime = Store.formatTime(timeDate);

      const item = document.createElement('div');
      item.className = 'med-list-item';
      item.innerHTML = `
        <div class="med-list-item__info">
          <span class="med-list-item__name">${escapeHtml(med.name)}</span>
          <span class="med-list-item__detail">${escapeHtml(med.dosage)} · ${displayTime}</span>
        </div>
        <div class="med-list-item__actions">
          <button class="btn btn--icon med-list-item__edit"
                  aria-label="Edit ${escapeHtml(med.name)}"
                  data-med-id="${med.id}">
            ✏️
          </button>
          <button class="btn btn--icon med-list-item__delete"
                  aria-label="Delete ${escapeHtml(med.name)}"
                  data-med-id="${med.id}">
            ✕
          </button>
        </div>
      `;

      // Bind edit handler
      const editBtn = item.querySelector('.med-list-item__edit');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          showMedModal(med);
        });
      }

      // Bind delete handler
      const deleteBtn = item.querySelector('.med-list-item__delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          handleDeleteMed(med.id);
        });
      }

      medList.appendChild(item);
    });

    medGroup.appendChild(medList);

    // Add Medication button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn--secondary btn--full';
    addBtn.textContent = '+ Add Medication';
    addBtn.setAttribute('aria-label', 'Add a new medication');
    addBtn.addEventListener('click', function () {
      showMedModal();
    });
    medGroup.appendChild(addBtn);

    container.appendChild(medGroup);

    // ── Accessibility Group ──
    const a11yGroup = createSettingsGroup('♿ Accessibility');

    a11yGroup.appendChild(
      createToggle(
        'Reduce Motion',
        'Disables animations and transitions',
        settings.reducedMotion,
        function (checked) {
          handleToggle('reducedMotion', checked);
        }
      )
    );

    a11yGroup.appendChild(
      createToggle(
        'Reduced Decorations',
        'Hides decorative elements',
        settings.reducedDecorations,
        function (checked) {
          handleToggle('reducedDecorations', checked);
        }
      )
    );

    container.appendChild(a11yGroup);

    // ── Notifications Group ──
    const notifGroup = createSettingsGroup('🔔 Notifications');

    notifGroup.appendChild(
      createToggle(
        'Enable Notifications',
        "Get reminders when it\u2019s time for medication",
        settings.notificationsEnabled,
        function (checked) {
          handleToggle('notificationsEnabled', checked);
        }
      )
    );

    // Permission note
    if (window.Notifications) {
      const permState = Notifications.getPermissionState();
      if (permState === 'unsupported') {
        const note = document.createElement('p');
        note.className = 'settings-note settings-note--warning';
        note.textContent = '⚠️ Your browser does not support notifications.';
        notifGroup.appendChild(note);
      } else if (permState === 'denied') {
        const note = document.createElement('p');
        note.className = 'settings-note settings-note--warning';
        note.textContent = '⚠️ Notifications are blocked. Please enable them in your browser settings.';
        notifGroup.appendChild(note);
      }
    }

    container.appendChild(notifGroup);

    // ── About Section ──
    const aboutSection = document.createElement('div');
    aboutSection.className = 'about-section';
    aboutSection.innerHTML = `
      <div class="about-section__mascot">${TodayScreen.getMascotSVG(48)}</div>
      <p class="about-section__name">RubyPills 🎀</p>
      <p class="about-section__version">Version 1.0</p>
      <p class="about-section__tagline">Your cute Hello Kitty medication reminder 💗</p>
    `;
    container.appendChild(aboutSection);
  }

  // ─── UI Component Builders ──────────────────────────────────────

  /**
   * Creates a settings group container with a title.
   * @param {string} titleText - The group title.
   * @returns {HTMLElement} The settings group div.
   */
  function createSettingsGroup(titleText) {
    const group = document.createElement('div');
    group.className = 'settings-group';

    const heading = document.createElement('h3');
    heading.className = 'settings-group__title';
    heading.textContent = titleText;
    group.appendChild(heading);

    return group;
  }

  /**
   * Creates a toggle switch row with label, description, and a checkbox.
   *
   * @param {string} labelText - The toggle label.
   * @param {string} description - Description text below the label.
   * @param {boolean} checked - Whether the toggle is initially checked.
   * @param {Function} onChange - Callback receiving the new checked state.
   * @returns {HTMLElement} The toggle row element.
   */
  function createToggle(labelText, description, checked, onChange) {
    const row = document.createElement('div');
    row.className = 'toggle-row';

    const textDiv = document.createElement('div');
    textDiv.className = 'toggle-row__text';

    const label = document.createElement('span');
    label.className = 'toggle-row__label';
    label.textContent = labelText;

    const desc = document.createElement('span');
    desc.className = 'toggle-row__description';
    desc.textContent = description;

    textDiv.appendChild(label);
    textDiv.appendChild(desc);

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';
    toggleLabel.setAttribute('aria-label', labelText);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.addEventListener('change', function () {
      if (typeof onChange === 'function') {
        onChange(input.checked);
      }
    });

    const slider = document.createElement('span');
    slider.className = 'toggle-switch__slider';

    toggleLabel.appendChild(input);
    toggleLabel.appendChild(slider);

    row.appendChild(textDiv);
    row.appendChild(toggleLabel);

    return row;
  }

  // ─── Medication Modal ───────────────────────────────────────────

  /**
   * Shows a modal dialog for adding or editing a medication.
   * If existingMed is provided, pre-fills the form for editing.
   *
   * @param {{id: string, name: string, dosage: string, time: string, notes: string}} [existingMed]
   */
  function showMedModal(existingMed) {
    const isEdit = !!existingMed;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'med-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', isEdit ? 'Edit Medication' : 'Add Medication');

    modal.innerHTML = `
      <h3 class="modal__title">${isEdit ? 'Edit Medication' : 'Add Medication'}</h3>
      <form class="modal__form" id="med-modal-form">
        <div class="form-field">
          <label class="form-field__label" for="med-name">Name</label>
          <input class="form-field__input" type="text" id="med-name"
                 value="${isEdit ? escapeAttr(existingMed.name) : ''}"
                 placeholder="e.g., Ibuprofen" required>
        </div>
        <div class="form-field">
          <label class="form-field__label" for="med-dosage">Dosage</label>
          <input class="form-field__input" type="text" id="med-dosage"
                 value="${isEdit ? escapeAttr(existingMed.dosage) : ''}"
                 placeholder="e.g., 200mg">
        </div>
        <div class="form-field">
          <label class="form-field__label" for="med-time">Time</label>
          <input class="form-field__input" type="time" id="med-time"
                 value="${isEdit ? existingMed.time : '08:00'}">
        </div>
        <div class="form-field">
          <label class="form-field__label" for="med-notes">Notes</label>
          <input class="form-field__input" type="text" id="med-notes"
                 value="${isEdit ? escapeAttr(existingMed.notes) : ''}"
                 placeholder="e.g., Take with food">
        </div>
        <div class="modal__actions">
          <button type="submit" class="btn btn--primary">Save</button>
          <button type="button" class="btn btn--secondary modal__cancel">Cancel</button>
        </div>
      </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Trap focus inside modal
    focusTrapRelease = Accessibility.trapFocus(modal);

    // ── Event bindings ──
    const form = modal.querySelector('#med-modal-form');
    const cancelBtn = modal.querySelector('.modal__cancel');

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = {
          name: (document.getElementById('med-name').value || '').trim(),
          dosage: (document.getElementById('med-dosage').value || '').trim(),
          time: document.getElementById('med-time').value || '08:00',
          notes: (document.getElementById('med-notes').value || '').trim(),
        };
        handleSaveMed(formData, isEdit ? existingMed.id : null);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        closeModal();
      });
    }

    // Close on overlay click (but not modal click)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  /**
   * Handles saving a medication from the modal form.
   * Validates that the name field is not empty.
   *
   * @param {{name: string, dosage: string, time: string, notes: string}} formData
   * @param {string|null} existingId - If editing, the medication id; null for new.
   */
  function handleSaveMed(formData, existingId) {
    if (!formData.name) {
      const nameInput = document.getElementById('med-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.classList.add('form-field__input--error');
      }
      return;
    }

    if (existingId) {
      Store.updateMedication(existingId, formData);
    } else {
      Store.addMedication(formData);
    }

    // Regenerate today's doses to pick up changes
    Store.generateTodayDoses();

    closeModal();

    // Re-render settings
    if (currentContainer) {
      render(currentContainer);
    }
  }

  /**
   * Handles deleting a medication after confirmation.
   * @param {string} id - The medication id to delete.
   */
  function handleDeleteMed(id) {
    const meds = Store.getMedications();
    const med = meds.find(function (m) { return m.id === id; });
    const name = med ? med.name : 'this medication';

    if (confirm('Are you sure you want to delete ' + name + '?')) {
      Store.deleteMedication(id);

      if (currentContainer) {
        render(currentContainer);
      }
    }
  }

  // ─── Toggle Handlers ───────────────────────────────────────────

  /**
   * Handles a toggle switch change for any setting key.
   *
   * @param {string} settingKey - One of 'reducedMotion', 'reducedDecorations', 'notificationsEnabled'.
   * @param {boolean} value - The new toggle state.
   */
  function handleToggle(settingKey, value) {
    switch (settingKey) {
      case 'reducedMotion':
        Accessibility.setReducedMotion(value);
        break;

      case 'reducedDecorations':
        Accessibility.setReducedDecorations(value);
        break;

      case 'notificationsEnabled':
        if (value) {
          // Request permission first, then save
          if (window.Notifications && Notifications.isSupported()) {
            Notifications.requestPermission().then(function (permission) {
              if (permission === 'granted') {
                Store.saveSettings({ notificationsEnabled: true });
                Notifications.init();
              } else {
                Store.saveSettings({ notificationsEnabled: false });
                // Uncheck the toggle since permission was denied
                if (currentContainer) {
                  render(currentContainer);
                }
              }
            });
          } else {
            Store.saveSettings({ notificationsEnabled: false });
          }
        } else {
          Store.saveSettings({ notificationsEnabled: false });
          if (window.Notifications) {
            Notifications.clearScheduled();
          }
        }
        break;

      default:
        Store.saveSettings({ [settingKey]: value });
    }
  }

  // ─── Modal Cleanup ─────────────────────────────────────────────

  /**
   * Closes and removes the medication modal, releasing the focus trap.
   */
  function closeModal() {
    if (focusTrapRelease) {
      focusTrapRelease.release();
      focusTrapRelease = null;
    }

    const overlay = document.getElementById('med-modal-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  /**
   * Full cleanup — closes modal and resets references.
   */
  function destroy() {
    closeModal();
    currentContainer = null;
  }

  // ─── Utilities ──────────────────────────────────────────────────

  /**
   * Escapes HTML for safe innerHTML insertion.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Escapes a string for use in an HTML attribute value.
   * @param {string} str
   * @returns {string}
   */
  function escapeAttr(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.SettingsScreen = {
    render,
    showMedModal,
    handleSaveMed,
    handleDeleteMed,
    handleToggle,
    closeModal,
    destroy,
  };
})();
