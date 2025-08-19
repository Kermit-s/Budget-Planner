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
    AED: { symbol: 'د.إ', locale: 'ar-AE' },
    ARS: { symbol: '$', locale: 'es-AR' },
    BGN: { symbol: 'лв', locale: 'bg-BG' },
    IDR: { symbol: 'Rp', locale: 'id-ID' },
    ILS: { symbol: '₪', locale: 'he-IL' },
    KRW: { symbol: '₩', locale: 'ko-KR' },
    MYR: { symbol: 'RM', locale: 'ms-MY' },
    THB: { symbol: '฿', locale: 'th-TH' },
    TWD: { symbol: 'NT$', locale: 'zh-TW' },
    UAH: { symbol: '₴', locale: 'uk-UA' },
    VND: { symbol: '₫', locale: 'vi-VN' },
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
    txDateInput: document.getElementById('txDateInput'),
    txDescInput: document.getElementById('txDescInput'),
    txCategorySelect: document.getElementById('txCategorySelect'),
    txTypeSelect: document.getElementById('txTypeSelect'),
    txAmountInput: document.getElementById('txAmountInput'),
    addTxBtn: document.getElementById('addTxBtn'),
    txList: document.getElementById('txList'),
    dayGrid: document.getElementById('dayGrid'),
    dayTxList: document.getElementById('dayTxList'),
    dayPanelLabel: document.getElementById('dayPanelLabel'),
    accountSelect: document.getElementById('accountSelect'),
    renameAccountBtn: document.getElementById('renameAccountBtn'),
    addAccountBtn: document.getElementById('addAccountBtn'),
  };

  const STORAGE_KEY = 'budget_planner_state_v5';
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

  function onDomReady(cb){ if(document.readyState!=='loading') cb(); else document.addEventListener('DOMContentLoaded', cb); }

  function init() {
    onDomReady(() => {
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
      if (els.txDateInput) els.txDateInput.value = `${state.month}-01`;

      // Accounts
      wireAccountsUI();

      els.currencySelect.addEventListener('change', async () => { state.currency = els.currencySelect.value; await refreshFxRate(); render(); persist(); });
      if (document.getElementById('secondaryCurrencySelect')) document.getElementById('secondaryCurrencySelect').addEventListener('change', async () => { state.secondaryCurrency.enabled = true; state.secondaryCurrency.code = document.getElementById('secondaryCurrencySelect').value; await refreshFxRate(); persist(); render(); });
      if (document.getElementById('removeCurrencyBtn')) document.getElementById('removeCurrencyBtn').addEventListener('click', removeSecondaryCurrency);

      els.incomeInput.addEventListener('input', () => { currentBudget().income = toNumber(els.incomeInput.value); render(); setDirty(); });
      els.goalInput.addEventListener('input', () => { currentBudget().goal = toNumber(els.goalInput.value); render(); setDirty(); });
      els.monthInput.addEventListener('change', () => { switchToMonth(els.monthInput.value); setDirty(false, true); });

      els.addCategoryBtn.addEventListener('click', addCustomCategory);
      els.saveBtn.addEventListener('click', () => { persist(true); setDirty(false, true); flash(els.saveBtn); showSavedToast(); });
      els.resetBtn.addEventListener('click', resetAll);
      els.exportCsvBtn.addEventListener('click', exportCsv);
      els.printBtn.addEventListener('click', () => window.print());
      if (els.prevMonthBtn) els.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
      if (els.nextMonthBtn) els.nextMonthBtn.addEventListener('click', () => shiftMonth(1));
      if (els.addTxBtn) els.addTxBtn.addEventListener('click', addTransaction);

      const importBtn = document.getElementById('importCsvBtn');
      const importFile = document.getElementById('importCsvFile');
      if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleImportCsv);
      }

      // Mobile sticky actions
      const mobileAdd = document.getElementById('mobileAddTxBtn');
      const mobileSave = document.getElementById('mobileSaveBtn');
      if (mobileAdd) mobileAdd.onclick = () => {
        try {
          const today = new Date();
          const targetMonth = formatMonthInputValue(today);
          if (state.month !== targetMonth) { els.monthInput.value = targetMonth; switchToMonth(targetMonth); }
          const day = today.getDate();
          selectDay(day);
          if (els.txDescInput) els.txDescInput.focus();
          if (els.txDateInput) els.txDateInput.value = `${targetMonth}-${String(day).padStart(2,'0')}`;
        } catch {}
      };
      if (mobileSave) mobileSave.onclick = () => { persist(true); showSavedToast(); };

      // Initial FX fetch if secondary enabled
      if (state.secondaryCurrency && state.secondaryCurrency.enabled) { refreshFxRate().then(() => render()); }

      window.addEventListener('beforeunload', () => { try { persist(true); } catch {} });

      renderCategories();
      populateTxCategoryOptions();
      renderDayGrid();
      render();
    });
  }

  function wireAccountsUI() {
    if (!els.accountSelect) return;
    // Ensure initial accounts exist
    if (!state.accounts) state.accounts = { 'Default': { budgets: {}, monthlyHistory: [], transactions: {} } };
    if (!state.activeAccount) state.activeAccount = Object.keys(state.accounts)[0] || 'Default';

    const names = Object.keys(state.accounts);
    els.accountSelect.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    els.accountSelect.value = state.activeAccount;

    els.accountSelect.onchange = () => {
      state.activeAccount = els.accountSelect.value;
      // Reflect inputs for this account/month
      els.incomeInput.value = toInput(currentBudget().income);
      els.goalInput.value = toInput(currentBudget().goal);
      renderCategories();
      populateTxCategoryOptions();
      renderDayGrid();
      render();
      persist();
    };

    if (els.addAccountBtn) els.addAccountBtn.onclick = () => {
      const name = prompt('New account name');
      if (!name) return;
      if (!state.accounts[name]) state.accounts[name] = { budgets: {}, monthlyHistory: [], transactions: {} };
      state.activeAccount = name;
      wireAccountsUI();
      render();
      persist();
    };

    if (els.renameAccountBtn) els.renameAccountBtn.onclick = () => {
      const current = state.activeAccount;
      const next = prompt('Rename account', current);
      if (!next || next === current) return;
      if (state.accounts[next]) { alert('An account with this name already exists.'); return; }
      state.accounts[next] = state.accounts[current];
      delete state.accounts[current];
      state.activeAccount = next;
      wireAccountsUI();
      render();
      persist();
    };
  }

  function createDefaultState() {
    return {
      month: formatMonthInputValue(new Date()),
      currency: 'USD',
      accounts: { 'Default': { budgets: {}, monthlyHistory: [], transactions: {} } },
      activeAccount: 'Default',
      budgets: {}, // deprecated, kept for migration safety
      monthlyHistory: [], // deprecated
      secondaryCurrency: { enabled: false, code: 'EUR', rate: 0.92, lastUpdated: null }, // rate auto-fetched
      transactions: {}, // deprecated
    };
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || ''); } catch { return null; }
  }

  function migrateStateIfNeeded(loaded) {
    if (!loaded) return null;
    // If already v2+ format with accounts
    if (loaded && typeof loaded === 'object' && loaded.accounts) return loaded;
    // v1 -> v2 migration
    const month = loaded.month || formatMonthInputValue(new Date());
    const migrated = {
      month,
      currency: loaded.currency || 'USD',
      accounts: { 'Default': { budgets: {}, monthlyHistory: Array.isArray(loaded.monthlyHistory) ? loaded.monthlyHistory : [], transactions: loaded.transactions || {} } },
      activeAccount: 'Default',
      monthlyHistory: Array.isArray(loaded.monthlyHistory) ? loaded.monthlyHistory : [],
    };
    migrated.accounts['Default'].budgets[month] = {
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
    const total = effectiveExpensesTotal();
    const acct = getActiveAccount();
    if (!acct.monthlyHistory) acct.monthlyHistory = [];
    const idx = acct.monthlyHistory.findIndex((m) => m.month === month);
    if (idx >= 0) acct.monthlyHistory[idx].total = total;
    else acct.monthlyHistory.push({ month, total });
  }

  function setTheme(mode) {
    document.documentElement.classList.toggle('light', mode === 'light');
    localStorage.setItem(THEME_KEY, mode);
  }

  function render() {
    const { symbol, locale } = currencyMap[state.currency] || currencyMap.USD;
    const income = currentBudget().income;
    const expenses = effectiveExpensesTotal();
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
    // Clicking the badge opens a month/year picker
    els.monthBadge.style.cursor = 'pointer';
    els.monthBadge.onclick = () => {
      try {
        const next = prompt('Jump to month (YYYY-MM):', state.month || formatMonthInputValue(new Date()));
        if (!next) return;
        if (!/^\d{4}-\d{2}$/.test(next)) { alert('Format: YYYY-MM'); return; }
        els.monthInput.value = next;
        switchToMonth(next);
      } catch {}
    };
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
      nameEl.addEventListener('input', () => { category.name = nameEl.value; persist(); setDirty(); renderCharts(); renderIncomeBreakdown(); });
      amountEl.addEventListener('input', () => { category.amount = toNumber(amountEl.value); render(); });
      const colorEl = colorWrap.querySelector('input');
      colorEl.addEventListener('input', () => {
        category.color = colorEl.value;
        persist();
        renderCharts();
        renderIncomeBreakdown();
        try {
          const selectedButton = els.dayGrid && Array.from(els.dayGrid.children).find((c) => c.classList.contains('selected'));
          if (selectedButton) selectDay(Number(selectedButton.textContent || '0'));
        } catch {}
      });
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
    populateTxCategoryOptions();
    renderDayGrid();
    render();
  }

  function removeCategory(categoryId) {
    const b = currentBudget();
    b.categories = b.categories.filter((c) => c.id !== categoryId);
    renderCategories();
    renderDayGrid();
    render();
  }

  // 50/30/20 template removed by user request

  function renderCharts() {
    const income = currentBudget().income;
    const expenses = effectiveExpensesTotal();
    const remaining = Math.max(0, income - expenses);

    // Donut chart: Expenses vs Remaining income
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(els.donutCanvas, {
      type: 'doughnut',
      data: buildDonutDataset(expenses, remaining),
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed, state.currency)}` } }
        },
        cutout: '65%',
      }
    });

    // Bar chart – show only the currently selected month
    const months = [state.month];
    const totals = [effectiveExpensesTotal()];
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
    // Robust export format (v2): plain two-line header + base64-encoded JSON payload.
    // Kept as .csv for familiarity, but content is universal and resilient to editors.
    const json = JSON.stringify(state);
    const b64 = base64EncodeUtf8(json);
    const content = [
      '#BUDGET_PLANNER_EXPORT_V2',
      `#BASE64:${b64}`
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(evt) {
    const file = evt.target && evt.target.files && evt.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseExportedStateFromCsv(text);

      // Basic validation
      if (!imported || typeof imported !== 'object' || !imported.accounts) { alert('Import fehlgeschlagen: Ungültige Datenstruktur.'); return; }

      state = imported;
      if (els.monthInput) els.monthInput.value = state.month || formatMonthInputValue(new Date());
      updateMonthBadge();
      wireAccountsUI();
      els.currencySelect.value = state.currency;
      els.incomeInput.value = toInput(currentBudget().income);
      els.goalInput.value = toInput(currentBudget().goal);
      renderCategories();
      populateTxCategoryOptions();
      renderDayGrid();
      render();
      persist(true);
      showSavedToast();
    } catch (e) {
      console.error(e);
      const msg = e && e.message === 'NO_JSON'
        ? 'Import fehlgeschlagen: Export-Datei enthält keinen Payload. Bitte eine mit „Export CSV“ erzeugte Datei verwenden.'
        : 'Import fehlgeschlagen: Datei konnte nicht gelesen oder geparst werden.';
      alert(msg);
    } finally {
      evt.target.value = '';
    }
  }

  function parseExportedStateFromCsv(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    // Prefer base64 payload
    const b64Line = lines.find(l => l.startsWith('#BASE64:')) || lines.find(l => l.startsWith('"#BASE64:'));
    if (b64Line) {
      let b64 = b64Line.replace(/^"?#BASE64:/,'').replace(/"$/,'');
      b64 = b64.replace(/\s+/g,'');
      const json = base64DecodeUtf8(b64);
      return JSON.parse(json);
    }
    // Fallback: JSON chunk format (#JSON: ...)
    const chunks = [];
    for (let raw of lines) {
      if (raw == null) continue;
      const idx = raw.indexOf('#JSON:');
      if (idx >= 0) {
        let chunk = raw.slice(idx + 6);
        chunk = chunk.trim();
        if ((chunk.startsWith('"') && chunk.endsWith('"')) || (chunk.startsWith("'") && chunk.endsWith("'"))) {
          chunk = chunk.slice(1, -1);
        }
        chunk = chunk.replace(/""/g, '"');
        chunks.push(chunk);
      }
    }
    if (!chunks.length) throw new Error('NO_JSON');
    const payload = chunks.join('');
    return JSON.parse(payload);
  }

  function base64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function base64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  function renderIncomeBreakdown() {
    const wrap = document.getElementById('incomeBreakdownList');
    if (!wrap) return;
    const income = toNumber(currentBudget().income);
    const total = effectiveExpensesTotal();
    const list = getEffectiveCategoryBreakdown().map(c => ({ name: c.name, amount: toNumber(c.amount), color: c.color || '#34d399' }))
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

  // Day grid rendering and filtering
  function renderDayGrid() {
    if (!els.dayGrid) return;
    els.dayGrid.innerHTML = '';
    const [y, m] = (state.month || formatMonthInputValue(new Date())).split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const list = getTxListForMonth();
    const txByDay = new Map();
    for (const t of list) {
      const d = String(t.date || '').slice(8, 10);
      if (!d) continue;
      const key = Number(d);
      txByDay.set(key, (txByDay.get(key) || 0) + 1);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day' + (txByDay.has(d) ? ' has-tx' : '');
      btn.textContent = String(d);
      btn.addEventListener('click', () => selectDay(d));
      els.dayGrid.appendChild(btn);
    }
    if (els.dayPanelLabel) els.dayPanelLabel.textContent = 'Select a day';
    if (els.dayTxList) els.dayTxList.innerHTML = '';
  }

  function selectDay(dayNum) {
    if (!els.dayGrid) return;
    for (const child of els.dayGrid.children) child.classList.remove('selected');
    const idx = dayNum - 1;
    if (els.dayGrid.children[idx]) els.dayGrid.children[idx].classList.add('selected');
    const [y, m] = (state.month || formatMonthInputValue(new Date())).split('-').map(Number);
    const dayStr = String(dayNum).padStart(2, '0');
    const label = new Date(y, m - 1, dayNum).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
    if (els.dayPanelLabel) els.dayPanelLabel.textContent = label;
    const list = getTxListForMonth().filter(t => String(t.date || '').slice(0, 10) === `${y}-${String(m).padStart(2, '0')}-${dayStr}`);
    if (!els.dayTxList) return;
    els.dayTxList.innerHTML = '';
    for (const tx of list) {
      const row = document.createElement('div');
      row.className = 'table-row';
      const catColor = getCategoryColorByName(tx.category);
      row.style.background = hexToRgba(catColor, 0.12);
      row.style.borderLeft = `4px solid ${catColor}`;
      row.innerHTML = `
        <div>${escapeHtml(tx.desc || '')}</div>
        <div>${escapeHtml(tx.category || '-')}</div>
        <div>${escapeHtml(tx.type)}</div>
        <div class="right">${formatCurrency(tx.type === 'expense' ? -Math.abs(tx.amount) : tx.amount, state.currency)}</div>
        <div class="center"><button class="danger" type="button">Remove</button></div>
      `;
      row.querySelector('button').addEventListener('click', () => { removeTransaction(tx.id); selectDay(dayNum); });
      els.dayTxList.appendChild(row);
    }
  }

  // Transactions
  function getTxListForMonth(month = state.month) {
    const acct = getActiveAccount();
    if (!acct.transactions) acct.transactions = {};
    if (!acct.transactions[month]) acct.transactions[month] = [];
    return acct.transactions[month];
  }

  function addTransaction() {
    const date = (els.txDateInput && els.txDateInput.value) || '';
    const desc = (els.txDescInput && els.txDescInput.value || '').trim();
    const category = (els.txCategorySelect && els.txCategorySelect.value) || '';
    const type = (els.txTypeSelect && els.txTypeSelect.value) || 'expense';
    const amount = toNumber(els.txAmountInput && els.txAmountInput.value);
    if (!date || !amount) { flash(els.addTxBtn); return; }
    const targetMonth = String(date).slice(0,7);
    const list = getTxListForMonth(targetMonth);
    list.push({ id: id(), date, desc, category, type, amount });
    if (els.txDescInput) els.txDescInput.value = '';
    if (els.txAmountInput) els.txAmountInput.value = '';
    // Switch view to the month of the transaction
    if (targetMonth !== state.month) {
      els.monthInput.value = targetMonth;
      switchToMonth(targetMonth);
    } else {
      renderDayGrid();
      render();
    }
  }

  function renderTxList() {
    if (!els.txList) return;
    const list = getTxListForMonth();
    els.txList.innerHTML = '';
    for (const tx of list) {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.dataset.id = tx.id;
      row.innerHTML = `
        <div>${escapeHtml(tx.date)}</div>
        <div>${escapeHtml(tx.desc || '')}</div>
        <div>${escapeHtml(tx.category || '-')}</div>
        <div>${escapeHtml(tx.type)}</div>
        <div class="right">${formatCurrency(tx.type === 'expense' ? -Math.abs(tx.amount) : tx.amount, state.currency)}</div>
        <div class="center"><button class="danger" type="button">Remove</button></div>
      `;
      row.querySelector('button').addEventListener('click', () => removeTransaction(tx.id));
      els.txList.appendChild(row);
    }
  }

  function removeTransaction(idToRemove) {
    const list = getTxListForMonth();
    const idx = list.findIndex(t => t.id === idToRemove);
    if (idx >= 0) list.splice(idx, 1);
    renderTxList();
    renderDayGrid();
    render();
  }

  function populateTxCategoryOptions() {
    if (!els.txCategorySelect) return;
    const names = Array.from(new Set(currentBudget().categories.map(c => c.name)));
    els.txCategorySelect.innerHTML = ['<option value="">— None —</option>'].concat(names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)).join('');
  }

  function effectiveExpensesTotal() {
    const tx = getTxListForMonth();
    const planned = totalExpenses();
    const txExpense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(toNumber(t.amount)), 0);
    // Income transactions are not added here; income is tracked separately in the budget
    return round2(planned + txExpense);
  }

  function getEffectiveCategoryBreakdown() {
    const base = currentBudget().categories.map(c => ({ name: c.name, amount: toNumber(c.amount), color: c.color || '#34d399' }));
    const map = new Map(base.map(c => [c.name.toLowerCase(), { ...c }]));
    const tx = getTxListForMonth();
    for (const t of tx) {
      if (t.type !== 'expense') continue;
      const key = (t.category || 'Uncategorized').toLowerCase();
      if (!map.has(key)) map.set(key, { name: t.category || 'Uncategorized', amount: 0, color: getCategoryColorByName(t.category) });
      const current = map.get(key);
      current.amount = round2(current.amount + Math.abs(toNumber(t.amount)));
    }
    return Array.from(map.values());
  }

  function buildDonutDataset(expenses, remaining) {
    const labels = [];
    const data = [];
    const colors = [];
    const source = getEffectiveCategoryBreakdown();
    for (const c of source) {
      const amt = toNumber(c.amount);
      if (amt > 0) {
        labels.push(c.name);
        data.push(amt);
        colors.push(c.color || getCategoryColorByName(c.name) || '#34d399');
      }
    }
    labels.push('Remaining');
    data.push(remaining);
    colors.push('#0ea5e9');
    return { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] };
  }

  function getCategoryColorByName(name) {
    if (!name) return '#34d399';
    const found = currentBudget().categories.find(c => (c.name || '').toLowerCase() === String(name).toLowerCase());
    return (found && found.color) || '#34d399';
  }

  function hexToRgba(hex, alpha) {
    try {
      let h = String(hex).replace('#','');
      if (h.length === 3) h = h.split('').map(ch => ch+ch).join('');
      const num = parseInt(h, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch { return `rgba(52, 211, 153, ${alpha})`; }
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
    if (!state.accounts) state.accounts = { 'Default': { budgets: {}, monthlyHistory: [], transactions: {} } };
    if (!state.activeAccount) state.activeAccount = Object.keys(state.accounts)[0] || 'Default';
    const acct = state.accounts[state.activeAccount] || (state.accounts[state.activeAccount] = { budgets: {}, monthlyHistory: [], transactions: {} });
    if (!acct.budgets[month]) {
      acct.budgets[month] = {
        income: 0,
        goal: 0,
        categories: structuredClone(DEFAULT_CATEGORIES),
      };
    }
    return acct.budgets[month];
  }

  function getActiveAccount() {
    if (!state.accounts) state.accounts = { 'Default': { budgets: {}, monthlyHistory: [], transactions: {} } };
    const name = state.activeAccount || Object.keys(state.accounts)[0] || 'Default';
    state.activeAccount = name;
    if (!state.accounts[name]) state.accounts[name] = { budgets: {}, monthlyHistory: [], transactions: {} };
    return state.accounts[name];
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
    if (els.txDateInput) {
      const d = els.txDateInput.value || `${newMonth}-01`;
      const currentPrefix = String(d).slice(0,7);
      els.txDateInput.value = currentPrefix === newMonth ? d : `${newMonth}-01`;
    }
    renderCategories();
    renderDayGrid();
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
    // Reset only the current account
    const acct = getActiveAccount();
    acct.budgets = {};
    acct.transactions = {};
    acct.monthlyHistory = [];
    // Keep global currency, theme, other accounts
    els.monthInput.value = state.month;
    els.currencySelect.value = state.currency;
    els.incomeInput.value = '';
    els.goalInput.value = '';
    renderCategories();
    renderDayGrid();
    render();
    persist(true);
    flash(els.resetBtn);
  }
})();


