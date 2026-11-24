import { api, state, go } from './store.js';
import {
  esc, money, field, topAlert, openDialog, emptyState, mobileMask
} from './ui.js';

const STATUS_OBSERVATIONS = [
  { number: 'JD5162', date: '2026-07-21', origin: 'Chengdu', destination: 'Guangzhou',
    airline: 'Other airline', departure: '09:00', arrival: '11:40', status: 'Scheduled',
    check_in: 'H14-H25', gate: 'B12', carousel: '6' },
  { number: 'MU5234', date: '2026-07-21', origin: 'Shanghai', destination: 'Beijing',
    airline: 'China Eastern', departure: '09:00', arrival: '11:30', status: 'Scheduled',
    check_in: 'F08-F16', gate: 'C05', carousel: '12' }
];

function statusIdentity(item) {
  return `${item.number} ${item.date} ${item.origin} - ${item.destination}`;
}

function resultRecord(item, showBaggage = false) {
  return `<div class="status-result" role="list">
    <div class="record-card" role="listitem" aria-label="Record ${esc(statusIdentity(item))}">
      <div class="status-flight-head" style="border-bottom:0;padding-bottom:0;margin-bottom:0">
        <div><div class="flight-no">${esc(item.number)}</div><div class="muted">${esc(item.airline)}</div></div>
        <div style="font-size:20px;font-weight:800">${esc(item.origin)} → ${esc(item.destination)}</div>
        <span class="status-badge paid">${esc(item.status)}</span>
      </div>
      <div class="status-grid" style="margin-top:14px">
        <div class="status-fact"><span class="label">Departure</span><strong>${esc(item.departure)}</strong></div>
        <div class="status-fact"><span class="label">Arrival</span><strong>${esc(item.arrival)}</strong></div>
        <div class="status-fact"><span class="label">Date</span><strong>${esc(item.date)}</strong></div>
        <div class="status-fact"><span class="label">Status</span><strong>${esc(item.status)}</strong></div>
        ${item.check_in ? `<div class="status-fact"><span class="label">Check-in</span><strong>${esc(item.check_in)}</strong></div>` : ''}
        ${item.gate ? `<div class="status-fact"><span class="label">Gate</span><strong>${esc(item.gate)}</strong></div>` : ''}
        ${showBaggage && item.carousel ? `<div class="status-fact"><span class="label">Baggage carousel</span><strong>${esc(item.carousel)}</strong></div>` : ''}
      </div>
    </div>
  </div>`;
}

export async function renderStatus(page) {
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Flight status</span></div>
    <div class="page-heading"><h1>Flight status</h1><p class="page-subtitle">Deterministic flight observations and ground-service details.</p></div>
    <section class="card section" aria-label="Flight status search">
      <div class="radio-group" role="radiogroup" aria-label="Search by" id="status-modes" style="margin-bottom:16px">
        <label class="radio"><input type="radio" name="status-mode" value="number" checked>Flight number</label>
        <label class="radio"><input type="radio" name="status-mode" value="route">Route</label>
      </div>
      <div id="status-fields"></div>
      <div id="status-alert"></div>
      <div class="search-submit" style="justify-content:flex-start"><button type="button" class="btn primary" id="status-search">Search</button></div>
    </section>
    <div id="status-output"></div>
    <section class="card section" role="region" aria-label="Search history" id="status-history">
      <div class="section-head"><h2>Search history</h2><button type="button" class="btn" id="clear-history">Clear history</button></div>
      <div id="status-history-list"><p class="muted">No search history</p></div>
    </section>
  </div>`;
  let mode = 'number';
  let history = [];
  const fieldsHost = page.querySelector('#status-fields');
  const output = page.querySelector('#status-output');
  const alertHost = page.querySelector('#status-alert');

  const renderFields = () => {
    if (mode === 'number') {
      fieldsHost.innerHTML = `<div class="form-grid">
        ${field('Flight number', '<input id="status-number" type="text" placeholder="For example, JD5162">')}
        ${field('Departure date', '<input id="status-date" type="text" value="2026-07-21">')}
      </div>`;
    } else {
      fieldsHost.innerHTML = `<div class="form-grid">
        ${field('Origin', '<input id="status-origin" type="text" placeholder="City">')}
        ${field('Destination', '<input id="status-destination" type="text" placeholder="City">')}
        ${field('Departure date', '<input id="status-date" type="text" value="2026-07-21">')}
        <div class="field"><span class="label">&nbsp;</span><button type="button" class="btn" id="status-swap">Swap cities</button></div>
      </div>`;
      fieldsHost.querySelector('#status-swap').addEventListener('click', () => {
        const origin = fieldsHost.querySelector('#status-origin');
        const destination = fieldsHost.querySelector('#status-destination');
        const old = origin.value;
        origin.value = destination.value;
        destination.value = old;
      });
    }
  };

  const renderHistory = () => {
    const host = page.querySelector('#status-history-list');
    if (!history.length) {
      host.innerHTML = '<p class="muted" id="no-status-history">No search history</p>';
      page.querySelector('#clear-history').hidden = true;
      return;
    }
    page.querySelector('#clear-history').hidden = false;
    host.innerHTML = `<div class="inline-actions">${history.map(item => `<span class="history-chip">
      <button type="button" class="link-button" aria-label="${esc(item.label)}" data-history="${item.id}">${esc(item.label)}</button>
      <span class="small" aria-hidden="true">${esc(item.flight_date)}</span></span>`).join('')}</div>`;
    host.querySelectorAll('[data-history]').forEach(button => {
      button.addEventListener('click', () => {
        const item = history.find(entry => String(entry.id) === button.dataset.history);
        if (!item) return;
        mode = item.mode;
        page.querySelectorAll('input[name="status-mode"]').forEach(radio => { radio.checked = radio.value === mode; });
        renderFields();
        if (mode === 'number') {
          fieldsHost.querySelector('#status-number').value = item.flight_number;
          fieldsHost.querySelector('#status-date').value = item.flight_date;
        } else {
          fieldsHost.querySelector('#status-origin').value = item.origin;
          fieldsHost.querySelector('#status-destination').value = item.destination;
          fieldsHost.querySelector('#status-date').value = item.flight_date;
        }
        executeSearch();
      });
    });
  };

  const loadHistory = async () => {
    try {
      const data = await api('status.history');
      history = data.history || [];
    } catch (e) { history = []; }
    renderHistory();
  };

  const recordHistory = async (payload) => {
    if (!state.user) return;
    try {
      const data = await api('status.record', payload);
      history = data.history || [];
      renderHistory();
    } catch (e) { /* history is a convenience */ }
  };

  const executeSearch = async () => {
    alertHost.innerHTML = '';
    output.innerHTML = '';
    const date = fieldsHost.querySelector('#status-date').value.trim();
    if (!date) { topAlert(alertHost, 'Choose a departure date'); return; }
    if (mode === 'number') {
      const number = fieldsHost.querySelector('#status-number').value.trim().toUpperCase();
      if (!number) { topAlert(alertHost, 'Enter a flight number'); return; }
      const item = STATUS_OBSERVATIONS.find(obs => obs.number === number && obs.date === date);
      if (!item) {
        output.innerHTML = `<div class="card section"><div class="empty-state">No flight status found for ${esc(number)} on ${esc(date)}.</div></div>`;
        return;
      }
      output.innerHTML = `<section class="card section" role="region" aria-label="Flight details">
        <div class="section-head"><h2>Flight details</h2><span class="small muted">Supplied observation</span></div>
        ${resultRecord(item, true)}
        <section class="card section" role="region" aria-label="Baggage carousel" style="box-shadow:none;margin-top:14px">
          <div class="section-head"><h2>Baggage carousel</h2><span class="pill green">Arrival baggage</span></div>
          <p style="font-size:26px;font-weight:800;margin:0">${esc(item.carousel)}</p>
          <p class="small muted">Carousel ${esc(item.carousel)} serves ${esc(item.number)} from ${esc(item.origin)}.</p>
        </section>
      </section>`;
      await recordHistory({ mode: 'number', number: item.number, origin: item.origin, destination: item.destination, date, label: item.number });
    } else {
      const origin = fieldsHost.querySelector('#status-origin').value.trim();
      const destination = fieldsHost.querySelector('#status-destination').value.trim();
      if (!origin || !destination) { topAlert(alertHost, 'Enter an origin and destination'); return; }
      const items = STATUS_OBSERVATIONS.filter(obs =>
        obs.origin.toLowerCase() === origin.toLowerCase() &&
        obs.destination.toLowerCase() === destination.toLowerCase() && obs.date === date);
      if (!items.length) {
        output.innerHTML = `<div class="card section"><div class="empty-state">No flight status results found.</div></div>`;
        return;
      }
      output.innerHTML = `<section class="card section" role="region" aria-label="Flight status results">
        <div class="section-head"><h2>Flight status results</h2><span class="small muted">${items.length} record(s)</span></div>
        ${items.map(item => resultRecord(item, false)).join('')}
      </section>`;
      await recordHistory({ mode: 'route', origin, destination, date, label: `${origin} - ${destination}` });
    }
  };

  page.querySelectorAll('input[name="status-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      mode = radio.value;
      output.innerHTML = '';
      alertHost.innerHTML = '';
      renderFields();
    });
  });
  page.querySelector('#status-search').addEventListener('click', executeSearch);
  page.querySelector('#clear-history').addEventListener('click', async () => {
    try {
      const data = await api('status.clear_history');
      history = data.history || [];
      renderHistory();
    } catch (error) { topAlert(alertHost, error.message); }
  });
  renderFields();
  await loadHistory();
}

// ------------------------------------------------------------------ Vouchers
export async function renderVouchers(page) {
  if (!state.user) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Reimbursement vouchers</h1><p>Sign in to see your reimbursement vouchers.</p><a class="btn primary" href="#/login">Log in</a></div></div>`;
    return;
  }
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Reimbursement vouchers</span></div>
    <div class="page-heading"><h1>Reimbursement vouchers</h1><p class="page-subtitle">Reimbursement document services for eligible paid flight orders.</p></div>
    <section class="rules-box" role="region" aria-label="Issuance rules">
      <h2>Issuance rules</h2>
      <p style="margin-bottom:0">Vouchers are available for eligible paid orders within 365 days of payment. Paid, completed orders can be issued automatically after travel. Issuance rules and processing are shown here for reference.</p>
    </section>
    <section class="card section">
      <div class="tabs" role="tablist" aria-label="Voucher lifecycle">
        <button type="button" role="tab" class="tab" data-voucher-tab="pending" aria-selected="true">Pending</button>
        <button type="button" role="tab" class="tab" data-voucher-tab="in-progress" aria-selected="false">In progress</button>
        <button type="button" role="tab" class="tab" data-voucher-tab="completed" aria-selected="false">Completed</button>
      </div>
      <div id="voucher-panel"><p class="muted">Loading vouchers…</p></div>
    </section>
  </div>`;
  let data = { pending: [], pending_history: [], in_progress: [], completed: [] };
  let active = 'pending';
  let showHistory = false;
  const panel = page.querySelector('#voucher-panel');

  const card = (item, completed = false) => `<article class="voucher-card">
    <div class="voucher-order">${esc(item.number)}</div>
    <div class="small muted">${esc(item.flight)} · ${esc(item.origin)} → ${esc(item.destination)}</div>
    <div class="small">Paid <span>${esc(item.payment_date || item.booking_date || '')}</span></div>
    <div style="margin-top:8px"><span class="status-badge ${completed ? 'paid' : 'pending'}">${completed ? 'Voucher issued' : 'Eligible for reimbursement'}</span></div>
    ${item.voucher_issued ? `<div class="small" style="margin-top:6px">${esc(item.voucher_issued)}</div>` : ''}
  </article>`;

  const renderPanel = () => {
    if (active === 'pending') {
      const items = showHistory ? [...data.pending, ...data.pending_history] : data.pending;
      panel.innerHTML = `<section role="region" aria-label="Pending vouchers">
        <div class="section-head"><h2>Pending vouchers</h2><button type="button" class="btn" id="view-more-vouchers">View more orders from the past year</button></div>
        ${items.length ? `<div class="voucher-grid">${items.map(item => card(item, false)).join('')}</div>` : '<p class="empty-state">No vouchers available</p>'}
      </section>`;
      panel.querySelector('#view-more-vouchers').addEventListener('click', () => {
        showHistory = true;
        renderPanel();
      });
    } else if (active === 'in-progress') {
      panel.innerHTML = `<section role="region" aria-label="In progress vouchers">
        <div class="section-head"><h2>In progress vouchers</h2></div>
        ${data.in_progress.length ? `<div class="voucher-grid">${data.in_progress.map(item => card(item, false)).join('')}</div>` : '<p class="empty-state">No vouchers available</p>'}
      </section>`;
    } else {
      panel.innerHTML = `<section role="region" aria-label="Completed vouchers">
        <div class="section-head"><h2>Completed vouchers</h2></div>
        ${data.completed.length ? `<div class="voucher-grid">${data.completed.map(item => card(item, true)).join('')}</div>` : '<p class="empty-state">No vouchers available</p>'}
      </section>`;
    }
  };
  page.querySelectorAll('[data-voucher-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      active = tab.dataset.voucherTab;
      showHistory = false;
      page.querySelectorAll('[data-voucher-tab]').forEach(item => item.setAttribute('aria-selected', String(item === tab)));
      renderPanel();
    });
  });
  try {
    data = await api('vouchers.list');
  } catch (error) {
    panel.innerHTML = `<div class="inline-alert" role="alert">${esc(error.message)}</div>`;
    return;
  }
  renderPanel();
}

// ------------------------------------------------------------------ Airports
const AIRPORTS = {
  beijing: {
    id: 'beijing', name: 'Beijing Capital Airport', location: 'Beijing',
    runways: '3 runways', overview: "China's first national gateway",
    bus: { name: 'Fangzhuang line', stop: 'Fangzhuang', first: '06:00', last: '21:00', headway: '30 minutes' },
    phones: [
      { name: 'Medical first aid center', phone: '010-64541100' },
      { name: 'Baggage service', phone: '010-64541000' },
      { name: 'Lost and found', phone: '010-64540900' }
    ]
  },
  shanghai: {
    id: 'shanghai', name: 'Shanghai Pudong Airport', location: 'Shanghai',
    runways: '3 runways', overview: 'A major international gateway on the eastern coast.',
    bus: { name: 'Pudong shuttle', stop: 'Longyang Road', first: '06:30', last: '22:00', headway: '20 minutes' },
    phones: [{ name: 'Medical first aid center', phone: '021-68333120' }]
  },
  guangzhou: {
    id: 'guangzhou', name: 'Guangzhou Baiyun Airport', location: 'Guangzhou',
    runways: '3 runways', overview: 'A southern aviation hub serving the Pearl River Delta.',
    bus: { name: 'Baiyun shuttle', stop: 'Tianhe', first: '06:00', last: '21:30', headway: '25 minutes' },
    phones: [{ name: 'Medical first aid center', phone: '020-36066999' }]
  },
  hongkong: {
    id: 'hongkong', name: 'Hong Kong International Airport', location: 'Hong Kong',
    runways: '3 runways', overview: 'An international gateway connected to the Greater Bay Area.',
    bus: { name: 'Airport express shuttle', stop: 'Central', first: '05:50', last: '01:00', headway: '15 minutes' },
    phones: [{ name: 'Medical first aid center', phone: '+852-21818888' }]
  },
  chengdu: {
    id: 'chengdu', name: 'Chengdu Tianfu Airport', location: 'Chengdu',
    runways: '3 runways', overview: 'A modern gateway to western China.',
    bus: { name: 'Tianfu airport line', stop: 'Tianfu Square', first: '06:00', last: '22:00', headway: '20 minutes' },
    phones: [{ name: 'Medical first aid center', phone: '028-86909120' }]
  }
};

const DOMESTIC_CITIES = {
  C: [['Chengdu', 'chengdu'], ['Chongqing', 'beijing'], ['Changchun', 'beijing']],
  B: [['Beijing', 'beijing']],
  S: [['Shanghai', 'shanghai']],
  G: [['Guangzhou', 'guangzhou']]
};

const INTL_AIRPORTS = [
  ['Hong Kong International Airport', 'hongkong'],
  ['Tokyo Narita Airport', 'hongkong'],
  ['Singapore Changi Airport', 'hongkong']
];

export async function renderAirports(page, query) {
  let tab = query.get('tab') === 'international' ? 'international' : 'domestic';
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Airport guide</span></div>
    <div class="page-heading"><h1>Airport guide</h1><p class="page-subtitle">Terminal guides, city transport and essential airport services.</p></div>
    <div class="two-col" style="grid-template-columns:minmax(0,1fr) 320px">
      <div>
        <section class="card section" role="region" aria-label="Popular airports">
          <div class="section-head"><h2>Popular airports</h2><span class="pill">Most searched</span></div>
          <div class="airport-links">
            <a href="#/airports/beijing">Beijing Capital Airport</a>
            <a href="#/airports/shanghai">Shanghai Pudong Airport</a>
            <a href="#/airports/guangzhou">Guangzhou Baiyun Airport</a>
          </div>
        </section>
        <section class="card section">
          <div class="tabs airport-tabs" role="tablist" aria-label="Airport directory">
            <button type="button" role="tab" class="tab" data-airport-tab="domestic" aria-selected="${tab === 'domestic'}">Domestic airports</button>
            <button type="button" role="tab" class="tab" data-airport-tab="international" aria-selected="${tab === 'international'}">International and Hong Kong, Macau, Taiwan airports</button>
          </div>
          <div id="airport-directory"></div>
        </section>
      </div>
      <aside>
        <section class="card section" role="region" aria-label="Today weather">
          <div class="weather-card">
            <h2>Today weather</h2>
            <div class="weather-temp">-5°C to 3°C</div>
            <div>Beijing</div>
            <p class="small" style="margin:12px 0 0"><a href="#/airports/beijing">Boarding process</a></p>
          </div>
          <p class="small muted" style="margin:14px 0 0">Weather is a supplied snapshot for this guide, independent of the travel date.</p>
        </section>
        <section class="card section">
          <h2 style="font-size:17px">Before you fly</h2>
          <p class="small muted">Check your terminal, allow time for security, and keep identification with you.</p>
        </section>
      </aside>
    </div>
  </div>`;
  let letter = 'C';
  const directory = page.querySelector('#airport-directory');
  const renderDirectory = () => {
    if (tab === 'domestic') {
      const cities = DOMESTIC_CITIES[letter] || [];
      directory.innerHTML = `<section role="region" aria-label="Domestic airports">
        <div class="section-head"><h2 style="font-size:18px">Domestic airports</h2><span class="small muted">Choose a city initial</span></div>
        <div class="airport-index">
          <div class="letter-nav" role="group" aria-label="City initials">
            ${['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map(init => `<button type="button" data-letter="${init}" aria-pressed="${init === letter}" aria-label="${init}">${init}</button>`).join('')}
          </div>
          <div class="domestic-grid">${cities.map(([name, id]) => `<a href="#/airports/${id}">${esc(name)}</a>`).join('') || '<p class="muted">No cities for this initial.</p>'}</div>
        </div>
      </section>`;
      directory.querySelectorAll('[data-letter]').forEach(button => {
        button.addEventListener('click', () => { letter = button.dataset.letter; renderDirectory(); });
      });
    } else {
      directory.innerHTML = `<section role="region" aria-label="International and Hong Kong, Macau, Taiwan airports">
        <div class="section-head"><h2 style="font-size:18px">International and Hong Kong, Macau, Taiwan airports</h2></div>
        <div class="airport-links">${INTL_AIRPORTS.map(([name, id]) => `<a href="#/airports/${id}">${esc(name)}</a>`).join('')}</div>
      </section>`;
    }
  };
  page.querySelectorAll('[data-airport-tab]').forEach(button => {
    button.addEventListener('click', () => {
      tab = button.dataset.airportTab;
      page.querySelectorAll('[data-airport-tab]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
      renderDirectory();
    });
  });
  renderDirectory();
}

export async function renderAirportDetail(page, query, params) {
  const id = params[0] || 'beijing';
  const airport = AIRPORTS[id] || AIRPORTS.beijing;
  let tab = 'overview';
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/airports">Airport guide</a><span aria-hidden="true">›</span><span>${esc(airport.name)}</span></div>
    <div class="page-heading"><h1>${esc(airport.name)}</h1><p class="page-subtitle">${esc(airport.location)} · Airport information</p></div>
    <section class="card section">
      <div class="tabs" role="tablist" aria-label="Airport information">
        <button type="button" role="tab" class="tab" data-detail-tab="overview" aria-selected="true">Overview</button>
        <button type="button" role="tab" class="tab" data-detail-tab="transportation" aria-selected="false">Transportation</button>
        <button type="button" role="tab" class="tab" data-detail-tab="phones" aria-selected="false">Phone numbers</button>
      </div>
      <div id="airport-detail-panel"></div>
    </section>
  </div>`;
  const panel = page.querySelector('#airport-detail-panel');
  const renderPanel = () => {
    if (tab === 'overview') {
      panel.innerHTML = `<section role="region" aria-label="Airport overview">
        <div class="airport-overview">
          <div><h2>Airport overview</h2>
            <p>${esc(airport.overview)}.</p>
            <p>${esc(airport.name)} is located in ${esc(airport.location)} and operates ${esc(airport.runways)}.</p>
            <div class="airport-facts">
              <div class="airport-fact"><span class="label">Location</span><strong>${esc(airport.location)}</strong></div>
              <div class="airport-fact"><span class="label">Runways</span><strong>${esc(airport.runways)}</strong></div>
              <div class="airport-fact"><span class="label">Character</span><strong>${esc(airport.overview)}</strong></div>
            </div>
          </div>
          <div class="weather-card"><h2>Travel snapshot</h2><div class="weather-temp">-5°C to 3°C</div><div>Beijing weather reference</div><p class="small" style="margin-top:10px">Supplied snapshot, not a live weather lookup.</p></div>
        </div>
      </section>`;
    } else if (tab === 'transportation') {
      panel.innerHTML = `<div>
        <section role="region" aria-label="City buses">
          <h2>City buses</h2>
          <div class="bus-card">
            <h3>${esc(airport.bus.name)}</h3>
            <div class="bus-times"><span>Stop: <strong>${esc(airport.bus.stop)}</strong></span><span>First service <strong>${esc(airport.bus.first)}</strong></span><span>Last service <strong>${esc(airport.bus.last)}</strong></span><span>Headway <strong>${esc(airport.bus.headway)}</strong></span></div>
          </div>
        </section>
        <section class="info-box" style="margin-top:14px"><strong>More ways into the city</strong><p class="small" style="margin:6px 0 0">Rail connections, airport shuttles and taxis are also available from the arrivals level. Follow the ground transport signs.</p></section>
      </div>`;
    } else {
      panel.innerHTML = `<section role="region" aria-label="Airport services">
        <h2>Airport phone numbers</h2>
        <ul class="record-list">${airport.phones.map(service => `<li class="record-card" role="listitem" aria-label="Record ${esc(service.name)}">
          <div class="record-grid"><div><div class="record-title">${esc(service.name)}</div><div class="record-sub">Airport service hotline</div></div><strong>${esc(service.phone)}</strong></div>
        </li>`).join('')}</ul>
      </section>`;
    }
  };
  page.querySelectorAll('[data-detail-tab]').forEach(button => {
    button.addEventListener('click', () => {
      tab = button.dataset.detailTab;
      page.querySelectorAll('[data-detail-tab]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
      renderPanel();
    });
  });
  renderPanel();
}
