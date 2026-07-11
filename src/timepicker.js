'use strict';

// A themed 24-hour analog clock time picker: tap the hour (inner ring 00–11,
// outer ring 12–23), then the minute. Value is 'HH:MM' (or ''). No AM/PM.
(function () {
  const pad = (n) => String(n).padStart(2, '0');
  const CX = 100;
  const CY = 100;
  const R_OUT = 82; // hours 12–23 and the minute ring
  const R_IN = 52;  // hours 00–11
  const pos = (deg, r) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
  };

  // opts: { onChange(value), align: 'right'? }
  function createTimePicker(root, opts) {
    let hour = null; // 0-23
    let minute = null; // 0-59
    let mode = 'hour';

    root.classList.add('timefield');
    if (opts.align === 'right') root.classList.add('tf-right');
    root.innerHTML = `
      <button type="button" class="tf-btn">
        <span class="tf-val tf-empty">--:--</span>
        <svg class="tf-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>
      </button>
      <div class="tf-pop hidden">
        <div class="tf-head">
          <button type="button" class="tf-seg tf-hour on">--</button>
          <span class="tf-colon">:</span>
          <button type="button" class="tf-seg tf-min">--</button>
        </div>
        <svg class="tf-clock" viewBox="0 0 200 200"></svg>
        <div class="tf-foot"><button type="button" class="tf-clear">Clear</button><button type="button" class="tf-done">Done</button></div>
      </div>`;

    const valEl = root.querySelector('.tf-val');
    const pop = root.querySelector('.tf-pop');
    const hourSeg = root.querySelector('.tf-hour');
    const minSeg = root.querySelector('.tf-min');
    const clock = root.querySelector('.tf-clock');
    const isOpen = () => !pop.classList.contains('hidden');
    const getValue = () => (hour === null || minute === null ? '' : `${pad(hour)}:${pad(minute)}`);

    function hand(deg, r) {
      const [hx, hy] = pos(deg, r);
      return `<line class="tf-hand" x1="100" y1="100" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}"/>`
        + `<circle class="tf-seldot" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="14"/>`
        + '<circle class="tf-center" cx="100" cy="100" r="3.5"/>';
    }
    function renderClock() {
      let svg = '<circle class="tf-face" cx="100" cy="100" r="97"/>';
      if (mode === 'hour') {
        if (hour !== null) svg += hand((hour % 12) * 30, hour < 12 ? R_IN : R_OUT);
        for (let h = 0; h < 24; h++) {
          const [x, y] = pos((h % 12) * 30, h < 12 ? R_IN : R_OUT);
          svg += `<text class="tf-num${h < 12 ? ' tf-inner' : ''}${h === hour ? ' on' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${pad(h)}</text>`;
        }
      } else {
        if (minute !== null) svg += hand(minute * 6, R_OUT);
        for (let m = 0; m < 60; m += 5) {
          const [x, y] = pos(m * 6, R_OUT);
          svg += `<text class="tf-num${m === minute ? ' on' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${pad(m)}</text>`;
        }
      }
      clock.innerHTML = svg;
    }
    function render() {
      valEl.textContent = getValue() || '--:--';
      valEl.classList.toggle('tf-empty', !getValue());
      hourSeg.textContent = hour === null ? '--' : pad(hour);
      minSeg.textContent = minute === null ? '--' : pad(minute);
      hourSeg.classList.toggle('on', mode === 'hour');
      minSeg.classList.toggle('on', mode === 'minute');
      renderClock();
    }
    function commit() { render(); if (opts.onChange) opts.onChange(getValue()); }

    function setValue(v) {
      if (v) { const [h, m] = v.split(':').map(Number); hour = h; minute = m; }
      else { hour = null; minute = null; }
      mode = 'hour';
      render();
    }

    function open() { mode = 'hour'; render(); pop.classList.remove('hidden'); root.classList.add('tf-open'); }
    function close() { pop.classList.add('hidden'); root.classList.remove('tf-open'); }

    root.querySelector('.tf-btn').addEventListener('click', (e) => { e.stopPropagation(); if (isOpen()) close(); else open(); });
    hourSeg.addEventListener('click', () => { mode = 'hour'; render(); });
    minSeg.addEventListener('click', () => { mode = 'minute'; render(); });
    clock.addEventListener('click', (e) => {
      const rect = clock.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 200 - CX;
      const y = (e.clientY - rect.top) / rect.height * 200 - CY;
      let ang = Math.atan2(x, -y) * 180 / Math.PI;
      if (ang < 0) ang += 360;
      if (mode === 'hour') {
        const p = Math.round(ang / 30) % 12;
        const inner = Math.sqrt(x * x + y * y) < (R_IN + R_OUT) / 2;
        hour = inner ? p : p + 12;
        if (minute === null) minute = 0;
        mode = 'minute';
        commit();
      } else {
        minute = Math.round(ang / 6) % 60;
        commit();
      }
    });
    root.querySelector('.tf-clear').addEventListener('click', () => { setValue(''); if (opts.onChange) opts.onChange(''); close(); });
    root.querySelector('.tf-done').addEventListener('click', close);
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('mousedown', (e) => { if (isOpen() && !root.contains(e.target)) close(); });

    render();
    return { getValue, setValue };
  }

  window.createTimePicker = createTimePicker;
})();
