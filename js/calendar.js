/**
 * @file calendar.js
 * @description History calendar screen for Kawaii Care. Renders a monthly
 * calendar grid showing dose completion status with color-coded day cells,
 * navigation between months, and a status legend.
 */

(function () {
  'use strict';

  /** Currently displayed year and month (0-indexed). */
  let currentYear = 0;
  let currentMonth = 0;

  /** Month names for display. */
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /** Weekday abbreviations. */
  const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // ─── Main Render ────────────────────────────────────────────────

  /**
   * Renders the full History / Calendar screen.
   * Initializes currentYear/currentMonth to the current date and
   * builds the calendar container.
   *
   * @param {HTMLElement} container - The DOM element to render into.
   */
  function render(container) {
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    // Section title
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'History 📅';
    container.appendChild(title);

    // Calendar container
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';
    container.appendChild(calendarContainer);

    renderCalendar(calendarContainer);
  }

  /**
   * Renders the calendar inside the given container, including
   * the month header, weekday labels, day grid, and legend.
   *
   * @param {HTMLElement} parentContainer - The .calendar-container element.
   */
  function renderCalendar(parentContainer) {
    if (!parentContainer) return;
    parentContainer.innerHTML = '';

    // ── Month header with navigation ──
    const header = document.createElement('div');
    header.className = 'calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn--icon calendar-header__nav';
    prevBtn.innerHTML = '‹';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.addEventListener('click', function () {
      navigateMonth(-1);
      renderCalendar(parentContainer);
    });

    const monthLabel = document.createElement('h3');
    monthLabel.className = 'calendar-header__title';
    monthLabel.textContent = MONTH_NAMES[currentMonth] + ' ' + currentYear;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn--icon calendar-header__nav';
    nextBtn.innerHTML = '›';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.addEventListener('click', function () {
      navigateMonth(1);
      renderCalendar(parentContainer);
    });

    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    parentContainer.appendChild(header);

    // ── Weekday labels ──
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-weekdays';
    WEEKDAY_LABELS.forEach(function (label) {
      const dayLabel = document.createElement('div');
      dayLabel.className = 'calendar-weekday';
      dayLabel.textContent = label;
      dayLabel.setAttribute('aria-hidden', 'true');
      weekdayRow.appendChild(dayLabel);
    });
    parentContainer.appendChild(weekdayRow);

    // ── Day grid ──
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', MONTH_NAMES[currentMonth] + ' ' + currentYear + ' dose history');
    grid.innerHTML = renderMonth();
    parentContainer.appendChild(grid);

    // ── Legend ──
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    legend.innerHTML = `
      <div class="calendar-legend__item">
        <span class="calendar-legend__dot calendar-legend__dot--taken"></span>
        <span>Taken 🎀</span>
      </div>
      <div class="calendar-legend__item">
        <span class="calendar-legend__dot calendar-legend__dot--late"></span>
        <span>Late 🕐</span>
      </div>
      <div class="calendar-legend__item">
        <span class="calendar-legend__dot calendar-legend__dot--missed"></span>
        <span>Missed</span>
      </div>
    `;
    parentContainer.appendChild(legend);
  }

  // ─── Month Grid Builder ─────────────────────────────────────────

  /**
   * Builds and returns the HTML string for the calendar day cells.
   * Each day cell reflects the aggregated dose status for that date.
   *
   * @returns {string} HTML string of calendar day cells.
   */
  function renderMonth() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const history = Store.getHistory(currentYear, currentMonth);

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    let html = '';

    // Empty cells for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = currentYear + '-' + monthStr + '-' + dayStr;

      const isToday = currentYear === todayYear && currentMonth === todayMonth && day === todayDate;
      const isFuture =
        currentYear > todayYear ||
        (currentYear === todayYear && currentMonth > todayMonth) ||
        (currentYear === todayYear && currentMonth === todayMonth && day > todayDate);

      let statusClass = '';
      let icon = '';
      let ariaLabel = day + '';

      if (history[dateKey] && Array.isArray(history[dateKey]) && history[dateKey].length > 0) {
        const doses = history[dateKey];
        const allTaken = doses.every(function (d) {
          return d.status === 'taken';
        });
        const anyLate = doses.some(function (d) {
          return d.status === 'late';
        });
        const allComplete = doses.every(function (d) {
          return d.status === 'taken' || d.status === 'late';
        });

        if (allTaken && allComplete) {
          statusClass = 'calendar-day--taken';
          icon = '🎀';
          ariaLabel = day + ', all doses taken';
        } else if (anyLate && allComplete) {
          statusClass = 'calendar-day--late';
          icon = '🕐';
          ariaLabel = day + ', taken late';
        } else if (!isFuture && !isToday) {
          statusClass = 'calendar-day--missed';
          icon = '●';
          ariaLabel = day + ', doses missed';
        }
      } else if (!isFuture && !isToday) {
        // Past day with no data → missed
        statusClass = 'calendar-day--missed';
        icon = '<span class="calendar-day__missed-dot">●</span>';
        ariaLabel = day + ', no data';
      }

      const todayClass = isToday ? ' calendar-day--today' : '';

      html += '<div class="calendar-day' + todayClass + (statusClass ? ' ' + statusClass : '') + '" role="gridcell" aria-label="' + ariaLabel + '">';
      html += '<span class="calendar-day__number">' + day + '</span>';
      if (icon && !isFuture) {
        html += '<span class="calendar-day__icon" aria-hidden="true">' + icon + '</span>';
      }
      html += '</div>';
    }

    return html;
  }

  // ─── Navigation ─────────────────────────────────────────────────

  /**
   * Navigates forward or backward by the given number of months.
   * Handles year rollover automatically.
   *
   * @param {number} delta - Number of months to shift (+1 for next, -1 for previous).
   */
  function navigateMonth(delta) {
    currentMonth += delta;

    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    } else if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
  }

  /**
   * Cleanup function. Currently a no-op but available for future use.
   */
  function destroy() {
    // No active listeners to clean up in the current implementation
  }

  // ─── Public API ──────────────────────────────────────────────────

  window.CalendarScreen = {
    render,
    renderCalendar,
    renderMonth,
    navigateMonth,
    destroy,
  };
})();
