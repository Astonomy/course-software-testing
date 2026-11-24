import { api, state, loadSession, setUser, go } from './store.js';
import { esc } from './ui.js';
import { renderHome, renderLogin, renderRegister } from './pages-core.js';
import { renderFlights, renderBooking, renderPayment } from './pages-flights.js';
import { renderOrders, renderOrderDetail, renderPersonal, renderTravelers, renderAddresses, renderAddressDetail, renderContacts, renderInvoices, renderProfile, renderSecurity } from './pages-account.js';
import { renderStatus, renderVouchers, renderAirports, renderAirportDetail } from './pages-services.js';

const pageRoot = () => document.querySelector('#page');
let navBound = false;

function navMarkup() {
  const signedIn = !!state.user;
  return `
  <nav class="global-nav" aria-label="Global navigation">
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">✈</span><span>Ctrip Travel</span></a>
    <div class="nav-search"><input type="search" aria-label="Search" placeholder="Search destinations, flights and services"></div>
    <div class="nav-actions">
      <div class="flyout-wrap">
        <button type="button" class="nav-button" id="flights-menu-button" aria-haspopup="true" aria-expanded="false" aria-controls="flights-flyout">Flights</button>
        <div class="flyout" id="flights-flyout" hidden>
          <a href="#/status" data-nav-close>Flight status</a>
        </div>
      </div>
      <div class="flyout-wrap more-services-wrap">
        <button type="button" class="nav-button" id="more-services-button" aria-haspopup="true" aria-expanded="false" aria-controls="more-services-panel">More services</button>
        <div class="flyout more-services-panel" id="more-services-panel" hidden>
          <button type="button" data-href="/vouchers">Reimbursement vouchers</button>
          <button type="button" data-href="/airports">Airport guide</button>
          <button type="button" data-href="/airports?tab=domestic">Domestic airport directory</button>
          <button type="button" data-href="/airports?tab=international">International airport directory</button>
        </div>
      </div>
      ${signedIn ? `
        <div class="account-wrap">
          <button type="button" class="account-button" id="account-menu-button" aria-haspopup="menu" aria-expanded="false">My account</button>
          <div class="account-menu" id="account-menu" aria-label="My account">
            <a href="#/orders">Orders</a>
            <a href="#/personal">Personal center</a>
            <button type="button" role="menuitem" class="logout" id="nav-logout">Log out</button>
          </div>
        </div>` : `
        <a class="nav-link auth-combined" href="#/login">Log in and Register</a>
        <a class="nav-link auth-login" href="#/login">Log in</a>
        <a class="nav-link auth-register" href="#/register">Register</a>`}
    </div>
  </nav>`;
}

function renderNav() {
  const header = document.querySelector('#site-header');
  if (!header) return;
  header.innerHTML = navMarkup();
  bindNav();
}

function bindNav() {
  const flightsButton = document.querySelector('#flights-menu-button');
  const flyout = document.querySelector('#flights-flyout');
  if (flightsButton && flyout) {
    flightsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = flyout.hidden;
      flyout.hidden = !open;
      flightsButton.setAttribute('aria-expanded', String(open));
      if (!open) {
        const panel = document.querySelector('#more-services-panel');
        const more = document.querySelector('#more-services-button');
        if (panel) panel.hidden = true;
        if (more) more.setAttribute('aria-expanded', 'false');
      }
    });
  }
  const moreButton = document.querySelector('#more-services-button');
  const morePanel = document.querySelector('#more-services-panel');
  if (moreButton && morePanel) {
    moreButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = morePanel.hidden;
      morePanel.hidden = !open;
      moreButton.setAttribute('aria-expanded', String(open));
    });
  }
  document.querySelectorAll('[data-href]').forEach(button => {
    button.addEventListener('click', () => go(button.dataset.href));
  });
  const account = document.querySelector('#account-menu-button');
  const accountWrap = document.querySelector('.account-wrap');
  if (account && accountWrap) {
    account.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = accountWrap.classList.toggle('open');
      account.setAttribute('aria-expanded', String(open));
    });
    accountWrap.addEventListener('mouseenter', () => account.setAttribute('aria-expanded', 'true'));
    accountWrap.addEventListener('mouseleave', () => {
      if (!accountWrap.classList.contains('open')) account.setAttribute('aria-expanded', 'false');
    });
  }
  const logout = document.querySelector('#nav-logout');
  if (logout) {
    logout.addEventListener('click', async () => {
      try { await api('auth.logout'); } catch (e) { /* ignore */ }
      setUser(null);
      go('/');
    });
  }
  if (!navBound) {
    navBound = true;
    document.addEventListener('click', (event) => {
      const flyout = document.querySelector('#flights-flyout');
      const button = document.querySelector('#flights-menu-button');
      if (flyout && button && !flyout.contains(event.target) && !button.contains(event.target)) {
        flyout.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
      const morePanel = document.querySelector('#more-services-panel');
      const moreBtn = document.querySelector('#more-services-button');
      if (morePanel && moreBtn && !morePanel.contains(event.target) && !moreBtn.contains(event.target)) {
        morePanel.hidden = true;
        moreBtn.setAttribute('aria-expanded', 'false');
      }
      const wrap = document.querySelector('.account-wrap');
      if (wrap && !wrap.contains(event.target)) {
        wrap.classList.remove('open');
        const account = document.querySelector('#account-menu-button');
        if (account) account.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

function parseRoute() {
  const raw = location.hash ? location.hash.slice(1) : '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  return { path: pathPart || '/', query: new URLSearchParams(queryPart) };
}

const routes = [
  { re: /^\/$/, render: renderHome, title: 'Ctrip Travel' },
  { re: /^\/login$/, render: renderLogin, title: 'Log in · Ctrip Travel' },
  { re: /^\/register$/, render: renderRegister, title: 'Register · Ctrip Travel' },
  { re: /^\/flights$/, render: renderFlights, title: 'Flight results · Ctrip Travel' },
  { re: /^\/book$/, render: renderBooking, title: 'Book flight · Ctrip Travel' },
  { re: /^\/payment\/([^/]+)$/, render: renderPayment, title: 'Payment · Ctrip Travel' },
  { re: /^\/orders$/, render: renderOrders, title: 'Orders · Ctrip Travel' },
  { re: /^\/orders\/([^/]+)$/, render: renderOrderDetail, title: 'Order details · Ctrip Travel' },
  { re: /^\/personal$/, render: renderPersonal, title: 'Personal center · Ctrip Travel' },
  { re: /^\/travelers$/, render: renderTravelers, title: 'Travelers · Ctrip Travel' },
  { re: /^\/addresses$/, render: renderAddresses, title: 'Addresses · Ctrip Travel' },
  { re: /^\/addresses\/(\d+)$/, render: renderAddressDetail, title: 'Address details · Ctrip Travel' },
  { re: /^\/contacts$/, render: renderContacts, title: 'Contacts · Ctrip Travel' },
  { re: /^\/invoices$/, render: renderInvoices, title: 'Invoice titles · Ctrip Travel' },
  { re: /^\/profile$/, render: renderProfile, title: 'My information · Ctrip Travel' },
  { re: /^\/security$/, render: renderSecurity, title: 'Account security · Ctrip Travel' },
  { re: /^\/status$/, render: renderStatus, title: 'Flight status · Ctrip Travel' },
  { re: /^\/vouchers$/, render: renderVouchers, title: 'Reimbursement vouchers · Ctrip Travel' },
  { re: /^\/airports$/, render: renderAirports, title: 'Airport guide · Ctrip Travel' },
  { re: /^\/airports\/([^/]+)$/, render: renderAirportDetail, title: 'Airport details · Ctrip Travel' }
];

async function route() {
  const page = pageRoot();
  if (!page) return;
  await loadSession();
  renderNav();
  const { path, query } = parseRoute();
  let matched = null;
  for (const item of routes) {
    const match = path.match(item.re);
    if (match) { matched = { item, match }; break; }
  }
  page.innerHTML = '<div class="container"><p class="muted">Loading…</p></div>';
  if (!matched) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Page not found</h1><p>The page you requested is not available.</p><a class="btn" href="#/">Back to home</a></div></div>`;
    return;
  }
  document.title = matched.item.title;
  try {
    await matched.item.render(page, query, matched.match.slice(1));
  } catch (error) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Something went wrong</h1><p role="alert">${esc(error.message || 'Unable to load this page.')}</p><a class="btn" href="#/">Back to home</a></div></div>`;
    console.error(error);
  }
  document.documentElement.scrollTop = 0;
  window.scrollTo(0, 0);
}

document.querySelector('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  const main = document.querySelector('#page');
  if (main) { main.focus(); main.scrollIntoView(); }
});

window.addEventListener('hashchange', route);
window.addEventListener('ct:nav', renderNav);
window.addEventListener('ct:refresh', route);
route();

export { route };
