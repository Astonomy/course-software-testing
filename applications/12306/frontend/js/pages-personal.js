/* Personal center shell, home and ticket-order center. */
(function () {
  'use strict';
  const App = window.App;

  App.personalLayout = function (active, content, breadcrumb) {
    const link = function (href, label, key, sub) {
      const cls = (sub ? 'menu-sub ' : '') + (active === key ? 'active' : '');
      return `<a class="${cls}" href="${href}">${App.esc(label)}</a>`;
    };
    return `<div class="content-page personal-page">
      <div class="breadcrumb">Current location: ${breadcrumb}</div>
      <div class="personal-layout">
        <aside class="personal-sidebar">
          <h2>Personal Center</h2>
          <nav aria-label="Personal center menu" class="personal-menu">
            ${link('#/personal', 'Personal Center', 'home')}
            <div class="menu-group">
              ${link('#/personal/orders?tab=uncompleted', 'Order center', 'orders')}
              ${link('#/personal/orders?tab=uncompleted', 'Ticket orders', 'orders', true)}
            </div>
            <div class="menu-group">
              ${link('#/personal/info', 'Personal', 'info')}
              ${link('#/personal/info', 'User information', 'info', true)}
              ${link('#/personal/security', 'Account security', 'security', true)}
              ${link('#/personal/mobile', 'Verify mobile number', 'mobile', true)}
            </div>
            <div class="menu-group">
              ${link('#/personal/passengers', 'Information management', 'passengers')}
              ${link('#/personal/passengers', 'My Passengers', 'passengers', true)}
            </div>
          </nav>
        </aside>
        <div class="personal-content">${content}</div>
      </div>
    </div>`;
  };

  App.page('/personal', {
    title: 'Personal Center',
    auth: true,
    render: async function () {
      const user = App.user;
      const content = `<div class="notice" role="region" aria-label="Notice">
        <img class="notice-image" src="/assets/notice.svg" alt="Notice">
        <div class="notice-body">
          <h2>${App.esc(user.name || user.username)}</h2>
          <p>Welcome to 12306.cn!</p>
          <p>Your personal information is protected. Please verify your contact information and keep your account credentials secure.</p>
          <p>Please <a href="${App.defaultResultsHref()}">ticket booking</a> to book your tickets and plan your trips.</p>
        </div>
      </div>
      <div class="notice-meta">
        <div><span>Account number</span><strong>${App.esc(user.username)}</strong></div>
        <div><span>Mobile number</span><strong>${App.esc(App.maskMobile(user.mobile))}</strong></div>
        <div><span>Security mailbox</span><strong>${App.esc(user.email || '—')}</strong></div>
      </div>`;
      return App.personalLayout('home', content, 'Personal Center');
    },
  });

  function emptyState(tab) {
    if (tab === 'uncompleted') {
      return `<div class="empty-state">
        <img src="/assets/empty.png" alt="No orders">
        <p>You don't have uncompleted orders.</p>
        <a href="${App.defaultResultsHref()}">You can book your tickets and plan your trips.</a>
      </div>`;
    }
    return `<div class="empty-state">
      <img src="/assets/empty.png" alt="No orders">
      <p>You don't have any bookings or we can't access your bookings at this time.</p>
      <a href="${App.defaultResultsHref()}">You can make travel plans through the ticket reservation function.</a>
    </div>`;
  }

  function orderActions(order) {
    if (order.status === 'unpaid') {
      return `<button type="button" class="btn btn-primary small pay-order" data-id="${order.id}">Pay</button>
        <button type="button" class="btn btn-ghost small cancel-order" data-id="${order.id}">Cancel</button>`;
    }
    if (order.status === 'paid' && order.refundable) {
      return `<button type="button" class="btn btn-primary small refund-order" data-id="${order.id}">Refund</button>`;
    }
    return '<span class="muted">—</span>';
  }

  function currentOrdersTable(orders) {
    if (!orders.length) return emptyState('uncompleted');
    return `<div class="table-wrap"><table class="orders-table" aria-label="Uncompleted orders">
      <thead><tr><th>Train No.</th><th>Departure date</th><th>Departure station</th><th>Arrival station</th><th>Passenger</th><th>Seat</th><th>Price</th><th>Status</th><th>Total Price</th><th>Operation</th></tr></thead>
      <tbody>${orders.map(function (o) {
        return o.passengers.map(function (p) {
          return `<tr data-order-id="${o.id}">
            <td><strong class="train-number">${App.esc(o.train_number)}</strong><div class="cell-sub">Booking Date: ${App.esc(o.booking_date)}</div><div class="cell-sub">Order no: ${App.esc(o.order_no)}</div></td>
            <td>${App.esc(o.departure_date)}</td><td>${App.esc(o.from_city)}</td><td>${App.esc(o.to_city)}</td>
            <td>${App.esc(p.name)}<div class="cell-sub">${App.esc(p.id_type)} ${App.esc(p.id_number)}</div></td>
            <td>${App.esc(p.ticket_class_label)}<div class="cell-sub">Coach: ${App.esc(p.coach)} · Seat: ${App.esc(p.seat)}</div></td>
            <td>${App.esc(p.ticket_type)}<div class="price-orange">${App.esc(p.price_text)}</div></td>
            <td class="status-${o.status}">${App.esc(o.status_label)}</td><td>${App.esc(o.total_text)}</td>
            <td class="op-cell">${orderActions(o)}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table></div>`;
  }

  function upcomingTable(orders) {
    if (!orders.length) return emptyState('upcoming');
    return `<div class="table-wrap"><table class="orders-table" aria-label="Upcoming trips">
      <thead><tr><th>Train No.</th><th>Departure date</th><th>Departure station</th><th>Arrival station</th><th>Passenger</th><th>Seat</th><th>Price</th><th>Status</th><th>Total Price</th><th>Operation</th></tr></thead>
      <tbody>${orders.map(function (o) {
        return o.passengers.map(function (p) {
          return `<tr data-order-id="${o.id}">
            <td><strong class="train-number">${App.esc(o.train_number)}</strong><div class="cell-sub">Booking Date: ${App.esc(o.booking_date)}</div><div class="cell-sub">Order no: ${App.esc(o.order_no)}</div></td>
            <td>${App.esc(o.departure_date)}</td><td>${App.esc(o.from_city)}</td><td>${App.esc(o.to_city)}</td>
            <td>${App.esc(p.name)}<div class="cell-sub">${App.esc(p.id_type)} ${App.esc(p.id_number)}</div></td>
            <td>${App.esc(p.ticket_class_label)}<div class="cell-sub">Coach: ${App.esc(p.coach)} · Seat: ${App.esc(p.seat)}</div></td>
            <td>${App.esc(p.ticket_type)}<div class="price-orange">${App.esc(p.price_text)}</div></td>
            <td class="status-${o.status}">${App.esc(o.status_label)}</td><td>${App.esc(o.total_text)}</td>
            <td class="op-cell">${orderActions(o)}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table></div>`;
  }

  function historyTable(orders) {
    if (!orders.length) {
      return `<div class="history-search-ticket"><a href="${App.defaultResultsHref()}">Search tickets</a></div>${emptyState('history')}`;
    }
    return `<div class="table-wrap"><table class="orders-table history-table" aria-label="History orders">
      <thead><tr><th>Train Information</th><th>Passenger Information</th><th>Seat Information</th><th>Price</th><th>Status</th><th>Total Price</th></tr></thead>
      <tbody>${orders.map(function (o) {
        return o.passengers.map(function (p) {
          return `<tr data-order-id="${o.id}">
            <td><strong class="train-number">${App.esc(o.train_number)}</strong><div class="cell-sub">${App.esc(o.from_city)} → ${App.esc(o.to_city)}</div><div class="cell-sub">Departure date: ${App.esc(o.departure_date)}</div><div class="cell-sub">Order no: ${App.esc(o.order_no)}</div></td>
            <td>${App.esc(p.name)}<div class="cell-sub">${App.esc(p.id_type)} ${App.esc(p.id_number)}</div></td>
            <td>${App.esc(p.ticket_class_label)}<div class="cell-sub">Coach: ${App.esc(p.coach)} · Seat: ${App.esc(p.seat)}</div></td>
            <td class="price-orange">${App.esc(p.price_text)}</td><td class="status-${o.status}">${App.esc(o.status_label)}</td><td>${App.esc(o.total_text)}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table></div>`;
  }

  function renderOrderResult(tab, orders) {
    if (tab === 'uncompleted') return currentOrdersTable(orders);
    if (tab === 'upcoming') return upcomingTable(orders);
    return historyTable(orders);
  }
  App.renderOrderResult = renderOrderResult;

  App.page('/personal/orders', {
    title: 'Ticket orders',
    auth: true,
    render: async function (params) {
      let tab = params.get('tab') || 'uncompleted';
      if (!['uncompleted', 'upcoming', 'history'].includes(tab)) tab = 'uncompleted';
      const data = await App.api('orders', { tab: tab });
      App._ordersCache = { tab: tab, orders: data.orders };
      const filterHtml = (tab === 'upcoming' || tab === 'history') ? `<form class="orders-filter" id="orders-filter-form" novalidate>
        <div class="filter-field"><label for="order-date-type">Order date type</label>
          <select id="order-date-type"><option value="booking">Search by booking date</option><option value="departure">Search by departure date</option></select></div>
        <div class="filter-field"><label for="order-start-date">Start date</label><input id="order-start-date" type="text" placeholder="YYYY-MM-DD"></div>
        <div class="filter-field"><label for="order-end-date">End date</label><input id="order-end-date" type="text" placeholder="YYYY-MM-DD"></div>
        <div class="filter-field grow"><label class="sr-only" for="order-keyword">Order number/train number/name</label><input id="order-keyword" type="text" placeholder="Order number/train number/name"></div>
        <button type="submit" class="btn btn-primary">Search</button>
        <div class="filter-error"></div>
      </form>` : '';
      const content = `<div class="order-tabs" role="tablist" aria-label="Ticket orders">
        ${['uncompleted', 'upcoming', 'history'].map(function (key) {
          const labels = { uncompleted: 'Uncompleted orders', upcoming: 'Upcoming trips', history: 'History orders' };
          return `<button type="button" role="tab" data-order-tab="${key}" aria-selected="${tab === key}">${labels[key]}</button>`;
        }).join('')}
      </div>
      <div class="order-panel" role="tabpanel" aria-label="${tab === 'uncompleted' ? 'Uncompleted orders' : tab === 'upcoming' ? 'Upcoming trips' : 'History orders'}">
        ${filterHtml}
        <div id="orders-results">${renderOrderResult(tab, data.orders)}</div>
      </div>`;
      return App.personalLayout('orders', content, 'Personal Center &gt; Ticket orders');
    },
    bind: function (params) {
      let tab = params.get('tab') || 'uncompleted';
      if (!['uncompleted', 'upcoming', 'history'].includes(tab)) tab = 'uncompleted';
      document.querySelectorAll('[data-order-tab]').forEach(function (button) {
        button.addEventListener('click', function () { App.go('/personal/orders', { tab: button.dataset.orderTab }); });
      });
      const filterForm = document.getElementById('orders-filter-form');
      const results = document.getElementById('orders-results');

      function openCancel(orderId) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = App.dialog({
          id: 'cancel-order',
          title: 'Are you sure you want to cancel this order?',
          body: '<p>Cancelling this order releases its locked seats.</p>',
          footer: '<button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="button" class="btn btn-primary" id="confirm-cancel-order">Confirm</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        wrapper.querySelector('#confirm-cancel-order').addEventListener('click', async function () {
          try {
            await App.api('cancel_order', { id: orderId });
            const back = wrapper.querySelector('.modal-backdrop');
            if (back) back.remove();
            App.setFlash('Order cancelled successfully.');
            App.render();
          } catch (err) {
            const body = wrapper.querySelector('.modal-body');
            if (body) body.innerHTML += App.alertHtml(err.message);
          }
        });
      }

      function openRefund(orderId) {
        let order = null;
        const wrapper = document.createElement('div');
        const orderData = (App._ordersCache && App._ordersCache.orders || []).find(function (o) { return String(o.id) === String(orderId); });
        order = orderData;
        const body = `<section role="region" aria-label="Refund information" class="refund-region">
          <h2>Refund information</h2>
          <p><strong>${order ? App.esc(order.train_number) : ''}</strong> ${order ? App.esc(order.from_city) : ''} → ${order ? App.esc(order.to_city) : ''}</p>
          <p>Departure date: ${order ? App.esc(order.departure_date) : ''}</p>
          <p>Refund amount: <strong>${order ? App.esc(order.total_text) : ''}</strong></p>
          <div class="refund-status"></div>
        </section>`;
        wrapper.innerHTML = App.dialog({
          id: 'refund-info',
          title: 'Refund order',
          body: body,
          footer: '<button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="button" class="btn btn-primary" id="confirm-refund">Confirm refund</button>',
        });
        document.body.appendChild(wrapper);
        App.bindModalClose(wrapper);
        wrapper.querySelector('#confirm-refund').addEventListener('click', async function () {
          try {
            await App.api('refund_order', { id: orderId });
            const bodyEl = wrapper.querySelector('.modal-body');
            const footer = wrapper.querySelector('.modal-foot');
            bodyEl.innerHTML = `<div class="form-success" role="status">Refund successful</div><p><a href="#/personal/orders?tab=history">View History orders</a></p>`;
            if (footer) footer.innerHTML = '';
            App._ordersCache = null;
          } catch (err) {
            const slot = wrapper.querySelector('.refund-status');
            if (slot) slot.innerHTML = App.alertHtml(err.message);
          }
        });
      }

      results.addEventListener('click', function (e) {
        const pay = e.target.closest('.pay-order');
        if (pay) { App.go('/payment', { id: pay.dataset.id }); return; }
        const cancel = e.target.closest('.cancel-order');
        if (cancel) { openCancel(cancel.dataset.id); return; }
        const refund = e.target.closest('.refund-order');
        if (refund) { openRefund(refund.dataset.id); return; }
      });

      if (filterForm) {
        filterForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const error = filterForm.querySelector('.filter-error');
          error.innerHTML = '';
          const keyword = document.getElementById('order-keyword').value.trim();
          if (keyword && /[^A-Za-z0-9\u4e00-\u9fff\s\-]/.test(keyword)) {
            error.innerHTML = App.alertHtml('Please enter a valid search condition.');
            return;
          }
          try {
            const data = await App.api('orders', {
              tab: tab,
              date_type: document.getElementById('order-date-type').value,
              start_date: document.getElementById('order-start-date').value.trim(),
              end_date: document.getElementById('order-end-date').value.trim(),
              keyword: keyword,
            });
            results.innerHTML = renderOrderResult(tab, data.orders);
          } catch (err) {
            error.innerHTML = App.alertHtml(err.message);
          }
        });
      }
    },
  });
})();
