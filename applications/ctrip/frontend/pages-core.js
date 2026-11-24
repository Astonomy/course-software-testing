import { api, state, setUser, go, flash, takeFlash, parseCity } from './store.js';
import {
  esc, money, topAlert, openDialog, field, passwordStrength,
  calendarPopover, dateDiffDays
} from './ui.js';
import { CALENDAR_FARES, CITY_TABS, BOOKING_CITIES } from './flights.js';

const BUSINESS_MIN_DATE = '2026-07-19';

function searchHistoryEntries() {
  const seeded = [{
    id: 'seed-chengdu-guangzhou', name: 'Chengdu - Guangzhou',
    origin: 'Chengdu', destination: 'Guangzhou', date: '2026-07-21'
  }];
  try {
    const stored = localStorage.getItem('ct_anonymous_search_history');
    if (!stored) {
      localStorage.setItem('ct_anonymous_search_history', JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : seeded;
  } catch (e) {
    return seeded;
  }
}

function saveSearchHistory(entry) {
  const entries = searchHistoryEntries().filter(item => !(
    item.origin === entry.origin && item.destination === entry.destination && item.date === entry.date
  ));
  entries.unshift({ ...entry, id: 'h' + Date.now() });
  try { localStorage.setItem('ct_anonymous_search_history', JSON.stringify(entries.slice(0, 8))); } catch (e) { /* ignore */ }
}

function cityPicker(initialTab, onChoose) {
  const dialog = openDialog({
    name: 'City selection',
    title: 'City selection',
    className: 'wide',
    body: `<div class="city-tabs" role="tablist" aria-label="City selection">
      ${CITY_TABS.map(tab => `<button type="button" class="tab" role="tab" data-city-tab="${tab}" aria-selected="${tab === initialTab}">${tab}</button>`).join('')}
    </div>
    <div id="city-grid" class="city-grid"></div>`
  });
  const renderGrid = (tab) => {
    const cities = Object.entries(BOOKING_CITIES).filter(([, info]) => info.group === tab);
    dialog.body.querySelector('#city-grid').innerHTML = cities.map(([name, info]) =>
      `<button type="button" class="city-choice" data-city="${esc(name)}" aria-label="${esc(name)}">${esc(name)}<small aria-hidden="true">${esc(info.code)}</small></button>`
    ).join('') || '<p class="muted">No cities in this group.</p>';
    dialog.body.querySelectorAll('[data-city]').forEach(button => {
      button.addEventListener('click', () => {
        dialog.close();
        onChoose(button.dataset.city, BOOKING_CITIES[button.dataset.city]?.code || '');
      });
    });
  };
  dialog.body.querySelectorAll('[data-city-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      dialog.body.querySelectorAll('[data-city-tab]').forEach(item => item.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      renderGrid(tab.dataset.cityTab);
    });
  });
  renderGrid(initialTab);
}

function agreementDialog({ onAgree, onDecline }) {
  const dialog = openDialog({
    name: 'Registration agreement and privacy policy',
    title: 'Registration agreement and privacy policy',
    body: `
      <p>Welcome to Ctrip Travel. Before you create an account, please review and accept the registration agreement and privacy policy.</p>
      <h3>Registration agreement</h3>
      <p>You agree to provide accurate account information and to use the travel services in accordance with applicable rules. Your account is personal to you.</p>
      <h3>Privacy policy</h3>
      <p>We use your mobile number to verify your identity and to keep your bookings, traveler information and order history secure. Verification delivery is simulated for this environment.</p>
      <p class="small muted">By choosing Agree and continue, you confirm that you have read and accept both documents.</p>`,
    footer: `<button type="button" class="btn" id="decline-agreement">Decline</button>
      <button type="button" class="btn primary" id="agree-agreement">Agree and continue</button>`
  });
  dialog.footer.querySelector('#decline-agreement').addEventListener('click', () => {
    dialog.close();
    if (onDecline) onDecline();
  });
  dialog.footer.querySelector('#agree-agreement').addEventListener('click', () => {
    dialog.close();
    if (onAgree) onAgree();
  });
  return dialog;
}

// ------------------------------------------------------------------ Home
const quickState = {
  trip: 'one-way',
  origin: 'Chengdu (CTU)',
  destination: 'Guangzhou (CAN)',
  depart: '2026-07-21',
  ret: '',
  cabin: 'Economy',
  children: false
};

export async function renderHome(page) {
  page.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <div class="eyebrow">Ctrip travel services</div>
        <h1>Ctrip Travel</h1>
        <p>Book flights across China and beyond, manage every journey and keep your travel details in one place.</p>
      </div>
    </section>
    <div class="quick-wrap">
      <section class="quick-card" id="quick-card" aria-label="Flight search"></section>
      <section class="search-history" id="home-history" aria-label="Search history"></section>
    </div>
    <div class="container" style="padding-top:0">
      <div class="promo-grid">
        <article class="promo"><div class="promo-icon" aria-hidden="true">🛫</div><h3>Live journey tools</h3><p>Check flight status, ground services and airport guidance before you travel.</p></article>
        <article class="promo"><div class="promo-icon" aria-hidden="true">🧳</div><h3>Reusable traveler details</h3><p>Save travelers, addresses, contacts and invoice titles for faster booking.</p></article>
        <article class="promo"><div class="promo-icon" aria-hidden="true">🎫</div><h3>Book with confidence</h3><p>Clear fares, optional services and a simulated cashier for complete order flows.</p></article>
      </div>
      <div class="info-strip">
        <div class="card"><strong>24/7 itinerary support</strong><span class="muted">Flight changes and order help are always available.</span></div>
        <div class="card"><strong>Transparent pricing</strong><span class="muted">Taxes and optional services are itemised before you pay.</span></div>
        <div class="card"><strong>Airport know-how</strong><span class="muted">Weather snapshots, transport options and service hotlines.</span></div>
      </div>
    </div>`;
  renderQuickForm();
  renderHomeHistory();
}

function renderHomeHistory() {
  const host = document.querySelector('#home-history');
  if (!host) return;
  const entries = searchHistoryEntries();
  host.innerHTML = `<h3>Search history</h3>${entries.length ? entries.map(entry =>
    `<button type="button" class="history-chip" data-history="${esc(entry.id)}">
      ${esc(entry.name)}<span class="small" aria-hidden="true">${esc(entry.date)}</span>
    </button>`).join('') : '<span class="small muted">No recent searches</span>'}`;
  host.querySelectorAll('[data-history]').forEach(button => {
    button.addEventListener('click', () => {
      const entry = searchHistoryEntries().find(item => item.id === button.dataset.history);
      if (!entry) return;
      goFlights(entry.origin, entry.destination, entry.date, 'Economy', false);
    });
  });
}

function goFlights(origin, destination, date, cabin = 'Economy', children = false) {
  const query = new URLSearchParams({
    origin, destination, date, cabin, children: children ? '1' : '0'
  });
  go('/flights?' + query.toString());
}

function renderQuickForm() {
  const host = document.querySelector('#quick-card');
  if (!host) return;
  const roundTrip = quickState.trip === 'round-trip';
  const duration = roundTrip && quickState.depart && quickState.ret
    ? dateDiffDays(quickState.depart, quickState.ret) : null;
  host.innerHTML = `
    <div class="trip-row">
      <div class="radio-group" role="radiogroup" aria-label="Trip type">
        <label class="radio"><input type="radio" name="trip-type" value="one-way" ${quickState.trip === 'one-way' ? 'checked' : ''}>One way</label>
        <label class="radio"><input type="radio" name="trip-type" value="round-trip" ${roundTrip ? 'checked' : ''}>Round trip</label>
        <label class="radio"><input type="radio" name="trip-type" value="multi-city" ${quickState.trip === 'multi-city' ? 'checked' : ''}>Multi-city</label>
      </div>
      <div class="trip-preferences">
        <label class="checkbox small"><input type="checkbox" id="traveling-children" ${quickState.children ? 'checked' : ''}>Traveling with children</label>
        <div class="field" style="min-width:150px"><label for="cabin-class">Cabin class</label>
          <select id="cabin-class">
            <option value="Economy" ${quickState.cabin === 'Economy' ? 'selected' : ''}>Economy</option>
            <option value="Business" ${quickState.cabin === 'Business' ? 'selected' : ''}>Business</option>
            <option value="First" ${quickState.cabin === 'First' ? 'selected' : ''}>First</option>
          </select>
        </div>
      </div>
    </div>
    <div class="route-row">
      <div class="route-box">
        <div class="field"><label for="origin">Origin</label><input id="origin" type="text" value="${esc(quickState.origin)}" autocomplete="off"></div>
      </div>
      <div class="route-box">
        <div class="field"><label for="destination">Destination</label><input id="destination" type="text" value="${esc(quickState.destination)}" autocomplete="off"></div>
      </div>
      <div class="route-box">
        <div class="field"><label for="departure-date">Departure date</label><input id="departure-date" type="text" value="${esc(quickState.depart)}" autocomplete="off"></div>
      </div>
      <div class="route-box">
        ${roundTrip ? `
          <div class="field"><label for="return-date">Return date</label><input id="return-date" type="text" value="${esc(quickState.ret)}" placeholder="Choose return date" autocomplete="off"></div>
          ${duration !== null ? `<div class="small muted" id="trip-duration">${duration} days</div>` : ''}` : `
          <div class="field"><label>Round trip</label><button type="button" class="btn" id="add-return">Add return</button></div>`}
      </div>
    </div>
    <div class="route-row" style="grid-template-columns:auto 1fr;margin-top:10px;align-items:center">
      <div class="inline-actions">
        <button type="button" class="btn" id="swap-cities">Swap cities</button>
        <button type="button" class="btn" id="choose-origin">City selection</button>
      </div>
      <div class="search-history" style="border:0;padding:0;margin:0;justify-content:flex-end">
        <span class="small muted">Cabin preference is retained in your flight results.</span>
      </div>
    </div>
    <div class="search-submit"><button type="button" class="btn primary lg" id="search-flights">Search flights</button></div>
    <div id="search-alert-host"></div>`;
  bindQuickForm();
}

function bindQuickForm() {
  const host = document.querySelector('#quick-card');
  if (!host) return;
  host.querySelectorAll('input[name="trip-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const previous = quickState.trip;
      quickState.trip = radio.value;
      if (quickState.trip === 'round-trip' && previous !== 'round-trip') quickState.ret = '';
      renderQuickForm();
    });
  });
  const origin = host.querySelector('#origin');
  const destination = host.querySelector('#destination');
  const depart = host.querySelector('#departure-date');
  if (origin) {
    origin.addEventListener('input', () => { quickState.origin = origin.value; });
    origin.addEventListener('click', () => openCityFor('origin', 'Popular'));
  }
  if (destination) {
    destination.addEventListener('input', () => { quickState.destination = destination.value; });
    destination.addEventListener('click', () => openCityFor('destination', 'Popular'));
  }
  if (depart) {
    depart.addEventListener('input', () => { quickState.depart = depart.value; });
    depart.addEventListener('click', () => {
      calendarPopover({
        anchor: depart, selected: quickState.depart, minDate: BUSINESS_MIN_DATE,
        fares: CALENDAR_FARES, label: 'Select departure date',
        onSelect: (iso) => { quickState.depart = iso; renderQuickForm(); }
      });
    });
  }
  const cabin = host.querySelector('#cabin-class');
  if (cabin) cabin.addEventListener('change', () => { quickState.cabin = cabin.value; });
  const children = host.querySelector('#traveling-children');
  if (children) children.addEventListener('change', () => { quickState.children = children.checked; });
  host.querySelector('#swap-cities').addEventListener('click', () => {
    const oldOrigin = quickState.origin;
    quickState.origin = quickState.destination;
    quickState.destination = oldOrigin;
    renderQuickForm();
  });
  host.querySelector('#choose-origin').addEventListener('click', () => openCityFor('origin', 'Popular'));
  const addReturn = host.querySelector('#add-return');
  if (addReturn) {
    addReturn.addEventListener('click', () => {
      quickState.trip = 'round-trip';
      quickState.ret = '';
      renderQuickForm();
      const returnField = document.querySelector('#return-date');
      if (returnField) openReturnCalendar(returnField);
    });
  }
  const returnField = host.querySelector('#return-date');
  if (returnField) {
    returnField.addEventListener('input', () => { quickState.ret = returnField.value; });
    returnField.addEventListener('click', () => openReturnCalendar(returnField));
  }
  host.querySelector('#search-flights').addEventListener('click', submitQuickSearch);
}

function openReturnCalendar(anchor) {
  calendarPopover({
    anchor, selected: quickState.ret, minDate: quickState.depart || BUSINESS_MIN_DATE,
    label: 'Select return date',
    onSelect: (iso) => { quickState.ret = iso; renderQuickForm(); }
  });
}

function openCityFor(which, tab) {
  cityPicker(tab, (name, code) => {
    const value = `${name} (${code})`;
    if (which === 'origin') quickState.origin = value;
    else quickState.destination = value;
    renderQuickForm();
  });
}

function submitQuickSearch() {
  const host = document.querySelector('#quick-card');
  const origin = parseCity(quickState.origin);
  const destination = parseCity(quickState.destination);
  const date = (quickState.depart || '').trim();
  resetSearchAlert();
  if (!origin || !destination) {
    topAlert(host, 'Enter an origin and destination');
    return;
  }
  if (origin.toLowerCase() === destination.toLowerCase()) {
    topAlert(host, 'Origin and destination cannot be the same');
    return;
  }
  if (!date) {
    topAlert(host, 'Choose a departure date');
    return;
  }
  saveSearchHistory({ name: `${origin} - ${destination}`, origin, destination, date });
  goFlights(origin, destination, date, quickState.cabin, quickState.children);
}

function resetSearchAlert() {
  document.querySelectorAll('#quick-card .inline-alert').forEach(node => node.remove());
}

// ------------------------------------------------------------------ Login
function agreementButtonHandler(button, { from }) {
  button.addEventListener('click', () => {
    agreementDialog({
      onDecline: () => {},
      onAgree: () => {
        if (from === 'login') go('/register?agreed=1');
      }
    });
  });
}

export async function renderLogin(page) {
  const flashMessage = takeFlash();
  page.innerHTML = `<div class="container"><div class="auth-wrap"><div class="card auth-card" id="auth-card">
    <h1>Log in</h1>
    <p class="muted">Access your bookings, saved travel information and account services.</p>
    ${flashMessage ? `<div class="inline-success" role="status">${esc(flashMessage)}</div>` : ''}
    <div id="auth-alert-host"></div>
    <div id="auth-stage"></div>
  </div></div></div>`;
  renderPasswordLogin();
}

function renderPasswordLogin() {
  const stage = document.querySelector('#auth-stage');
  if (!stage) return;
  stage.innerHTML = `
    <div class="auth-switch"><strong>Password login</strong><a href="#/login" id="switch-sms">Verification code login</a></div>
    <div class="field"><label for="login-account">Account</label><input id="login-account" type="text" autocomplete="username"></div>
    <div class="field"><label for="login-password">Password</label><input id="login-password" type="password" autocomplete="current-password"></div>
    <label class="checkbox legal-row"><input type="checkbox" id="login-agree">Agree to terms</label>
    <button type="button" class="btn primary block lg" id="login-submit">Log in</button>
    <div class="auth-links" style="margin-top:14px">
      <div><button type="button" class="link-button" id="free-registration" role="button">Free registration</button></div>
      <div><button type="button" class="link-button" id="login-agreement">Registration agreement and privacy policy</button></div>
    </div>`;
  stage.querySelector('#switch-sms').addEventListener('click', (event) => { event.preventDefault(); renderSmsLogin(); });
  stage.querySelector('#login-submit').addEventListener('click', submitPasswordLogin);
  stage.querySelector('#free-registration').addEventListener('click', () => {
    agreementDialog({ onDecline: () => {}, onAgree: () => go('/register?agreed=1') });
  });
  stage.querySelector('#login-agreement').addEventListener('click', () => {
    agreementDialog({ onDecline: () => {}, onAgree: () => {} });
  });
}

async function submitPasswordLogin() {
  const card = document.querySelector('#auth-card');
  const host = document.querySelector('#auth-alert-host');
  host.innerHTML = '';
  const account = document.querySelector('#login-account').value.trim();
  const password = document.querySelector('#login-password').value;
  const agreed = document.querySelector('#login-agree').checked;
  if (!agreed) { topAlert(host, 'Agree to terms first'); return; }
  if (!account) { topAlert(host, 'Enter your account'); return; }
  if (!password) { topAlert(host, 'Enter your password'); return; }
  try {
    const result = await api('auth.login_password', { account, password });
    setUser(result.user);
    go('/');
  } catch (error) {
    topAlert(host, error.message);
  }
}

function renderSmsLogin() {
  const stage = document.querySelector('#auth-stage');
  const host = document.querySelector('#auth-alert-host');
  host.innerHTML = '';
  stage.innerHTML = `
    <div class="auth-switch"><strong>Verification code login</strong><a href="#/login" id="switch-password">Password login</a></div>
    <div class="field"><label for="sms-mobile">Mobile number</label>
      <div class="inline-actions"><span class="muted">+86</span><input id="sms-mobile" type="tel" inputmode="numeric" autocomplete="tel" style="flex:1"></div>
    </div>
    <div class="field"><label for="sms-code">Verification code</label>
      <div class="inline-actions"><input id="sms-code" type="text" inputmode="numeric" autocomplete="one-time-code" style="flex:1"><button type="button" class="btn" id="sms-send">Send code</button></div>
    </div>
    <label class="checkbox legal-row"><input type="checkbox" id="sms-agree">Agree to terms</label>
    <button type="button" class="btn primary block lg" id="sms-submit">Log in</button>
    <p class="auth-note">Verification delivery is simulated. A code is valid only after Send code.</p>`;
  stage.querySelector('#switch-password').addEventListener('click', (event) => { event.preventDefault(); renderPasswordLogin(); });
  const send = stage.querySelector('#sms-send');
  send.addEventListener('click', async () => {
    host.innerHTML = '';
    const mobile = stage.querySelector('#sms-mobile').value.trim();
    if (!mobile) { topAlert(host, 'Enter your mobile number'); return; }
    try {
      await api('auth.send_code', { phone: mobile, purpose: 'login' });
      send.textContent = 'Resend code';
    } catch (error) { topAlert(host, error.message); }
  });
  stage.querySelector('#sms-submit').addEventListener('click', async () => {
    host.innerHTML = '';
    const mobile = stage.querySelector('#sms-mobile').value.trim();
    const code = stage.querySelector('#sms-code').value.trim();
    const agreed = stage.querySelector('#sms-agree').checked;
    if (!agreed) { topAlert(host, 'Agree to terms first'); return; }
    if (!mobile) { topAlert(host, 'Enter your mobile number'); return; }
    if (!code) { topAlert(host, 'Enter your verification code'); return; }
    try {
      const result = await api('auth.login_sms', { phone: mobile, code });
      setUser(result.user);
      go('/');
    } catch (error) { topAlert(host, error.message); }
  });
}

// ------------------------------------------------------------------ Register
export async function renderRegister(page, query) {
  const agreed = query.get('agreed') === '1';
  page.innerHTML = `<div class="container"><div class="auth-wrap" style="max-width:560px">
    <div class="card auth-card" id="register-card">
      <h1>Register</h1>
      <p class="muted">Create your Ctrip Travel account to book and manage trips.</p>
      <div id="register-alert-host"></div>
      <div id="register-stage"></div>
    </div></div></div>`;
  if (agreed) {
    renderVerifyMobile();
  } else {
    const stage = document.querySelector('#register-stage');
    stage.innerHTML = `<p>Please review and accept the registration agreement and privacy policy to continue.</p>
      <button type="button" class="btn primary" id="open-registration-agreement">Registration agreement and privacy policy</button>`;
    document.querySelector('#open-registration-agreement').addEventListener('click', () => {
      agreementDialog({
        onDecline: () => go('/'),
        onAgree: () => renderVerifyMobile()
      });
    });
    setTimeout(() => {
      agreementDialog({
        onDecline: () => go('/'),
        onAgree: () => renderVerifyMobile()
      });
    }, 0);
  }
}

let registerPhone = '';

function renderVerifyMobile() {
  const stage = document.querySelector('#register-stage');
  if (!stage) return;
  stage.innerHTML = `
    <div class="steps"><span class="done"></span><span></span><span></span></div>
    <h2>Verify mobile number</h2>
    <div class="field"><label for="register-mobile">Mobile number</label>
      <div class="inline-actions"><span class="muted">+86</span><input id="register-mobile" type="tel" value="${esc(registerPhone)}" style="flex:1"></div>
    </div>
    <div class="field"><label for="register-code">Verification code</label>
      <div class="inline-actions"><input id="register-code" type="text" inputmode="numeric" style="flex:1"><button type="button" class="btn" id="register-send">Send code</button></div>
    </div>
    <button type="button" class="btn primary block lg" id="register-next">Next, set password</button>
    <div class="auth-links" style="margin-top:14px"><button type="button" class="link-button" id="register-agreement">Registration agreement and privacy policy</button></div>
    <p class="auth-note">A simulated code is delivered after Send code. Use 123456.</p>`;
  const host = document.querySelector('#register-alert-host');
  const send = stage.querySelector('#register-send');
  send.addEventListener('click', async () => {
    host.innerHTML = '';
    const mobile = stage.querySelector('#register-mobile').value.trim();
    if (!mobile) { topAlert(host, 'Enter your mobile number'); return; }
    try {
      await api('auth.send_code', { phone: mobile, purpose: 'register' });
      send.textContent = 'Resend code';
      registerPhone = mobile;
    } catch (error) { topAlert(host, error.message); }
  });
  stage.querySelector('#register-next').addEventListener('click', async () => {
    host.innerHTML = '';
    const mobile = stage.querySelector('#register-mobile').value.trim();
    const code = stage.querySelector('#register-code').value.trim();
    if (!mobile) { topAlert(host, 'Enter your mobile number'); return; }
    if (!code) { topAlert(host, 'Enter your verification code'); return; }
    try {
      await api('auth.check_code', { phone: mobile, code, purpose: 'register' });
      registerPhone = mobile;
      renderSetPassword();
    } catch (error) { topAlert(host, error.message); }
  });
  stage.querySelector('#register-agreement').addEventListener('click', () => {
    agreementDialog({ onDecline: () => {}, onAgree: () => {} });
  });
}

function renderSetPassword() {
  const stage = document.querySelector('#register-stage');
  const host = document.querySelector('#register-alert-host');
  host.innerHTML = '';
  stage.innerHTML = `
    <div class="steps"><span class="done"></span><span class="done"></span><span></span></div>
    <h2>Set password</h2>
    <p class="muted small">Verification complete for +86 ${esc(registerPhone)}.</p>
    <div class="field"><label for="register-password">Password</label><input id="register-password" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="register-confirm">Confirm password</label><input id="register-confirm" type="password" autocomplete="new-password"></div>
    <section class="field" role="region" aria-label="Password strength">
      <span class="label">Password strength</span>
      <span id="register-strength-text">Enter a new password</span>
      <div class="strength-bar" id="register-strength-bar"><span></span></div>
    </section>
    <button type="button" class="btn primary block lg" id="register-complete" style="margin-top:14px">Complete registration</button>`;
  const password = stage.querySelector('#register-password');
  const confirm = stage.querySelector('#register-confirm');
  password.addEventListener('input', updateStrength);
  stage.querySelector('#register-complete').addEventListener('click', async () => {
    host.innerHTML = '';
    const value = password.value;
    const confirmation = confirm.value;
    if (value !== confirmation) { topAlert(host, 'Passwords do not match'); return; }
    if (value.length < 8 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
      topAlert(host, 'Password must contain letters and numbers and be at least 8 characters');
      return;
    }
    try {
      await api('auth.register', { mobile: registerPhone, password: value });
      flash('Registration successful');
      go('/login');
    } catch (error) { topAlert(host, error.message); }
  });
}

function updateStrength() {
  const input = document.querySelector('#register-password');
  const text = document.querySelector('#register-strength-text');
  const bar = document.querySelector('#register-strength-bar');
  if (!input || !text || !bar) return;
  const result = passwordStrength(input.value);
  text.textContent = result.label;
  bar.className = 'strength-bar ' + (result.score >= 3 ? 'strong' : result.score === 2 ? 'medium' : 'weak');
}

export { goFlights, cityPicker, BUSINESS_MIN_DATE };
