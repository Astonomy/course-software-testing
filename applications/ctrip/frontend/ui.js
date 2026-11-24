export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

export function money(value) {
  return '¥' + String(Number(value || 0));
}

export function mobileMask(mobile) {
  const m = String(mobile || '');
  if (m.length < 7) return m || 'Not bound';
  return m.slice(0, 3) + '****' + m.slice(-4);
}

export function emailMask(email) {
  const e = String(email || '');
  if (!e.includes('@')) return e || 'Not bound';
  const [local, domain] = e.split('@');
  return (local[0] || '') + '***@' + domain;
}

export function idMask(id) {
  const value = String(id || '');
  if (value.length < 10) return value;
  return value.slice(0, 6) + '********' + value.slice(-4);
}

export function isValidId(id) {
  const value = String(id || '').trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(value)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(value[i]) * weights[i];
  return value[17] === codes[sum % 11];
}

export function isValidPhone(phone) {
  return /^1\d{10}$/.test(String(phone || '').trim());
}

export function dateDiffDays(start, end) {
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function topAlert(container, message) {
  if (!container) return;
  container.querySelectorAll('.inline-alert').forEach(node => node.remove());
  if (!message) return;
  const alert = document.createElement('div');
  alert.className = 'inline-alert';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  container.prepend(alert);
  return alert;
}

export function inlineAlert(container, message) {
  if (!container) return;
  let alert = container.querySelector(':scope > .inline-alert');
  if (!message) { if (alert) alert.remove(); return; }
  if (!alert) {
    alert = document.createElement('div');
    alert.className = 'inline-alert';
    alert.setAttribute('role', 'alert');
    container.prepend(alert);
  }
  alert.textContent = message;
  return alert;
}

export function clearAlert(container) {
  if (container) container.querySelectorAll('.inline-alert').forEach(n => n.remove());
}

export function openDialog({ name, title, body, footer = '', className = '', onClose = null }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${className}" role="dialog" aria-modal="true" aria-label="${esc(name || title)}">
      <div class="modal-head">
        <h2>${esc(title || name)}</h2>
        <button type="button" class="icon-button" aria-label="Close dialog">×</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(backdrop);
  const previous = document.activeElement;
  const close = () => {
    if (!backdrop.isConnected) return;
    backdrop.remove();
    if (previous && typeof previous.focus === 'function') previous.focus();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };
  const onKey = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.querySelector('.icon-button').addEventListener('click', close);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  const focusable = backdrop.querySelector('input, select, textarea, button:not(.icon-button)');
  if (focusable) setTimeout(() => focusable.focus(), 0);
  return {
    root: backdrop,
    body: backdrop.querySelector('.modal-body'),
    footer: backdrop.querySelector('.modal-footer'),
    close
  };
}

export function field(label, controlHtml, options = {}) {
  let id = options.id || '';
  if (!id) {
    const match = controlHtml.match(/id="([^"]+)"/);
    id = match ? match[1] : ('f' + Math.random().toString(36).slice(2, 9));
  }
  const html = controlHtml.replace('{{id}}', id);
  return `<div class="field ${options.className || ''}">
    <label for="${id}">${esc(label)}</label>
    ${html}
  </div>`;
}

export function passwordStrength(password) {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
  if (value.length >= 10) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (!value) return { label: 'Enter a new password', score: 0 };
  if (score >= 3) return { label: 'Strong', score: 3 };
  if (score === 2) return { label: 'Medium', score: 2 };
  return { label: 'Weak', score: 1 };
}

export function recordName(prefix, value) {
  return `${prefix}${value}`;
}

export function emptyState(message) {
  return `<p class="empty-state">${esc(message)}</p>`;
}

export function heading(text, sub = '') {
  return `<div class="page-heading"><h1>${esc(text)}</h1>${sub ? `<p class="page-subtitle">${esc(sub)}</p>` : ''}</div>`;
}

export function calendarPopover({ anchor, selected, minDate, maxDate, fares = {}, onSelect, label = 'Choose date' }) {
  document.querySelectorAll('.calendar-popover').forEach(n => n.remove());
  const existingBar = document.querySelector('#date-bar');
  if (existingBar) existingBar.hidden = false;
  const months = [];
  const startMonth = new Date('2026-07-01T00:00:00');
  for (let i = 0; i < 2; i++) {
    const date = new Date(startMonth);
    date.setMonth(startMonth.getMonth() + i);
    months.push(date);
  }
  const monthHtml = months.map((month, index) => {
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const blanks = Array.from({ length: first.getDay() }, () => '<span class="cal-blank"></span>').join('');
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const iso = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const disabled = (minDate && iso < minDate) || (maxDate && iso > maxDate);
      const fare = fares[iso];
      const isSelected = selected === iso;
      return `<button type="button" class="cal-day ${isSelected ? 'selected' : ''}" data-date="${iso}" aria-label="${iso}" ${disabled ? 'disabled' : ''}>
        <span>${day}</span>${fare !== undefined ? `<small aria-hidden="true">${money(fare)}</small>` : ''}
      </button>`;
    }).join('');
    return `<div class="cal-month ${index === 1 ? 'cal-month-secondary' : ''}">
      <div class="cal-month-title">${year}-${String(mon + 1).padStart(2, '0')}</div>
      <div class="cal-week"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
      <div class="cal-grid">${blanks}${days}</div>
      ${index === 0 ? `<div class="cal-note">Fares shown are the lowest available for the day.</div>` : ''}
    </div>`;
  }).join('');
  const pop = document.createElement('div');
  pop.className = 'calendar-popover';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', label);
  pop.innerHTML = `<div class="cal-head"><strong>${esc(label)}</strong><button type="button" class="icon-button" aria-label="Close date picker">×</button></div>${monthHtml}`;
  document.body.appendChild(pop);
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(640, window.innerWidth - 32);
  pop.style.width = width + 'px';
  pop.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) + 'px';
  pop.style.top = (rect.bottom + window.scrollY + 8) + 'px';
  const dateBar = document.querySelector('#date-bar');
  if (dateBar) dateBar.hidden = true;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    pop.remove();
    if (dateBar) dateBar.hidden = false;
  };
  pop.querySelector('.icon-button').addEventListener('click', close);
  pop.querySelectorAll('.cal-day:not([disabled])').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.date;
      close();
      onSelect(value);
    });
  });
  setTimeout(() => {
    document.addEventListener('mousedown', function outside(event) {
      if (!pop.contains(event.target) && event.target !== anchor) {
        close();
        document.removeEventListener('mousedown', outside);
      }
    });
  }, 0);
  return { close };
}
