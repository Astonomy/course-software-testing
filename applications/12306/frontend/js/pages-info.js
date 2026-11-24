/* Personal information, account security, mobile verification and passengers. */
(function () {
  'use strict';
  const App = window.App;
  const COUNTRIES = ['China', 'United States', 'United Kingdom', 'Japan', 'Korea', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Australia', 'Canada', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'India', 'Brazil', 'New Zealand', 'Other'];

  function infoRow(label, value) {
    return `<div class="info-row"><span class="info-label">${App.esc(label)}</span><span class="info-value">${App.esc(value || '—')}</span></div>`;
  }

  App.page('/personal/info', {
    title: 'User information',
    auth: true,
    render: async function () {
      const user = App.user;
      const content = `
        <section class="info-card" role="region" aria-label="Essential information">
          <div class="info-card-head"><h2>Essential information</h2><button type="button" class="btn-link section-edit" data-edit-section="essential">Edit</button></div>
          <div class="info-display" data-section-body="essential">
            ${infoRow('Account number', user.username)}
            ${infoRow('Name', user.name)}
            ${infoRow('Gender', user.gender)}
            ${infoRow('Nationality', user.nationality)}
            ${infoRow('ID type', 'Foreign passport')}
            ${infoRow('ID number', user.passport || user.id_number)}
          </div>
        </section>
        <section class="info-card" role="region" aria-label="Contact information">
          <div class="info-card-head"><h2>Contact information</h2><button type="button" class="btn-link section-edit" data-edit-section="contact">Edit</button></div>
          <div class="info-display" data-section-body="contact">${infoRow('Email', user.email)}</div>
        </section>
        <section class="info-card" role="region" aria-label="Additional information">
          <div class="info-card-head"><h2>Additional information</h2><button type="button" class="btn-link section-edit" data-edit-section="additional">Edit</button></div>
          <div class="info-display" data-section-body="additional">${infoRow('Passenger type', user.passenger_type)}</div>
        </section>`;
      return App.personalLayout('info', content, 'Personal Center &gt; User information');
    },
    bind: function () {
      const user = App.user;
      const templates = {
        essential: function () {
          return `<form class="info-edit" data-edit-form="essential" novalidate>
            ${infoRow('Account number', user.username)}
            ${infoRow('Name', user.name)}
            ${infoRow('Nationality', user.nationality)}
            ${infoRow('ID type', 'Foreign passport')}
            ${infoRow('ID number', user.passport || user.id_number)}
            <fieldset class="radio-group"><legend>Gender</legend>
              <label><input type="radio" name="essential-gender" value="Male" ${user.gender === 'Male' ? 'checked' : ''}> Male</label>
              <label><input type="radio" name="essential-gender" value="Female" ${user.gender === 'Female' ? 'checked' : ''}> Female</label>
            </fieldset>
            <div class="form-field"><label for="essential-password">Password</label><input id="essential-password" type="password" autocomplete="current-password"></div>
            <div class="inline-error"></div>
            <div class="form-actions"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" data-cancel-edit>Cancel</button></div>
          </form>`;
        },
        contact: function () {
          return `<form class="info-edit" data-edit-form="contact" novalidate>
            <div class="form-field"><label for="contact-email">Email</label><input id="contact-email" type="text" value="${App.esc(user.email || '')}"></div>
            <div class="inline-error"></div>
            <div class="form-actions"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" data-cancel-edit>Cancel</button></div>
          </form>`;
        },
        additional: function () {
          return `<form class="info-edit" data-edit-form="additional" novalidate>
            <div class="form-field"><label for="additional-passenger-type">Passenger type</label><select id="additional-passenger-type"><option ${user.passenger_type === 'Adult' ? 'selected' : ''}>Adult</option><option ${user.passenger_type === 'Child' ? 'selected' : ''}>Child</option></select></div>
            <div class="inline-error"></div>
            <div class="form-actions"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" data-cancel-edit>Cancel</button></div>
          </form>`;
        },
      };

      function bindForm(section) {
        const form = document.querySelector('[data-edit-form="' + section + '"]');
        form.querySelector('[data-cancel-edit]').addEventListener('click', function () { App.render(); });
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const error = form.querySelector('.inline-error');
          error.innerHTML = '';
          try {
            if (section === 'essential') {
              const gender = form.querySelector('input[name=essential-gender]:checked');
              await App.api('save_essential', { gender: gender ? gender.value : '', password: form.querySelector('#essential-password').value });
              App.setFlash('Essential information updated successfully.');
            } else if (section === 'contact') {
              await App.api('save_contact', { email: form.querySelector('#contact-email').value });
              App.setFlash('Contact information updated successfully.');
            } else {
              await App.api('save_additional', { passenger_type: form.querySelector('#additional-passenger-type').value });
              App.setFlash('Additional information updated successfully.');
            }
            App.render();
          } catch (err) { error.innerHTML = App.alertHtml(err.message); }
        });
      }

      document.querySelectorAll('[data-edit-section]').forEach(function (button) {
        button.addEventListener('click', function () {
          const section = button.dataset.editSection;
          const body = document.querySelector('[data-section-body="' + section + '"]');
          if (!body) return;
          body.innerHTML = templates[section]();
          button.hidden = true;
          bindForm(section);
        });
      });
    },
  });

  App.page('/personal/security', {
    title: 'Account security',
    auth: true,
    render: async function () {
      const user = App.user;
      const content = `
        <section class="info-card security-card" role="region" aria-label="Login password">
          <div class="info-card-head"><h2>Login password</h2></div>
          <p>Regular password changes are recommended for your account security.</p>
          <p><a class="security-link" href="#/personal/password">Login password</a></p>
        </section>
        <section class="info-card security-card" role="region" aria-label="Security mailbox">
          <div class="info-card-head"><h2>Security mailbox</h2><button type="button" class="btn-link" id="edit-security-mailbox">Edit</button></div>
          <div id="mailbox-body"><p>Current email address: <strong>${App.esc(user.email || '—')}</strong></p></div>
        </section>
        <section class="info-card security-card" role="region" aria-label="Mobile number">
          <div class="info-card-head"><h2>Mobile number</h2></div>
          <p>Linked mobile number: <strong>${App.esc(App.maskMobile(user.mobile))}</strong></p>
        </section>`;
      return App.personalLayout('security', content, 'Personal Center &gt; Account security');
    },
    bind: function () {
      const user = App.user;
      const edit = document.getElementById('edit-security-mailbox');
      edit.addEventListener('click', function () {
        const body = document.getElementById('mailbox-body');
        body.innerHTML = `<p>Current email address: <strong>${App.esc(user.email || '—')}</strong></p>
          <form id="mailbox-form" class="info-edit" novalidate>
            <div class="form-field"><label for="security-new-email">New e-mail:</label><input id="security-new-email" type="text" placeholder="Please enter a new email address."></div>
            <div class="form-field"><label for="security-email-password">Confirm your password:</label><input id="security-email-password" type="password" placeholder="Correct password input to modify personal information"></div>
            <div class="inline-error"></div>
            <div class="form-actions"><button type="button" class="btn btn-ghost" id="cancel-mailbox">Cancel</button><button type="submit" class="btn btn-primary">Determine</button></div>
          </form>`;
        edit.hidden = true;
        document.getElementById('security-new-email').focus();
        document.getElementById('cancel-mailbox').addEventListener('click', function () { App.render(); });
        const form = document.getElementById('mailbox-form');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const error = form.querySelector('.inline-error');
          error.innerHTML = '';
          try {
            await App.api('update_email', { new_email: document.getElementById('security-new-email').value, password: document.getElementById('security-email-password').value });
            App.setFlash('Security mailbox updated successfully.');
            App.render();
          } catch (err) { error.innerHTML = App.alertHtml(err.message); }
        });
      });
    },
  });

  App.page('/personal/password', {
    title: 'Change password',
    auth: true,
    render: async function () {
      const content = `<div class="form-card change-card">
        <h2>Change your password</h2>
        <form id="change-password-form" novalidate>
          <div class="form-field"><label for="current-password">Current password:</label><input id="current-password" type="password" autocomplete="current-password"></div>
          <div class="form-field"><label for="new-password">New password:</label><input id="new-password" type="password" autocomplete="new-password"></div>
          <div class="form-field"><label for="confirm-password">Confirm your password:</label><input id="confirm-password" type="password" autocomplete="new-password"></div>
          <div class="inline-error"></div>
          <div class="form-actions"><button type="button" class="btn btn-ghost" id="cancel-password">Cancel</button><button type="submit" class="btn btn-primary">Determine</button></div>
          <div class="password-success" role="status"></div>
        </form>
      </div>`;
      return App.personalLayout('security', content, 'Personal Center &gt; Account security');
    },
    bind: function () {
      const form = document.getElementById('change-password-form');
      document.getElementById('cancel-password').addEventListener('click', function () { App.go('/personal/security'); });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const error = form.querySelector('.inline-error');
        const success = form.querySelector('.password-success');
        error.innerHTML = '';
        success.textContent = '';
        try {
          const result = await App.api('change_password', {
            current: document.getElementById('current-password').value,
            new: document.getElementById('new-password').value,
            confirm: document.getElementById('confirm-password').value,
          });
          success.textContent = result.message;
          form.querySelectorAll('input').forEach(function (i) { i.value = ''; });
        } catch (err) { error.innerHTML = App.alertHtml(err.message); }
      });
    },
  });

  App.page('/personal/mobile', {
    title: 'Verify mobile number',
    auth: true,
    render: async function () {
      const user = App.user;
      const content = `<div class="form-card change-card">
        <h2>Verify mobile number</h2>
        <p class="old-mobile">old mobile number: <strong>${App.esc(App.maskMobile(user.mobile))}</strong></p>
        <form id="mobile-form" novalidate>
          <div class="form-field inline-fields">
            <label for="region-code">Region code</label>
            <select id="region-code"><option>(+86)</option><option>(+852)</option><option>(+853)</option><option>(+886)</option><option>(+1)</option><option>(+44)</option></select>
          </div>
          <div class="form-field"><label for="new-mobile">new mobile number:</label><input id="new-mobile" type="text" placeholder="new mobile number"></div>
          <div class="form-field"><label for="mobile-password">Confirm your password:</label><input id="mobile-password" type="password" placeholder="Please enter the login password"></div>
          <div class="inline-error"></div>
          <div class="form-actions"><button type="button" class="btn btn-ghost" id="cancel-mobile">Cancel</button><button type="submit" class="btn btn-primary">Determine</button></div>
        </form>
      </div>`;
      return App.personalLayout('mobile', content, 'Personal Center &gt; Verify mobile number');
    },
    bind: function () {
      const form = document.getElementById('mobile-form');
      document.getElementById('cancel-mobile').addEventListener('click', function () { App.go('/personal/security'); });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const error = form.querySelector('.inline-error');
        error.innerHTML = '';
        try {
          await App.api('update_mobile', {
            region: document.getElementById('region-code').value,
            new_mobile: document.getElementById('new-mobile').value,
            password: document.getElementById('mobile-password').value,
          });
          App.setFlash('Mobile number updated successfully.');
          App.render();
        } catch (err) { error.innerHTML = App.alertHtml(err.message); }
      });
    },
  });

  function passengerRow(p) {
    return `<tr data-passenger-id="${p.id}" data-passport="${App.esc(p.passport)}">
      <td>${p.holder ? '' : `<input type="checkbox" data-select-passenger="${p.id}" aria-label="Select ${App.esc(p.passport)}">`}</td>
      <td class="passenger-name">${App.esc(p.name)}</td>
      <td>Foreign passport</td>
      <td class="passenger-id">${App.esc(p.passport)}</td>
      <td>${App.esc(p.mobile || '—')}</td>
      <td>${p.holder ? '<span class="muted">Protected</span>' : `<button type="button" class="btn-link delete-passenger" data-id="${p.id}">Delete</button>`}</td>
    </tr>`;
  }

  App.page('/personal/passengers', {
    title: 'My passengers',
    auth: true,
    render: async function () {
      const data = await App.api('passengers');
      App._passengersCache = data.passengers;
      const content = `<div class="passenger-page">
        <div class="passenger-search">
          <label class="sr-only" for="passenger-search-input">Please enter passenger name</label>
          <input id="passenger-search-input" type="text" placeholder="Please enter passenger name">
          <button type="button" class="btn btn-primary" id="passenger-search-btn">Search</button>
          <button type="button" class="btn btn-ghost clear-passenger" id="clear-passenger-search" aria-label="×">×</button>
        </div>
        <div class="passenger-error" role="alert"></div>
        <div class="table-wrap"><table class="passenger-table" aria-label="My passengers">
          <thead><tr><th><label class="all-label"><input id="all-passengers" type="checkbox" aria-label="All"> <span>All</span></label></th><th>Name</th><th>ID type</th><th>ID number</th><th>Mobile number</th><th>Operation</th></tr></thead>
          <tbody id="passenger-rows">${data.passengers.map(passengerRow).join('')}</tbody>
        </table></div>
        <div class="passenger-actions">
          <button type="button" class="btn-link danger" id="batch-delete">Batch deletion</button>
          <button type="button" class="btn-link add-passenger" id="add-passenger">Add new passengers</button>
        </div>
      </div>`;
      return App.personalLayout('passengers', content, 'Personal Center &gt; My passengers');
    },
    bind: function () {
      const allPassengers = (App._passengersCache || []).slice();
      const tbody = document.getElementById('passenger-rows');
      const allBox = document.getElementById('all-passengers');
      const error = document.querySelector('.passenger-error');
      const searchInput = document.getElementById('passenger-search-input');

      function visibleBoxes() { return Array.from(tbody.querySelectorAll('[data-select-passenger]')); }
      function showRows(list) {
        tbody.innerHTML = list.map(passengerRow).join('');
        allBox.checked = false;
        allBox.indeterminate = false;
        error.innerHTML = '';
      }
      function updateAllState() {
        const boxes = visibleBoxes();
        const checked = boxes.filter(function (b) { return b.checked; });
        allBox.checked = boxes.length > 0 && checked.length === boxes.length;
        allBox.indeterminate = checked.length > 0 && checked.length < boxes.length;
      }
      allBox.addEventListener('change', function () {
        visibleBoxes().forEach(function (b) { b.checked = allBox.checked; });
      });
      tbody.addEventListener('change', function (e) {
        if (e.target.matches('[data-select-passenger]')) updateAllState();
      });

      function openDelete(id) {
        const p = allPassengers.find(function (x) { return String(x.id) === String(id); });
        if (!p) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = App.dialog({
          id: 'delete-passenger',
          title: 'Are you sure you want to delete this passenger?',
          body: `<p>${App.esc(p.name)} · ${App.esc(p.passport)}</p>`,
          footer: '<button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="button" class="btn btn-primary" id="confirm-delete-passenger">Confirm</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        wrapper.querySelector('#confirm-delete-passenger').addEventListener('click', async function () {
          try {
            await App.api('passenger_delete', { id: id });
            const back = wrapper.querySelector('.modal-backdrop');
            if (back) back.remove();
            App.setFlash('Passenger deleted successfully.');
            App.render();
          } catch (err) {
            const body = wrapper.querySelector('.modal-body');
            if (body) body.innerHTML = App.alertHtml(err.message);
          }
        });
      }

      tbody.addEventListener('click', function (e) {
        const del = e.target.closest('.delete-passenger');
        if (del) openDelete(del.dataset.id);
      });

      document.getElementById('passenger-search-btn').addEventListener('click', function () {
        const q = searchInput.value.trim().toLowerCase();
        const filtered = q ? allPassengers.filter(function (p) {
          return p.name.toLowerCase().includes(q) || p.passport.toLowerCase().includes(q);
        }) : allPassengers;
        showRows(filtered);
      });
      document.getElementById('clear-passenger-search').addEventListener('click', function () {
        searchInput.value = '';
        showRows(allPassengers);
      });

      document.getElementById('batch-delete').addEventListener('click', function () {
        const ids = visibleBoxes().filter(function (b) { return b.checked; }).map(function (b) { return Number(b.dataset.selectPassenger); });
        if (!ids.length) {
          error.innerHTML = App.alertHtml('Please select at least one passenger.');
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = App.dialog({
          id: 'batch-delete',
          title: 'Are you sure you want to delete the selected passengers?',
          body: '<p>The account-holder passenger is always preserved.</p>',
          footer: '<button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="button" class="btn btn-primary" id="confirm-batch-delete">Confirm</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        wrapper.querySelector('#confirm-batch-delete').addEventListener('click', async function () {
          try {
            await App.api('passenger_batch_delete', { ids: ids });
            const back = wrapper.querySelector('.modal-backdrop');
            if (back) back.remove();
            App.setFlash('Passengers deleted successfully.');
            App.render();
          } catch (err) {
            const body = wrapper.querySelector('.modal-body');
            if (body) body.innerHTML = App.alertHtml(err.message);
          }
        });
      });

      document.getElementById('add-passenger').addEventListener('click', function () {
        const body = `<form id="add-passenger-form" novalidate>
          <div class="form-grid">
            <div class="form-field"><label for="add-nationality">Nationality</label><select id="add-nationality"><option value="">Please select</option>${COUNTRIES.map(function (c) { return `<option>${App.esc(c)}</option>`; }).join('')}</select></div>
            <div class="form-field"><label for="add-name">Name</label><input id="add-name" type="text"></div>
            <div class="form-field"><label for="add-passport">Passport number</label><input id="add-passport" type="text"></div>
            <div class="form-field"><label for="add-expiry">Passport expiration date</label><input id="add-expiry" type="text" placeholder="YYYY-MM-DD"></div>
            <div class="form-field"><label for="add-dob">Date of birth</label><input id="add-dob" type="text" placeholder="YYYY-MM-DD"></div>
            <div class="form-field"><fieldset class="radio-group"><legend>Gender</legend><label><input type="radio" name="add-gender" value="Male"> Male</label><label><input type="radio" name="add-gender" value="Female"> Female</label></fieldset></div>
            <div class="form-field"><label for="add-email">Email address</label><input id="add-email" type="text"></div>
            <div class="form-field"><label for="add-mobile">Mobile number</label><input id="add-mobile" type="text"></div>
            <div class="form-field"><label for="add-passenger-type">Passenger type</label><select id="add-passenger-type"><option>Adult</option><option>Child</option></select></div>
          </div>
          <div class="inline-error"></div>
        </form>`;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = App.dialog({
          id: 'add-passenger',
          title: 'Add new passengers',
          wide: true,
          body: body,
          footer: '<button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="button" class="btn btn-primary" id="determine-passenger">Determine</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        wrapper.querySelector('#determine-passenger').addEventListener('click', async function () {
          const genderEl = wrapper.querySelector('input[name=add-gender]:checked');
          const payload = {
            nationality: wrapper.querySelector('#add-nationality').value,
            name: wrapper.querySelector('#add-name').value,
            passport: wrapper.querySelector('#add-passport').value,
            passport_expiry: wrapper.querySelector('#add-expiry').value,
            dob: wrapper.querySelector('#add-dob').value,
            gender: genderEl ? genderEl.value : '',
            email: wrapper.querySelector('#add-email').value,
            mobile: wrapper.querySelector('#add-mobile').value,
            passenger_type: wrapper.querySelector('#add-passenger-type').value,
          };
          const err = wrapper.querySelector('.inline-error');
          err.innerHTML = '';
          try {
            await App.api('passenger_add', payload);
            const back = wrapper.querySelector('.modal-backdrop');
            if (back) back.remove();
            App.setFlash('Passenger added successfully.');
            App.render();
          } catch (e) {
            err.innerHTML = App.alertHtml(e.message);
          }
        });
      });
    },
  });
})();
