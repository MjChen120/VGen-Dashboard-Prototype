/* VGen Dashboard — responsive prototype (vanilla JS, no build step). */
(function () {
  'use strict';

  const D = window.VGEN;
  const MOBILE_PROTOTYPE_URL = 'https://vgen-disagreements.vercel.app';
  const ICON = 'assets/icons/';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3));
  const TYPE_COLOR = { delivery: 'var(--delivery-pink)', progress: 'var(--progress-blue)', payment: 'var(--money-green)' };
  const TYPE_LABEL = { delivery: 'Delivery', progress: 'Progress', payment: 'Payment' };

  /* ---------------- state ---------------- */
  const state = {
    commissions: D.commissions.map((c) => ({ ...c })),
    events: D.events.map((e) => ({ ...e })),
    tags: [...D.TAGS],
    filter: { tags: new Set(), payments: new Set(), range: '30' },
    draft: null, // in-progress popover selection
    openPop: null, // 'tags' | 'payments'
    tagQuery: '',
    openMenu: null, // commission id whose kebab menu is open
    search: '',
    deadlineType: null,
    showAllDeadlines: false,
    expanded: { month: false, pending: false },
    chart: { year: 2024, from: 4, to: 9 },
    cal: { y: 2025, m: 9, sel: iso(D.TODAY) },
    details: {}, // per-commission detail state (steps, files, links…)
    tab: 'details',
    editingDesc: false,
    flashId: null,
  };

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysLeft = (s) => Math.round((parse(s) - D.TODAY) / 86400000);
  const short = (s) => { const d = parse(s); return `${MON[d.getMonth()]} ${d.getDate()}`; };
  const long = (s) => { const d = parse(s); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const byId = (id) => state.commissions.find((c) => c.id === id);
  const payment = (id) => D.PAYMENTS.find((p) => p.id === id);
  const status = (id) => D.STATUSES.find((s) => s.id === id);
  const img = (name, w, h, alt = '') => `<img src="${ICON}${name}.svg" alt="${esc(alt)}" width="${w}" height="${h}" />`;
  // Figma vector: box inset + stroke bleed inset
  const layer = (name, inset, bleed = '0') => `<span class="layer" style="inset:${inset}"><i style="inset:${bleed}"><img src="${ICON}${name}.svg" alt="" /></i></span>`;
  const kebabIcon = () => `<span class="kebab" aria-hidden="true">${layer('kebab-dot', '45.83%', '-50%')}${layer('kebab-dot', '16.67% 45.83% 75% 45.83%', '-50%')}${layer('kebab-dot', '75% 45.83% 16.67% 45.83%', '-50%')}</span>`;
  const clockIcon = () => `<span class="stat__clock">${layer('clock-a', '25% 33.33% 41.67% 50%', '-12.5% -25.01% -12.5% -25%')}${layer('clock-b', '8.33%', '-5%')}</span>`;

  function toast(title, body = '') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<b>${esc(title)}</b>${body ? esc(body) : ''}`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function matchesSearch(c) {
    const q = state.search.trim().toLowerCase();
    return !q || `${c.title} ${c.client} ${c.tag}`.toLowerCase().includes(q);
  }

  function visibleCommissions() {
    const { tags, payments, range } = state.filter;
    return state.commissions.filter((c) => {
      if (tags.size && !tags.has(c.tag)) return false;
      if (payments.size && !payments.has(c.payment)) return false;
      if (range !== 'all' && Math.abs(daysLeft(c.due)) > Number(range)) return false;
      return matchesSearch(c);
    });
  }

  /* ---------------- router ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h.startsWith('project/')) return { name: 'project', id: decodeURIComponent(h.slice(8)) };
    if (h === 'mobile') return { name: 'mobile' };
    return { name: 'dashboard' };
  }

  function render() {
    const r = route();
    const main = $('#main');
    document.querySelectorAll('.version-switch__opt').forEach((a) => a.classList.toggle('is-active', (a.dataset.version === 'mobile') === (r.name === 'mobile')));
    document.querySelectorAll('.nav__item').forEach((a, i) => a.classList.toggle('is-active', i === 0 && r.name !== 'mobile'));
    if (r.name === 'project' && byId(r.id)) main.innerHTML = renderProject(byId(r.id));
    else if (r.name === 'mobile') main.innerHTML = renderMobile();
    else main.innerHTML = renderDashboard();
    if (state.flashId) {
      const el = main.querySelector(`[data-card="${CSS.escape(state.flashId)}"]`);
      if (el) { el.classList.add('is-new-flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      state.flashId = null;
    }
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    return `<div class="page">
      <div class="welcome">
        <div><h1>Welcome back, Creator! 👋</h1><p>Here's what's happening with your commissions today</p></div>
      </div>
      ${renderEarnings()}
      ${renderPipeline()}
      <section class="card schedule" aria-label="Deadlines and calendar">
        ${renderDeadlines()}
        ${renderCalendar()}
      </section>
    </div>`;
  }

  /* ---- Earnings overview ---- */
  function renderEarnings() {
    const s = D.summary;
    const m = state.expanded.month, p = state.expanded.pending;
    return `<section class="earnings" aria-label="Earnings overview">
      <div class="stat ${m ? 'is-open' : ''}">
        <button class="stat__toggle" type="button" data-action="toggle-stat" data-stat="month" aria-expanded="${m}">
          <span class="stat__icon stat__icon--blue">${img('trend', 20, 20)}</span>
          <span class="stat__body">
            <span class="stat__label">This Month</span>
            <span class="stat__value">${money(s.thisMonth)}</span>
            <span class="stat__sub"><b>${s.change}</b> vs last month</span>
          </span>
          <img class="stat__chev" src="${ICON}chevron-lg.svg" alt="" />
        </button>
        ${m ? `<div class="stat__panel">${renderLineChart()}</div>` : ''}
      </div>
      <div class="stat ${p ? 'is-open' : ''}">
        <button class="stat__toggle" type="button" data-action="toggle-stat" data-stat="pending" aria-expanded="${p}">
          <span class="stat__icon stat__icon--orange">${clockIcon()}</span>
          <span class="stat__body">
            <span class="stat__label">Pending Payments</span>
            <span class="stat__value">${money(s.pending)}</span>
            <span class="stat__sub">${s.pendingCount} commissions</span>
          </span>
          <img class="stat__chev" src="${ICON}chevron-lg.svg" alt="" />
        </button>
        ${p ? `<div class="stat__panel">${renderDonut()}</div>` : ''}
      </div>
    </section>`;
  }

  function renderLineChart() {
    const { year, from, to } = state.chart;
    const vals = D.earnings[year].slice(from, to + 1);
    const W = 520, H = 280, L = 52, R = 20, T = 16, B = 34;
    const max = 5000;
    const x = (i) => L + (vals.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (vals.length - 1));
    const y = (v) => T + (1 - v / max) * (H - T - B);
    const grid = [1000, 2000, 3000, 4000, 5000].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e5e5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">$${v}</text>`).join('');
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const dots = vals.map((v, i) => {
      const current = from + i === 9; // October = month in progress
      return `<circle cx="${x(i)}" cy="${y(v)}" r="9" fill="${current ? '#fff' : 'var(--money-green)'}" stroke="var(--money-green)" stroke-width="${current ? 2 : 0}"><title>${MON[from + i]} ${year}: ${money(v)}</title></circle>`;
    }).join('');
    const labels = vals.map((_, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${MON[from + i]}</text>`).join('');
    const opt = (n, sel) => `<option value="${n}" ${n === sel ? 'selected' : ''}>${MON[n]}</option>`;
    return `<div class="chart-controls">
        <label class="sr-only" for="c-year">Year</label>
        <select class="select-sm" id="c-year" data-chart="year">${Object.keys(D.earnings).map((y) => `<option ${+y === year ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <label class="sr-only" for="c-from">From</label>
        <select class="select-sm" id="c-from" data-chart="from">${[...Array(10).keys()].map((n) => opt(n, from)).join('')}</select>
        <label class="sr-only" for="c-to">To</label>
        <select class="select-sm" id="c-to" data-chart="to">${[...Array(10).keys()].map((n) => opt(n, to)).join('')}</select>
      </div>
      <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly earnings ${MON[from]} to ${MON[to]} ${year}">
        ${grid}<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#333"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#333"/>
        <polyline points="${pts}" fill="none" stroke="var(--money-green)" stroke-width="2"/>${dots}${labels}
      </svg>
      <div class="chart-foot"><button class="btn-green" type="button" data-action="soon" data-what="Financial Reports">Financial Reports</button></div>`;
  }

  function renderDonut() {
    const { unpaid, partial } = D.summary.pendingSplit;
    const total = unpaid + partial;
    const r = 100, C = 2 * Math.PI * r, part = (partial / total) * C;
    return `<div class="donut-wrap">
      <svg class="donut" viewBox="0 0 300 300" role="img" aria-label="Pending payments: ${money(unpaid)} not paid, ${money(partial)} partially paid">
        <g transform="rotate(-90 150 150)">
          <circle cx="150" cy="150" r="${r}" fill="none" stroke="var(--money-green-soft)" stroke-width="44"/>
          <circle cx="150" cy="150" r="${r}" fill="none" stroke="var(--money-green)" stroke-width="44" stroke-linecap="round" stroke-dasharray="${part} ${C}"/>
        </g>
        <rect x="104" y="128" width="14" height="14" fill="var(--money-green-soft)"/><text x="126" y="140" font-size="14" fill="#333">Not Paid</text>
        <rect x="104" y="152" width="14" height="14" fill="var(--money-green)"/><text x="126" y="164" font-size="14" fill="#333">Partially paid</text>
        <text x="296" y="46" text-anchor="end" font-size="16" fill="#004e05">${money(partial)}</text>
        <text x="4" y="276" font-size="16" fill="#004e05">${money(unpaid)}</text>
      </svg></div>`;
  }

  /* ---- Commission pipeline ---- */
  function renderPipeline() {
    const list = visibleCommissions();
    const f = state.filter;
    const tagCount = f.tags.size, payCount = f.payments.size;
    return `<section class="card pipeline" aria-labelledby="pipe-title">
      <div class="pipeline__head">
        <div class="section-head">
          <div class="pipeline__title"><h2 id="pipe-title">Commission Pipeline</h2><span class="pipeline__total">${list.length} Total</span></div>
          <p>Track your active commissions</p>
        </div>
        <div class="pipeline__controls">
          <div class="filter">
            <button class="filter__btn" type="button" data-action="pop" data-pop="tags" aria-expanded="${state.openPop === 'tags'}" aria-haspopup="true">
              Tags ${tagCount ? `<span class="count">${tagCount}</span>` : ''}<img src="${ICON}chevron-sm.svg" alt="" />
            </button>
            ${state.openPop === 'tags' ? renderTagPop() : ''}
          </div>
          <div class="filter">
            <button class="filter__btn filter__btn--payments" type="button" data-action="pop" data-pop="payments" aria-expanded="${state.openPop === 'payments'}" aria-haspopup="true">
              Payments ${payCount ? `<span class="count">${payCount}</span>` : ''}<img src="${ICON}chevron-sm.svg" alt="" />
            </button>
            ${state.openPop === 'payments' ? renderPayPop() : ''}
          </div>
          <div class="seg" role="group" aria-label="Date range">
            ${[['30', '30 days'], ['60', '60 days'], ['all', 'All']].map(([v, l]) => `<button type="button" data-action="range" data-range="${v}" aria-pressed="${f.range === v}">${l}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="board">
        ${D.STATUSES.map((s) => {
          const cards = list.filter((c) => c.status === s.id);
          return `<div class="lane" aria-label="${s.label}">
            <div class="lane__head"><h3>${s.label}</h3><span class="lane__count">${cards.length}</span></div>
            <div class="lane__cards">${cards.length ? cards.map(renderCard).join('') : '<p class="lane__empty">No commissions</p>'}</div>
          </div>`;
        }).join('')}
      </div>
    </section>`;
  }

  function renderCard(c) {
    const p = payment(c.payment);
    const menu = state.openMenu === c.id ? `<div class="menu" role="menu">
        <button type="button" role="menuitem" data-action="open-project" data-id="${esc(c.id)}">Open details</button>
        <hr/><p class="menu__label">Move to</p>
        ${D.STATUSES.filter((s) => s.id !== c.status).map((s) => `<button type="button" role="menuitem" data-action="move" data-id="${esc(c.id)}" data-status="${s.id}">${s.label}</button>`).join('')}
        ${c.payment !== 'paid' ? `<hr/><button type="button" role="menuitem" data-action="mark-paid" data-id="${esc(c.id)}">Mark as paid</button>` : ''}
      </div>` : '';
    return `<article class="ccard" data-card="${esc(c.id)}" data-action="open-project" data-id="${esc(c.id)}" tabindex="0" aria-label="${esc(c.title)} for ${esc(c.client)}">
      <div class="ccard__top">
        <h4 class="ccard__title">${esc(c.title)}</h4>
        <button class="kebab-btn" type="button" data-action="menu" data-id="${esc(c.id)}" aria-label="More actions for ${esc(c.title)}" aria-expanded="${state.openMenu === c.id}">${kebabIcon()}</button>
      </div>
      <div class="ccard__client"><span class="avatar">${esc(initials(c.client))}</span><span class="ccard__name">${esc(c.client)}</span></div>
      <p class="ccard__price">${money(c.price)}</p>
      <div class="ccard__foot">
        <span class="ccard__badges"><span class="badge">${esc(c.tag)}</span><span class="badge badge--${c.payment}">${p.badge}</span></span>
        <span class="ccard__date">${img('calendar-sm', 12, 12)}${short(c.due)}</span>
      </div>
      ${menu}
    </article>`;
  }

  function renderTagPop() {
    const q = state.tagQuery.toLowerCase();
    const tags = state.tags.filter((t) => t.toLowerCase().includes(q));
    return `<div class="pop" role="dialog" aria-label="Filter by tag">
      <label class="pop__search">${img('search', 12, 12)}<input type="text" data-input="tag-query" placeholder="Search tags" value="${esc(state.tagQuery)}" /></label>
      <div class="pop__list">
        ${tags.map((t) => `<label class="pop__opt">${esc(t)}<input type="checkbox" data-draft="${esc(t)}" ${state.draft.has(t) ? 'checked' : ''}/></label>`).join('') || '<p class="pop__opt">No tags</p>'}
      </div>
      <div class="pop__foot"><button type="button" class="pop__clear" data-action="pop-clear">Clear</button><button type="button" class="pop__done" data-action="pop-done">Done</button></div>
    </div>`;
  }

  function renderPayPop() {
    return `<div class="pop" role="dialog" aria-label="Filter by payment">
      <div class="pop__list">
        ${D.PAYMENTS.map((p) => `<label class="pop__opt">${p.label}<input type="checkbox" data-draft="${p.id}" ${state.draft.has(p.id) ? 'checked' : ''}/></label>`).join('')}
      </div>
      <div class="pop__foot"><button type="button" class="pop__clear" data-action="pop-clear">Clear</button><button type="button" class="pop__done" data-action="pop-done">Done</button></div>
    </div>`;
  }

  /* ---- Upcoming deadlines ---- */
  function renderDeadlines() {
    let list = state.commissions
      .filter((c) => c.status !== 'completed' && matchesSearch(c))
      .filter((c) => !state.deadlineType || c.deadlineType === state.deadlineType)
      .sort((a, b) => parse(a.due) - parse(b.due));
    const total = list.length;
    if (!state.showAllDeadlines) list = list.slice(0, 5);
    const bar = { delivery: 'bar-pink', progress: 'bar-blue', payment: 'bar-green' };
    return `<div class="deadlines">
      <div class="section-head"><h2>Upcoming Deadlines</h2><p>Stay on track with your commissions</p></div>
      <div class="chips" role="group" aria-label="Filter deadlines">
        ${['delivery', 'progress', 'payment'].map((t) => `<button type="button" class="chip chip--${t}" data-action="dl-type" data-type="${t}" aria-pressed="${state.deadlineType === t}"><span>${TYPE_LABEL[t]}</span></button>`).join('')}
      </div>
      <div class="dl-list">
        ${list.map((c) => {
          const d = daysLeft(c.due);
          const urgent = d <= 3;
          const icon = urgent ? img('alert', 16, 16) : d <= 8 ? img('clock-grey', 16, 16) : '';
          const left = d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : `${d}d left`;
          return `<button type="button" class="dl" data-action="open-project" data-id="${esc(c.id)}">
            <span class="dl__bar" aria-hidden="true"><span><img src="${ICON}${bar[c.deadlineType]}.svg" alt="" /></span></span>
            <span class="avatar avatar--md">${esc(initials(c.client))}</span>
            <span class="dl__main"><span class="dl__title" style="display:block">${esc(c.title)}</span><span class="dl__client" style="display:block">${esc(c.client)}</span></span>
            <span class="dl__when"><span class="dl__left ${urgent ? 'is-urgent' : ''}">${icon}${left}</span><span class="dl__date">${short(c.due)}</span></span>
            <span class="price-chip">${money(c.price)}</span>
            <span class="sr-only">${TYPE_LABEL[c.deadlineType]} deadline</span>
          </button>`;
        }).join('') || '<p class="dl-empty">No deadlines match.</p>'}
      </div>
      ${total > 5 ? `<button type="button" class="view-all" data-action="all-deadlines">${state.showAllDeadlines ? 'Show fewer ↑' : 'View all deadlines →'}</button>` : ''}
    </div>`;
  }

  /* ---- Calendar ---- */
  function renderCalendar() {
    const { y, m, sel } = state.cal;
    const first = new Date(y, m, 1);
    const start = new Date(y, m, 1 - first.getDay());
    const lastDay = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + lastDay) / 7);
    const today = iso(D.TODAY);
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = iso(d);
      const types = [...new Set(state.events.filter((e) => e.date === key).map((e) => e.type))];
      const cls = ['cal__day', d.getMonth() !== m && 'is-out', key === today && 'is-today', key === sel && 'is-selected'].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-action="cal-day" data-date="${key}" aria-pressed="${key === sel}" aria-label="${MONTHS[d.getMonth()]} ${d.getDate()}${types.length ? ', ' + types.map((t) => TYPE_LABEL[t]).join(', ') : ''}">
        <span>${d.getDate()}</span>${types.length ? `<span class="cal__dots">${types.map((t) => `<span class="dot dot--${t}"></span>`).join('')}</span>` : ''}
      </button>`;
    }
    const selEvents = state.events.filter((e) => e.date === sel).map((e) => ({ ...e, c: byId(e.id) })).filter((e) => e.c);
    const sd = parse(sel);
    return `<div class="calendar">
      <div class="section-head"><h2>Calendar</h2><p>Stay on track with your commissions and payments</p></div>
      <div class="cal-row">
        <div class="cal-card">
          <div class="cal">
            <div class="cal__head">
              <button type="button" class="cal__nav" data-action="cal-nav" data-dir="-1" aria-label="Previous month">${img('prev', 16, 16)}</button>
              <span class="cal__month" aria-live="polite">${MONTHS[m]} ${y}</span>
              <button type="button" class="cal__nav" data-action="cal-nav" data-dir="1" aria-label="Next month">${img('next', 16, 16)}</button>
            </div>
            <div class="cal__grid">
              ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => `<span class="cal__dow">${d}</span>`).join('')}
              ${cells}
            </div>
          </div>
          <div class="legend"><p>Legend</p><div class="legend__items">
            <span><i class="dot dot--payment"></i>Payment</span><span><i class="dot dot--progress"></i>WIP</span><span><i class="dot dot--delivery"></i>Delivery</span>
          </div></div>
        </div>
        <div class="day-panel" aria-live="polite">
          <h3>${MONTHS[sd.getMonth()]} ${sd.getDate()}</h3>
          <p>${selEvents.length} commission${selEvents.length === 1 ? '' : 's'} due</p>
          ${selEvents.length
            ? `<div class="day-panel__list">${selEvents.map((e) => `<button type="button" class="day-item" style="--c:${TYPE_COLOR[e.type]}" data-action="open-project" data-id="${esc(e.c.id)}"><b>${esc(e.c.title)}</b><span>${esc(e.c.client)} · ${TYPE_LABEL[e.type]}</span></button>`).join('')}</div>`
            : '<p class="day-panel__empty">No commissions due on this date</p>'}
        </div>
      </div>
    </div>`;
  }

  /* ================= PROJECT DETAILS ================= */
  function detailFor(c) {
    if (!state.details[c.id]) {
      const due = parse(c.due);
      const at = (off) => iso(new Date(due.getFullYear(), due.getMonth(), due.getDate() + off));
      const doneCount = { new: 0, wip: 2, ready: 5, completed: 5 }[c.status] ?? 0;
      const names = ['Initial Sketch', 'Color Concepts', 'Final Design', 'Rigging Setup', 'Final Delivery'];
      const offs = [-20, -15, -7, -3, 0];
      state.details[c.id] = {
        steps: names.map((n, i) => ({ name: n, date: at(offs[i]), done: i < doneCount })),
        description: c.description || `Commission for ${c.client}: ${c.title.toLowerCase()} (${c.tag}).`,
        links: ['Pinterest Board', 'Character Details Doc'],
        files: ['Reference #1.jpg'],
        created: at(-30),
        plan: '50% upfront, 50% on completion',
        method: 'PayPal',
      };
    }
    return state.details[c.id];
  }

  const paidAmount = (c) => (c.payment === 'paid' ? c.price : c.payment === 'partial' ? c.price / 2 : 0);

  function renderProject(c) {
    const d = detailFor(c);
    const done = d.steps.filter((s) => s.done).length;
    const pct = d.steps.length ? Math.round((done / d.steps.length) * 100) : 0;
    const paid = paidAmount(c), half = c.price / 2;
    const pay = payment(c.payment);
    const st = status(c.status);
    const payPill = { paid: 'pill--paid', partial: 'pill--pay', unpaid: 'pill--unpaid', tbd: 'pill--unpaid' }[c.payment];
    return `<div class="page">
      <div class="detail-head">
        <div class="detail-head__left">
          <a class="btn-square" href="#/" aria-label="Back to dashboard">${img('back', 16, 16)}</a>
          <div>
            <div class="detail-title"><h1>${esc(c.title)}</h1>
              <span class="detail-pills"><span class="pill pill--status">${st.label === 'NEW' ? 'New' : st.label}</span><span class="pill ${payPill}">${pay.badge}</span></span>
            </div>
            <div class="detail-meta">
              <span>${img('user', 20, 20)}${esc(c.client)}</span>
              <span>${img('due', 20, 20)}&nbsp;Due ${long(c.due)}</span>
              <span>${img('dollar-lg', 20, 20)}${Number(c.price).toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>
        <div class="dropdown">
          <button class="btn-outline" type="button" data-action="menu" data-id="__actions" aria-expanded="${state.openMenu === '__actions'}">Actions <img src="${ICON}chevron-sm.svg" alt="" width="11" height="6" /></button>
          ${state.openMenu === '__actions' ? `<div class="menu" role="menu">
            <p class="menu__label">Move to</p>
            ${D.STATUSES.filter((s) => s.id !== c.status).map((s) => `<button type="button" role="menuitem" data-action="move" data-id="${esc(c.id)}" data-status="${s.id}">${s.label}</button>`).join('')}
            <hr/><button type="button" role="menuitem" data-action="send-invoice" data-id="${esc(c.id)}">Send invoice</button>
            <button type="button" role="menuitem" data-action="delete" data-id="${esc(c.id)}">Delete commission</button>
          </div>` : ''}
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-col">
          <section class="panel" aria-labelledby="pp-title">
            <div class="panel__head"><h2 id="pp-title">Project Progress</h2><span class="pct">${pct}%</span></div>
            <div class="progress" aria-hidden="true">
              <span class="progress__track"></span><span class="progress__fill" style="width:${pct}%"></span>
              <span class="progress__mark ${paid >= half ? '' : 'is-pending'}" style="left:50%">${img('dot-filled', 20, 20)}<span>${money(half)}</span></span>
              <span class="progress__mark ${paid >= c.price ? '' : 'is-pending'}" style="left:100%">${img('dot-ring', 20, 20)}<span>${money(half)}</span></span>
            </div>
            <ol class="steps">
              ${d.steps.map((s, i) => {
                const milestone = i === 1 ? (paid >= half ? '<span class="milestone milestone--paid">Paid Partially</span>' : '<span class="milestone milestone--due">50% due</span>')
                  : i === d.steps.length - 1 ? (paid >= c.price ? '<span class="milestone milestone--paid">Paid</span>' : '<span class="milestone milestone--due">To be Paid</span>') : '';
                return `<li class="step ${s.done ? 'is-done' : ''}">
                  <label><input type="checkbox" data-step="${i}" ${s.done ? 'checked' : ''}/><span class="check">${img('check', 17, 17)}</span>
                  <span class="step__text"><b>${esc(s.name)}</b><span>${short(s.date)}</span></span></label>${milestone}
                </li>`;
              }).join('')}
            </ol>
            <form class="add-step" data-form="add-step">
              <label class="sr-only" for="new-step">New step name</label>
              <input id="new-step" name="step" placeholder="Step name, e.g. Revisions" />
              <button class="btn-dark" type="submit">+ Add new step</button>
            </form>
          </section>

          <section class="panel">
            <div class="tabs" role="tablist">
              ${['details', 'messages', 'files', 'activity'].map((t) => `<button type="button" role="tab" data-action="tab" data-tab="${t}" aria-selected="${state.tab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
            </div>
            ${renderTab(c, d)}
          </section>
        </div>

        <div class="detail-col detail-col--side">
          <section class="panel panel--sm">
            <div class="panel__head"><h2>Client Information</h2></div>
            <div class="client"><span class="avatar avatar--lg">${esc(initials(c.client))}</span><div><b>${esc(c.client)}</b><span>${esc(c.email || '—')}</span></div></div>
            <div class="stack">
              <button class="btn-block" type="button" data-action="send-message" data-id="${esc(c.id)}">${img('mail', 16, 16)}Send Message</button>
              <button class="btn-block" type="button" data-action="project-access">${img('link', 16, 16)}Project Access</button>
            </div>
          </section>
          <section class="panel panel--sm">
            <div class="panel__head"><h2>Payment Details</h2><span class="pill ${payPill}">${pay.badge}</span></div>
            <dl class="pay-grid">
              <dt>Total Amount</dt><dd class="total">${money(c.price)}</dd>
              <dt>Paid Amount</dt><dd class="paid">${money(paid)}</dd>
              <dt>Remaining</dt><dd>${money(c.price - paid)}</dd>
            </dl>
            <hr class="pay-sep"/>
            <dl class="pay-grid"><dt>Payment Plan</dt><dd>${esc(d.plan)}</dd><dt style="margin-top:16px">Payment Method</dt><dd>${esc(d.method)}</dd></dl>
            <hr class="pay-sep"/>
            <div class="stack">
              <button class="btn-block btn-block--dark" type="button" data-action="record-payment" data-id="${esc(c.id)}" ${paid >= c.price ? 'disabled style="opacity:.5;cursor:default"' : ''}>${img('card', 16, 16)}Record Payment</button>
              <button class="btn-block" type="button" data-action="send-invoice" data-id="${esc(c.id)}">${img('doc', 16, 16)}Send Invoice</button>
            </div>
          </section>
        </div>
      </div>
    </div>`;
  }

  function renderTab(c, d) {
    if (state.tab === 'messages') return `<p class="placeholder">No messages with ${esc(c.client)} yet.<br/><button class="btn-sm" style="margin-top:12px" type="button" data-action="send-message" data-id="${esc(c.id)}">${img('mail', 16, 16)} Start a conversation</button></p>`;
    if (state.tab === 'files') return d.files.length ? fileRows(d) : '<p class="placeholder">No files uploaded.</p>';
    if (state.tab === 'activity') {
      const items = [
        [d.created, 'Commission created'],
        ...d.steps.filter((s) => s.done).map((s) => [s.date, `Completed “${s.name}”`]),
        ...(paidAmount(c) ? [[d.created, `Payment received · ${money(paidAmount(c))}`]] : []),
      ].sort((a, b) => parse(b[0]) - parse(a[0]));
      return `<ul class="links">${items.map(([dt, t]) => `<li style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(t)}</span><span style="color:var(--gray)">${short(dt)}</span></li>`).join('')}</ul>`;
    }
    return `<div class="kv">
        <h3>Description <button type="button" data-action="edit-desc" aria-label="Edit description"><span class="icon-14">${img('edit', 14, 14)}</span></button></h3>
        ${state.editingDesc
          ? `<form data-form="desc"><textarea class="textarea" name="desc" rows="3" style="margin:8px 0">${esc(d.description)}</textarea><button class="btn-dark" type="submit">Save</button></form>`
          : `<p>${esc(d.description)}</p>`}
      </div>
      <div class="kv kv-row">
        <div><h3>Service Type <span class="icon-14">${img('edit', 14, 14)}</span></h3><p>${esc(c.service || c.tag)}</p></div>
        <div><h3>Created Date</h3><p>${long(d.created)}</p></div>
      </div>
      <div class="kv">
        <h3>External References</h3>
        <ul class="links">${d.links.map((l) => `<li>${img('external', 16, 16)}<p>${esc(l)}</p></li>`).join('')}</ul>
        <form data-form="add-link" style="display:flex;gap:8px;flex-wrap:wrap">
          <label class="sr-only" for="new-link">Link title</label>
          <input class="input" id="new-link" name="link" placeholder="Paste a link or title" style="flex:1;min-width:160px;height:32px" />
          <button class="btn-dark" type="submit">${img('add-link', 16, 16)} Add Link</button>
        </form>
      </div>
      <div class="kv">
        <h3>Reference Files</h3>
        ${fileRows(d)}
        <label class="btn-dark" style="cursor:pointer">
          <span class="ico" style="width:18px;height:18px">${layer('upload', '3.57%', '-5.77%')}</span> Upload Files
          <input type="file" multiple data-input="upload" class="sr-only" />
        </label>
      </div>
      <div class="kv">
        <h3>Terms of Service</h3>
        <div class="tos-row"><p>${esc(c.service || c.tag)} Model Agreement</p><button class="btn-sm" type="button" data-action="soon" data-what="TOS editor">${img('doc', 16, 16)}View/Edit TOS</button></div>
      </div>`;
  }

  function fileRows(d) {
    return d.files.map((f, i) => `<div class="file-row">
        <span class="ico">${layer('file', '3.57% 10.71%', '-5.77% -6.82%')}</span>
        <span class="file-row__name">${esc(f)}</span>
        <button type="button" class="ico" data-action="soon" data-what="File preview" aria-label="Preview ${esc(f)}">${layer('eye', '21.43% 3.66%', '-7.29% -4.5%')}</button>
        <button type="button" class="ico" data-action="soon" data-what="Download" aria-label="Download ${esc(f)}">${layer('download', '14.29% 7.14% 5% 7.14%', '-6.64% -6.25%')}</button>
        <button type="button" class="ico file-row__remove" data-action="remove-file" data-index="${i}" aria-label="Remove ${esc(f)}">${layer('remove-a', '3.57%')}${layer('remove-b', '34.86%', '-13.76%')}</button>
      </div>`).join('');
  }

  /* ================= MOBILE VERSION ================= */
  function renderMobile() {
    return `<div class="page mobile-view">
      <div class="mobile-view__intro">
        <h1>VGen on mobile</h1>
        <p>The laptop dashboard is where artists plan and track commissions. The mobile version covers what happens on the go: resolving a disagreement with a client through the Resolve Issue flow.</p>
        <p>It's a separate React prototype, shown here in a phone frame. Use the switch at the top to go back to the laptop dashboard.</p>
        <a class="link-out" href="${MOBILE_PROTOTYPE_URL}" target="_blank" rel="noopener">Open mobile prototype in a new tab ↗</a>
      </div>
      <div class="phone"><iframe src="${MOBILE_PROTOTYPE_URL}" title="VGen mobile prototype: Resolve Issue flow" loading="lazy"></iframe></div>
    </div>`;
  }

  /* ================= NEW COMMISSION DIALOG ================= */
  function openNewDialog() {
    const dlg = $('#new-dialog');
    dlg.innerHTML = `<div class="modal__inner">
      <button class="modal__close" type="button" data-action="close-new" aria-label="Close">${img('close', 31, 31)}</button>
      <h2 id="new-title">Create New Commission</h2>
      <p class="modal__lede">Add a new commission project to your dashboard. You can always add more details later.</p>
      <form class="form" id="new-form" novalidate>
        <fieldset class="fieldset">
          <legend>${img('form-details', 16, 16)}Commission Details</legend>
          <label class="field" data-req><span>Commission Title<i> *</i></span><input class="input" name="title" placeholder="e.g., VTuber Character Design" /></label>
          <label class="field"><span>Description</span><textarea class="textarea" name="description" placeholder="Describe the commission requirements, style preferences, etc."></textarea></label>
          <div class="grid-2">
            <label class="field" data-req><span>Service Type <i>*</i></span>
              <select class="select" name="service" required><option value="" selected disabled>Select a service</option>${D.SERVICES.map((s) => `<option>${s}</option>`).join('')}</select></label>
            <label class="field"><span>Initial Status</span>
              <select class="select" name="status">${D.STATUSES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}</select></label>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend>${img('form-client', 16, 16)}Client Information</legend>
          <div class="grid-2">
            <label class="field"><span>Client Name</span><input class="input" name="client" placeholder="John Doe" autocomplete="off" /></label>
            <label class="field"><span>Client Contact Email</span><input class="input" type="email" name="email" placeholder="john@example.com" autocomplete="off" /></label>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend>${img('form-pricing', 16, 16)}Pricing &amp; Timeline</legend>
          <div class="grid-2">
            <div class="price-row">
              <label class="field" data-req><span>Price<i> *</i></span><span class="input-icon">${img('dollar', 16, 16)}<input class="input" name="price" inputmode="decimal" placeholder="150.00" /></span></label>
              <label class="field"><span>Currency</span><select class="select select--currency" name="currency"><option>USD</option><option>CAD</option><option>EUR</option></select></label>
            </div>
            <label class="field" data-req><span>Deadline <i>*</i></span><span class="input-icon input-icon--date">${img('date', 16, 16)}<input class="input input--date" type="date" name="due" /></span></label>
          </div>
        </fieldset>
        <fieldset class="fieldset">
          <legend>${img('form-tag', 16, 16)}Additional Information</legend>
          <label class="field"><span>Internal Notes</span><textarea class="textarea" name="notes" placeholder="Any internal notes or reminders about this commission..."></textarea></label>
        </fieldset>
        <div class="form__foot">
          <button class="btn-ghost" type="button" data-action="close-new">Cancel</button>
          <button class="btn-create" type="submit">${img('create', 16, 16)}Create Commission</button>
        </div>
      </form>
    </div>`;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    closeNav();
    $('input[name="title"]', dlg).focus();
  }

  function formValues(form) {
    const fd = new FormData(form);
    const v = Object.fromEntries([...fd.entries()].map(([k, val]) => [k, String(val).trim()]));
    v.priceNum = parseFloat((v.price || '').replace(/[^0-9.]/g, ''));
    return v;
  }
  function formErrors(v) {
    const e = {};
    if (!v.title) e.title = 'Add a title for this commission.';
    if (!v.service) e.service = 'Choose a service type.';
    if (!(v.priceNum > 0)) e.price = 'Enter a price greater than 0.';
    if (!v.due) e.due = 'Pick a deadline.';
    return e;
  }
  function paintErrors(form, errors) {
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('has-error'); f.querySelector('.field__error')?.remove(); });
    Object.entries(errors).forEach(([name, msg]) => {
      const field = form.querySelector(`[name="${name}"]`).closest('.field');
      field.classList.add('has-error');
      field.insertAdjacentHTML('beforeend', `<span class="field__error">${esc(msg)}</span>`);
    });
  }

  function createCommission(v) {
    let id = v.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'commission';
    while (byId(id)) id += '-1';
    const c = {
      id, title: v.title, client: v.client || 'New Client', email: v.email, price: Math.round(v.priceNum * 100) / 100,
      tag: v.service, payment: 'unpaid', status: v.status || 'new', due: v.due, deadlineType: 'delivery', service: v.service,
      description: v.description,
    };
    state.commissions.push(c);
    state.events.push({ date: v.due, type: 'delivery', id });
    if (!state.tags.includes(v.service)) state.tags.push(v.service);
    return c;
  }

  /* ================= EVENTS ================= */
  function openNav() { $('#app').classList.add('nav-open'); $('#scrim').hidden = false; $('.topbar__menu').setAttribute('aria-expanded', 'true'); }
  function closeNav() { $('#app').classList.remove('nav-open'); $('#scrim').hidden = true; $('.topbar__menu')?.setAttribute('aria-expanded', 'false'); }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    // close popovers / menus when clicking elsewhere
    if (state.openPop && !e.target.closest('.filter')) { state.openPop = null; render(); }
    if (state.openMenu && !e.target.closest('.menu') && !(t && t.dataset.action === 'menu')) { state.openMenu = null; if (!t) render(); }
    if (!t) return;
    const a = t.dataset.action;
    const id = t.dataset.id;

    switch (a) {
      case 'toggle-nav': $('#app').classList.contains('nav-open') ? closeNav() : openNav(); return;
      case 'close-nav': closeNav(); return;
      case 'open-new': openNewDialog(); return;
      case 'close-new': $('#new-dialog').close(); return;
      case 'notifications': toast('Notifications', '2 payments are due this week.'); return;
      case 'profile': toast('Profile', 'Account settings aren’t part of this prototype.'); return;
      case 'soon': toast(t.dataset.what || 'Coming soon', ' isn’t part of this prototype.'); return;
      case 'toggle-stat': state.expanded[t.dataset.stat] = !state.expanded[t.dataset.stat]; break;
      case 'pop': {
        const p = t.dataset.pop;
        if (state.openPop === p) state.openPop = null;
        else { state.openPop = p; state.tagQuery = ''; state.draft = new Set(p === 'tags' ? state.filter.tags : state.filter.payments); }
        break;
      }
      case 'pop-clear': state.draft.clear(); applyDraft(); break;
      case 'pop-done': applyDraft(); state.openPop = null; break;
      case 'range': state.filter.range = t.dataset.range; break;
      case 'menu': e.stopPropagation(); state.openMenu = state.openMenu === id ? null : id; break;
      case 'move': {
        const c = byId(id); c.status = t.dataset.status; state.openMenu = null;
        if (state.details[id] && (c.status === 'completed' || c.status === 'ready')) state.details[id].steps.forEach((s) => (s.done = true));
        toast(`${c.title} moved`, ` to ${status(c.status).label}.`);
        break;
      }
      case 'mark-paid': { const c = byId(id); c.payment = 'paid'; state.openMenu = null; toast(`${c.title} marked as paid`); break; }
      case 'open-project':
        state.tab = 'details'; state.editingDesc = false; state.openMenu = null;
        location.hash = `#/project/${encodeURIComponent(id)}`; return;
      case 'dl-type': state.deadlineType = state.deadlineType === t.dataset.type ? null : t.dataset.type; break;
      case 'all-deadlines': state.showAllDeadlines = !state.showAllDeadlines; break;
      case 'cal-nav': {
        const d = new Date(state.cal.y, state.cal.m + Number(t.dataset.dir), 1);
        state.cal.y = d.getFullYear(); state.cal.m = d.getMonth(); state.cal.sel = iso(d); break;
      }
      case 'cal-day': {
        state.cal.sel = t.dataset.date; const d = parse(t.dataset.date);
        state.cal.y = d.getFullYear(); state.cal.m = d.getMonth(); break;
      }
      case 'tab': state.tab = t.dataset.tab; break;
      case 'edit-desc': state.editingDesc = !state.editingDesc; break;
      case 'remove-file': { const c = byId(route().id); detailFor(c).files.splice(Number(t.dataset.index), 1); break; }
      case 'record-payment': {
        const c = byId(id); const before = paidAmount(c);
        c.payment = c.payment === 'unpaid' ? 'partial' : 'paid';
        toast('Payment recorded', ` ${money(paidAmount(c) - before)} from ${c.client}.`); break;
      }
      case 'send-invoice': {
        const c = byId(id); state.openMenu = null;
        toast('Invoice sent', ` ${money(c.price - paidAmount(c))} requested from ${c.client}${c.email ? ' (' + c.email + ')' : ''}.`); break;
      }
      case 'send-message': toast('Message drafted', ` A new thread with ${byId(id).client} is ready.`); return;
      case 'project-access': {
        navigator.clipboard?.writeText(location.href).catch(() => {});
        toast('Client access link copied'); return;
      }
      case 'delete': {
        const c = byId(id);
        if (confirm(`Delete “${c.title}”? This only affects this prototype session.`)) {
          state.commissions = state.commissions.filter((x) => x.id !== id);
          state.events = state.events.filter((x) => x.id !== id);
          state.openMenu = null; location.hash = '#/'; toast(`${c.title} deleted`);
        }
        return;
      }
      default: return;
    }
    render();
  });

  function applyDraft() {
    if (state.openPop === 'tags') state.filter.tags = new Set(state.draft);
    if (state.openPop === 'payments') state.filter.payments = new Set(state.draft);
  }

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.draft !== undefined) { t.checked ? state.draft.add(t.dataset.draft) : state.draft.delete(t.dataset.draft); return; }
    if (t.dataset.chart) {
      const k = t.dataset.chart; state.chart[k] = Number(t.value);
      if (state.chart.from > state.chart.to) { if (k === 'from') state.chart.to = state.chart.from; else state.chart.from = state.chart.to; }
      render(); return;
    }
    if (t.dataset.step !== undefined) {
      const c = byId(route().id); detailFor(c).steps[Number(t.dataset.step)].done = t.checked; render(); return;
    }
    if (t.dataset.input === 'upload') {
      const c = byId(route().id); detailFor(c).files.push(...[...t.files].map((f) => f.name));
      toast(`${t.files.length} file${t.files.length === 1 ? '' : 's'} added`, ' (kept in this browser tab only)'); render(); return;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'search') {
      state.search = t.value;
      if (route().name !== 'dashboard') location.hash = '#/'; else render();
      return;
    }
    if (t.dataset.input === 'tag-query') {
      state.tagQuery = t.value;
      const pos = t.selectionStart; render();
      const el = $('[data-input="tag-query"]'); el.focus(); el.setSelectionRange(pos, pos); return;
    }
    const form = t.closest('#new-form');
    if (form) {
      const v = formValues(form);
      $('.btn-create', form).classList.toggle('is-ready', !Object.keys(formErrors(v)).length);
      if (t.closest('.field.has-error')) paintErrors(form, Object.fromEntries(Object.entries(formErrors(v)).filter(([k]) => form.querySelector(`[name="${k}"]`).closest('.field').classList.contains('has-error'))));
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    e.preventDefault();
    if (f.id === 'new-form') {
      const v = formValues(f); const errs = formErrors(v);
      if (Object.keys(errs).length) { paintErrors(f, errs); f.querySelector('.has-error input, .has-error select')?.focus(); return; }
      const c = createCommission(v);
      $('#new-dialog').close();
      state.flashId = c.id;
      // make sure the new card is visible
      state.filter.tags.clear(); state.filter.payments.clear(); state.filter.range = 'all'; state.search = ''; $('#search').value = '';
      toast('New project added', ` “${c.title}” is in ${status(c.status).label}.`);
      if (route().name !== 'dashboard') location.hash = '#/'; else render();
      return;
    }
    const c = byId(route().id); if (!c) return;
    const d = detailFor(c);
    if (f.dataset.form === 'add-step') {
      const name = f.step.value.trim(); if (!name) return;
      d.steps.push({ name, date: c.due, done: false });
    } else if (f.dataset.form === 'add-link') {
      const l = f.link.value.trim(); if (!l) return; d.links.push(l);
    } else if (f.dataset.form === 'desc') {
      d.description = f.desc.value.trim() || d.description; state.editingDesc = false;
    }
    render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.openPop || state.openMenu) { state.openPop = null; state.openMenu = null; render(); }
      closeNav();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.ccard')) {
      e.preventDefault(); e.target.click();
    }
  });

  // Close the drawer after navigating; links with data-soon just announce
  document.querySelectorAll('.nav__item').forEach((a) => a.addEventListener('click', (e) => {
    if (a.hasAttribute('data-soon')) { e.preventDefault(); toast(a.textContent.trim(), ' isn’t part of this prototype.'); }
    closeNav();
  }));
  window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => m.matches && closeNav());

  // Shorter search placeholder on phones
  const phone = window.matchMedia('(max-width: 640px)');
  const setPlaceholder = () => { $('#search').placeholder = phone.matches ? 'Search…' : 'Search commissions, clients...'; };
  phone.addEventListener('change', setPlaceholder);
  setPlaceholder();

  window.addEventListener('hashchange', () => { closeNav(); render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); });
  render();
})();
