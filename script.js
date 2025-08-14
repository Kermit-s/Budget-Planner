/* Minimal, readable JS. Data persists in localStorage. */
(function () {
  const DEFAULT_CATEGORIES = [
    { id: id(), name: 'Housing', amount: 0, color: '#22d3ee' },
    { id: id(), name: 'Utilities', amount: 0, color: '#34d399' },
    { id: id(), name: 'Food', amount: 0, color: '#fbbf24' },
    { id: id(), name: 'Transport', amount: 0, color: '#f472b6' },
    { id: id(), name: 'Entertainment', amount: 0, color: '#60a5fa' },
    { id: id(), name: 'Debt', amount: 0, color: '#a78bfa' },
    { id: id(), name: 'Savings', amount: 0, color: '#fb7185' },
    { id: id(), name: 'Misc', amount: 0, color: '#4ade80' },
  ];

  const currencyMap = {
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
    JPY: { symbol: '¥', locale: 'ja-JP' },
    CHF: { symbol: 'Fr.', locale: 'de-CH' },
    AUD: { symbol: 'A$', locale: 'en-AU' },
    CAD: { symbol: 'C$', locale: 'en-CA' },
    NZD: { symbol: 'NZ$', locale: 'en-NZ' },
    CNY: { symbol: '¥', locale: 'zh-CN' },
    INR: { symbol: '₹', locale: 'en-IN' },
    BRL: { symbol: 'R$', locale: 'pt-BR' },
    MXN: { symbol: 'Mex$', locale: 'es-MX' },
    ZAR: { symbol: 'R', locale: 'en-ZA' },
    SGD: { symbol: 'S$', locale: 'en-SG' },
    HKD: { symbol: 'HK$', locale: 'zh-HK' },
    SEK: { symbol: 'kr', locale: 'sv-SE' },
    NOK: { symbol: 'kr', locale: 'nb-NO' },
    DKK: { symbol: 'kr', locale: 'da-DK' },
    PLN: { symbol: 'zł', locale: 'pl-PL' },
    CZK: { symbol: 'Kč', locale: 'cs-CZ' },
    HUF: { symbol: 'Ft', locale: 'hu-HU' },
    TRY: { symbol: '₺', locale: 'tr-TR' },
    RON: { symbol: 'lei', locale: 'ro-RO' },
  };

  const els = {
    themeToggle: document.getElementById('themeToggle'),
    monthInput: document.getElementById('monthInput'),
    monthBadge: document.getElementById('monthBadge'),
    saveIndicator: document.getElementById('saveIndicator'),
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    currencySelect: document.getElementById('currencySelect'),
    incomeInput: document.getElementById('incomeInput'),
    goalInput: document.getElementById('goalInput'),
    applyTemplateBtn: document.getElementById('applyTemplateBtn'),
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),
    categoryList: document.getElementById('categoryList'),
    customCategoryName: document.getElementById('customCategoryName'),
    customCategoryAmount: document.getElementById('customCategoryAmount'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    incomeTotal: document.getElementById('incomeTotal'),
    expenseTotal: document.getElementById('expenseTotal'),
    balanceTotal: document.getElementById('balanceTotal'),
    goalLabel: document.getElementById('goalLabel'),
    incomeTotalSecondary: document.getElementById('incomeTotalSecondary'),
    expenseTotalSecondary: document.getElementById('expenseTotalSecondary'),
    balanceTotalSecondary: document.getElementById('balanceTotalSecondary'),
    goalLabelSecondary: document.getElementById('goalLabelSecondary'),
    goalProgress: document.getElementById('goalProgress'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    printBtn: document.getElementById('printBtn'),
    donutCanvas: document.getElementById('donutChart'),
    barCanvas: document.getElementById('barChart'),
  };

  const STORAGE_KEY = 'budget_planner_state_v4';
  const THEME_KEY = 'budget_planner_theme';

  /** State */
  let state = migrateStateIfNeeded(loadState()) || createDefaultState();

  /** Charts */
  let donutChart = null;
  let barChart = null;
  // Expose for beforeprint/afterprint resize
  Object.defineProperty(window, 'donutChart', { get: () => donutChart });
  Object.defineProperty(window, 'barChart', { get: () => barChart });

  init();

  function init() {
    // Theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = savedTheme ? savedTheme === 'light' : prefersLight;
    setTheme(isLight ? 'light' : 'dark');
    els.themeToggle.checked = !isLight ? true : false;
    els.themeToggle.addEventListener('change', () => setTheme(els.themeToggle.checked ? 'dark' : 'light'));

    // Wire inputs
    els.monthInput.value = state.month || formatMonthInputValue(new Date());
    updateMonthBadge();
    els.currencySelect.value = state.currency;
    els.incomeInput.value = toInput(currentBudget().income);
    els.goalInput.value = toInput(currentBudget().goal);

    els.currencySelect.addEventListener('change', async () => { state.currency = els.currencySelect.value; await refreshFxRate(); render(); persist(); });
    if (document.getElementById('secondaryCurrencySelect')) document.getElementById('secondaryCurrencySelect').addEventListener('change', async () => { state.secondaryCurrency.enabled = true; state.secondaryCurrency.code = document.getElementById('secondaryCurrencySelect').value; await refreshFxRate(); persist(); render(); });
    if (document.getElementById('removeCurrencyBtn')) document.getElementById('removeCurrencyBtn').addEventListener('click', removeSecondaryCurrency);

    els.incomeInput.addEventListener('input', () => { currentBudget().income = toNumber(els.incomeInput.value); render(); setDirty(); });
    els.goalInput.addEventListener('input', () => { currentBudget().goal = toNumber(els.goalInput.value); render(); setDirty(); });
    els.monthInput.addEventListener('change', () => { switchToMonth(els.monthInput.value); setDirty(false, true); });

    els.addCategoryBtn.addEventListener('click', addCustomCategory);
    // removed 50/30/20 template button
    els.saveBtn.addEventListener('click', () => { persist(true); setDirty(false, true); flash(els.saveBtn); showSavedToast(); });
    els.resetBtn.addEventListener('click', resetAll);
    els.exportCsvBtn.addEventListener('click', exportCsv);
    els.printBtn.addEventListener('click', () => window.print());
    if (els.prevMonthBtn) els.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
    if (els.nextMonthBtn) els.nextMonthBtn.addEventListener('click', () => shiftMonth(1));

    // Initial FX fetch if secondary enabled
    if (state.secondaryCurrency && state.secondaryCurrency.enabled) { refreshFxRate().then(() => render()); }

    // Auto-save on unload
    window.addEventListener('beforeunload', () => { try { persist(true); } catch {} });

    renderCategories();
    render();
  }

  function createDefaultState() {
    return {
      month: formatMonthInputValue(new Date()),
      currency: 'USD',
      budgets: {}, // map: month -> { income, goal, categories }
      monthlyHistory: [], // { month: '2025-08', total: 123 }
      secondaryCurrency: { enabled: false, code: 'EUR', rate: 0.92, lastUpdated: null }, // rate auto-fetched
    };
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || ''); } catch { return null; }
  }

  function migrateStateIfNeeded(loaded) {
    if (!loaded) return null;
    // If already v2 format
    if (loaded && typeof loaded === 'object' && loaded.budgets) return loaded;
    // v1 -> v2 migration
    const month = loaded.month || formatMonthInputValue(new Date());
    const migrated = {
      month,
      currency: loaded.currency || 'USD',
      budgets: {},
      monthlyHistory: Array.isArray(loaded.monthlyHistory) ? loaded.monthlyHistory : [],
    };
    migrated.budgets[month] = {
      income: toNumber(loaded.income),
      goal: toNumber(loaded.goal),
      categories: Array.isArray(loaded.categories) && loaded.categories.length > 0
        ? loaded.categories.map(c => ({ id: c.id || id(), name: c.name, amount: toNumber(c.amount) }))
        : structuredClone(DEFAULT_CATEGORIES),
    };
    // Save immediately under new key
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch {}
    return migrated;
  }

  function persist(withHistory = false) {
    if (withHistory) {
      upsertMonthlyHistory();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    indicateSaved();
  }

  function upsertMonthlyHistory() {
    const month = state.month || formatMonthInputValue(new Date());
    const total = totalExpenses();
    const idx = state.monthlyHistory.findIndex((m) => m.month === month);
    if (idx >= 0) state.monthlyHistory[idx].total = total;
    else state.monthlyHistory.push({ month, total });
  }

  function setTheme(mode) {
    document.documentElement.classList.toggle('light', mode === 'light');
    localStorage.setItem(THEME_KEY, mode);
  }

  function render() {
    const { symbol, locale } = currencyMap[state.currency] || currencyMap.USD;
    const income = currentBudget().income;
    const expenses = totalExpenses();
    const balance = income - expenses;

    els.incomeTotal.textContent = formatCurrency(income, state.currency, locale);
    els.expenseTotal.textContent = formatCurrency(expenses, state.currency, locale);
    els.balanceTotal.textContent = formatCurrency(balance, state.currency, locale);

    els.goalLabel.textContent = formatCurrency(currentBudget().goal, state.currency, locale);
    const goalPct = income > 0 && currentBudget().goal > 0 ? Math.min(100, Math.round((income - expenses) / currentBudget().goal * 100)) : 0;
    els.goalProgress.style.width = String(Math.max(0, goalPct)) + '%';

    // Ensure monthly history reflects current totals (keeps bar chart live)
    upsertMonthlyHistory();

    // Secondary currency display
    updateSecondaryDisplays(income, expenses, balance);

    renderCharts();
    renderIncomeBreakdown();
    persist();
  }

  function updateSecondaryDisplays(income, expenses, balance) {
    const sc = state.secondaryCurrency || { enabled: false };
    const wrap = document.getElementById('secondaryControls');
    if (wrap) wrap.classList.toggle('hidden', !sc.enabled);
    const addBtn = document.getElementById('addCurrencyBtn');
    if (addBtn) addBtn.textContent = sc.enabled ? 'Change Currency' : 'Add Currency';
    if (!sc.enabled || !sc.code) {
      setSecondaryText(els.incomeTotalSecondary, '');
      setSecondaryText(els.expenseTotalSecondary, '');
      setSecondaryText(els.balanceTotalSecondary, '');
      setSecondaryText(els.goalLabelSecondary, '');
      return;
    }
    const { locale } = currencyMap[sc.code] || {};
    const rate = Number(sc.rate) > 0 ? Number(sc.rate) : null;
    if (!rate) {
      // fetch if not available
      refreshFxRate().then(() => updateSecondaryDisplays(income, expenses, balance));
      return;
    }
    setSecondaryText(els.incomeTotalSecondary, formatCurrency(income * rate, sc.code, locale));
    setSecondaryText(els.expenseTotalSecondary, formatCurrency(expenses * rate, sc.code, locale));
    setSecondaryText(els.balanceTotalSecondary, formatCurrency(balance * rate, sc.code, locale));
    setSecondaryText(els.goalLabelSecondary, formatCurrency(currentBudget().goal * rate, sc.code, locale));
    // Reflect selectors if present
    const scSel = document.getElementById('secondaryCurrencySelect');
    const scRate = document.getElementById('secondaryRateInput');
    if (scSel) scSel.value = sc.code;
  }

  function setSecondaryText(el, text) { if (el) el.textContent = text; }

  async function toggleSecondaryCurrency() {
    const sc = state.secondaryCurrency || { enabled: false, code: 'EUR', rate: 1 };
    sc.enabled = !sc.enabled ? true : true; // show controls; button acts as "change"
    state.secondaryCurrency = sc;
    await refreshFxRate();
    persist();
    render();
  }

  function removeSecondaryCurrency() {
    state.secondaryCurrency = { enabled: false, code: 'EUR', rate: 0.92, lastUpdated: null };
    persist();
    render();
  }

  async function refreshFxRate() {
    try {
      const base = state.currency;
      const sc = state.secondaryCurrency;
      if (!sc || !sc.enabled || !sc.code || sc.code === base) { sc.rate = 1; sc.lastUpdated = Date.now(); return; }
      // Use a free, no-auth FX API. Fallback if blocked.
      // Primary: exchangerate.host
      const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(sc.code)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('FX fetch failed');
      const data = await res.json();
      const rate = data && data.rates ? Number(data.rates[sc.code]) : null;
      if (rate && rate > 0) {
        sc.rate = rate;
        sc.lastUpdated = Date.now();
      }
    } catch (e) {
      // Silent fallback: keep existing rate if present
    }
  }

  function updateMonthBadge() {
    if (!els.monthBadge) return;
    const label = formatMonthLabel(state.month || formatMonthInputValue(new Date()));
    els.monthBadge.textContent = label;
  }

  function indicateSaved() {
    if (!els.saveIndicator) return;
    els.saveIndicator.textContent = 'Saved';
    els.saveIndicator.style.opacity = '0.9';
    clearTimeout(indicateSaved._t);
    indicateSaved._t = setTimeout(() => { els.saveIndicator.style.opacity = '0.6'; }, 1200);
  }

  function setDirty(isDirty = true, immediate = false) {
    if (!els.saveIndicator) return;
    els.saveIndicator.textContent = isDirty ? 'Unsaved changes…' : 'Saved';
    els.saveIndicator.style.opacity = isDirty ? '1' : '0.6';
    if (immediate) { els.saveIndicator.style.opacity = isDirty ? '1' : '0.9'; }
  }

  function showSavedToast() {
    try {
      const toast = document.createElement('div');
      toast.textContent = 'Budget saved in this browser';
      toast.setAttribute('role', 'status');
      toast.style.position = 'fixed';
      toast.style.bottom = '16px';
      toast.style.right = '16px';
      toast.style.padding = '10px 12px';
      toast.style.borderRadius = '10px';
      toast.style.border = '1px solid var(--border)';
      toast.style.background = 'var(--elev)';
      toast.style.color = 'var(--text)';
      toast.style.boxShadow = 'var(--shadow)';
      toast.style.zIndex = '9999';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1800);
    } catch {}
  }

  function renderCategories() {
    els.categoryList.innerHTML = '';
    for (const category of currentBudget().categories) {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.dataset.id = category.id;
      row.innerHTML = `
        <input class="name-input" type="text" value="${escapeHtml(category.name)}" aria-label="Category name" />
        <input class="amount-input" type="number" min="0" step="0.01" value="${toInput(category.amount)}" aria-label="Category amount" />
        <div class="center"><input class="color-input" type="color" value="${category.color || '#34d399'}" aria-label="Category color" /></div>
        <div class="center"><button class="danger" type="button">Remove</button></div>
      `;
      const [nameEl, amountEl, colorWrap, removeWrap] = row.children;
      nameEl.addEventListener('input', () => { category.name = nameEl.value; persist(); setDirty(); });
      amountEl.addEventListener('input', () => { category.amount = toNumber(amountEl.value); render(); });
      const colorEl = colorWrap.querySelector('input');
      colorEl.addEventListener('input', () => { category.color = colorEl.value; persist(); renderCharts(); });
      removeWrap.querySelector('button').addEventListener('click', () => removeCategory(category.id));
      els.categoryList.appendChild(row);
    }
  }

  function addCustomCategory() {
    const name = (els.customCategoryName.value || '').trim();
    const amount = toNumber(els.customCategoryAmount.value);
    if (!name) return flash(els.customCategoryName);
    currentBudget().categories.push({ id: id(), name, amount, color: pickNextColor(currentBudget().categories.length) });
    els.customCategoryName.value = '';
    els.customCategoryAmount.value = '';
    renderCategories();
    render();
  }

  function removeCategory(categoryId) {
    const b = currentBudget();
    b.categories = b.categories.filter((c) => c.id !== categoryId);
    renderCategories();
    render();
  }

  // 50/30/20 template removed by user request

  function renderCharts() {
    const income = currentBudget().income;
    const expenses = totalExpenses();
    const remaining = Math.max(0, income - expenses);

    // Donut chart: Expenses vs Remaining income
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(els.donutCanvas, {
      type: 'doughnut',
      data: {
        labels: buildDonutLabels(),
        datasets: [{ data: buildDonutData(expenses, remaining), backgroundColor: buildDonutColors(), borderWidth: 0 }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed, state.currency)}` } }
        },
        cutout: '65%',
      }
    });

    // Bar chart history across months (sorted chronologically)
    const historySorted = [...state.monthlyHistory].sort((a, b) => String(a.month).localeCompare(String(b.month)));
    const months = historySorted.map(m => m.month);
    const totals = historySorted.map(m => m.total);
    if (barChart) barChart.destroy();
    barChart = new Chart(els.barCanvas, {
      type: 'bar',
      data: { labels: months, datasets: [{ label: 'Total expenses', data: totals, backgroundColor: '#34d399' }] },
      options: {
        scales: {
          x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } },
          y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } },
        },
        plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } } }
      }
    });
  }

  function buildDonutLabels() {
    const labels = [];
    for (const c of currentBudget().categories) {
      const amt = toNumber(c.amount);
      if (amt > 0) labels.push(c.name);
    }
    labels.push('Remaining');
    return labels;
  }

  function buildDonutData(expenses, remaining) {
    const data = [];
    for (const c of currentBudget().categories) {
      const amt = toNumber(c.amount);
      if (amt > 0) data.push(amt);
    }
    data.push(remaining);
    return data;
  }

  function buildDonutColors() {
    const colors = [];
    for (const c of currentBudget().categories) {
      const amt = toNumber(c.amount);
      if (amt > 0) colors.push(c.color || '#34d399');
    }
    colors.push('#0ea5e9'); // remaining
    return colors;
  }

  function pickNextColor(index) {
    const palette = ['#22d3ee','#34d399','#fbbf24','#f472b6','#60a5fa','#f87171','#a78bfa','#fb7185','#4ade80','#f59e0b','#2dd4bf'];
    return palette[index % palette.length];
  }

  function exportCsv() {
    const rows = [];
    rows.push(['Month', state.month]);
    rows.push(['Currency', state.currency]);
    rows.push(['Income', currentBudget().income]);
    rows.push([]);
    rows.push(['Category', 'Amount']);
    for (const c of currentBudget().categories) rows.push([c.name, c.amount]);
    rows.push([]);
    rows.push(['Total Expenses', totalExpenses()]);
    rows.push(['Balance', currentBudget().income - totalExpenses()]);
    if (currentBudget().goal > 0) rows.push(['Savings Goal', currentBudget().goal]);

    const csv = rows.map(r => r.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_${state.month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderIncomeBreakdown() {
    const wrap = document.getElementById('incomeBreakdownList');
    if (!wrap) return;
    const income = toNumber(currentBudget().income);
    const total = totalExpenses();
    const list = currentBudget().categories.map(c => ({ name: c.name, amount: toNumber(c.amount), color: c.color || '#34d399' }))
      .filter(i => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    wrap.innerHTML = '';
    for (const item of list) {
      const pctOfIncome = income > 0 ? Math.round(item.amount / income * 100) : 0;
      const row = document.createElement('div');
      row.className = 'breakdown-item';
      row.innerHTML = `
        <div>${escapeHtml(item.name)}</div>
        <div class="pill">${pctOfIncome}% of income</div>
        <div class="pill">${formatCurrency(item.amount, state.currency)}</div>
        <div class="breakdown-bar"><div style="width:${Math.min(100, pctOfIncome)}%; background:${item.color}; --bar-color:${item.color}"></div></div>
      `;
      wrap.appendChild(row);
    }
  }

  // Helpers
  function totalExpenses() { return round2(currentBudget().categories.reduce((s, c) => s + toNumber(c.amount), 0)); }
  function id() { return Math.random().toString(36).slice(2, 10); }
  function toNumber(v) { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; }
  function toInput(v) { return Number.isFinite(v) ? String(v) : '0'; }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]?/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c)); }
  function formatCurrency(v, code = 'USD', locale) {
    try { return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: code }).format(toNumber(v)); }
    catch { const map = currencyMap[code] || currencyMap.USD; return `${map.symbol}${toNumber(v).toFixed(2)}`; }
  }
  function formatMonthInputValue(d) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); return `${y}-${m}`; }
  function formatMonthLabel(value) {
    try {
      const [y, m] = value.split('-').map(Number);
      const date = new Date(y, (m || 1) - 1, 1);
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch { return value; }
  }

  function currentBudget() {
    return getOrCreateBudget(state.month);
  }

  function getOrCreateBudget(month) {
    if (!state.budgets) state.budgets = {};
    if (!state.budgets[month]) {
      state.budgets[month] = {
        income: 0,
        goal: 0,
        categories: structuredClone(DEFAULT_CATEGORIES),
      };
    }
    return state.budgets[month];
  }

  function switchToMonth(newMonth) {
    if (!newMonth) return;
    state.month = newMonth;
    updateMonthBadge();
    // Ensure budget exists
    const b = currentBudget();
    // Reflect inputs
    els.incomeInput.value = toInput(b.income);
    els.goalInput.value = toInput(b.goal);
    renderCategories();
    render();
    persist();
  }

  function shiftMonth(offset) {
    const [yStr, mStr] = (state.month || formatMonthInputValue(new Date())).split('-');
    let year = Number(yStr);
    let month = Number(mStr);
    month += offset;
    while (month <= 0) { month += 12; year -= 1; }
    while (month > 12) { month -= 12; year += 1; }
    const newMonth = `${year}-${String(month).padStart(2, '0')}`;
    els.monthInput.value = newMonth;
    switchToMonth(newMonth);
  }
  function flash(el) { if (!el) return; el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 240 }); }

  function resetAll() {
    state = createDefaultState();
    els.monthInput.value = state.month;
    els.currencySelect.value = state.currency;
    els.incomeInput.value = '';
    els.goalInput.value = '';
    renderCategories();
    render();
    localStorage.removeItem(STORAGE_KEY);
    flash(els.resetBtn);
  }
})();


