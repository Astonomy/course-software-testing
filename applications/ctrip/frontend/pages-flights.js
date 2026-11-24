import { api, state, go, parseCity } from './store.js';
import {
  esc, money, field, topAlert, openDialog, calendarPopover, isValidId,
  isValidPhone, mobileMask
} from './ui.js';
import { flightsFor, flightByNumber, CALENDAR_FARES, JD5162_SERVICES, TAX_PER_PASSENGER } from './flights.js';

export async function renderFlights(page, query) {
  const view = {
    origin: query.get('origin') || 'Chengdu',
    destination: query.get('destination') || 'Guangzhou',
    date: query.get('date') || '2026-07-21',
    cabin: query.get('cabin') || 'Economy',
    children: query.get('children') === '1',
    nonstop: false,
    airline: 'All airlines',
    sort: 'recommended',
    expanded: new Set(),
    nextWeek: false
  };
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Flight results</span></div>
    <div class="page-heading"><h1>Flight results</h1><p class="page-subtitle">${esc(view.origin)} to ${esc(view.destination)} · ${esc(view.date)} · ${esc(view.cabin)}${view.children ? ' · ' : ''}${view.children ? '<span id="children-included">Children included</span>' : ''}</p></div>
    <section class="card criteria-card" aria-label="Search criteria" id="criteria-card">
      <div class="criteria-row">
        ${field('Origin', `<input id="result-origin" type="text" value="${esc(view.origin)}" autocomplete="off">`)}
        ${field('Destination', `<input id="result-destination" type="text" value="${esc(view.destination)}" autocomplete="off">`)}
        ${field('Departure date', `<input id="result-date" type="text" value="${esc(view.date)}" autocomplete="off">`)}
        ${field('Cabin class', `<select id="result-cabin"><option ${view.cabin === 'Economy' ? 'selected' : ''}>Economy</option><option ${view.cabin === 'Business' ? 'selected' : ''}>Business</option><option ${view.cabin === 'First' ? 'selected' : ''}>First</option></select>`)}
        <div class="inline-actions">
          <button type="button" class="btn blue" id="update-results">Update results</button>
          <button type="button" class="btn" id="search-flights-results">Search flights</button>
        </div>
      </div>
      <div id="criteria-alert"></div>
    </section>
    <section class="card date-bar" role="region" aria-label="Date bar" id="date-bar"></section>
    <div class="results-layout">
      <aside class="card filters" aria-label="Filters" id="filters"></aside>
      <section role="region" aria-label="Flight list" id="flight-list"></section>
    </div>
  </div>`;

  const criteriaAlert = page.querySelector('#criteria-alert');
  const refreshCriteria = () => {
    const origin = page.querySelector('#result-origin');
    const destination = page.querySelector('#result-destination');
    const date = page.querySelector('#result-date');
    const cabin = page.querySelector('#result-cabin');
    view.origin = origin.value;
    view.destination = destination.value;
    view.date = date.value;
    view.cabin = cabin.value;
  };
  const navigateWith = () => {
    const o = parseCity(view.origin);
    const d = parseCity(view.destination);
    if (!o || !d) { topAlert(criteriaAlert, 'Enter an origin and destination'); return false; }
    if (o.toLowerCase() === d.toLowerCase()) {
      topAlert(criteriaAlert, 'Origin and destination cannot be the same'); return false;
    }
    const params = new URLSearchParams({
      origin: o, destination: d, date: view.date, cabin: view.cabin,
      children: view.children ? '1' : '0'
    });
    go('/flights?' + params.toString());
    return true;
  };

  page.querySelector('#result-date').addEventListener('click', () => {
    calendarPopover({
      anchor: page.querySelector('#result-date'), selected: view.date,
      minDate: '2026-07-19', fares: CALENDAR_FARES, label: 'Select departure date',
      onSelect: (iso) => { page.querySelector('#result-date').value = iso; view.date = iso; }
    });
  });
  const submitCriteria = () => {
    criteriaAlert.innerHTML = '';
    refreshCriteria();
    navigateWith();
  };
  page.querySelector('#update-results').addEventListener('click', submitCriteria);
  page.querySelector('#search-flights-results').addEventListener('click', submitCriteria);

  const renderDateBar = () => {
    const host = page.querySelector('#date-bar');
    if (!host) return;
    let dates = ['2026-07-19', '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'];
    if (view.nextWeek) dates = dates.concat(['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31']);
    if (!dates.includes(view.date)) dates.push(view.date);
    host.innerHTML = dates.map(iso => {
      const fare = CALENDAR_FARES[iso];
      return `<button type="button" class="date-choice ${iso === view.date ? 'selected' : ''}" data-date="${iso}" aria-label="${iso}" ${iso === view.date ? 'aria-current="date"' : ''}>
        <strong aria-hidden="true">${iso}</strong>
        <small aria-hidden="true">${fare !== undefined ? money(fare) : 'Check fares'}</small>
      </button>`;
    }).join('') + `<div class="date-bar-actions">
      <button type="button" class="btn" id="more-dates">More dates</button>
      <button type="button" class="btn" id="next-week">Next week</button>
    </div>`;
    host.querySelectorAll('[data-date]').forEach(button => {
      button.addEventListener('click', () => {
        view.date = button.dataset.date;
        const params = new URLSearchParams({ origin: view.origin, destination: view.destination, date: view.date, cabin: view.cabin, children: view.children ? '1' : '0' });
        go('/flights?' + params.toString());
      });
    });
    host.querySelector('#more-dates').addEventListener('click', openMonthlyFares);
    host.querySelector('#next-week').addEventListener('click', () => {
      view.nextWeek = true;
      renderDateBar();
      const target = host.querySelector('[data-date="2026-07-28"]');
      if (target) target.focus();
    });
  };

  const openMonthlyFares = () => {
    const dateBar = page.querySelector('#date-bar');
    if (dateBar) dateBar.hidden = true;
    const dialog = openDialog({
      name: 'Monthly fares', title: 'Monthly fares',
      onClose: () => { if (dateBar) dateBar.hidden = false; },
      body: `<p class="muted small">Lowest fares from ${esc(view.origin)} to ${esc(view.destination)}.</p>
        <div class="city-grid" id="monthly-grid">
          ${Array.from({ length: 11 }, (_, i) => {
            const iso = '2026-07-' + String(i + 18).padStart(2, '0');
            const fare = CALENDAR_FARES[iso];
            return `<button type="button" class="date-choice" data-month-date="${iso}" aria-label="${iso}">
              <strong aria-hidden="true">${iso}</strong><small aria-hidden="true">${fare !== undefined ? money(fare) : 'Check fares'}</small></button>`;
          }).join('')}
        </div>
        <div class="form-actions"><button type="button" class="btn" id="monthly-next-week">Next week</button></div>`
    });
    dialog.body.querySelectorAll('[data-month-date]').forEach(button => {
      button.addEventListener('click', () => {
        dialog.close();
        view.date = button.dataset.monthDate;
        const params = new URLSearchParams({ origin: view.origin, destination: view.destination, date: view.date, cabin: view.cabin, children: view.children ? '1' : '0' });
        go('/flights?' + params.toString());
      });
    });
    dialog.body.querySelector('#monthly-next-week').addEventListener('click', () => {
      dialog.close();
      view.nextWeek = true;
      renderDateBar();
      const target = page.querySelector('[data-date="2026-07-28"]');
      if (target) target.focus();
    });
  };

  const renderFilters = () => {
    const host = page.querySelector('#filters');
    host.innerHTML = `<h2 style="font-size:17px">Filter flights</h2>
      <div class="filter-group">
        <h3>Stops</h3>
        <label class="checkbox"><input type="checkbox" id="nonstop-only" ${view.nonstop ? 'checked' : ''}>Nonstop only</label>
      </div>
      <div class="filter-group">
        <h3>Airline</h3>
        ${field('Airline', `<select id="airline-filter">
          ${['All airlines', 'China Southern', 'China Eastern', 'Other airline'].map(name => `<option ${view.airline === name ? 'selected' : ''}>${name}</option>`).join('')}
        </select>`)}
      </div>
      <div class="filter-group">
        <h3>Sort by</h3>
        <div class="inline-actions" style="flex-direction:column;align-items:stretch">
          <button type="button" class="btn ${view.sort === 'price' ? 'subtle' : ''}" id="sort-price">Price: low to high</button>
          <button type="button" class="btn ${view.sort === 'ontime' ? 'subtle' : ''}" id="sort-ontime">On-time: high to low</button>
          <button type="button" class="btn ${view.sort === 'departure' ? 'subtle' : ''}" id="sort-departure">Departure: earliest first</button>
        </div>
      </div>
      <p class="small muted">Time and airport filters are available in the full search experience.</p>`;
    host.querySelector('#nonstop-only').addEventListener('change', (event) => {
      view.nonstop = event.target.checked;
      renderFilters(); renderFlightsList();
    });
    host.querySelector('#airline-filter').addEventListener('change', (event) => {
      view.airline = event.target.value;
      renderFilters(); renderFlightsList();
    });
    host.querySelector('#sort-price').addEventListener('click', () => { view.sort = 'price'; renderFilters(); renderFlightsList(); });
    host.querySelector('#sort-ontime').addEventListener('click', () => { view.sort = 'ontime'; renderFilters(); renderFlightsList(); });
    host.querySelector('#sort-departure').addEventListener('click', () => { view.sort = 'departure'; renderFilters(); renderFlightsList(); });
  };

  const visibleFlights = () => {
    let items = flightsFor(parseCity(view.origin), parseCity(view.destination), view.date);
    if (view.nonstop) items = items.filter(f => f.stops === 'nonstop');
    if (view.airline !== 'All airlines') items = items.filter(f => f.airline === view.airline);
    if (view.sort === 'price') items.sort((a, b) => a.fare - b.fare);
    if (view.sort === 'ontime') items.sort((a, b) => parseFloat(b.on_time) - parseFloat(a.on_time));
    if (view.sort === 'departure') items.sort((a, b) => a.departure.localeCompare(b.departure));
    return items;
  };

  const renderFlightsList = () => {
    const host = page.querySelector('#flight-list');
    const items = visibleFlights();
    if (!items.length) {
      host.innerHTML = `<div class="card empty-state tall" id="empty-flights">
        <h2>No flights found</h2>
        <p>Try another route or date. The published schedule has no matching flight.</p>
        <button type="button" class="btn" id="modify-search">Modify search</button>
      </div>`;
      host.querySelector('#modify-search').addEventListener('click', () => {
        const origin = page.querySelector('#result-origin');
        origin.focus();
        origin.select();
        page.querySelector('#criteria-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    host.innerHTML = `<div class="flight-list" role="list">${items.map(flight => {
      const expanded = view.expanded.has(flight.number);
      return `<article class="card flight-card" role="listitem" aria-label="Flight ${esc(flight.number)}">
        <div class="airline-cell"><div class="flight-no">${esc(flight.number)}</div><div>${esc(flight.airline)}</div></div>
        <div>
          <div class="flight-times">
            <span class="flight-time">${esc(flight.departure)}</span>
            <span class="flight-route-line"></span>
            <span class="flight-time">${esc(flight.arrival)}</span>
          </div>
          <div class="flight-meta">
            <span>${esc(flight.origin)} → ${esc(flight.destination)}</span>
            <span class="pill">${flight.stops === 'nonstop' ? 'nonstop' : 'stopover'}</span>
            <span>On-time ${esc(flight.on_time)}</span>
            <span class="small">${esc(flight.airline)}</span>
          </div>
        </div>
        <div class="price-cell">
          <div class="price">${money(flight.fare)}</div>
          <div class="price-note">from · taxes ${money(flight.taxes || 70)}</div>
          <button type="button" class="btn ${expanded ? '' : 'primary'}" data-show-fares="${esc(flight.number)}">${expanded ? 'Hide fares' : 'Show fares'}</button>
        </div>
        ${expanded ? `<section class="fare-options" role="region" aria-label="Fare options">
          <div class="section-head"><h3>Fare options</h3><span class="small muted">Choose your fare</span></div>
          <div class="fare-group" role="group" aria-label="Economy fare">
            <div><h4>Economy fare</h4><div class="small muted">Standard seat · ${flight.number} · ${esc(flight.origin)}–${esc(flight.destination)}</div></div>
            <div class="fare-price">${money(flight.fare)}</div>
            <button type="button" class="btn primary" data-book="${esc(flight.number)}">Book</button>
          </div>
          <div class="rules"><strong>Refund and change rules</strong><p>Changes allowed before departure. Refund fee: ${money(JD5162_SERVICES.refund_fee)}.</p></div>
        </section>` : ''}
      </article>`;
    }).join('')}</div>`;
    host.querySelectorAll('[data-show-fares]').forEach(button => {
      button.addEventListener('click', () => {
        const number = button.dataset.showFares;
        if (view.expanded.has(number)) view.expanded.delete(number); else view.expanded.add(number);
        renderFlightsList();
      });
    });
    host.querySelectorAll('[data-book]').forEach(button => {
      button.addEventListener('click', () => {
        const flight = items.find(f => f.number === button.dataset.book);
        const params = new URLSearchParams({
          flight: flight.number, date: view.date, origin: flight.origin,
          destination: flight.destination, cabin: 'Economy'
        });
        go('/book?' + params.toString());
      });
    });
  };

  renderDateBar();
  renderFilters();
  renderFlightsList();
}

// ------------------------------------------------------------------ Booking
export async function renderBooking(page, query) {
  const flightNumber = query.get('flight') || 'JD5162';
  const date = query.get('date') || '2026-07-21';
  const flight = flightByNumber(flightNumber, date) || flightByNumber('JD5162');
  const origin = query.get('origin') || flight.origin;
  const destination = query.get('destination') || flight.destination;
  const fare = flight.fare || 460;
  const tax = flight.taxes ?? JD5162_SERVICES.taxes_per_passenger;
  const booking = {
    frequent: new Set(),
    travelers: [],
    services: { insurance: false, baggage: false, dropoff: false, lounge: false },
    contact: state.user?.mobile || '',
    fullName: '',
    idNumber: '',
    idError: '',
    agreed: false,
    showFeeDetails: false,
    reminderOpen: false
  };
  if (state.user) {
    try {
      const personal = await api('personal.list');
      booking.travelers = personal.travelers || [];
    } catch (e) { booking.travelers = []; }
  }
  const count = () => Math.max(1, booking.frequent.size);
  const serviceTotal = () =>
    (booking.services.insurance ? JD5162_SERVICES.insurance : 0) +
    (booking.services.baggage ? JD5162_SERVICES.extra_10kg : 0) +
    (booking.services.dropoff ? JD5162_SERVICES.drop_off : 0) +
    (booking.services.lounge ? JD5162_SERVICES.lounge : 0);
  const total = () => (fare + tax) * count() + serviceTotal();

  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><a href="#/flights?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${date}&cabin=Economy&children=0">Flight results</a><span aria-hidden="true">›</span><span>Book flight</span></div>
    <div class="page-heading"><h1>Book flight</h1>
      <p class="page-subtitle"><strong>${esc(flight.number)}</strong> · ${esc(origin)} → ${esc(destination)} · ${esc(date)} · Economy</p>
    </div>
    <section class="card section" role="region" aria-label="Travel reminders">
      <div class="section-head"><h2>Travel reminders</h2><button type="button" class="btn" id="reminder-toggle">${booking.reminderOpen ? 'Hide reminder details' : 'Show reminder details'}</button></div>
      <div class="notice-box">Please arrive at the airport at least 90 minutes before departure and keep your identification handy.</div>
      <div class="reminder-details" id="reminder-details" ${booking.reminderOpen ? '' : 'hidden'}>
        <p><strong>Power banks</strong> must be carried in cabin baggage and must not be placed in checked baggage.</p>
        <p><strong>Baggage allowance</strong>: ${JD5162_SERVICES.baggage_kg} kg of free checked baggage is included for this fare.</p>
      </div>
    </section>
    <div class="two-col">
      <div id="booking-main"></div>
      <aside class="booking-side" id="booking-side"></aside>
    </div>
  </div>`;
  page.querySelector('#reminder-toggle').addEventListener('click', () => {
    booking.reminderOpen = !booking.reminderOpen;
    page.querySelector('#reminder-details').hidden = !booking.reminderOpen;
    page.querySelector('#reminder-toggle').textContent = booking.reminderOpen ? 'Hide reminder details' : 'Show reminder details';
  });

  const captureFields = () => {
    const name = page.querySelector('#passenger-full-name');
    const id = page.querySelector('#passenger-id-number');
    const contact = page.querySelector('#contact-mobile');
    if (name) booking.fullName = name.value;
    if (id) booking.idNumber = id.value;
    if (contact) booking.contact = contact.value;
  };

  const renderMain = () => {
    const host = page.querySelector('#booking-main');
    const selectedNames = booking.travelers.filter(t => booking.frequent.has(String(t.id))).map(t => t.name);
    host.innerHTML = `
      ${state.user ? `<section class="card section" role="region" aria-label="Frequent passengers">
        <div class="section-head"><h2>Frequent passengers</h2></div>
        <p class="small muted">Select saved travelers, or provide passenger details below.</p>
        <div class="traveler-grid">
          ${booking.travelers.length ? booking.travelers.map(traveler => `<div class="traveler-choice">
            <label class="checkbox"><input type="checkbox" data-traveler="${traveler.id}" ${booking.frequent.has(String(traveler.id)) ? 'checked' : ''}>${esc(traveler.name)}</label>
            <div class="small muted">${esc(traveler.id_number || 'Identity on file')}</div>
          </div>`).join('') : '<p class="muted">No saved travelers yet.</p>'}
        </div>
      </section>` : ''}
      <section class="card section" role="region" aria-label="Selected passengers">
        <div class="section-head"><h2>Selected passengers</h2><span class="small muted">${selectedNames.length ? selectedNames.length + ' selected' : 'Standard passenger'}</span></div>
        <div id="selected-passengers">${selectedNames.length ? selectedNames.map(name => `<span class="passenger-tag">${esc(name)}</span>`).join('\n') : '<p class="muted">Passenger 1 uses the details below.</p>'}</div>
      </section>
      <section class="card section" role="region" aria-label="Passenger details">
        <div class="section-head"><h2>Passenger details</h2><div class="inline-actions"><span class="small muted">Required for the ad hoc passenger</span><button type="button" class="btn" id="add-passenger">Add passenger</button></div></div>
        <div class="form-grid">
          ${field('Full name', `<input id="passenger-full-name" type="text" value="${esc(booking.fullName)}" autocomplete="name">`, { className: 'wide' })}
          ${field('ID number', `<input id="passenger-id-number" type="text" value="${esc(booking.idNumber)}" autocomplete="off">`, { className: 'wide' })}
        </div>
        <div id="id-error-host">${booking.idError ? `<div class="inline-alert" role="alert">${esc(booking.idError)}</div>` : ''}</div>
        <p class="small muted">Mainland ID numbers are checked for a valid checksum. This passenger is not saved to your traveler list.</p>
      </section>
      <section class="card section" role="region" aria-label="Contact information">
        <div class="section-head"><h2>Contact information</h2><span class="small muted">Booking updates are sent here</span></div>
        ${field('Contact mobile', `<input id="contact-mobile" type="tel" value="${esc(booking.contact)}" autocomplete="tel">`)}
        <div id="contact-error-host"></div>
      </section>
      <section class="card section" role="region" aria-label="Trip protection">
        <div class="section-head"><h2>Trip protection</h2><button type="button" class="btn" id="insurance-terms">Insurance terms</button></div>
        <label class="checkbox"><input type="checkbox" id="combo-insurance" ${booking.services.insurance ? 'checked' : ''}>Combo insurance <span class="service-price" aria-hidden="true">+${money(JD5162_SERVICES.insurance)}</span></label>
        <p class="small muted" style="margin-top:6px">Cover for delays and baggage mishaps on this journey.</p>
      </section>
      <section class="card section" role="region" aria-label="Baggage allowance">
        <div class="section-head"><h2>Baggage allowance</h2><span class="pill green">Free checked baggage: ${JD5162_SERVICES.baggage_kg} kg</span></div>
        <label class="checkbox"><input type="checkbox" id="extra-baggage" ${booking.services.baggage ? 'checked' : ''}>Extra 10 kg <span class="service-price" aria-hidden="true">+${money(JD5162_SERVICES.extra_10kg)}</span></label>
        ${booking.services.baggage ? `<p class="notice-box" style="margin-top:10px"><strong>Checked baggage: 30 kg</strong> total after adding 10 kg.</p>` : ''}
      </section>
      <section class="card section" role="region" aria-label="Airport transfer">
        <div class="section-head"><h2>Airport transfer</h2><span class="small muted">Door-to-door convenience</span></div>
        ${field('Pickup address', `<input id="pickup-address" type="text" placeholder="Enter a pickup address" value="${esc(booking.pickupAddress || '')}">`)}
        <label class="checkbox" style="margin-top:10px"><input type="checkbox" id="airport-dropoff" ${booking.services.dropoff ? 'checked' : ''}>Airport drop-off <span class="service-price" aria-hidden="true">+${money(JD5162_SERVICES.drop_off)}</span></label>
        ${booking.services.dropoff ? `<p class="small" style="color:var(--orange-dark)">Estimated fare: ${money(JD5162_SERVICES.drop_off)}</p>` : ''}
      </section>
      <section class="card section" role="region" aria-label="Airport services">
        <div class="section-head"><h2>Airport services</h2><span class="small muted">Relax before boarding</span></div>
        <label class="checkbox"><input type="checkbox" id="lounge-service" ${booking.services.lounge ? 'checked' : ''}>Tianfu T2 lounge <span class="service-price" aria-hidden="true">+${money(JD5162_SERVICES.lounge)}</span></label>
      </section>
      <section class="card section">
        <div id="submit-alert-host"></div>
        <label class="checkbox agreement-row"><input type="checkbox" id="booking-terms" ${booking.agreed ? 'checked' : ''}>Agree to booking terms</label>
        <button type="button" class="btn primary block lg" id="submit-order" style="margin-top:14px">Submit order</button>
      </section>`;
    bindMain();
  };

  const renderSide = () => {
    const host = page.querySelector('#booking-side');
    const lines = [];
    lines.push(`<li><span>Fare × ${count()}</span><span>${money(fare * count())}</span></li>`);
    lines.push(`<li><span>Taxes × ${count()}</span><span>${money(tax * count())}</span></li>`);
    if (booking.services.insurance) lines.push(`<li><span>Combo insurance: ${money(JD5162_SERVICES.insurance)}</span><span></span></li>`);
    if (booking.services.baggage) lines.push(`<li><span>Extra 10 kg: ${money(JD5162_SERVICES.extra_10kg)}</span><span></span></li>`);
    if (booking.services.dropoff) lines.push(`<li><span>Airport drop-off: ${money(JD5162_SERVICES.drop_off)}</span><span></span></li>`);
    if (booking.services.lounge) lines.push(`<li><span>Tianfu T2 lounge: ${money(JD5162_SERVICES.lounge)}</span><span></span></li>`);
    host.innerHTML = `<section class="card fee-summary" role="region" aria-label="Fee breakdown">
      <div class="section-head"><h2>Fee breakdown</h2><span class="pill">${esc(flightNumber)}</span></div>
      <ul class="fee-lines">${lines.join('')}</ul>
      <div class="small">Passengers: ${count()}</div>
      <div class="fee-total"><span>Order total: ${money(total())}</span><span class="amount" aria-hidden="true">${money(total())}</span></div>
      <button type="button" class="btn block" id="fee-details-button" style="margin-top:12px">Fee details</button>
      ${booking.showFeeDetails ? `<section class="fee-lines" role="region" aria-label="Fee details" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
        <h3 style="font-size:15px;margin:0">Fee details</h3>
        <div>Fare: ${money(fare * count())}</div>
        <div>Taxes: ${money(tax * count())}</div>
        ${booking.services.insurance ? `<div>Combo insurance: ${money(JD5162_SERVICES.insurance)}</div>` : ''}
        ${booking.services.baggage ? `<div>Extra 10 kg: ${money(JD5162_SERVICES.extra_10kg)}</div>` : ''}
        ${booking.services.dropoff ? `<div>Airport drop-off: ${money(JD5162_SERVICES.drop_off)}</div>` : ''}
        ${booking.services.lounge ? `<div>Tianfu T2 lounge: ${money(JD5162_SERVICES.lounge)}</div>` : ''}
        <div style="font-weight:700;margin-top:6px">Order total: ${money(total())}</div>
      </section>` : ''}
      <p class="small muted" style="margin-bottom:0">Payment is simulated. Your order is held while you pay.</p>
    </section>`;
    host.querySelector('#fee-details-button').addEventListener('click', () => {
      captureFields();
      booking.showFeeDetails = true;
      renderSide();
      const details = host.querySelector('[role="region"][aria-label="Fee details"]');
      if (details) details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const bindMain = () => {
    const host = page.querySelector('#booking-main');
    host.querySelectorAll('[data-traveler]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        captureFields();
        const id = checkbox.dataset.traveler;
        if (checkbox.checked) booking.frequent.add(id); else booking.frequent.delete(id);
        renderMain(); renderSide();
      });
    });
    const add = host.querySelector('#add-passenger');
    if (add) {
      add.addEventListener('click', () => {
        const dialog = openDialog({
          name: 'Add passenger', title: 'Add passenger',
          body: `<div class="form-grid">${field('Full name', '<input id="dialog-full-name" type="text">', { className: 'wide' })}${field('ID number', '<input id="dialog-id-number" type="text">', { className: 'wide' })}</div>`,
          footer: `<button type="button" class="btn" id="dialog-cancel">Close</button>`
        });
        dialog.footer.querySelector('#dialog-cancel').addEventListener('click', () => dialog.close());
      });
    }
    const idInput = host.querySelector('#passenger-id-number');
    if (idInput) {
      idInput.addEventListener('input', () => {
        booking.idNumber = idInput.value;
        booking.idError = '';
        host.querySelector('#id-error-host').innerHTML = '';
        idInput.removeAttribute('aria-invalid');
      });
      idInput.addEventListener('blur', () => {
        booking.idNumber = idInput.value;
        if (booking.idNumber && !isValidId(booking.idNumber)) {
          booking.idError = 'Enter a valid ID number';
          host.querySelector('#id-error-host').innerHTML = '<div class="inline-alert" role="alert">Enter a valid ID number</div>';
          idInput.setAttribute('aria-invalid', 'true');
        } else {
          booking.idError = '';
          host.querySelector('#id-error-host').innerHTML = '';
          idInput.removeAttribute('aria-invalid');
        }
      });
    }
    const fullName = host.querySelector('#passenger-full-name');
    if (fullName) fullName.addEventListener('input', () => { booking.fullName = fullName.value; });
    const contact = host.querySelector('#contact-mobile');
    if (contact) contact.addEventListener('input', () => { booking.contact = contact.value; });
    const pickup = host.querySelector('#pickup-address');
    if (pickup) pickup.addEventListener('input', () => { booking.pickupAddress = pickup.value; });
    const insurance = host.querySelector('#combo-insurance');
    if (insurance) insurance.addEventListener('change', () => {
      captureFields(); booking.services.insurance = insurance.checked; renderMain(); renderSide();
    });
    const baggage = host.querySelector('#extra-baggage');
    if (baggage) baggage.addEventListener('change', () => {
      captureFields(); booking.services.baggage = baggage.checked; renderMain(); renderSide();
    });
    const dropoff = host.querySelector('#airport-dropoff');
    if (dropoff) dropoff.addEventListener('change', () => {
      captureFields(); booking.services.dropoff = dropoff.checked; renderMain(); renderSide();
    });
    const lounge = host.querySelector('#lounge-service');
    if (lounge) lounge.addEventListener('change', () => {
      captureFields(); booking.services.lounge = lounge.checked; renderMain(); renderSide();
    });
    host.querySelector('#insurance-terms').addEventListener('click', () => {
      openDialog({
        name: 'Insurance terms', title: 'Insurance terms',
        body: `<h3>Flight delay coverage</h3>
          <p>If your flight is delayed by more than three hours, covered expenses may be reimbursed.</p>
          <p><strong>Coverage limit: ¥1000</strong></p>
          <h3>How to claim</h3>
          <p>Open the order after travel, choose the insurance claim action and upload your delay certificate. Claims are reviewed within ten business days.</p>`
      });
    });
    const terms = host.querySelector('#booking-terms');
    if (terms) terms.addEventListener('change', () => { booking.agreed = terms.checked; });
    host.querySelector('#submit-order').addEventListener('click', submitBooking);
  };

  const submitBooking = async () => {
    captureFields();
    const host = page.querySelector('#booking-main');
    topAlert(host.querySelector('#submit-alert-host'), '');
    const selectedNames = booking.travelers.filter(t => booking.frequent.has(String(t.id))).map(t => t.name);
    if (!booking.frequent.size) {
      if (!booking.fullName.trim()) { topAlert(host.querySelector('#submit-alert-host'), 'Enter a full name'); return; }
      if (!isValidId(booking.idNumber)) {
        booking.idError = 'Enter a valid ID number';
        host.querySelector('#id-error-host').innerHTML = '<div class="inline-alert" role="alert">Enter a valid ID number</div>';
        host.querySelector('#passenger-id-number').focus();
        return;
      }
    }
    if (!isValidPhone(booking.contact)) {
      topAlert(host.querySelector('#submit-alert-host'), 'Enter a valid contact mobile number');
      return;
    }
    if (!booking.agreed) {
      topAlert(host.querySelector('#submit-alert-host'), 'Agree to booking terms first');
      return;
    }
    const passengers = selectedNames.length ? selectedNames : [booking.fullName.trim()];
    const services = [];
    if (booking.services.insurance) services.push({ name: 'Combo insurance', amount: JD5162_SERVICES.insurance });
    if (booking.services.baggage) services.push({ name: 'Extra 10 kg', amount: JD5162_SERVICES.extra_10kg });
    if (booking.services.dropoff) services.push({ name: 'Airport drop-off', amount: JD5162_SERVICES.drop_off });
    if (booking.services.lounge) services.push({ name: 'Tianfu T2 lounge', amount: JD5162_SERVICES.lounge });
    try {
      const result = await api('orders.create', {
        flight: { number: flight.number, date, origin, destination, airline: flight.airline, departure: flight.departure, fare, taxes: tax },
        passengers, passenger_count: count(), services, total: total(), contact_mobile: booking.contact
      });
      go('/payment/' + encodeURIComponent(result.order.number));
    } catch (error) {
      topAlert(host.querySelector('#submit-alert-host'), error.message);
    }
  };

  renderMain();
  renderSide();
}

// ------------------------------------------------------------------ Payment
export async function renderPayment(page, query, params) {
  const number = decodeURIComponent(params[0] || '');
  let order;
  try {
    const result = await api('orders.get', { number });
    order = result.order;
  } catch (error) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Payment</h1><div class="inline-alert" role="alert">${esc(error.message)}</div><a href="#/">Return home</a></div></div>`;
    return;
  }
  const initialSeconds = order.remaining_seconds || 0;
  const started = Date.now();
  const renderPaid = () => {
    page.innerHTML = `<div class="container"><div class="payment-shell">
      <div class="page-heading"><h1>Payment</h1><p class="page-subtitle">Order ${esc(order.number)}</p></div>
      <div class="card section status-panel">
        <div class="status-icon" aria-hidden="true">✓</div>
        <h2 role="status">Payment successful</h2>
        <p>Your payment for order <strong>${esc(order.number)}</strong> has been received.</p>
        <div class="info-box" style="text-align:left;margin-top:16px">
          <strong>${esc(order.flight)}</strong> · ${esc(order.origin)} → ${esc(order.destination)} · ${esc(order.flight_date)}
          <div class="small muted">Total paid ${money(order.total)} · ${esc(order.display_status || 'Not traveled')}</div>
        </div>
        <div class="form-actions"><a class="btn" href="#/orders">View orders</a><a class="btn primary" href="#/">Back to home</a></div>
      </div>
    </div></div>`;
  };
  if (order.payment_status !== 'Pending payment') {
    if (order.payment_status === 'Closed') {
      page.innerHTML = `<div class="container"><div class="payment-shell"><div class="page-heading"><h1>Payment</h1></div><div class="card section"><h2>Order closed</h2><p>Order ${esc(order.number)} for ${esc(order.flight)} is closed and can no longer be paid.</p><a class="btn" href="#/orders">View orders</a></div></div></div>`;
    } else {
      renderPaid();
    }
    return;
  }
  page.innerHTML = `<div class="container"><div class="payment-shell">
    <div class="page-heading"><h1>Payment</h1><p class="page-subtitle">Complete payment for your flight booking.</p></div>
    <div id="payment-alert"></div>
    <div class="card section">
      <div class="section-head"><h2>${esc(order.flight)} · ${esc(order.origin)} → ${esc(order.destination)}</h2><span class="status-badge pending">${esc(order.payment_status)}</span></div>
      <p class="small muted">Order <strong>${esc(order.number)}</strong> · ${esc(order.flight_date)} · departure ${esc(order.departure || '')}</p>
      <div class="order-grid" style="margin:18px 0">
        <div><span class="label">Order number</span>${esc(order.number)}</div>
        <div><span class="label">Passengers</span>${(order.passengers_json || []).length || 1}</div>
        <div><span class="label">Contact mobile</span>${esc(mobileMask(order.contact_mobile))}</div>
        <div><span class="label">Order total</span><strong>${money(order.total)}</strong></div>
      </div>
      <div class="timeline-note" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
        <span>Unpaid orders are cancelled when the timer expires.</span>
        <span>Time remaining <strong class="timer" role="timer" aria-label="Time remaining" id="payment-timer">--:--</strong></span>
      </div>
      <div class="pay-methods" role="radiogroup" aria-label="Payment method">
        <label class="pay-method"><input type="radio" name="payment-method" value="Alipay"> Alipay</label>
      </div>
      <div class="fee-total"><span>Amount due ${money(order.total)}</span><span class="payment-total">${money(order.total)}</span></div>
      <button type="button" class="btn primary block lg" id="pay-now" style="margin-top:15px">Pay now</button>
    </div>
  </div></div>`;

  const timer = page.querySelector('#payment-timer');
  let interval;
  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const remaining = Math.max(0, initialSeconds - elapsed);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    timer.textContent = hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (remaining <= 0) clearInterval(interval);
  };
  updateTimer();
  interval = setInterval(updateTimer, 1000);
  page.querySelector('#pay-now').addEventListener('click', async () => {
    const selected = page.querySelector('input[name="payment-method"]:checked');
    if (!selected) { topAlert(page.querySelector('#payment-alert'), 'Select a payment method'); return; }
    try {
      const result = await api('orders.pay', { number: order.number, method: selected.value });
      order = result.order;
      clearInterval(interval);
      renderPaid();
    } catch (error) { topAlert(page.querySelector('#payment-alert'), error.message); }
  });
  window.addEventListener('hashchange', () => clearInterval(interval), { once: true });
}
