/* Search results, booking form, confirmation, payment and quick login. */
(function () {
  'use strict';
  const App = window.App;

  function secondClassPrice(train) {
    return 'CNY ' + App.priceInt(train.second_price);
  }

  function trainRow(train, date, from, to) {
    return `<tr data-train="${App.esc(train.number)}">
      <td class="train-cell"><strong class="train-number">${App.esc(train.number)}</strong>
        <span class="station-pair">${App.esc(train.from_station)} → ${App.esc(train.to_station)}</span></td>
      <td class="dep-time">${App.esc(train.departure)}</td>
      <td>${App.durationText(train.duration)}</td>
      <td>${App.esc(train.arrival)}</td>
      <td class="price-cell"><span class="seat-kind">Second-class seat</span><span class="price-value">${secondClassPrice(train)}</span>
        <button type="button" class="btn btn-primary book-btn" data-train="${App.esc(train.number)}" data-date="${App.esc(date)}" data-from="${App.esc(from)}" data-to="${App.esc(to)}" ${train.any_available ? '' : 'disabled'}>Book</button>
      </td>
    </tr>`;
  }

  function resultsTable(trains, date, from, to) {
    return `<table class="results-table" aria-label="Train search results">
      <thead><tr>
        <th scope="col">Train No.</th>
        <th scope="col"><button type="button" class="sort-btn" data-sort="departure">Departure Time</button></th>
        <th scope="col"><button type="button" class="sort-btn" data-sort="duration">Travel time</button></th>
        <th scope="col"><button type="button" class="sort-btn" data-sort="arrival">Arrival Time</button></th>
        <th scope="col">Price</th>
      </tr></thead>
      <tbody id="train-table-body">${trains.map(function (t) { return trainRow(t, date, from, to); }).join('')}</tbody>
    </table>`;
  }

  function transferArticle(plan) {
    return `<article class="transfer-plan" aria-label="${App.esc(plan.first)} and ${App.esc(plan.second)} transfer plan">
      <div class="plan-head">
        <div><span class="transfer-number">${App.esc(plan.first)}</span><span class="plus">+</span><span class="transfer-number">${App.esc(plan.second)}</span></div>
        <div class="plan-via">via ${App.esc(plan.via)}</div>
      </div>
      <div class="plan-segments">
        <div class="segment">
          <div class="segment-line"><strong>${App.esc(plan.first)}</strong> ${App.esc(plan.first_route)}</div>
          <div class="segment-times">${App.esc(plan.first_times)} · ${plan.first_minutes} minutes</div>
          <div class="segment-price">CNY ${plan.first_price}</div>
        </div>
        <div class="segment">
          <div class="segment-line"><strong>${App.esc(plan.second)}</strong> ${App.esc(plan.second_route)}</div>
          <div class="segment-times">${App.esc(plan.second_times)} · ${plan.second_minutes} minutes</div>
          <div class="segment-price">CNY ${plan.second_price}</div>
        </div>
      </div>
      <div class="plan-meta"><span>Transfer waiting ${App.esc(plan.wait_text)}</span><span>Total travel time: ${plan.total} minutes</span>
        <button type="button" class="btn btn-primary transfer-book">Book</button></div>
    </article>`;
  }

  App.quickLoginDialog = function (target) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal-backdrop" data-modal="quick-login">
      <div class="modal quick-login" role="dialog" aria-modal="true" aria-labelledby="quick-login-title">
        <button type="button" class="modal-x" data-close aria-label="Close">×</button>
        <div class="quick-login-title"><img src="/assets/logo-icon.png" alt="12306 icon"><h2 id="quick-login-title">Login</h2></div>
        <form id="quick-login-form" novalidate>
          <div class="form-field"><label class="sr-only" for="quick-identifier">Email/Username/Mobile number</label>
            <input id="quick-identifier" type="text" placeholder="Email/Username/Mobile number" autocomplete="username"></div>
          <div class="form-field"><label class="sr-only" for="quick-password">Password</label>
            <input id="quick-password" type="password" placeholder="Password" autocomplete="current-password"></div>
          <div class="quick-help"><a href="#/forgot-password">Forgot your password</a></div>
          <button type="submit" class="btn btn-primary btn-block">LOGIN</button>
          <p class="quick-register"><a href="#/register">No account yet? Register now.</a></p>
          <div class="form-slot"></div>
        </form>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const back = wrap.querySelector('.modal-backdrop');
    const form = wrap.querySelector('#quick-login-form');
    const slot = wrap.querySelector('.form-slot');
    wrap.querySelector('[data-close]').addEventListener('click', function () { back.remove(); });
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
    setTimeout(function () { const el = wrap.querySelector('#quick-identifier'); if (el) el.focus(); }, 30);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      slot.innerHTML = '';
      const identifier = wrap.querySelector('#quick-identifier').value.trim();
      const password = wrap.querySelector('#quick-password').value;
      try {
        const result = await App.api('login', { identifier: identifier, password: password });
        App.user = result.user;
        back.remove();
        App.setFlash('Login successful.');
        if (target) App.go('/booking', target);
      } catch (err) {
        slot.innerHTML = App.alertHtml(err.message);
      }
    });
  };

  App.page('/results', {
    title: 'Tickets',
    render: async function (params) {
      const defaults = App.defaults;
      const from = App.canonicalCity(params.get('from') || defaults.from) || defaults.from;
      const to = App.canonicalCity(params.get('to') || defaults.to) || defaults.to;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : defaults.date;
      const data = await App.api('search', { from: from, to: to, date: date });
      App._resultsCache = { key: from + '|' + to + '|' + date, data: data };
      const fromStations = Array.from(new Set(data.trains.map(function (t) { return t.from_station; })));
      const toStations = Array.from(new Set(data.trains.map(function (t) { return t.to_station; })));
      const emptyDirect = data.trains.length === 0;
      return `<div class="results-page">
        <section class="results-search" role="region" aria-label="Ticket search">
          <form id="results-search-form" novalidate>
            <div class="search-grid compact">
              ${App.locationField({ id: 'results-from', label: 'From', value: data.from })}
              ${App.locationField({ id: 'results-to', label: 'To', value: data.to })}
              ${App.dateField({ id: 'results-date', label: 'Date', value: data.date })}
              <div class="search-action"><button type="submit" class="btn btn-primary btn-search">Search</button></div>
            </div>
            <div class="search-error-slot"></div>
          </form>
        </section>
        <section class="travel-dates" role="region" aria-label="Travel dates">
          <div class="travel-dates-scroll">${App.dateRange().map(function (d) {
            return `<button type="button" class="travel-date ${d === data.date ? 'selected' : ''}" data-date="${d}" aria-pressed="${d === data.date}">${d}</button>`;
          }).join('')}</div>
        </section>
        <div class="results-layout">
          <aside class="filter-panel" role="region" aria-label="Filter">
            <h2>Filter</h2>
            <div class="filter-group" role="group" aria-label="Train type">
              <h3>Train type</h3>
              <label class="check-line"><input type="checkbox" name="train-type" value="all" checked> All</label>
              <label class="check-line"><input type="checkbox" name="train-type" value="gcd"> G/C/D</label>
              <label class="check-line"><input type="checkbox" name="train-type" value="other"> Other</label>
            </div>
            <div class="filter-group">
              <label for="filter-from-station">From Station</label>
              <select id="filter-from-station"><option value="">All</option>${fromStations.map(function (s) { return `<option value="${App.esc(s)}">${App.esc(s)}</option>`; }).join('')}</select>
            </div>
            <div class="filter-group">
              <label for="filter-to-station">To Station</label>
              <select id="filter-to-station"><option value="">All</option>${toStations.map(function (s) { return `<option value="${App.esc(s)}">${App.esc(s)}</option>`; }).join('')}</select>
            </div>
            <div class="filter-group">
              <label for="filter-departure-time">Departure time</label>
              <select id="filter-departure-time">
                <option>00:00-24:00</option><option>00:00-06:00</option><option>06:00-12:00</option><option>12:00-18:00</option><option>18:00-24:00</option>
              </select>
            </div>
          </aside>
          <section class="results-main" aria-label="Search results">
            <div class="route-summary"><h2>${App.esc(data.from_label)} - ${App.esc(data.to_label)}</h2><span id="result-count">${data.count} results</span></div>
            <div id="results-body">${emptyDirect
              ? `<div class="empty-state direct-empty"><img src="/assets/empty.png" alt="No trains"><p>sorry, according to your inquiry condition, there is no train at present.</p></div>`
              : resultsTable(data.trains, data.date, data.from, data.to)}</div>
            ${data.transfers && data.transfers.length ? `<section class="transfer-zone" role="region" aria-label="Transfer plans">
              <div class="transfer-head"><h2>Transfer plans</h2><div class="transfer-sort">
                <button type="button" class="sort-btn" data-transfer-sort="departure">Departure Time</button>
                <button type="button" class="sort-btn" data-transfer-sort="total">Travel time</button>
                <button type="button" class="sort-btn" data-transfer-sort="arrival">Arrival Time</button>
              </div></div>
              <div id="transfer-list">${data.transfers.slice().sort(function (a, b) { return a.total - b.total; }).map(transferArticle).join('')}</div>
            </section>` : ''}
          </section>
        </div>
      </div>`;
    },
    bind: async function (params) {
      const cacheKey = (App.canonicalCity(params.get('from') || App.defaults.from) || App.defaults.from) + '|' +
        (App.canonicalCity(params.get('to') || App.defaults.to) || App.defaults.to) + '|' +
        (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : App.defaults.date);
      let data;
      if (App._resultsCache && App._resultsCache.key === cacheKey) data = App._resultsCache.data;
      else {
        data = await App.api('search', {
          from: App.canonicalCity(params.get('from') || App.defaults.from) || App.defaults.from,
          to: App.canonicalCity(params.get('to') || App.defaults.to) || App.defaults.to,
          date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : App.defaults.date,
        });
      }
      const resultsRoot = document.querySelector('.results-page');
      const state = {
        sortKey: null, sortDir: 1,
        typeMode: 'all', fromStation: '', toStation: '', depRange: '00:00-24:00',
        transfers: (data.transfers || []).slice().sort(function (a, b) { return a.total - b.total; }),
        transferKey: null, transferDir: 1,
      };
      const byNumber = {};
      data.trains.forEach(function (t) { byNumber[t.number] = t; });
      const body = document.getElementById('results-body');
      const countEl = document.getElementById('result-count');
      const travelDates = document.querySelector('.travel-dates');

      App.bindLocationFields();
      App.bindDateField(document, {
        onOpen: function () { if (travelDates) travelDates.hidden = true; },
        onClose: function () { if (travelDates) travelDates.hidden = false; },
      });

      function applyFilters() {
        let list = data.trains.slice();
        if (state.typeMode === 'gcd') list = list.filter(function (t) { return /^[GCD]/.test(t.number); });
        if (state.typeMode === 'other') list = list.filter(function (t) { return !/^[GCD]/.test(t.number); });
        if (state.fromStation) list = list.filter(function (t) { return t.from_station === state.fromStation; });
        if (state.toStation) list = list.filter(function (t) { return t.to_station === state.toStation; });
        if (state.depRange !== '00:00-24:00') {
          const bits = state.depRange.split('-');
          const lo = bits[0];
          const hi = bits[1] === '24:00' ? '24:00' : bits[1];
          list = list.filter(function (t) { return t.departure >= lo && t.departure < hi; });
        }
        if (state.sortKey) {
          list.sort(function (a, b) {
            let av = a[state.sortKey];
            let bv = b[state.sortKey];
            if (typeof av === 'string') { av = state.sortKey === 'duration' ? Number(av) : av; bv = state.sortKey === 'duration' ? Number(bv) : bv; }
            if (av < bv) return -1 * state.sortDir;
            if (av > bv) return 1 * state.sortDir;
            return a.number.localeCompare(b.number) * state.sortDir;
          });
        }
        countEl.textContent = list.length + ' results';
        if (list.length === 0) {
          body.innerHTML = data.trains.length === 0
            ? `<div class="empty-state direct-empty"><img src="/assets/empty.png" alt="No trains"><p>sorry, according to your inquiry condition, there is no train at present.</p></div>`
            : '<div class="empty-state"><p>No trains match the selected filters.</p></div>';
        } else {
          body.innerHTML = resultsTable(list, data.date, data.from, data.to);
        }
      }

      document.querySelectorAll('input[name=train-type]').forEach(function (box) {
        box.addEventListener('change', function () {
          state.typeMode = box.value;
          document.querySelectorAll('input[name=train-type]').forEach(function (other) {
            other.checked = other.value === box.value;
          });
          applyFilters();
        });
      });
      document.getElementById('filter-from-station').addEventListener('change', function (e) { state.fromStation = e.target.value; applyFilters(); });
      document.getElementById('filter-to-station').addEventListener('change', function (e) { state.toStation = e.target.value; applyFilters(); });
      document.getElementById('filter-departure-time').addEventListener('change', function (e) { state.depRange = e.target.value; applyFilters(); });
      document.addEventListener('click', function (e) {
        if (!document.body.contains(resultsRoot)) return;
        const sort = e.target.closest('.sort-btn[data-sort]');
        if (sort) {
          const key = sort.dataset.sort;
          if (state.sortKey === key) state.sortDir *= -1;
          else { state.sortKey = key; state.sortDir = 1; }
          applyFilters();
          return;
        }
        const book = e.target.closest('.book-btn');
        if (book && !book.disabled) {
          if (!App.user) {
            App.quickLoginDialog({ train: book.dataset.train, date: book.dataset.date, from: book.dataset.from, to: book.dataset.to });
          } else {
            App.go('/booking', { train: book.dataset.train, date: book.dataset.date, from: book.dataset.from, to: book.dataset.to });
          }
          return;
        }
        const travel = e.target.closest('.travel-date');
        if (travel) {
          App.go('/results', { from: data.from, to: data.to, date: travel.dataset.date });
          return;
        }
        const transferBook = e.target.closest('.transfer-book');
        if (transferBook) {
          let note = document.querySelector('.transfer-book-note');
          if (!note) {
            note = document.createElement('p');
            note.className = 'transfer-book-note muted';
            note.setAttribute('role', 'status');
            document.querySelector('.transfer-zone').appendChild(note);
          }
          note.textContent = 'Transfer booking is not available online; please book at the station counter.';
          return;
        }
      });

      const form = document.getElementById('results-search-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const slot = form.querySelector('.search-error-slot');
        slot.innerHTML = '';
        const values = App.validateSearch(
          document.getElementById('results-from').value,
          document.getElementById('results-to').value,
          document.getElementById('results-date').value
        );
        if (values.error) { slot.innerHTML = App.alertHtml(values.error); return; }
        App.go('/results', { from: values.from, to: values.to, date: values.date });
      });

      document.querySelectorAll('[data-transfer-sort]').forEach(function (button) {
        button.addEventListener('click', function () {
          const key = button.dataset.transferSort;
          if (state.transferKey === key) state.transferDir *= -1;
          else { state.transferKey = key; state.transferDir = 1; }
          state.transfers.sort(function (a, b) {
            let av = key === 'departure' ? a.departure : key === 'arrival' ? a.arrival : a.total;
            let bv = key === 'departure' ? b.departure : key === 'arrival' ? b.arrival : b.total;
            if (av < bv) return -1 * state.transferDir;
            if (av > bv) return 1 * state.transferDir;
            return a.first.localeCompare(b.first) * state.transferDir;
          });
          document.getElementById('transfer-list').innerHTML = state.transfers.map(transferArticle).join('');
        });
      });
    },
    noScroll: false,
  });

  App.page('/booking', {
    title: 'Booking',
    auth: true,
    render: async function (params) {
      const trainKey = params.get('train') || 'G1001';
      const dateKey = params.get('date') || App.defaults.date;
      const fromKey = params.get('from') || 'Shanghai';
      const toKey = params.get('to') || 'Beijing';
      const data = await App.api('booking', {
        train: trainKey,
        date: dateKey,
        from: fromKey,
        to: toKey,
      });
      App._bookingCache = { key: trainKey + '|' + dateKey + '|' + fromKey + '|' + toKey, data: data };
      const train = data.train;
      return `<div class="content-page booking-page">
        <div class="breadcrumb"><a href="#/home">HOME</a> &gt; Booking</div>
        <section class="train-info" role="region" aria-label="Train Information">
          <div class="section-head"><h2>Train Information:</h2><span>(The information of remaining tickets is for reference only.)</span></div>
          <div class="train-summary">
            <div class="train-id"><strong>${App.esc(train.number)}</strong><span>${App.prettyDate(data.date)} (${App.weekday(data.date)})</span></div>
            <div class="station-block"><strong>${App.esc(train.from_station)} (${App.esc(data.from_label.replace(/^[^(]+\(/, '').replace(/\)$/, ''))})</strong><span>${App.esc(train.departure)}</span></div>
            <div class="dur-block">${App.durationText(train.duration)}<span class="arrow-line">⟶</span></div>
            <div class="station-block"><strong>${App.esc(train.to_station)} (${App.esc(data.to_label.replace(/^[^(]+\(/, '').replace(/\)$/, ''))})</strong><span>${App.esc(train.arrival)}</span></div>
          </div>
          <ul class="fare-list">
            ${['business', 'first', 'second', 'standing'].map(function (cls) {
              return `<li class="fare-${cls}">${App.esc(train.fares[cls].display)}</li>`;
            }).join('')}
          </ul>
          <p class="muted small">The sleeper ticket prices shown on the page are all upper berth. Actual prices vary among different berths.</p>
        </section>
        <section class="passenger-info">
          <div class="section-head"><h2>Passenger Information:</h2></div>
          <div class="frequent-list">
            ${data.passengers.map(function (p) {
              return `<div class="frequent-row">
                <label class="freq-check"><input type="checkbox" data-passenger-id="${p.id}" aria-label="${App.esc(p.name)}"> <span>${App.esc(p.name)}</span></label>
                <span class="freq-meta">${App.esc(p.id_type)} · ${App.esc(p.passport)}</span>
                ${p.holder ? '<span class="holder-tag">Account holder</span>' : ''}
              </div>`;
            }).join('')}
          </div>
          <p class="muted small">Select a frequent passenger to add one booking row. The passenger record itself is not changed.</p>
          <div class="booking-error-slot"></div>
          <table class="booking-table" aria-label="Booking passengers">
            <thead><tr><th>Ticket class</th><th>Ticket type</th><th>Name</th><th>ID type</th><th>ID number</th><th>Nationality</th><th>Operation</th></tr></thead>
            <tbody id="booking-rows"></tbody>
          </table>
        </section>
        <section class="booking-tips">
          <strong>Tips</strong>
          <p>A valid ID can be used to purchase only one ticket for the same train on the same date of travel, except for EMU sleeping trains.</p>
        </section>
        <div class="booking-agree"><a href="#/terms">I have read and agree to the Terms of Service</a></div>
        <div class="booking-actions">
          <button type="button" class="btn btn-ghost" id="previous-step">Previous step</button>
          <button type="button" class="btn btn-primary" id="place-order">Place order</button>
        </div>
      </div>`;
    },
    bind: function (params) {
      const trainNumber = params.get('train') || 'G1001';
      const date = params.get('date') || App.defaults.date;
      const from = params.get('from') || 'Shanghai';
      const to = params.get('to') || 'Beijing';
      const rows = document.getElementById('booking-rows');
      const errorSlot = document.querySelector('.booking-error-slot');
      const selections = new Map();
      let passengerData = [];
      let trainData = null;
      let fares = null;
      const cacheKey = trainNumber + '|' + date + '|' + from + '|' + to;
      if (App._bookingCache && App._bookingCache.key === cacheKey) {
        passengerData = App._bookingCache.data.passengers;
        trainData = App._bookingCache.data.train;
        fares = App._bookingCache.data.train.fares;
      } else {
        App.api('booking', { train: trainNumber, date: date, from: from, to: to }).then(function (data) {
          passengerData = data.passengers;
          trainData = data.train;
          fares = data.train.fares;
        });
      }

      function selectedArray() {
        const out = [];
        selections.forEach(function (sel, id) { out.push({ id: id, sel: sel }); });
        return out;
      }

      function rowHtml(id, sel) {
        const p = passengerData.find(function (x) { return String(x.id) === String(id); });
        if (!p) return '';
        const classOrder = ['business', 'first', 'second', 'standing'];
        return `<tr data-passenger-id="${p.id}" data-passport="${App.esc(p.passport)}">
          <td><select aria-label="Ticket class" data-class-select>
            ${classOrder.map(function (cls) { return `<option value="${cls}" ${sel.ticket_class === cls ? 'selected' : ''}>${App.esc(fares[cls].option_label)}</option>`; }).join('')}
          </select></td>
          <td><select aria-label="Ticket type" data-type-select>
            <option ${sel.ticket_type === 'Adult' ? 'selected' : ''}>Adult</option><option ${sel.ticket_type === 'Child' ? 'selected' : ''}>Child</option>
          </select></td>
          <td>${App.esc(p.name)}</td><td>Foreign passport</td><td>${App.esc(p.passport)}</td><td>${App.esc(p.nationality)}</td>
          <td><button type="button" class="btn-link delete-booking" data-passenger-id="${p.id}">Delete</button></td>
        </tr>`;
      }
      function redraw() {
        rows.innerHTML = selectedArray().map(function (x) { return rowHtml(x.id, x.sel); }).join('');
      }
      function defaultClass() {
        if (!fares) return 'business';
        const order = ['business', 'first', 'second', 'standing'];
        for (const cls of order) {
          const a = fares[cls].available;
          if (a === 'Enough' || a > 0) return cls;
        }
        return 'second';
      }
      document.querySelectorAll('[data-passenger-id].freq-check, input[data-passenger-id]').forEach(function (box) {
        if (!(box instanceof HTMLInputElement)) return;
        box.addEventListener('change', function () {
          const id = box.dataset.passengerId;
          if (box.checked) {
            selections.set(id, { ticket_class: defaultClass(), ticket_type: 'Adult' });
          } else {
            selections.delete(id);
          }
          redraw();
        });
      });
      rows.addEventListener('change', function (e) {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = tr.dataset.passengerId;
        const sel = selections.get(id);
        if (!sel) return;
        if (e.target.matches('[data-class-select]')) sel.ticket_class = e.target.value;
        if (e.target.matches('[data-type-select]')) sel.ticket_type = e.target.value;
      });
      rows.addEventListener('click', function (e) {
        const del = e.target.closest('.delete-booking');
        if (!del) return;
        const id = del.dataset.passengerId;
        selections.delete(id);
        const box = document.querySelector('input[data-passenger-id="' + id + '"]');
        if (box) box.checked = false;
        redraw();
      });

      document.getElementById('previous-step').addEventListener('click', function () {
        App.go('/results', { from: from, to: to, date: date });
      });

      document.getElementById('place-order').addEventListener('click', function () {
        errorSlot.innerHTML = '';
        if (selections.size === 0) {
          errorSlot.innerHTML = App.alertHtml('Please select at least one passenger.');
          return;
        }
        if (!fares) {
          errorSlot.innerHTML = App.alertHtml('Please wait for the booking information to load.');
          return;
        }
        const counts = {};
        selections.forEach(function (sel) { counts[sel.ticket_class] = (counts[sel.ticket_class] || 0) + 1; });
        for (const cls of Object.keys(counts)) {
          const a = fares[cls].available;
          if (a !== 'Enough' && counts[cls] > a) {
            errorSlot.innerHTML = App.alertHtml('Sorry, there are no tickets available for the selected ticket class.');
            return;
          }
        }
        openConfirmation();
      });

      function openConfirmation() {
        const chosen = selectedArray().map(function (x) {
          const p = passengerData.find(function (q) { return String(q.id) === String(x.id); });
          return { passenger: p, sel: x.sel };
        });
        const body = `<div class="confirm-train">
          <div><strong>${App.esc(trainNumber)}</strong><span>${App.prettyDate(date)} (${App.weekday(date)})</span></div>
          <div class="confirm-route">${App.esc(trainData.from_station)} (${App.esc(dataCn(trainData.from_city))}) ${App.esc(trainData.departure)} <span class="arrow-line">⟶</span> ${App.esc(trainData.to_station)} (${App.esc(dataCn(trainData.to_city))}) ${App.esc(trainData.arrival)}</div>
        </div>
        <table class="confirm-table"><thead><tr><th>Number</th><th>Seat type</th><th>Ticket type</th><th>Name</th><th>ID type</th><th>ID number</th><th>Nationality</th></tr></thead><tbody>
          ${chosen.map(function (x, i) { return `<tr><td>${i + 1}</td><td>${App.esc(fares[x.sel.ticket_class].option_label)}</td><td>${App.esc(x.sel.ticket_type)}</td><td>${App.esc(x.passenger.name)}</td><td>Foreign passport</td><td>${App.esc(x.passenger.passport)}</td><td>${App.esc(x.passenger.nationality)}</td></tr>`; }).join('')}
        </tbody></table>
        <div class="confirm-error"></div>`;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = App.dialog({
          id: 'confirm-order',
          title: 'Please confirm the following information.',
          wide: true,
          body: body,
          footer: '<button type="button" class="btn btn-ghost" id="edit-confirm">Edit</button><button type="button" class="btn btn-primary" id="confirm-order-btn">Confirm</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        const back = wrapper.querySelector('.modal-backdrop');
        wrapper.querySelector('#edit-confirm').addEventListener('click', function () { back.remove(); });
        wrapper.querySelector('#confirm-order-btn').addEventListener('click', async function () {
          const button = wrapper.querySelector('#confirm-order-btn');
          button.disabled = true;
          const payload = {
            train: trainNumber, date: date, from: from, to: to,
            passengers: selectedArray().map(function (x) {
              return { passenger_id: Number(x.id), ticket_class: x.sel.ticket_class, ticket_type: x.sel.ticket_type };
            }),
          };
          try {
            const result = await App.api('create_order', payload);
            back.remove();
            App.setFlash('Order submitted successfully.');
            App.go('/payment', { id: result.order.id });
          } catch (err) {
            button.disabled = false;
            const slot = wrapper.querySelector('.confirm-error');
            if (slot) slot.innerHTML = App.alertHtml(err.message);
          }
        });
      }
    },
  });

  function dataCn(city) {
    const st = App.stations.find(function (s) { return s.city === city; });
    return st ? st.cn : city;
  }

  App.page('/payment', {
    title: 'Payment',
    auth: true,
    render: async function (params) {
      const id = params.get('id');
      const data = await App.api('get_order', { id: id });
      const order = data.order;
      const unpaid = order.status === 'unpaid';
      return `<div class="content-page payment-page">
        <div class="breadcrumb"><a href="#/home">HOME</a> &gt; Payment</div>
        ${unpaid ? `<div class="seat-lock"><span class="lock-icon">▣</span><span>Seats are locked, Time remained to complete your payment:</span>
          <strong id="payment-countdown" role="region" aria-label="Payment countdown">${App.formatCountdown(App.remaining(order.payment_deadline))}</strong></div>`
          : `<div class="status-banner">Order status: <strong>${App.esc(order.status_label)}</strong></div>`}
        <section class="order-details" role="region" aria-label="Order details">
          <h2>Order details</h2>
          <div class="train-summary compact-summary">
            <div class="train-id"><strong>${App.esc(order.train_number)}</strong><span>${App.prettyDate(order.departure_date)} (${App.weekday(order.departure_date)})</span></div>
            <div class="station-block"><strong>${App.esc(order.from_station)}</strong><span>${App.esc(order.departure_time)}</span></div>
            <div class="dur-block">${App.durationText(order.duration)}<span class="arrow-line">⟶</span></div>
            <div class="station-block"><strong>${App.esc(order.to_station)}</strong><span>${App.esc(order.arrival_time)}</span></div>
          </div>
          <table class="payment-table">
            <thead><tr><th>Number</th><th>name</th><th>ID type</th><th>ID number</th><th>Ticket type</th><th>Ticket class</th><th>Coach</th><th>Seat/berth number</th><th>Price</th></tr></thead>
            <tbody>${order.passengers.map(function (p, i) {
              return `<tr><td>${i + 1}</td><td>${App.esc(p.name)}</td><td>${App.esc(p.id_type)}</td><td>${App.esc(p.id_number)}</td><td>${App.esc(p.ticket_type)}</td><td>${App.esc(p.ticket_class_label)}</td><td>${App.esc(p.coach)}</td><td>${App.esc(p.seat)}</td><td>${App.esc(p.price_text)}</td></tr>`;
            }).join('')}</tbody>
          </table>
          <div class="grand-total">Total: <strong>${App.esc(order.total_text)}</strong></div>
        </section>
        <section class="payment-info" role="region" aria-label="Payment information">
          <h2>Payment information</h2>
          <div class="payment-method"><span>Payment method</span><strong>12306 online payment</strong></div>
          <div class="payment-lines"><span>Order number</span><span>${App.esc(order.order_no)}</span></div>
          <div class="payment-lines"><span>Total</span><span>${App.esc(order.total_text)}</span></div>
          <div class="grand-total">Total: <strong>${App.esc(order.total_text)}</strong></div>
          ${unpaid ? '<p class="muted small">Please complete payment within the seat-lock window. The locked seat is released when the order is cancelled.</p>' : ''}
        </section>
        ${unpaid ? `<div class="payment-actions"><button type="button" class="btn btn-ghost" id="cancel-payment">Cancel</button><button type="button" class="btn btn-primary" id="pay-order">Pay</button></div>`
          : `<div class="payment-actions">${order.status === 'paid' ? '<a class="btn btn-primary" href="#/personal/orders?tab=upcoming">View Upcoming trips</a>' : '<a class="btn btn-primary" href="#/personal/orders?tab=uncompleted">View Uncompleted orders</a>'}</div>`}
      </div>`;
    },
    bind: function (params) {
      const id = params.get('id');
      function paymentError(message) {
        const actions = document.querySelector('.payment-actions');
        if (!actions) return;
        let box = document.querySelector('.payment-error');
        if (!box) { box = document.createElement('div'); box.className = 'payment-error'; actions.before(box); }
        box.innerHTML = App.alertHtml(message);
      }
      const countdown = document.getElementById('payment-countdown');
      if (countdown) {
        App.api('get_order', { id: id }).then(function (data) {
          const deadline = data.order.payment_deadline;
          function tick() {
            if (!document.body.contains(countdown)) return;
            countdown.textContent = App.formatCountdown(App.remaining(deadline));
          }
          tick();
          App.timers.push(setInterval(tick, 500));
        });
      }
      const pay = document.getElementById('pay-order');
      if (pay) {
        pay.addEventListener('click', async function () {
          pay.disabled = true;
          try {
            await App.api('pay_order', { id: id });
            App.setFlash('Payment successful.');
            App.render();
          } catch (err) {
            pay.disabled = false;
            paymentError(err.message);
          }
        });
      }
      const cancel = document.getElementById('cancel-payment');
      if (cancel) {
        cancel.addEventListener('click', async function () {
          cancel.disabled = true;
          try {
            await App.api('cancel_order', { id: id });
            App.setFlash('Order cancelled successfully.');
            App.go('/personal/orders', { tab: 'uncompleted' });
          } catch (err) {
            cancel.disabled = false;
            paymentError(err.message);
          }
        });
      }
    },
  });
})();
