/* Public pages: home, login, registration, recovery, agreements, travel guide. */
(function () {
  'use strict';
  const App = window.App;

  const COUNTRIES = ['China', 'United States', 'United Kingdom', 'Japan', 'Korea', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Australia', 'Canada', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'India', 'Brazil', 'New Zealand', 'Other'];

  App.page('/home', {
    title: 'Home',
    render: async function () {
      const d = App.defaults;
      const banners = ['Banner 1', 'Banner 2', 'Banner 3'];
      const idx = App.bannerIndex;
      const quick = App.quickQuestions.map(function (q) {
        return `<a href="${App.guideHref(q.category, q.slug)}">${App.esc(q.title)}</a>`;
      }).join('');
      return `
      <section class="home-hero" role="region" aria-label="Home banners">
        <img id="home-banner-img" class="hero-img" src="/assets/banner${idx + 1}.svg" alt="${banners[idx]}">
        <div class="hero-controls">
          <button type="button" id="next-banner" class="round-next">Next banner</button>
          <div class="hero-dots" aria-hidden="true">${banners.map(function (_, i) {
            return `<span class="${i === idx ? 'on' : ''}" data-dot="${i}"></span>`;
          }).join('')}</div>
        </div>
      </section>
      <section class="search-card" role="region" aria-label="Ticket search">
        <div class="service-note"><span class="clock-icon">◷</span> The 12306.cn website provides information query and ticket refund services 24 hours a day; ticket sales and endorsement are available from 5:00 to 23:30.</div>
        <form id="home-search-form" novalidate>
          <div class="search-grid">
            ${App.locationField({ id: 'home-from', label: 'From', value: d.from })}
            ${App.locationField({ id: 'home-to', label: 'To', value: d.to })}
            ${App.dateField({ id: 'home-date', label: 'Date', value: d.date })}
            <div class="search-action"><button type="submit" class="btn btn-primary btn-search">Search</button></div>
          </div>
          <div class="search-error-slot"></div>
        </form>
      </section>
      <div class="home-content">
        <section class="quick-guide" role="region" aria-label="Quick Guide">
          <h2>Quick Guide</h2>
          <div class="quick-links">${quick}</div>
          <a class="more-link" href="${App.guideHref('Ticketing', '')}">More</a>
        </section>
        <section class="home-promo">
          <div class="promo-card"><strong>Book with confidence</strong><span>Real-name ticketing, transparent fares and secure payment.</span></div>
          <div class="promo-card"><strong>Travel across China</strong><span>High-speed and conventional services on one platform.</span></div>
          <div class="promo-card"><strong>Manage every trip</strong><span>Uncompleted, upcoming and historical orders in one place.</span></div>
        </section>
      </div>`;
    },
    bind: function () {
      const form = document.getElementById('home-search-form');
      const errorSlot = form.querySelector('.search-error-slot');
      App.bindLocationFields();
      App.bindDateField();
      const next = document.getElementById('next-banner');
      next.addEventListener('click', function () {
        App.bannerIndex = (App.bannerIndex + 1) % 3;
        const img = document.getElementById('home-banner-img');
        img.src = '/assets/banner' + (App.bannerIndex + 1) + '.svg';
        img.alt = 'Banner ' + (App.bannerIndex + 1);
        document.querySelectorAll('.hero-dots span').forEach(function (dot, i) {
          dot.classList.toggle('on', i === App.bannerIndex);
        });
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        errorSlot.innerHTML = '';
        const values = App.validateSearch(
          document.getElementById('home-from').value,
          document.getElementById('home-to').value,
          document.getElementById('home-date').value
        );
        if (values.error) {
          errorSlot.innerHTML = App.alertHtml(values.error);
          return;
        }
        App.go('/results', { from: values.from, to: values.to, date: values.date });
      });
    },
  });

  App.page('/login', {
    title: 'Login',
    render: async function () {
      return `<div class="login-layout">
        <div class="login-art" aria-hidden="true"><img src="/assets/banner2.svg" alt=""></div>
        <form id="login-form" class="login-card" novalidate>
          <h1>Login</h1>
          <div class="form-field">
            <label for="login-identifier">Email/Username/Mobile number</label>
            <input id="login-identifier" type="text" autocomplete="username" placeholder="Email/Username/Mobile number">
          </div>
          <div class="form-field">
            <label for="login-password">Password</label>
            <input id="login-password" type="password" autocomplete="current-password" placeholder="Password">
          </div>
          <div class="login-help"><a href="#/forgot-password">Forgot password?</a></div>
          <button type="submit" class="btn btn-primary btn-block">LOGIN</button>
          <p class="login-register"><a href="#/register">No account yet? Register now.</a></p>
          <div class="form-slot"></div>
        </form>
      </div>`;
    },
    bind: function (params) {
      const form = document.getElementById('login-form');
      const slot = form.querySelector('.form-slot');
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        slot.innerHTML = '';
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;
        try {
          const result = await App.api('login', { identifier: identifier, password: password });
          App.user = result.user;
          App.setFlash('Login successful.');
          const next = params.get('next');
          if (next && next.startsWith('/')) {
            location.hash = '#' + next;
          } else {
            App.go('/home');
          }
        } catch (err) {
          slot.innerHTML = App.alertHtml(err.message);
        }
      });
    },
  });

  App.page('/register', {
    title: 'Register',
    render: async function () {
      return `<div class="content-page">
        <div class="breadcrumb"><a href="#/home">HOME</a> &gt; Register</div>
        <form id="register-form" class="form-card register-card" novalidate>
          <h1>Register</h1>
          <div class="required-note"><span>*</span> Required fields</div>
          <div class="form-grid">
            <div class="form-field">
              <label for="reg-nationality">Nationality</label>
              <select id="reg-nationality" autocomplete="country">
                <option value="">Please select</option>
                ${COUNTRIES.map(function (c) { return `<option value="${App.esc(c)}">${App.esc(c)}</option>`; }).join('')}
              </select>
            </div>
            <div class="form-field">
              <label for="reg-name">Name</label>
              <input id="reg-name" type="text" autocomplete="name">
            </div>
            <div class="form-field">
              <label for="reg-passport">Passport number</label>
              <input id="reg-passport" type="text">
            </div>
            <div class="form-field">
              <label for="reg-expiry">Passport expiration date</label>
              <input id="reg-expiry" type="text" placeholder="YYYY-MM-DD">
            </div>
            <div class="form-field">
              <label for="reg-dob">Date of birth</label>
              <input id="reg-dob" type="text" placeholder="YYYY-MM-DD">
            </div>
            <div class="form-field">
              <fieldset class="radio-group">
                <legend>Gender</legend>
                <label><input type="radio" name="reg-gender" value="Male"> Male</label>
                <label><input type="radio" name="reg-gender" value="Female"> Female</label>
              </fieldset>
            </div>
            <div class="form-field">
              <label for="reg-username">Username</label>
              <input id="reg-username" type="text" autocomplete="username">
            </div>
            <div class="form-field">
              <label for="reg-email">Email address</label>
              <input id="reg-email" type="text" autocomplete="email">
            </div>
            <div class="form-field">
              <label for="reg-password">Password</label>
              <input id="reg-password" type="password" autocomplete="new-password">
            </div>
            <div class="form-field">
              <label for="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" type="password" autocomplete="new-password">
            </div>
          </div>
          <label class="agreement-check">
            <input id="reg-agree" type="checkbox">
            <span>I have read and agree to abide by <a href="#/terms" data-legal>Terms of Service</a> and <a href="#/privacy" data-legal>Privacy Policy</a> of 12306.cn.</span>
          </label>
          <div class="form-actions"><button type="submit" class="btn btn-primary register-submit">Register</button></div>
          <div class="form-slot"></div>
        </form>
      </div>`;
    },
    bind: function () {
      const form = document.getElementById('register-form');
      const slot = form.querySelector('.form-slot');
      form.querySelectorAll('a[data-legal]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.stopPropagation(); });
        a.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        slot.innerHTML = '';
        const genderEl = form.querySelector('input[name=reg-gender]:checked');
        const data = {
          nationality: document.getElementById('reg-nationality').value,
          name: document.getElementById('reg-name').value,
          passport: document.getElementById('reg-passport').value,
          passport_expiry: document.getElementById('reg-expiry').value,
          dob: document.getElementById('reg-dob').value,
          gender: genderEl ? genderEl.value : '',
          username: document.getElementById('reg-username').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value,
          confirm: document.getElementById('reg-confirm').value,
          agree: document.getElementById('reg-agree').checked,
        };
        try {
          const result = await App.api('register', data);
          slot.innerHTML = `<div class="form-success" role="status">${App.esc(result.message)}</div>`;
        } catch (err) {
          slot.innerHTML = App.alertHtml(err.message);
        }
      });
    },
  });

  App.page('/forgot-password', {
    title: 'Forgot password',
    render: async function () {
      return `<div class="content-page">
        <div class="breadcrumb"><a href="#/home">HOME</a> &gt; Forget password</div>
        <div class="form-card recovery-card">
          <h1>Forgot password</h1>
          <div id="recovery-area"></div>
        </div>
      </div>`;
    },
    bind: function () {
      const area = document.getElementById('recovery-area');
      let identity = { email: '', id_number: '' };

      function renderStep1(message) {
        area.innerHTML = `<form id="recovery-step1" novalidate>
          <div class="form-field"><label for="rec-email">Email:</label><input id="rec-email" type="text" value="${App.esc(identity.email)}"></div>
          <div class="form-field"><label for="rec-id">ID number:</label><input id="rec-id" type="text" value="${App.esc(identity.id_number)}"></div>
          <div class="form-actions"><button type="submit" class="btn btn-primary btn-block">submit</button></div>
          ${App.alertHtml(message)}
          <p class="center muted"><a href="#/login">Back to Login</a></p>
        </form>`;
        const form = document.getElementById('recovery-step1');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const email = document.getElementById('rec-email').value;
          const idNumber = document.getElementById('rec-id').value;
          identity = { email: email, id_number: idNumber };
          try {
            await App.api('recover_verify', { email: email, id_number: idNumber });
            renderStep2('');
          } catch (err) {
            renderStep1(err.message);
          }
        });
      }

      function renderStep2(message) {
        area.innerHTML = `<form id="recovery-step2" novalidate>
          <p class="muted">Identity verified. Choose a new password.</p>
          <div class="form-field"><label for="rec-new">New password:</label><input id="rec-new" type="password"></div>
          <div class="form-field"><label for="rec-confirm">Confirm new password:</label><input id="rec-confirm" type="password"></div>
          <div class="form-actions"><button type="submit" class="btn btn-primary btn-block">submit</button></div>
          ${App.alertHtml(message)}
          <p class="center muted"><a href="#/login">Back to Login</a></p>
        </form>`;
        const form = document.getElementById('recovery-step2');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          try {
            const result = await App.api('recover_reset', {
              email: identity.email, id_number: identity.id_number,
              new_password: document.getElementById('rec-new').value,
              confirm: document.getElementById('rec-confirm').value,
            });
            area.innerHTML = `<div class="form-success" role="status">${App.esc(result.message)}</div><p class="center"><a class="btn btn-primary" href="#/login">Back to Login</a></p>`;
          } catch (err) {
            renderStep2(err.message);
          }
        });
      }

      renderStep1('');
    },
  });

  function legalPage(title, paragraphs) {
    return function () { return ''; };
  }

  App.page('/terms', {
    title: 'Terms of Service',
    render: async function () {
      return `<div class="content-page legal-page">
        <h1>Terms of Service</h1>
        <p>Welcome to 12306.cn, the official railway ticketing service platform. By registering an account or purchasing a ticket you agree to these terms.</p>
        <h2>1. Accounts and identity</h2>
        <p>You must provide accurate identity information. Each passport number may be associated with only one account. You are responsible for protecting your credentials and for all activity performed with your account.</p>
        <h2>2. Tickets and payment</h2>
        <p>Ticket availability is shown at the time of booking. A seat is locked for a limited payment window after order confirmation. Orders that are not paid, or that are cancelled, release their locked seats. Fares, discounts and refund rules are displayed with the journey.</p>
        <h2>3. Travel documents</h2>
        <p>Passengers must carry the valid identity document used for booking. Railway staff may verify identity at the station or on board. Passengers are responsible for complying with railway safety and transport regulations.</p>
        <h2>4. Changes</h2>
        <p>We may update these terms to reflect changes in the service or applicable rules. Continued use of 12306.cn after an update constitutes acceptance of the revised terms.</p>
      </div>`;
    },
  });

  App.page('/privacy', {
    title: 'Privacy Policy',
    render: async function () {
      return `<div class="content-page legal-page">
        <h1>Privacy Policy</h1>
        <p>12306.cn respects your privacy. This policy explains what information we collect and how it is used to provide railway ticketing services.</p>
        <h2>1. Information we collect</h2>
        <p>To create an account and issue tickets we collect your name, nationality, passport number and expiry, date of birth, gender, contact email and mobile number. Travel and order records are created when you book.</p>
        <h2>2. How information is used</h2>
        <p>Identity information is used to issue real-name tickets, verify eligibility and provide order, refund and passenger management services. Contact information is used for service notices and account security.</p>
        <h2>3. Sharing</h2>
        <p>Information is shared only with railway service providers and authorities where required to deliver the journey or comply with law. We do not sell personal information.</p>
        <h2>4. Your choices</h2>
        <p>You may review and update contact information in the personal center. Passenger records can be maintained from My Passengers, except for the protected account-holder record.</p>
      </div>`;
    },
  });

  App.page('/guide', {
    title: 'Travel guide',
    render: async function (params) {
      let category = params.get('category') || 'Ticketing';
      if (!App.guide.some(function (g) { return g.name === category; })) category = 'Ticketing';
      return `<div class="content-page guide-page">
        <div class="breadcrumb"><a href="#/home">HOME</a> &gt; Travel guide</div>
        <h1>Travel guide</h1>
        <div class="guide-tabs" role="tablist" aria-label="Travel guide categories">
          ${App.guide.map(function (cat) {
            return `<button type="button" role="tab" data-guide-tab="${App.esc(cat.name)}" aria-selected="${cat.name === category}">${App.esc(cat.name)}</button>`;
          }).join('')}
        </div>
        ${App.guide.map(function (cat) {
          return `<section class="guide-panel" role="tabpanel" aria-label="${App.esc(cat.name)}" ${cat.name === category ? '' : 'hidden'} data-guide-panel="${App.esc(cat.name)}">
            ${cat.questions.map(function (q, i) {
              return `<article class="guide-question" id="guide-${App.esc(cat.name.replace(/\s+/g, '-'))}-${App.esc(q.slug)}">
                <h3>${App.esc(q.title)}</h3>
                <p>${App.esc(q.body)}</p>
              </article>`;
            }).join('')}
          </section>`;
        }).join('')}
      </div>`;
    },
    bind: function (params) {
      const tabs = Array.from(document.querySelectorAll('[data-guide-tab]'));
      const panels = Array.from(document.querySelectorAll('[data-guide-panel]'));
      function select(name) {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.guideTab === name)); });
        panels.forEach(function (p) { p.hidden = p.dataset.guidePanel !== name; });
      }
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          select(tab.dataset.guideTab);
          history.replaceState(null, '', App.href('/guide', { category: tab.dataset.guideTab }));
        });
      });
      const q = params.get('q');
      if (q) {
        const heading = document.querySelector('#guide-' + (params.get('category') || 'Ticketing').replace(/\s+/g, '-') + '-' + q + ' h3');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.scrollIntoView({ block: 'center' });
        }
      }
    },
  });
})();
