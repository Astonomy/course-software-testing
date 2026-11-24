import { api, state, setUser, go } from './store.js';
import {
  esc, money, field, topAlert, openDialog, emptyState, mobileMask,
  emailMask, idMask, isValidPhone, passwordStrength
} from './ui.js';

function signInRequired(page, message = 'Sign in to view this page.') {
  page.innerHTML = `<div class="container narrow"><div class="card section">
    <h1>Sign in required</h1><p>${esc(message)}</p>
    <a class="btn primary" href="#/login">Log in</a>
  </div></div>`;
}

function accountSubpage(page, title, active, contentHtml) {
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><a href="#/personal">Personal center</a><span aria-hidden="true">›</span><span>${esc(title)}</span></div>
    <div class="page-heading"><h1>${esc(title)}</h1></div>
    ${contentHtml}
  </div>`;
}

function dialogConfirm({ name, title, keepLabel, onConfirm }) {
  const dialog = openDialog({
    name, title,
    body: `<p>${esc(name)} will update this account's saved travel information. This action cannot be undone.</p>`,
    footer: `<button type="button" class="btn" id="dialog-keep">${esc(keepLabel)}</button>
      <button type="button" class="btn danger" id="dialog-confirm">Confirm deletion</button>`
  });
  dialog.footer.querySelector('#dialog-keep').addEventListener('click', () => dialog.close());
  const confirm = dialog.footer.querySelector('#dialog-confirm');
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    try {
      await onConfirm();
      dialog.close();
    } catch (error) {
      topAlert(dialog.body, error.message);
      confirm.disabled = false;
    }
  });
  return dialog;
}

// ------------------------------------------------------------------ Personal center
export async function renderPersonal(page) {
  if (!state.user) { signInRequired(page); return; }
  const user = state.user;
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Personal center</span></div>
    <div class="page-heading"><h1>Personal center</h1><p class="page-subtitle">Manage your account and the information you reuse when booking.</p></div>
    <div class="two-col">
      <div>
        <section class="card section">
          <div class="section-head"><h2>My details</h2><span class="pill">${esc(user.nickname || user.email || user.mobile || 'Ctrip traveler')}</span></div>
          <div class="inline-actions" style="gap:12px">
            <button type="button" class="btn" id="my-information">My information</button>
            <button type="button" class="btn" id="account-security">Account security</button>
          </div>
        </section>
        <section class="card section">
          <div class="section-head">
            <h2>Common information</h2>
            <button type="button" class="btn" id="common-information" aria-expanded="false" aria-controls="common-links">Common information</button>
          </div>
          <p class="small muted" style="margin-top:0">Frequently used details for faster booking and delivery.</p>
          <div id="common-links" hidden>
            <div class="domestic-grid">
              <a href="#/travelers">Travelers</a>
              <a href="#/contacts">Contacts</a>
              <a href="#/invoices">Invoice titles</a>
              <a href="#/addresses">Addresses</a>
            </div>
          </div>
        </section>
      </div>
      <aside class="card persona-card">
        <h2 style="font-size:18px">Account at a glance</h2>
        <p class="small muted">${esc(user.email || 'Mobile account')}</p>
        <div class="info-box">
          <div class="small muted">Bound mobile</div><strong>${esc(mobileMask(user.mobile))}</strong>
          <div class="small muted" style="margin-top:10px">Traveler name</div><strong>${esc(user.real_name || 'Not provided')}</strong>
        </div>
      </aside>
    </div>
  </div>`;
  page.querySelector('#common-information').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const links = page.querySelector('#common-links');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    links.hidden = expanded;
  });
  page.querySelector('#my-information').addEventListener('click', () => go('/profile'));
  page.querySelector('#account-security').addEventListener('click', () => go('/security'));
}

// ------------------------------------------------------------------ Travelers
export async function renderTravelers(page) {
  if (!state.user) { signInRequired(page); return; }
  accountSubpage(page, 'Travelers', 'travelers', `
    <section class="card section">
      <div class="inline-actions" style="justify-content:space-between;margin-bottom:14px">
        <div class="inline-actions" style="flex:1">
          <div class="field" style="min-width:240px;flex:1"><label for="traveler-name">Traveler name</label><input id="traveler-name" type="text"></div>
          <button type="button" class="btn" id="search-travelers">Search travelers</button>
        </div>
        <button type="button" class="btn primary" id="add-traveler-button">Add traveler</button>
      </div>
      <div id="traveler-form-host"></div>
      <section role="region" aria-label="Traveler list" id="traveler-list"></section>
    </section>`);
  let records = [];
  let keyword = '';
  let selected = new Set();
  let editId = null;
  let showAdd = false;
  const listHost = page.querySelector('#traveler-list');
  const formHost = page.querySelector('#traveler-form-host');

  const load = async () => {
    try {
      const data = await api('personal.list');
      records = data.travelers || [];
      selected = new Set([...selected].filter(id => records.some(r => String(r.id) === id)));
      renderList();
    } catch (error) { topAlert(listHost, error.message); }
  };
  const filtered = () => records.filter(r => r.name.toLowerCase().includes(keyword.toLowerCase()));
  const renderList = () => {
    const items = filtered();
    listHost.innerHTML = `<div class="inline-actions" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:18px;margin:0">Traveler list</h2>
      <button type="button" class="btn danger" id="delete-selected-travelers">Delete selected</button>
    </div>
    ${items.length ? `<ul class="record-list">${items.map(record => `<li class="record-card" role="listitem" aria-label="Record ${esc(record.name)}">
      <div class="record-grid">
        <div class="record-main">
          <input type="checkbox" class="record-check" aria-label="${esc(record.name)}" data-select-traveler="${record.id}" ${selected.has(String(record.id)) ? 'checked' : ''}>
          <div><div class="record-title">${esc(record.name)}</div><div class="record-sub">ID <span>${esc(idMask(record.id_number))}</span></div></div>
        </div>
        <div class="record-actions">
          <button type="button" class="btn" data-edit-traveler="${record.id}">Edit</button>
          <button type="button" class="btn danger" data-delete-traveler="${record.id}">Delete</button>
        </div>
      </div></li>`).join('')}</ul>` : emptyState('No travelers found')}`;
    listHost.querySelectorAll('[data-select-traveler]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.dataset.selectTraveler); else selected.delete(cb.dataset.selectTraveler);
      });
    });
    listHost.querySelectorAll('[data-edit-traveler]').forEach(button => {
      button.addEventListener('click', () => {
        const record = records.find(r => String(r.id) === button.dataset.editTraveler);
        editId = record.id; showAdd = false; renderForm(record);
      });
    });
    listHost.querySelectorAll('[data-delete-traveler]').forEach(button => {
      button.addEventListener('click', () => {
        const record = records.find(r => String(r.id) === button.dataset.deleteTraveler);
        dialogConfirm({
          name: 'Delete traveler', title: 'Delete traveler', keepLabel: 'Keep traveler',
          onConfirm: async () => { await api('personal.delete_traveler', { id: record.id }); await load(); }
        });
      });
    });
    listHost.querySelector('#delete-selected-travelers').addEventListener('click', () => {
      if (!selected.size) { topAlert(listHost, 'Select at least one traveler'); return; }
      dialogConfirm({
        name: 'Delete travelers', title: 'Delete travelers', keepLabel: 'Keep traveler',
        onConfirm: async () => {
          await api('personal.delete_travelers', { ids: [...selected] });
          selected.clear(); await load();
        }
      });
    });
  };
  const renderForm = (record = null) => {
    formHost.innerHTML = `<section class="add-panel" role="region" aria-label="${record ? 'Edit traveler' : 'Add traveler'}">
      <div class="section-head"><h2>${record ? 'Edit traveler' : 'Add traveler'}</h2><button type="button" class="btn" id="cancel-traveler-form">Cancel</button></div>
      <div class="form-grid">
        ${field('Full name', `<input id="traveler-form-name" type="text" value="${esc(record?.name || '')}">`, { className: 'wide' })}
        ${field('ID number', `<input id="traveler-form-id" type="text" value="${esc(record?.id_number || '')}">`, { className: 'wide' })}
      </div>
      <div id="traveler-form-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="save-traveler">Save traveler</button></div>
    </section>`;
    formHost.querySelector('#cancel-traveler-form').addEventListener('click', () => { formHost.innerHTML = ''; editId = null; showAdd = false; });
    formHost.querySelector('#save-traveler').addEventListener('click', async () => {
      const name = formHost.querySelector('#traveler-form-name').value.trim();
      const idNumber = formHost.querySelector('#traveler-form-id').value.trim();
      if (!name) { topAlert(formHost.querySelector('#traveler-form-alert'), 'Enter a full name'); return; }
      try {
        if (record) await api('personal.update_traveler', { id: record.id, name, id_number: idNumber });
        else await api('personal.add_traveler', { name, id_number: idNumber });
        formHost.innerHTML = '';
        editId = null; showAdd = false;
        await load();
      } catch (error) { topAlert(formHost.querySelector('#traveler-form-alert'), error.message); }
    });
  };
  page.querySelector('#search-travelers').addEventListener('click', () => {
    keyword = page.querySelector('#traveler-name').value.trim();
    renderList();
  });
  page.querySelector('#traveler-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { keyword = event.currentTarget.value.trim(); renderList(); }
  });
  page.querySelector('#add-traveler-button').addEventListener('click', () => { showAdd = true; editId = null; renderForm(); });
  await load();
}

// ------------------------------------------------------------------ Addresses
export async function renderAddresses(page) {
  if (!state.user) { signInRequired(page); return; }
  accountSubpage(page, 'Addresses', 'addresses', `
    <section class="card section">
      <div class="inline-actions" style="justify-content:flex-end;margin-bottom:14px">
        <button type="button" class="btn primary" id="add-address-button">Add address</button>
      </div>
      <div id="address-form-host"></div>
      <section role="region" aria-label="Address list" id="address-list"></section>
    </section>`);
  let records = [];
  let selected = new Set();
  const listHost = page.querySelector('#address-list');
  const formHost = page.querySelector('#address-form-host');
  const load = async () => {
    try {
      const data = await api('personal.list');
      records = data.addresses || [];
      selected = new Set([...selected].filter(id => records.some(r => String(r.id) === id)));
      renderList();
    } catch (error) { topAlert(listHost, error.message); }
  };
  const renderList = () => {
    listHost.innerHTML = `<div class="inline-actions" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:18px;margin:0">Address list</h2>
      <button type="button" class="btn danger" id="delete-selected-addresses">Delete selected</button>
    </div>
    ${records.length ? `<ul class="record-list">${records.map(record => `<li class="record-card" role="listitem" aria-label="Record ${esc(record.recipient)}">
      <div class="record-grid">
        <div class="record-main">
          <input type="checkbox" class="record-check" aria-label="${esc(record.recipient)}" data-select-address="${record.id}" ${selected.has(String(record.id)) ? 'checked' : ''}>
          <div><div class="record-title">${esc(record.recipient)}</div>
            <div class="record-sub"><span>${esc(record.city)}</span> · <span>${esc(record.district)}</span> · <span>${esc(record.street)}</span></div>
            <div class="record-sub">Mobile <span>${esc(record.mobile)}</span></div>
          </div>
        </div>
        <div class="record-actions">
          <button type="button" class="btn" data-view-address="${record.id}" data-address-id="${record.id}">View address</button>
          <button type="button" class="btn danger" data-delete-address="${record.id}">Delete</button>
        </div>
      </div></li>`).join('')}</ul>` : emptyState('No saved addresses')}`;
    listHost.querySelectorAll('[data-select-address]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.dataset.selectAddress); else selected.delete(cb.dataset.selectAddress);
      });
    });
    listHost.querySelectorAll('[data-view-address]').forEach(button => {
      button.addEventListener('click', () => go('/addresses/' + button.dataset.viewAddress));
    });
    listHost.querySelectorAll('[data-delete-address]').forEach(button => {
      button.addEventListener('click', () => {
        const record = records.find(r => String(r.id) === button.dataset.deleteAddress);
        dialogConfirm({
          name: 'Delete address', title: 'Delete address', keepLabel: 'Keep address',
          onConfirm: async () => { await api('personal.delete_address', { id: record.id }); await load(); }
        });
      });
    });
    listHost.querySelector('#delete-selected-addresses').addEventListener('click', () => {
      if (!selected.size) { topAlert(listHost, 'Select at least one address'); return; }
      dialogConfirm({
        name: 'Delete addresses', title: 'Delete addresses', keepLabel: 'Keep address',
        onConfirm: async () => { await api('personal.delete_addresses', { ids: [...selected] }); selected.clear(); await load(); }
      });
    });
  };
  const renderForm = () => {
    formHost.innerHTML = `<section class="add-panel" role="region" aria-label="Add address">
      <div class="section-head"><h2>Add address</h2><button type="button" class="btn" id="cancel-address-form">Cancel</button></div>
      <div class="form-grid">
        ${field('Recipient', '<input id="address-recipient" type="text">')}
        ${field('City', '<input id="address-city" type="text">')}
        ${field('District', '<input id="address-district" type="text">')}
        ${field('Street address', '<input id="address-street" type="text">')}
        ${field('Mobile number', '<input id="address-mobile" type="tel">')}
      </div>
      <div id="address-form-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="save-address">Save address</button></div>
    </section>`;
    formHost.querySelector('#cancel-address-form').addEventListener('click', () => { formHost.innerHTML = ''; });
    formHost.querySelector('#save-address').addEventListener('click', async () => {
      const data = {
        recipient: formHost.querySelector('#address-recipient').value.trim(),
        city: formHost.querySelector('#address-city').value.trim(),
        district: formHost.querySelector('#address-district').value.trim(),
        street: formHost.querySelector('#address-street').value.trim(),
        mobile: formHost.querySelector('#address-mobile').value.trim()
      };
      if (!data.recipient) { topAlert(formHost.querySelector('#address-form-alert'), 'Enter a recipient'); return; }
      if (!isValidPhone(data.mobile)) { topAlert(formHost.querySelector('#address-form-alert'), 'Enter a valid mobile number'); return; }
      try {
        await api('personal.add_address', data);
        formHost.innerHTML = '';
        await load();
      } catch (error) { topAlert(formHost.querySelector('#address-form-alert'), error.message); }
    });
  };
  page.querySelector('#add-address-button').addEventListener('click', renderForm);
  await load();
}

export async function renderAddressDetail(page, query, params) {
  if (!state.user) { signInRequired(page); return; }
  const id = params[0];
  let record;
  try {
    const data = await api('personal.list');
    record = (data.addresses || []).find(item => String(item.id) === String(id));
  } catch (error) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Address details</h1><div class="inline-alert" role="alert">${esc(error.message)}</div></div></div>`;
    return;
  }
  if (!record) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Address details</h1><p>This address is not available.</p><a class="btn" href="#/addresses">Back to addresses</a></div></div>`;
    return;
  }
  page.innerHTML = `<div class="container narrow">
    <div class="breadcrumbs"><a href="#/personal">Personal center</a><span aria-hidden="true">›</span><a href="#/addresses">Addresses</a><span aria-hidden="true">›</span><span>Address details</span></div>
    <div class="page-heading"><h1>Address details</h1></div>
    <section class="card section" role="region" aria-label="Address details">
      <h2>${esc(record.recipient)}</h2>
      <dl class="profile-grid" style="grid-template-columns:repeat(2,1fr)">
        <div class="profile-item"><span class="label">Recipient</span><strong>${esc(record.recipient)}</strong></div>
        <div class="profile-item"><span class="label">Mobile number</span><strong>${esc(record.mobile)}</strong></div>
        <div class="profile-item"><span class="label">City</span><strong>${esc(record.city)}</strong></div>
        <div class="profile-item"><span class="label">District</span><strong>${esc(record.district)}</strong></div>
        <div class="profile-item" style="grid-column:1/-1"><span class="label">Street address</span><strong>${esc(record.street)}</strong></div>
      </dl>
      <div class="form-actions"><a class="btn" href="#/addresses">Back to addresses</a></div>
    </section>
  </div>`;
}

// ------------------------------------------------------------------ Contacts
export async function renderContacts(page) {
  if (!state.user) { signInRequired(page); return; }
  accountSubpage(page, 'Contacts', 'contacts', `
    <section class="card section">
      <div class="inline-actions" style="justify-content:space-between;margin-bottom:14px">
        <div class="inline-actions" id="contact-search-row" style="flex:1">
          <div class="field" style="min-width:240px;flex:1"><label for="contact-name">Contact name</label><input id="contact-name" type="text"></div>
          <button type="button" class="btn" id="search-contacts">Search contacts</button>
        </div>
        <button type="button" class="btn primary" id="add-contact-button">Add contact</button>
      </div>
      <div id="contact-form-host"></div>
      <section role="region" aria-label="Contact list" id="contact-list"></section>
    </section>`);
  let records = [];
  let keyword = '';
  let selected = new Set();
  const listHost = page.querySelector('#contact-list');
  const formHost = page.querySelector('#contact-form-host');
  const load = async () => {
    try {
      const data = await api('personal.list');
      records = data.contacts || [];
      selected = new Set([...selected].filter(id => records.some(r => String(r.id) === id)));
      renderList();
    } catch (error) { topAlert(listHost, error.message); }
  };
  const renderList = () => {
    const items = records.filter(r => (r.name || '').toLowerCase().includes(keyword.toLowerCase()));
    listHost.innerHTML = `<div class="inline-actions" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:18px;margin:0">Contact list</h2>
      <button type="button" class="btn danger" id="delete-selected-contacts">Delete selected</button>
    </div>
    ${items.length ? `<ul class="record-list">${items.map(record => `<li class="record-card" role="listitem" aria-label="Record ${esc(record.name)}">
      <div class="record-grid">
        <div class="record-main">
          <input type="checkbox" class="record-check" aria-label="${esc(record.name)}" data-select-contact="${record.id}" ${selected.has(String(record.id)) ? 'checked' : ''}>
          <div><div class="record-title">${esc(record.name)} ${record.is_default ? '<span class="pill green">Default</span>' : ''}</div>
            <div class="record-sub"><span>${esc(record.mobile)}</span> · <span>${esc(record.email)}</span></div>
          </div>
        </div>
        <div class="record-actions"><button type="button" class="btn danger" data-delete-contact="${record.id}">Delete</button></div>
      </div></li>`).join('')}</ul>` : emptyState('No contacts found')}`;
    listHost.querySelectorAll('[data-select-contact]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.dataset.selectContact); else selected.delete(cb.dataset.selectContact);
      });
    });
    listHost.querySelectorAll('[data-delete-contact]').forEach(button => {
      button.addEventListener('click', () => {
        const record = records.find(r => String(r.id) === button.dataset.deleteContact);
        dialogConfirm({
          name: 'Delete contact', title: 'Delete contact', keepLabel: 'Keep contact',
          onConfirm: async () => { await api('personal.delete_contact', { id: record.id }); await load(); }
        });
      });
    });
    listHost.querySelector('#delete-selected-contacts').addEventListener('click', () => {
      if (!selected.size) { topAlert(listHost, 'Select at least one contact'); return; }
      dialogConfirm({
        name: 'Delete contacts', title: 'Delete contacts', keepLabel: 'Keep contact',
        onConfirm: async () => { await api('personal.delete_contacts', { ids: [...selected] }); selected.clear(); await load(); }
      });
    });
  };
  const renderForm = () => {
    formHost.innerHTML = `<section class="add-panel" role="region" aria-label="Add contact">
      <div class="section-head"><h2>Add contact</h2><button type="button" class="btn" id="cancel-contact-form">Cancel</button></div>
      <div class="form-grid">
        ${field('Contact name', '<input id="contact-form-name" type="text">')}
        ${field('Mobile number', '<input id="contact-form-mobile" type="tel">')}
        ${field('Email', '<input id="contact-form-email" type="email">', { className: 'wide' })}
        <label class="checkbox wide"><input type="checkbox" id="contact-default">Default contact</label>
      </div>
      <div id="contact-form-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="save-contact">Save contact</button></div>
    </section>`;
    const searchRow = page.querySelector('#contact-search-row');
    if (searchRow) searchRow.hidden = true;
    formHost.querySelector('#cancel-contact-form').addEventListener('click', () => { formHost.innerHTML = ''; if (searchRow) searchRow.hidden = false; });
    formHost.querySelector('#save-contact').addEventListener('click', async () => {
      const data = {
        name: formHost.querySelector('#contact-form-name').value.trim(),
        mobile: formHost.querySelector('#contact-form-mobile').value.trim(),
        email: formHost.querySelector('#contact-form-email').value.trim(),
        is_default: formHost.querySelector('#contact-default').checked
      };
      if (!data.name) { topAlert(formHost.querySelector('#contact-form-alert'), 'Enter a contact name'); return; }
      try {
        await api('personal.add_contact', data);
        formHost.innerHTML = '';
        if (searchRow) searchRow.hidden = false;
        await load();
      } catch (error) { topAlert(formHost.querySelector('#contact-form-alert'), error.message); }
    });
  };
  page.querySelector('#search-contacts').addEventListener('click', () => {
    keyword = page.querySelector('#contact-name').value.trim();
    renderList();
  });
  page.querySelector('#add-contact-button').addEventListener('click', renderForm);
  await load();
}

// ------------------------------------------------------------------ Invoice titles
export async function renderInvoices(page) {
  if (!state.user) { signInRequired(page); return; }
  accountSubpage(page, 'Invoice titles', 'invoices', `
    <section class="card section">
      <div class="inline-actions" style="justify-content:space-between;margin-bottom:14px">
        <div class="inline-actions" style="flex:1">
          <div class="field" style="min-width:250px;flex:1"><label for="invoice-search">Search invoice titles</label><input id="invoice-search" type="text"></div>
          <button type="button" class="btn" id="search-invoices">Search</button>
        </div>
        <button type="button" class="btn primary" id="add-invoice-button">Add invoice title</button>
      </div>
      <div id="invoice-form-host"></div>
      <section role="region" aria-label="Invoice title list" id="invoice-list"></section>
    </section>`);
  let records = [];
  let keyword = '';
  let selected = new Set();
  const listHost = page.querySelector('#invoice-list');
  const formHost = page.querySelector('#invoice-form-host');
  const load = async () => {
    try {
      const data = await api('personal.list');
      records = data.invoice_titles || [];
      selected = new Set([...selected].filter(id => records.some(r => String(r.id) === id)));
      renderList();
    } catch (error) { topAlert(listHost, error.message); }
  };
  const renderList = () => {
    const items = records.filter(r => (r.name || '').toLowerCase().includes(keyword.toLowerCase()));
    listHost.innerHTML = `<div class="inline-actions" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:18px;margin:0">Invoice title list</h2>
      <button type="button" class="btn danger" id="delete-selected-invoices">Delete selected</button>
    </div>
    ${items.length ? `<ul class="record-list">${items.map(record => `<li class="record-card" role="listitem" aria-label="Record ${esc(record.name)}">
      <div class="record-grid">
        <div class="record-main">
          <input type="checkbox" class="record-check" aria-label="${esc(record.name)}" data-select-invoice="${record.id}" ${selected.has(String(record.id)) ? 'checked' : ''}>
          <div><div class="record-title">${esc(record.name)}</div>
            <div class="record-sub">${esc(record.type)} · Taxpayer ID <span>${esc(record.taxpayer_id)}</span></div>
          </div>
        </div>
        <div class="record-actions"><button type="button" class="btn danger" data-delete-invoice="${record.id}">Delete</button></div>
      </div></li>`).join('')}</ul>` : emptyState('No invoice titles found')}`;
    listHost.querySelectorAll('[data-select-invoice]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.dataset.selectInvoice); else selected.delete(cb.dataset.selectInvoice);
      });
    });
    listHost.querySelectorAll('[data-delete-invoice]').forEach(button => {
      button.addEventListener('click', () => {
        const record = records.find(r => String(r.id) === button.dataset.deleteInvoice);
        dialogConfirm({
          name: 'Delete invoice title', title: 'Delete invoice title', keepLabel: 'Keep invoice title',
          onConfirm: async () => { await api('personal.delete_invoice', { id: record.id }); await load(); }
        });
      });
    });
    listHost.querySelector('#delete-selected-invoices').addEventListener('click', () => {
      if (!selected.size) { topAlert(listHost, 'Select at least one invoice title'); return; }
      dialogConfirm({
        name: 'Delete invoice titles', title: 'Delete invoice titles', keepLabel: 'Keep invoice title',
        onConfirm: async () => { await api('personal.delete_invoices', { ids: [...selected] }); selected.clear(); await load(); }
      });
    });
  };
  const renderForm = () => {
    formHost.innerHTML = `<section class="add-panel" role="region" aria-label="Add invoice title">
      <div class="section-head"><h2>Add invoice title</h2><button type="button" class="btn" id="cancel-invoice-form">Cancel</button></div>
      <div class="form-grid">
        ${field('Type', '<select id="invoice-type"><option>Company</option><option>Personal</option></select>')}
        ${field('Invoice title', '<input id="invoice-title" type="text">')}
        ${field('Taxpayer ID', '<input id="invoice-taxpayer" type="text">')}
        <label class="checkbox wide"><input type="checkbox" id="invoice-special">Special VAT invoice</label>
        <div class="form-grid wide" id="invoice-vat-fields" hidden>
          ${field('Registered address', '<input id="invoice-registered-address" type="text">')}
          ${field('Registered phone', '<input id="invoice-registered-phone" type="text">')}
          ${field('Bank name', '<input id="invoice-bank-name" type="text">')}
          ${field('Bank account', '<input id="invoice-bank-account" type="text">')}
        </div>
      </div>
      <div id="invoice-form-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="save-invoice">Save</button></div>
    </section>`;
    formHost.querySelector('#cancel-invoice-form').addEventListener('click', () => { formHost.innerHTML = ''; });
    formHost.querySelector('#invoice-special').addEventListener('change', (event) => {
      formHost.querySelector('#invoice-vat-fields').hidden = !event.target.checked;
    });
    formHost.querySelector('#save-invoice').addEventListener('click', async () => {
      const data = {
        type: formHost.querySelector('#invoice-type').value,
        name: formHost.querySelector('#invoice-title').value.trim(),
        taxpayer_id: formHost.querySelector('#invoice-taxpayer').value.trim(),
        special_vat: formHost.querySelector('#invoice-special').checked,
        registered_address: formHost.querySelector('#invoice-registered-address').value.trim(),
        registered_phone: formHost.querySelector('#invoice-registered-phone').value.trim(),
        bank_name: formHost.querySelector('#invoice-bank-name').value.trim(),
        bank_account: formHost.querySelector('#invoice-bank-account').value.trim()
      };
      if (!data.name) { topAlert(formHost.querySelector('#invoice-form-alert'), 'Enter an invoice title'); return; }
      if (data.type === 'Company' && !data.taxpayer_id) {
        topAlert(formHost.querySelector('#invoice-form-alert'), 'Enter a taxpayer ID');
        formHost.querySelector('#invoice-taxpayer').setAttribute('aria-invalid', 'true');
        return;
      }
      try {
        await api('personal.add_invoice', data);
        formHost.innerHTML = '';
        await load();
      } catch (error) { topAlert(formHost.querySelector('#invoice-form-alert'), error.message); }
    });
  };
  page.querySelector('#search-invoices').addEventListener('click', () => {
    keyword = page.querySelector('#invoice-search').value.trim();
    renderList();
  });
  page.querySelector('#add-invoice-button').addEventListener('click', renderForm);
  await load();
}

// ------------------------------------------------------------------ Profile
export async function renderProfile(page) {
  if (!state.user) { signInRequired(page); return; }
  const user = state.user;
  const details = `<section class="card section">
    <div class="section-head"><h2>Profile details</h2><button type="button" class="btn" id="edit-profile">Edit</button></div>
    <div class="profile-grid">
      <div class="profile-item"><span class="label">Mobile</span><strong>${esc(mobileMask(user.mobile))}</strong></div>
      <div class="profile-item"><span class="label">Email</span><strong>${esc(emailMask(user.email))}</strong></div>
      <div class="profile-item"><span class="label">Nickname</span><strong>${esc(user.nickname || '—')}</strong></div>
      <div class="profile-item"><span class="label">Real name</span><strong>${esc(user.real_name || '—')}</strong></div>
      <div class="profile-item"><span class="label">Gender</span><strong>${esc(user.gender || '—')}</strong></div>
      <div class="profile-item"><span class="label">Date of birth</span><strong>${esc(user.birth_date || '—')}</strong></div>
    </div>
  </section>
  <div id="profile-edit-host"></div>`;
  page.innerHTML = `<div class="container narrow">
    <div class="breadcrumbs"><a href="#/personal">Personal center</a><span aria-hidden="true">›</span><span>My information</span></div>
    <div class="page-heading"><h1>My information</h1></div>${details}</div>`;
  page.querySelector('#edit-profile').addEventListener('click', () => {
    const host = page.querySelector('#profile-edit-host');
    host.innerHTML = `<section class="card section" role="region" aria-label="Edit profile">
      <div class="section-head"><h2>Edit profile</h2></div>
      <div class="form-grid">
        ${field('Nickname', `<input id="profile-nickname" type="text" value="${esc(user.nickname || '')}">`)}
        ${field('Real name', `<input id="profile-real-name" type="text" value="${esc(user.real_name || '')}">`)}
        ${field('Gender', `<select id="profile-gender"><option ${user.gender === 'Male' ? 'selected' : ''}>Male</option><option ${user.gender === 'Female' ? 'selected' : ''}>Female</option></select>`)}
        ${field('Date of birth', `<input id="profile-birth" type="text" value="${esc(user.birth_date || '')}" placeholder="YYYY-MM-DD">`)}
      </div>
      <div id="profile-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="save-profile">Save</button><button type="button" class="btn" id="cancel-profile">Cancel</button></div>
    </section>`;
    host.querySelector('#cancel-profile').addEventListener('click', () => { host.innerHTML = ''; });
    host.querySelector('#save-profile').addEventListener('click', async () => {
      const data = {
        nickname: host.querySelector('#profile-nickname').value.trim(),
        real_name: host.querySelector('#profile-real-name').value.trim(),
        gender: host.querySelector('#profile-gender').value,
        birth_date: host.querySelector('#profile-birth').value.trim()
      };
      try {
        const result = await api('profile.update', data);
        setUser(result.user);
        await renderProfile(page);
      } catch (error) { topAlert(host.querySelector('#profile-alert'), error.message); }
    });
  });
}

// ------------------------------------------------------------------ Security
export async function renderSecurity(page) {
  if (!state.user) { signInRequired(page); return; }
  const user = state.user;
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/personal">Personal center</a><span aria-hidden="true">›</span><span>Account security</span></div>
    <div class="page-heading"><h1>Account security</h1><p class="page-subtitle">Change your password regularly.</p></div>
    <div id="security-alert-host"></div>
    <div class="security-list">
      <section class="card security-item" role="region" aria-label="Login password">
        <div class="security-row"><div><h2 style="font-size:18px">Login password</h2><p class="small muted" style="margin:0">Use a password that is hard to guess.</p></div><button type="button" class="btn" data-security-change="password">Change</button></div>
        <div id="password-panel"></div>
      </section>
      <section class="card security-item" role="region" aria-label="Bound phone">
        <div class="security-row"><div><h2 style="font-size:18px">Bound phone</h2><p class="small muted" style="margin:0">${esc(mobileMask(user.mobile))}</p></div><button type="button" class="btn" data-security-change="phone">Change</button></div>
        <div id="phone-panel"></div>
      </section>
      <section class="card security-item" role="region" aria-label="Bound email">
        <div class="security-row"><div><h2 style="font-size:18px">Bound email</h2><p class="small muted" style="margin:0">Email address on file</p></div><button type="button" class="btn" data-security-change="email">Change</button></div>
        <div id="email-panel"></div>
      </section>
    </div>
  </div>`;
  page.querySelector('[data-security-change="password"]').addEventListener('click', renderPasswordPanel);
  page.querySelector('[data-security-change="phone"]').addEventListener('click', renderPhonePanel);
  page.querySelector('[data-security-change="email"]').addEventListener('click', renderEmailPanel);

  function renderPasswordPanel() {
    page.querySelector('#phone-panel').innerHTML = '';
    page.querySelector('#email-panel').innerHTML = '';
    const panel = page.querySelector('#password-panel');
    panel.innerHTML = `<section class="security-region" role="region" aria-label="Password change form">
      <h3>Change login password</h3>
      <div class="form-grid">
        ${field('Current password', '<input id="current-password" type="password" autocomplete="current-password">', { className: 'wide' })}
        ${field('New password', '<input id="new-password" type="password" autocomplete="new-password">')}
        ${field('Confirm new password', '<input id="confirm-new-password" type="password" autocomplete="new-password">')}
      </div>
      <section class="field" role="region" aria-label="Password strength" style="margin-top:12px">
        <span class="label">Password strength</span>
        <span id="password-strength-text">Enter a new password</span>
        <div class="strength-bar" id="password-strength-bar"><span></span></div>
      </section>
      <div id="password-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="complete-password">Complete</button><button type="button" class="btn" id="cancel-password">Cancel</button></div>
    </section>`;
    panel.querySelector('#new-password').addEventListener('input', (event) => {
      const result = passwordStrength(event.target.value);
      panel.querySelector('#password-strength-text').textContent = result.label;
      const bar = panel.querySelector('#password-strength-bar');
      bar.className = 'strength-bar ' + (result.score >= 3 ? 'strong' : result.score === 2 ? 'medium' : 'weak');
    });
    panel.querySelector('#cancel-password').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('#complete-password').addEventListener('click', async () => {
      const current = panel.querySelector('#current-password').value;
      const next = panel.querySelector('#new-password').value;
      const confirmation = panel.querySelector('#confirm-new-password').value;
      const alertHost = panel.querySelector('#password-alert');
      alertHost.innerHTML = '';
      if (next !== confirmation) { topAlert(alertHost, 'Passwords do not match'); return; }
      if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
        topAlert(alertHost, 'Password must contain letters and numbers and be at least 8 characters'); return;
      }
      try {
        const result = await api('security.change_password', { current_password: current, new_password: next });
        setUser(null);
        panel.innerHTML = `<div class="inline-success" role="status">Sign in again</div><p class="small">Your password has been changed.</p><a class="btn" href="#/login">Go to sign in</a>`;
      } catch (error) { topAlert(alertHost, error.message); }
    });
  }

  function renderPhonePanel() {
    page.querySelector('#password-panel').innerHTML = '';
    page.querySelector('#email-panel').innerHTML = '';
    const panel = page.querySelector('#phone-panel');
    panel.innerHTML = `<section class="security-region" role="region" aria-label="Verify identity">
      <h3>Verify identity</h3>
      <div class="form-grid">
        ${field('Login password', '<input id="phone-current-password" type="password">')}
        ${field('New phone', '<input id="phone-new-number" type="tel">')}
      </div>
      <div id="phone-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="next-verify-phone">Next, verify new phone</button><button type="button" class="btn" id="cancel-phone">Cancel</button></div>
    </section>`;
    panel.querySelector('#cancel-phone').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('#next-verify-phone').addEventListener('click', async () => {
      const password = panel.querySelector('#phone-current-password').value;
      const phone = panel.querySelector('#phone-new-number').value.trim();
      if (!phone) { topAlert(panel.querySelector('#phone-alert'), 'Enter a new phone number'); return; }
      try {
        await api('security.check_password', { password });
        panel.innerHTML = `<section class="security-region" role="region" aria-label="Verify new phone">
          <h3>Verify new phone</h3>
          <p>Code sent to ${esc(phone)}</p>
          ${field('Verification code', '<input id="new-phone-code" type="text" inputmode="numeric">')}
          <div class="form-actions"><button type="button" class="btn">Verify</button><button type="button" class="btn" id="cancel-phone">Cancel</button></div>
        </section>`;
        panel.querySelector('#cancel-phone').addEventListener('click', () => { panel.innerHTML = ''; });
      } catch (error) { topAlert(panel.querySelector('#phone-alert'), error.message); }
    });
  }

  function renderEmailPanel() {
    page.querySelector('#password-panel').innerHTML = '';
    page.querySelector('#phone-panel').innerHTML = '';
    const panel = page.querySelector('#email-panel');
    let sent = false;
    panel.innerHTML = `<section class="security-region" role="region" aria-label="Verify current email">
      <h3>Verify current email</h3>
      <p>Current email: <strong>${esc(emailMask(user.email))}</strong></p>
      <div class="inline-actions" style="margin-bottom:12px"><button type="button" class="btn" id="send-email-code">Send verification code</button></div>
      ${field('Verification code', '<input id="email-code" type="text" inputmode="numeric">')}
      <div id="email-alert"></div>
      <div class="form-actions"><button type="button" class="btn primary" id="next-email">Next, verify new email</button><button type="button" class="btn" id="cancel-email">Cancel</button></div>
    </section>`;
    panel.querySelector('#cancel-email').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('#send-email-code').addEventListener('click', async () => {
      try {
        await api('security.send_email_code');
        sent = true;
        panel.querySelector('#send-email-code').textContent = 'Resend verification code';
      } catch (error) { topAlert(panel.querySelector('#email-alert'), error.message); }
    });
    panel.querySelector('#next-email').addEventListener('click', () => {
      const code = panel.querySelector('#email-code').value.trim();
      const alertHost = panel.querySelector('#email-alert');
      alertHost.innerHTML = '';
      if (!sent) { topAlert(alertHost, 'Send a verification code first'); return; }
      if (!code) { topAlert(alertHost, 'Enter your verification code'); return; }
      if (code !== '123456') { topAlert(alertHost, 'Incorrect verification code'); return; }
      panel.querySelector('[aria-label="Verify current email"]').innerHTML = `<h3>Verify new email</h3>
        <p>Current email verified successfully.</p>
        ${field('New email', '<input id="new-email" type="email">')}
        <div class="form-actions"><button type="button" class="btn">Verify new email</button></div>`;
    });
  }
}

// ------------------------------------------------------------------ Orders
export async function renderOrders(page, query) {
  if (!state.user) { signInRequired(page); return; }
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/">Home</a><span aria-hidden="true">›</span><span>Orders</span></div>
    <div class="page-heading"><h1>Orders</h1><p class="page-subtitle">View and manage your flight orders.</p></div>
    <section class="card section">
      <div class="search-row">
        <div class="field"><label for="order-number">Order number</label><input id="order-number" type="text"></div>
        <button type="button" class="btn" id="search-orders">Search orders</button>
      </div>
      <div class="tabs" role="tablist" aria-label="Order status">
        <button type="button" role="tab" class="tab" data-order-tab="all" aria-selected="true">All orders</button>
        <button type="button" role="tab" class="tab" data-order-tab="not-traveled" aria-selected="false">Not traveled</button>
        <button type="button" role="tab" class="tab" data-order-tab="pending-payment" aria-selected="false">Pending payment</button>
        <button type="button" role="tab" class="tab" data-order-tab="pending-review" aria-selected="false">Pending review</button>
      </div>
      <section role="region" aria-label="Order list" id="order-list"><p class="muted">Loading orders…</p></section>
    </section>
  </div>`;
  let records = [];
  let activeTab = 'all';
  let numberQuery = '';
  let listTimers = [];
  const listHost = page.querySelector('#order-list');
  window.addEventListener('hashchange', () => listTimers.forEach(clearInterval), { once: true });
  const load = async () => {
    try {
      const data = await api('orders.list');
      records = data.orders || [];
      renderList();
    } catch (error) { listHost.innerHTML = `<div class="inline-alert" role="alert">${esc(error.message)}</div>`; }
  };
  const filtered = () => records.filter(order => {
    if (numberQuery && !order.number.toLowerCase().includes(numberQuery.toLowerCase())) return false;
    if (activeTab === 'pending-payment') return order.payment_status === 'Pending payment';
    if (activeTab === 'not-traveled') return order.display_status === 'Not traveled';
    if (activeTab === 'pending-review') return order.display_status === 'Pending review';
    return true;
  });
  const renderList = () => {
    const items = filtered();
    listHost.innerHTML = items.length ? `<ul class="order-list">${items.map(order => `<li class="order-card" role="listitem" aria-label="Record ${esc(order.number)}">
      <div class="order-head">
        <div><span class="order-number">${esc(order.number)}</span> <span class="small muted">Booked ${esc(order.booking_date || '')}</span></div>
        <span class="status-badge ${order.payment_status === 'Closed' ? 'closed' : order.payment_status === 'Paid' ? 'paid' : 'pending'}">${esc(order.display_status)}</span>
      </div>
      <div class="order-grid">
        <div><span class="label">Itinerary</span><span>${esc(order.origin)} → ${esc(order.destination)}</span> · <span>${esc(order.flight_date)}</span></div>
        <div><span class="label">Flight</span><strong>${esc(order.flight)}</strong></div>
        <div><span class="label">Total</span><strong>${money(order.total)}</strong></div>
        <div class="record-actions" style="justify-content:flex-end">
          ${order.payment_status === 'Pending payment' ? `<button type="button" class="btn primary" data-pay-order="${esc(order.number)}">Pay now</button>` : ''}
          <a class="btn" href="#/orders/${encodeURIComponent(order.number)}" data-view-order="${esc(order.number)}">View details</a>
        </div>
      </div>
      ${order.payment_status === 'Pending payment' ? `<div class="timeline-note" style="margin-top:10px">Time remaining <strong role="timer" aria-label="Time remaining" data-order-countdown="${order.remaining_seconds || 0}">--:--</strong> · Unpaid orders are cancelled when the timer expires.</div>` : ''}
      </li>`).join('')}</ul>` : emptyState('No orders found');
    listTimers.forEach(clearInterval);
    listTimers = [];
    const started = Date.now();
    listHost.querySelectorAll('[data-order-countdown]').forEach(timer => {
      const allowed = Number(timer.dataset.orderCountdown || 0);
      const update = () => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const remaining = Math.max(0, allowed - elapsed);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        timer.textContent = hours > 0
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };
      update();
      listTimers.push(setInterval(update, 1000));
    });
    listHost.querySelectorAll('[data-pay-order]').forEach(button => {
      button.addEventListener('click', () => go('/payment/' + encodeURIComponent(button.dataset.payOrder)));
    });
  };
  page.querySelectorAll('[data-order-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.orderTab;
      page.querySelectorAll('[data-order-tab]').forEach(item => item.setAttribute('aria-selected', String(item === tab)));
      renderList();
    });
  });
  page.querySelector('#search-orders').addEventListener('click', () => {
    numberQuery = page.querySelector('#order-number').value.trim();
    renderList();
  });
  page.querySelector('#order-number').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { numberQuery = event.currentTarget.value.trim(); renderList(); }
  });
  await load();
}

export async function renderOrderDetail(page, query, params) {
  if (!state.user) { signInRequired(page); return; }
  const number = decodeURIComponent(params[0] || '');
  let order;
  try {
    const data = await api('orders.get', { number });
    order = data.order;
  } catch (error) {
    page.innerHTML = `<div class="container narrow"><div class="card section"><h1>Order details</h1><div class="inline-alert" role="alert">${esc(error.message)}</div><a href="#/orders">Back to orders</a></div></div>`;
    return;
  }
  const pending = order.payment_status === 'Pending payment';
  const seconds = order.remaining_seconds || 0;
  const started = Date.now();
  page.innerHTML = `<div class="container">
    <div class="breadcrumbs"><a href="#/orders">Orders</a><span aria-hidden="true">›</span><span>Order details</span></div>
    <div class="page-heading"><h1>Order details</h1><p class="page-subtitle">Order ${esc(order.number)}</p></div>
    <div class="two-col">
      <div>
        <section class="card section" role="region" aria-label="Flight itinerary">
          <div class="section-head"><h2>Flight itinerary</h2><span class="status-badge ${order.payment_status === 'Closed' ? 'closed' : order.payment_status === 'Paid' ? 'paid' : 'pending'}">${esc(order.display_status)}</span></div>
          <div class="status-flight-head">
            <div><div class="flight-no">${esc(order.flight)}</div><div class="muted">${esc(order.airline)} · ${esc(order.departure)}</div></div>
            <div style="font-size:18px;font-weight:700">${esc(order.origin)} → ${esc(order.destination)}</div>
            <div>${esc(order.flight_date)}</div>
          </div>
          <div class="inline-actions" style="justify-content:space-between">
            <span class="small muted">Order number <strong>${esc(order.number)}</strong> · Booked ${esc(order.booking_date || '')}</span>
            <button type="button" class="btn" id="refund-rules">Refund and change rules</button>
          </div>
          <div id="refund-details" class="rules" hidden>
            <p><strong>Refund fee: ¥100</strong></p>
            <p>Changes allowed before departure.</p>
          </div>
        </section>
        <section class="card section">
          <h2>Passengers and contact</h2>
          <p>${(order.passengers_json || []).map(name => esc(name)).join(', ') || 'Traveler'}</p>
          <p class="small muted">Contact mobile ${esc(mobileMask(order.contact_mobile))}</p>
          <p class="small muted">Fare ${money(order.fare)} · Taxes ${money(order.taxes)} · Total ${money(order.total)}</p>
        </section>
      </div>
      <aside class="booking-side">
        <section class="card section" role="region" aria-label="Payment status">
          <div class="section-head"><h2>Payment status</h2></div>
          <p><span class="status-badge ${order.payment_status === 'Closed' ? 'closed' : order.payment_status === 'Paid' ? 'paid' : 'pending'}">${esc(order.payment_status)}</span></p>
          ${pending ? `<div class="timeline-note">
            <div>Unpaid orders are cancelled when the timer expires.</div>
            <div style="margin-top:8px">Time remaining <strong role="timer" aria-label="Time remaining" class="timer" id="order-timer">--:--</strong></div>
          </div>
          <div class="form-actions" style="flex-direction:column;align-items:stretch">
            <button type="button" class="btn primary" id="order-pay-now">Pay now</button>
            <button type="button" class="btn danger" id="cancel-order-button">Cancel order</button>
          </div>` : `<p class="small muted">This order is ${esc(order.payment_status)}.</p>`}
        </section>
      </aside>
    </div>
  </div>`;
  page.querySelector('#refund-rules').addEventListener('click', () => {
    const details = page.querySelector('#refund-details');
    details.hidden = !details.hidden;
  });
  if (pending) {
    const timer = page.querySelector('#order-timer');
    let interval;
    const update = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const remaining = Math.max(0, seconds - elapsed);
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const secs = remaining % 60;
      timer.textContent = hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (remaining <= 0) clearInterval(interval);
    };
    update();
    interval = setInterval(update, 1000);
    window.addEventListener('hashchange', () => clearInterval(interval), { once: true });
    page.querySelector('#order-pay-now').addEventListener('click', () => go('/payment/' + encodeURIComponent(order.number)));
    page.querySelector('#cancel-order-button').addEventListener('click', () => {
      const dialog = openDialog({
        name: 'Cancel order', title: 'Cancel order',
        body: `<p>Are you sure you want to cancel order <strong>${esc(order.number)}</strong>? The order will be closed.</p>`,
        footer: `<button type="button" class="btn" id="keep-order">Keep order</button><button type="button" class="btn danger" id="confirm-cancellation">Confirm cancellation</button>`
      });
      dialog.footer.querySelector('#keep-order').addEventListener('click', () => dialog.close());
      dialog.footer.querySelector('#confirm-cancellation').addEventListener('click', async () => {
        try {
          await api('orders.cancel', { number: order.number });
          dialog.close();
          go('/orders/' + encodeURIComponent(order.number));
        } catch (error) { topAlert(dialog.body, error.message); }
      });
    });
  }
}
