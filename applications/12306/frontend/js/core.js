/* Shared state, API, router, chrome and UI helpers for 12306. */
(function () {
  'use strict';

  const App = (window.App = {
    user: null,
    skew: 0,
    bannerIndex: 0,
    timers: [],
    defaults: { from: 'Beijing', to: 'Shanghai', date: '2026-07-21' },
    stations: [],
    saleStart: '2026-07-21',
    saleEnd: '2026-08-04',
    pendingBooking: null,
  });
  window.Pages = {};

  App.esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  App.api = async function (action, data) {
    const response = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: action, data: data || {} }),
    });
    let result;
    try { result = await response.json(); } catch (e) { result = {}; }
    if (result && result.now) {
      const server = new Date(result.now).getTime();
      if (Number.isFinite(server)) App.skew = server - Date.now();
    }
    if (!response.ok) {
      const err = new Error(result.error || 'Request failed');
      err.status = response.status;
      throw err;
    }
    if (result && Object.prototype.hasOwnProperty.call(result, 'user')) {
      App.user = result.user;
    }
    return result;
  };

  App.clockNow = function () { return Date.now() + App.skew; };
  App.serverNow = function () { return new Date(App.clockNow()); };

  App.setFlash = function (message, kind) {
    try { sessionStorage.setItem('__12306_flash', JSON.stringify({ message: message, kind: kind || 'success' })); } catch (e) { /* ignore */ }
  };

  App.consumeFlash = function () {
    try {
      const raw = sessionStorage.getItem('__12306_flash');
      if (!raw) return null;
      sessionStorage.removeItem('__12306_flash');
      return JSON.parse(raw);
    } catch (e) { return null; }
  };

  App.href = function (path, params) {
    let out = '#' + path;
    if (params) {
      const query = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        const v = params[k];
        if (v !== undefined && v !== null && v !== '') query.set(k, v);
      });
      const s = query.toString();
      if (s) out += '?' + s;
    }
    return out;
  };

  App.parseHash = function () {
    const raw = (location.hash || '').replace(/^#/, '') || '/home';
    const parts = raw.split('?');
    let path = parts[0] || '/home';
    if (!path.startsWith('/')) path = '/' + path;
    return { path: path, params: new URLSearchParams(parts[1] || '') };
  };

  App.go = function (path, params) {
    const target = App.href(path, params);
    if (location.hash === target) App.render();
    else location.hash = target;
  };

  App.clearTimers = function () {
    (App.timers || []).forEach(function (t) { clearInterval(t); clearTimeout(t); });
    App.timers = [];
  };

  App.money = function (value) { return '￥' + Number(value || 0).toFixed(2); };
  App.priceInt = function (value) {
    const n = Number(value);
    return Number.isInteger(n) ? String(n) : String(n);
  };
  App.durationText = function (minutes) {
    const m = Number(minutes) || 0;
    return Math.floor(m / 60) + 'h' + (m % 60) + 'm';
  };
  App.formatCountdown = function (seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  };
  App.remaining = function (deadline) {
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((new Date(deadline).getTime() - App.clockNow()) / 1000));
  };
  App.weekday = function (date) {
    try {
      const d = new Date(date + 'T12:00:00+08:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Shanghai' });
    } catch (e) { return ''; }
  };
  App.prettyDate = function (date) {
    try {
      const d = new Date(date + 'T12:00:00+08:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Shanghai' });
    } catch (e) { return date; }
  };
  App.dateRange = function () {
    const out = [];
    const start = new Date(App.saleStart + 'T12:00:00+08:00');
    for (let i = 0; i < 15; i += 1) {
      const d = new Date(start.getTime() + i * 86400000);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  };
  App.maskMobile = function (mobile) {
    const m = String(mobile || '');
    if (m.length === 11) return '(+86) ' + m.slice(0, 3) + '****' + m.slice(7);
    return m ? '(+86) ' + m : '';
  };
  App.canonicalCity = function (raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    for (const st of App.stations) {
      if (value.toLowerCase() === st.city.toLowerCase() || value === st.cn || value.toLowerCase() === st.cn.toLowerCase()) return st.city;
      if ((st.pinyin || []).some(function (p) { return value.toLowerCase() === String(p).toLowerCase(); })) return st.city;
    }
    return null;
  };
  App.cityLabel = function (city) {
    const st = App.stations.find(function (s) { return s.city === city; });
    return st ? st.label : city;
  };
  App.validateSearch = function (fromRaw, toRaw, dateRaw) {
    const date = String(dateRaw || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < App.saleStart || date > App.saleEnd) {
      return { error: 'Please choose a departure date from 2026-07-21 through 2026-08-04.' };
    }
    const from = App.canonicalCity(fromRaw);
    if (!from) return { error: 'Please enter a valid departure place.' };
    const to = App.canonicalCity(toRaw);
    if (!to) return { error: 'Please enter a valid arrival place.' };
    return { from: from, to: to, date: date };
  };
  App.defaultResultsHref = function () {
    return App.href('/results', { from: 'Beijing', to: 'Shanghai', date: '2026-07-21' });
  };

  App.guide = [
    {
      name: 'Ticketing',
      questions: [
        { slug: 'book-online', title: 'How to book tickets online?', body: 'Sign in to 12306.cn, enter your departure and arrival places and travel date, choose an available train and seat class, select a passenger, confirm the order and complete payment before the seat lock expires.' },
        { slug: 'real-name', title: 'What is real-name ticketing?', body: 'Railway operation companies implement real-name ticketing. A valid identity document of the passenger must be presented when purchasing and using a ticket. Foreign passengers may use valid passports under the relevant regulations.' },
        { slug: 'ticket-kinds', title: 'How many kinds of tickets are there?', body: 'Both electronic tickets and paper tickets are available. Electronic tickets are linked to the passenger identity document and can be used at station gates after identity verification.' },
        { slug: 'where-buy', title: 'Where can I buy the ticket?', body: 'Tickets may be purchased on 12306.cn, in the 12306 mobile app, at station ticketing counters, at automatic ticket machines and at authorised railway ticket agencies.' },
      ],
    },
    {
      name: 'Endorsement and refund',
      questions: [
        { slug: 'change-refund', title: 'How to change or refund tickets?', body: 'Open Order center, choose the order, and follow the refund or endorsement entry before the applicable deadline. Refund fees depend on how long remains before departure.' },
        { slug: 'endorsement', title: 'What is endorsement?', body: 'Endorsement changes the date, train or seat of an existing ticket. It is subject to seat availability and the applicable railway rules.' },
        { slug: 'refund-rules', title: 'What are the rules of ticket refund?', body: 'A refund may be requested before the train departs. The refund is returned to the original payment channel after the railway service fee rules are applied.' },
        { slug: 'change-destination', title: 'What is change of destination?', body: 'A passenger may apply to change the destination station when travel plans change, provided that the requested journey is available and the applicable conditions are met.' },
      ],
    },
    {
      name: 'Miscellaneous',
      questions: [
        { slug: 'train-status', title: 'How to check train status?', body: 'Use the train status query on 12306.cn or the mobile app. Enter the train number and date to see the planned and actual times at each station.' },
        { slug: 'mobile-app', title: 'How to use 12306 mobile app?', body: 'Download the official 12306 app, sign in with your account, add passengers and use the ticket search, order and payment functions. Keep your identity information accurate.' },
        { slug: 'child-tickets', title: 'How to buy child tickets?', body: 'Add a child passenger with the correct identity details and select Child as the ticket type when booking. Children travelling alone are subject to railway conditions.' },
        { slug: 'children-discount', title: 'Is there any discount for children?', body: 'Child fares follow the current railway passenger transport rules. The exact fare is shown when a Child ticket type is selected for a passenger.' },
      ],
    },
  ];

  App.quickQuestions = [
    { title: 'How to book tickets online?', category: 'Ticketing', slug: 'book-online' },
    { title: 'How to change or refund tickets?', category: 'Endorsement and refund', slug: 'change-refund' },
    { title: 'How to check train status?', category: 'Miscellaneous', slug: 'train-status' },
    { title: 'How to use 12306 mobile app?', category: 'Miscellaneous', slug: 'mobile-app' },
  ];

  App.guideHref = function (category, slug) {
    return App.href('/guide', { category: category || 'Ticketing', q: slug || '' });
  };

  App.brandHeader = function () {
    const user = App.user;
    const userLinks = user
      ? `<span class="account-name">${App.esc(user.username)}</span><span class="sep">|</span><a href="#/home" data-action="logout">Sign Out</a>`
      : `<a href="#/login">Login</a><a href="#/register">Register</a>`;
    const quick = user
      ? `<div class="top-item has-dropdown">
          <a class="my12306" href="#/personal">My 12306</a>
          <div class="dropdown quick-entries" role="region" aria-label="My 12306 quick entries">
            <a href="#/personal/orders?tab=uncompleted">Order center</a>
            <a href="#/personal/info">User information</a>
            <a href="#/personal/security">Account security</a>
            <a href="#/personal/passengers">My passengers</a>
          </div>
        </div>`
      : `<div class="top-item"><a class="my12306" href="#/login">My 12306</a></div>`;
    return `<header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#/home" aria-label="12306 home">
          <img src="/assets/logo.png" alt="12306 logo">
          <span class="brand-text"><strong>中国铁路12306</strong><small>12306 CHINA RAILWAY</small></span>
        </a>
        <div class="utility">
          ${userLinks}
          ${quick}
          <span class="utility-muted">简体中文</span>
          <span class="utility-muted">Contact us</span>
        </div>
      </div>
    </header>`;
  };

  App.mainNav = function () {
    const guideCols = App.guide.map(function (cat) {
      return `<div class="guide-col" role="region" aria-label="${App.esc(cat.name)}">
        <h3>${App.esc(cat.name)}</h3>
        ${cat.questions.map(function (q) {
          return `<a href="${App.guideHref(cat.name, q.slug)}">${App.esc(q.title)}</a>`;
        }).join('')}
        <a class="more-link" href="${App.guideHref(cat.name, '')}">More</a>
      </div>`;
    }).join('');
    return `<nav class="main-nav" aria-label="Main navigation">
      <div class="nav-inner">
        <a class="nav-link" href="#/home">Home</a>
        <div class="nav-item has-dropdown">
          <a class="nav-link" href="${App.defaultResultsHref()}">Booking <span class="caret" aria-hidden="true">⌄</span></a>
          <div class="dropdown booking-dd">
            <a href="${App.defaultResultsHref()}">Tickets</a>
            <a href="#/personal/orders?tab=upcoming">Refund</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a class="nav-link" href="${App.guideHref('Ticketing', '')}">Travel guide <span class="caret" aria-hidden="true">⌄</span></a>
          <div class="dropdown guide-dd" role="region" aria-label="Travel guide categories">${guideCols}</div>
        </div>
      </div>
    </nav>`;
  };

  App.footer = function () {
    return `<footer class="site-footer">
      <p>COPYRIGHT©2008-2025 CHINA ACADEMY OF RAILWAY SCIENCES CORPORATION LIMITED, ALL RIGHTS RESERVED</p>
      <p>京公网安备 11010802038392号 | 京ICP备05020493号-4 | ICP证: 京B2-20202537</p>
      <p>Privacy Policy | Cookie Statement</p>
    </footer>`;
  };

  App.shell = function (content) {
    const flash = App.consumeFlash();
    const flashHtml = flash && flash.message
      ? `<div class="flash flash-${App.esc(flash.kind || 'success')}" role="status">${App.esc(flash.message)}</div>`
      : '';
    return `${App.brandHeader()}${App.mainNav()}${flashHtml}<main class="site-main">${content}</main>${App.footer()}`;
  };

  App.alertHtml = function (message, kind) {
    if (!message) return '';
    return `<div class="form-error ${kind === 'info' ? 'info' : ''}" role="alert">${App.esc(message)}</div>`;
  };

  App.dialog = function (opts) {
    return `<div class="modal-backdrop" data-modal="${App.esc(opts.id || 'modal')}">
      <div class="modal ${opts.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${App.esc(opts.id)}-title">
        <div class="modal-head">
          <h2 id="${App.esc(opts.id)}-title">${App.esc(opts.title)}</h2>
          ${opts.noClose ? '' : '<button type="button" class="modal-x" data-close-modal aria-label="Close">×</button>'}
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
        ${opts.hidden ? '' : ''}
      </div>
    </div>`;
  };

  App.bindModalClose = function (root) {
    const scope = root || document;
    scope.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () {
        const back = button.closest('.modal-backdrop');
        if (back) back.remove();
      });
    });
    scope.querySelectorAll('.modal-backdrop').forEach(function (back) {
      back.addEventListener('click', function (e) {
        if (e.target === back) back.remove();
      });
    });
  };

  App.locationField = function (opts) {
    const id = App.esc(opts.id);
    return `<div class="field loc-field" data-location-field>
      <label for="${id}">${App.esc(opts.label)}</label>
      <input id="${id}" class="loc-input" type="text" autocomplete="off" placeholder="${App.esc(opts.placeholder || opts.label)}" value="${App.esc(opts.value || '')}">
      <div class="loc-pop" role="dialog" aria-label="${App.esc(opts.label)} station selector" hidden>
        <div class="loc-tabs" role="tablist" aria-label="Station groups">
          ${['Popular', 'ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXYZ'].map(function (g) {
            return `<button type="button" role="tab" data-group="${g}" aria-selected="${g === 'Popular'}">${g}</button>`;
          }).join('')}
        </div>
        <div class="loc-list" aria-live="polite"></div>
      </div>
    </div>`;
  };

  App.bindLocationFields = function (scope) {
    const root = scope || document;
    root.querySelectorAll('[data-location-field]').forEach(function (field) {
      if (field.dataset.bound) return;
      field.dataset.bound = '1';
      const input = field.querySelector('.loc-input');
      const pop = field.querySelector('.loc-pop');
      const list = field.querySelector('.loc-list');
      const tabs = Array.from(field.querySelectorAll('[role=tab]'));
      let group = 'Popular';

      function setGroup(g) {
        group = g;
        tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.group === g)); });
      }
      function close() {
        pop.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      }
      function open() {
        pop.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }
      function stationButton(st) {
        return `<button type="button" class="station-option" data-city="${App.esc(st.city)}" aria-label="${App.esc(st.label)}">${App.esc(st.label)}</button>`;
      }
      function renderGroup() {
        const matches = App.stations.filter(function (s) { return s.group === group; });
        list.innerHTML = `<h4>${group === 'Popular' ? 'Popular destinations' : 'Stations'}</h4>
          <div class="station-list">${matches.map(stationButton).join('') || '<p class="muted">No stations in this group.</p>'}</div>`;
      }
      function renderMatches(query) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) { renderGroup(); return; }
        const matches = App.stations.filter(function (s) {
          return s.city.toLowerCase().includes(q) || String(s.cn).includes(String(query).trim()) ||
            (s.pinyin || []).some(function (p) { return String(p).toLowerCase().includes(q); });
        });
        list.innerHTML = `<h4>Top destinations</h4>
          <div class="station-list">${matches.map(stationButton).join('') || '<p class="muted">No matching stations.</p>'}</div>`;
      }
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          setGroup(tab.dataset.group);
          renderGroup();
        });
      });
      input.addEventListener('focus', function () {
        if (!pop.hidden) {
          if (input.value.trim()) renderMatches(input.value); else renderGroup();
          return;
        }
        setGroup('Popular');
        if (input.value.trim()) renderMatches(input.value); else renderGroup();
        open();
      });
      input.addEventListener('input', function () {
        if (!pop.hidden) renderMatches(input.value);
      });
      list.addEventListener('click', function (e) {
        const btn = e.target.closest('.station-option');
        if (!btn) return;
        input.value = btn.dataset.city;
        close();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      document.addEventListener('pointerdown', function (e) {
        if (!field.contains(e.target)) close();
      });
    });
  };

  App.dateField = function (opts) {
    const id = App.esc(opts.id);
    return `<div class="field date-field" data-date-field>
      <label for="${id}">${App.esc(opts.label || 'Date')}</label>
      <input id="${id}" class="date-input" type="text" autocomplete="off" placeholder="${App.esc(opts.placeholder || 'Date')}" value="${App.esc(opts.value || '')}">
      <div class="date-pop" role="dialog" aria-label="Date picker" hidden>
        <div class="date-pop-head"><strong>July 2026</strong><span>Sale period: Jul 21 – Aug 4</span></div>
        <div class="date-week">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return `<span>${d}</span>`; }).join('')}</div>
        <div class="date-grid">${App.dateRange().map(function (d) {
          return `<button type="button" class="date-choice" data-date="${d}">${d}</button>`;
        }).join('')}</div>
      </div>
    </div>`;
  };

  App.bindDateField = function (scope, callbacks) {
    const root = scope || document;
    const cb = callbacks || {};
    root.querySelectorAll('[data-date-field]').forEach(function (field) {
      if (field.dataset.bound) return;
      field.dataset.bound = '1';
      const input = field.querySelector('.date-input');
      const pop = field.querySelector('.date-pop');
      function close() {
        pop.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        if (cb.onClose) cb.onClose();
      }
      function open() {
        pop.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        if (cb.onOpen) cb.onOpen();
      }
      input.addEventListener('focus', open);
      pop.addEventListener('click', function (e) {
        const btn = e.target.closest('.date-choice');
        if (!btn) return;
        input.value = btn.dataset.date;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
        input.blur();
      });
      document.addEventListener('pointerdown', function (e) {
        if (!field.contains(e.target)) close();
      });
    });
  };

  App.authRequiredMessage = function () {
    return '<div class="page-narrow"><h1>Login required</h1><p>Please <a href="#/login">Login</a> to continue.</p></div>';
  };

  App.routes = {};
  App.page = function (path, config) { App.routes[path] = config; };

  App.render = async function () {
    App.clearTimers();
    document.querySelectorAll('.modal-backdrop').forEach(function (el) { el.remove(); });
    Array.from(document.body.children).forEach(function (el) {
      if (el.tagName === 'DIV' && el.id !== 'app' && !el.children.length && !el.textContent.trim()) el.remove();
    });
    const parsed = App.parseHash();
    let route = App.routes[parsed.path];
    if (!route) route = App.routes['/home'];
    if (route.auth && !App.user) {
      const next = parsed.path + (parsed.params.toString() ? '?' + parsed.params.toString() : '');
      if (!location.hash.startsWith('#/login')) {
        location.hash = App.href('/login', { next: next });
        return;
      }
    }
    const app = document.getElementById('app');
    app.innerHTML = '<div class="boot-loading">Loading 12306…</div>';
    try {
      const html = await route.render(parsed.params);
      if (html == null) return;
      document.title = (route.title ? route.title + ' · ' : '') + '12306 China Railway';
      app.innerHTML = App.shell(html);
      if (route.bind) route.bind(parsed.params);
      if (!(route.noScroll || (parsed.path === '/guide' && parsed.params.get('q')))) {
        window.scrollTo(0, 0);
      }
      App.bindModalClose(app);
      const logout = app.querySelector('[data-action=logout]');
      if (logout) {
        logout.addEventListener('click', async function (e) {
          e.preventDefault();
          try { await App.api('logout'); } catch (err) { /* ignore */ }
          App.user = null;
          App.setFlash('Logout successful.');
          if (location.hash === '#/home' || !location.hash) App.render();
          else location.hash = '#/home';
        });
      }
    } catch (err) {
      app.innerHTML = App.shell(`<div class="page-narrow"><h1>Something went wrong</h1>${App.alertHtml(err.message || 'Unable to load this page.')}<p><a href="#/home">Return home</a></p></div>`);
      App.bindModalClose(app);
    }
  };

  App.start = async function () {
    try {
      const boot = await App.api('bootstrap');
      App.user = boot.user;
      App.stations = boot.stations || [];
      App.defaults = boot.defaults || App.defaults;
      App.saleStart = boot.sale_start || App.saleStart;
      App.saleEnd = boot.sale_end || App.saleEnd;
    } catch (e) {
      document.getElementById('app').innerHTML = '<div class="page-narrow"><h1>12306 is unavailable</h1><p>Please reload the page.</p></div>';
      return;
    }
    window.addEventListener('hashchange', App.render);
    const app = document.getElementById('app');
    if (app) app.classList.remove('app-loading');
    App.render();
  };
})();
