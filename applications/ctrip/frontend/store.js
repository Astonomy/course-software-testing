export const state = {
  user: null,
  business_date: '2026-07-19',
  business_clock: '2026-07-19T08:00:00+08:00'
};

export async function api(action, data = {}) {
  const response = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  });
  let result;
  try { result = await response.json(); } catch (e) { result = {}; }
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export async function loadSession() {
  try {
    const data = await api('bootstrap');
    state.user = data.user;
    state.business_date = data.business_date || state.business_date;
    state.business_clock = data.business_clock || state.business_clock;
  } catch (e) {
    state.user = null;
  }
  return state.user;
}

export function setUser(user) {
  state.user = user;
  window.dispatchEvent(new CustomEvent('ct:nav'));
}

export function go(path) {
  const next = '#' + path;
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = next;
  }
}

export function flash(message) {
  try { sessionStorage.setItem('ct_flash', message); } catch (e) { /* ignore */ }
}

export function takeFlash() {
  try {
    const value = sessionStorage.getItem('ct_flash');
    sessionStorage.removeItem('ct_flash');
    return value;
  } catch (e) { return null; }
}

export function parseCity(value) {
  return String(value || '').replace(/\s*\([A-Za-z]{2,5}\)\s*$/, '').trim();
}
