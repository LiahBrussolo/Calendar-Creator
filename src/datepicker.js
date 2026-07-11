'use strict';

// A small, self-contained date picker. Two views: a day grid and a month grid
// (tap the title to switch), so you can jump months/years in a couple of clicks.
// The header is rebuilt on every render, so it can never drift from the grid.
// Sunday-first, English UI labels.
(function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();

  // opts: { onChange(value), getMin(): iso|null, getMax(): iso|null, defaultMonth(): {y,m}|null }
  function createDatePicker(root, opts) {
    let value = '';
    let viewY;
    let viewM;
    let mode = 'days';

    root.classList.add('datefield');
    root.innerHTML = `
      <button type="button" class="df-btn">
        <span class="df-val df-empty">Select date</span>
        <svg class="df-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/></svg>
      </button>
      <div class="df-pop hidden">
        <div class="df-head">
          <button type="button" class="df-nav df-prev" aria-label="Previous"><svg viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18"/></svg></button>
          <button type="button" class="df-title"><span class="df-title-lbl"></span><svg class="df-caret" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
          <button type="button" class="df-nav df-next" aria-label="Next"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></button>
        </div>
        <div class="df-dow">${DOW.map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="df-body"></div>
        <div class="df-foot"><button type="button" class="df-today">Today</button></div>
      </div>`;

    const valEl = root.querySelector('.df-val');
    const pop = root.querySelector('.df-pop');
    const lbl = root.querySelector('.df-title-lbl');
    const body = root.querySelector('.df-body');
    const isOpen = () => !pop.classList.contains('hidden');
    const min = () => (opts.getMin && opts.getMin()) || null;
    const max = () => (opts.getMax && opts.getMax()) || null;

    function renderValue() {
      valEl.textContent = value || 'Select date';
      valEl.classList.toggle('df-empty', !value);
    }

    function renderDays() {
      mode = 'days';
      pop.classList.remove('df-monthview');
      lbl.textContent = `${MONTHS[viewM]} ${viewY}`;
      const lo = min();
      const hi = max();
      const firstDow = new Date(viewY, viewM, 1).getDay();
      let html = '';
      for (let i = 0; i < firstDow; i++) html += '<span class="df-pad"></span>';
      for (let d = 1; d <= lastDay(viewY, viewM); d++) {
        const iso = toISO(viewY, viewM, d);
        const dis = (lo && iso < lo) || (hi && iso > hi);
        html += `<button type="button" class="df-day${iso === value ? ' df-sel' : ''}" data-iso="${iso}"${dis ? ' disabled' : ''}>${d}</button>`;
      }
      body.innerHTML = html;
    }

    function renderMonths() {
      mode = 'months';
      pop.classList.add('df-monthview');
      lbl.textContent = `${viewY}`;
      const lo = min();
      const hi = max();
      const selM = value && Number(value.slice(0, 4)) === viewY ? Number(value.slice(5, 7)) - 1 : -1;
      let html = '';
      for (let m = 0; m < 12; m++) {
        const dis = (hi && toISO(viewY, m, 1) > hi) || (lo && toISO(viewY, m, lastDay(viewY, m)) < lo);
        html += `<button type="button" class="df-month${m === selM ? ' df-sel' : ''}" data-m="${m}"${dis ? ' disabled' : ''}>${MON_ABBR[m]}</button>`;
      }
      body.innerHTML = html;
    }

    function renderYears() {
      mode = 'years';
      pop.classList.add('df-monthview');
      const start = Math.floor(viewY / 12) * 12;
      lbl.textContent = `${start}–${start + 11}`;
      const lo = min();
      const hi = max();
      const loY = lo ? Number(lo.slice(0, 4)) : null;
      const hiY = hi ? Number(hi.slice(0, 4)) : null;
      let html = '';
      for (let y = start; y < start + 12; y++) {
        const dis = (loY !== null && y < loY) || (hiY !== null && y > hiY);
        html += `<button type="button" class="df-year${y === viewY ? ' df-sel' : ''}" data-y="${y}"${dis ? ' disabled' : ''}>${y}</button>`;
      }
      body.innerHTML = html;
    }

    function setView(y, m) { viewY = y; viewM = m; renderDays(); }
    function shiftMonth(delta) {
      let m = viewM + delta;
      let y = viewY;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      setView(y, m);
    }
    function setValue(v) { value = v || ''; renderValue(); if (opts.onChange) opts.onChange(value); }

    function open() {
      let init = null;
      if (value) { const [y, m] = value.split('-').map(Number); init = { y, m: m - 1 }; }
      else if (opts.defaultMonth) init = opts.defaultMonth();
      if (!init) { const now = new Date(); init = { y: now.getFullYear(), m: now.getMonth() }; }
      viewY = init.y; viewM = init.m;
      renderDays();
      pop.classList.remove('hidden');
      root.classList.add('df-open');
    }
    function close() { pop.classList.add('hidden'); root.classList.remove('df-open'); }

    root.querySelector('.df-btn').addEventListener('click', (e) => { e.stopPropagation(); if (isOpen()) close(); else open(); });
    root.querySelector('.df-prev').addEventListener('click', () => {
      if (mode === 'years') { viewY -= 12; renderYears(); }
      else if (mode === 'months') { viewY -= 1; renderMonths(); }
      else shiftMonth(-1);
    });
    root.querySelector('.df-next').addEventListener('click', () => {
      if (mode === 'years') { viewY += 12; renderYears(); }
      else if (mode === 'months') { viewY += 1; renderMonths(); }
      else shiftMonth(1);
    });
    root.querySelector('.df-title').addEventListener('click', () => {
      if (mode === 'days') renderMonths();
      else if (mode === 'months') renderYears();
      else renderMonths();
    });
    body.addEventListener('click', (e) => {
      const day = e.target.closest('.df-day');
      if (day && !day.disabled) { setValue(day.dataset.iso); close(); return; }
      const mon = e.target.closest('.df-month');
      if (mon && !mon.disabled) { viewM = Number(mon.dataset.m); renderDays(); return; }
      const yr = e.target.closest('.df-year');
      if (yr && !yr.disabled) { viewY = Number(yr.dataset.y); renderMonths(); }
    });
    root.querySelector('.df-today').addEventListener('click', () => {
      const now = new Date();
      const iso = toISO(now.getFullYear(), now.getMonth(), now.getDate());
      if ((min() && iso < min()) || (max() && iso > max())) setView(now.getFullYear(), now.getMonth());
      else { setValue(iso); close(); }
    });
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('mousedown', (e) => { if (isOpen() && !root.contains(e.target)) close(); });

    renderValue();
    return { getValue: () => value, setValue };
  }

  window.createDatePicker = createDatePicker;
})();
