// [Codex] 로컬 저장소 기반 개인용 가계부 상태 정의입니다. 서버 없이도 iPhone Safari에서 바로 사용할 수 있습니다.
const STORAGE_KEY = "money-pocket-v1";
const APP_STATE_VERSION = 1;
const CATEGORY_MAP = {
  expense: [
    "식비",
    "교통",
    "장보기",
    "카페",
    "구독",
    "생활",
    "주거",
    "건강",
    "여가",
    "기타 지출",
  ],
  income: ["급여", "보너스", "부수입", "환급", "이자", "기타 수입"],
};
const PAYMENT_METHOD_MAP = {
  cash: "현금",
  credit: "신용카드",
  debit: "체크카드",
};

let appState = loadState();
let editingTransactionId = null;
let installPromptEvent = null;
let toastTimer = null;
let activeMobileView = "summary";
let activeCalendarDate = "";
let calendarClickTimer = null;
let lastCalendarTapDate = "";
let lastCalendarTapAt = 0;
let isLedgerSearchOpen = false;
let monthSheetTarget = "summary";
let pendingMonthSheetScope = "month";
let pendingMonthSheetYear = "";
let pendingMonthSheetMonth = "";

const elements = {
  mobileViewerNav: document.querySelector("#mobile-viewer-nav"),
  sectionTrack: document.querySelector("#section-track"),
  monthPickerButton: document.querySelector("#month-picker-button"),
  ledgerMonthButton: document.querySelector("#ledger-month-button"),
  ledgerMonthLabel: document.querySelector("#ledger-month-label"),
  ledgerSearchButton: document.querySelector("#ledger-search-button"),
  ledgerSearchField: document.querySelector("#ledger-search-field"),
  summaryQuickEntryButton: document.querySelector("#summary-quick-entry"),
  monthSheet: document.querySelector("#month-sheet"),
  monthSheetBackdrop: document.querySelector("#month-sheet-backdrop"),
  monthScopeSwitch: document.querySelector("#month-scope-switch"),
  monthScopeMonth: document.querySelector("#month-scope-month"),
  monthScopeAll: document.querySelector("#month-scope-all"),
  monthPickerFields: document.querySelector("#month-picker-fields"),
  monthYearPrev: document.querySelector("#month-year-prev"),
  monthYearNext: document.querySelector("#month-year-next"),
  monthPickerYearLabel: document.querySelector("#month-picker-year-label"),
  monthPickerGrid: document.querySelector("#month-picker-grid"),
  monthPickerYear: document.querySelector("#month-picker-year"),
  monthPickerMonth: document.querySelector("#month-picker-month"),
  monthSheetCancel: document.querySelector("#month-sheet-cancel"),
  monthSheetApply: document.querySelector("#month-sheet-apply"),
  summaryMonth: document.querySelector("#summary-month"),
  headerMonthLabel: document.querySelector("#header-month-label"),
  filterMonth: document.querySelector("#filter-month"),
  filterScope: document.querySelector("#filter-scope"),
  filterType: document.querySelector("#filter-type"),
  filterCategory: document.querySelector("#filter-category"),
  filterPaymentMethod: document.querySelector("#filter-payment-method"),
  searchInput: document.querySelector("#search-input"),
  statBalance: document.querySelector("#stat-balance"),
  statIncome: document.querySelector("#stat-income"),
  statExpense: document.querySelector("#stat-expense"),
  headlineCard: document.querySelector(".headline-card"),
  calendarMonthCaption: document.querySelector("#calendar-month-caption"),
  calendarGrid: document.querySelector("#calendar-grid"),
  calendarDetailSheet: document.querySelector("#calendar-detail-sheet"),
  calendarDetailBackdrop: document.querySelector("#calendar-detail-backdrop"),
  calendarDetailClose: document.querySelector("#calendar-detail-close"),
  calendarDetailDate: document.querySelector("#calendar-detail-date"),
  calendarDetailMetrics: document.querySelector("#calendar-detail-metrics"),
  calendarDetailNote: document.querySelector("#calendar-detail-note"),
  calendarDetailList: document.querySelector("#calendar-detail-list"),
  entryForm: document.querySelector("#entry-form"),
  categoryInput: document.querySelector("#category-input"),
  paymentMethodInput: document.querySelector("#payment-method-input"),
  dateInput: document.querySelector("#date-input"),
  amountInput: document.querySelector("#amount-input"),
  memoInput: document.querySelector("#memo-input"),
  submitButton: document.querySelector("#submit-button"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  formModeLabel: document.querySelector("#form-mode-label"),
  analysisMonthLabel: document.querySelector("#analysis-month-label"),
  flowChart: document.querySelector("#flow-chart"),
  flowChartCaption: document.querySelector("#flow-chart-caption"),
  categoryBreakdown: document.querySelector("#category-breakdown"),
  transactionList: document.querySelector("#transaction-list"),
  filterCount: document.querySelector("#filter-count"),
  exportButton: document.querySelector("#export-button"),
  importButton: document.querySelector("#import-button"),
  importFileInput: document.querySelector("#import-file-input"),
  resetButton: document.querySelector("#reset-button"),
  installButton: document.querySelector("#install-button"),
  installHint: document.querySelector("#install-hint"),
  toast: document.querySelector("#toast"),
  transactionItemTemplate: document.querySelector("#transaction-item-template"),
  categoryItemTemplate: document.querySelector("#category-item-template"),
  mobileViewButtons: [...document.querySelectorAll(".tab-button")],
  mobileViewPanels: [...document.querySelectorAll("[data-view-panel]")],
};

initializeApp();

function initializeApp() {
  const today = getLocalDateString(new Date());
  const initialMonth = getLatestDataMonth() || getCurrentMonthKey();

  elements.dateInput.value = today;
  elements.searchInput.placeholder = "예: 점심, 송금";
  // [Codex] 거래나 예산이 있는 가장 최근 월을 기본으로 열어 월이 바뀐 날에도 기록이 사라진 것처럼 보이지 않게 합니다.
  setActiveMonth(initialMonth);

  bindEvents();
  syncCompactHeadline();
  initializeMobileViewer();
  syncEntryCategoryOptions();
  syncFilterCategoryOptions();
  renderAll();
  updateInstallHint();
  registerServiceWorker();
}

function bindEvents() {
  document.addEventListener("click", handleViewTargetClick);
  elements.entryForm.addEventListener("submit", handleEntrySubmit);
  elements.cancelEditButton.addEventListener("click", resetEntryForm);
  elements.monthPickerButton.addEventListener("click", () => openMonthSheet("summary"));
  elements.ledgerMonthButton.addEventListener("click", () => openMonthSheet("ledger"));
  elements.ledgerSearchButton.addEventListener("click", toggleLedgerSearch);
  elements.summaryQuickEntryButton.addEventListener("click", handleSummaryQuickEntry);
  elements.monthSheetBackdrop.addEventListener("click", closeMonthSheet);
  elements.monthSheetCancel.addEventListener("click", closeMonthSheet);
  elements.monthSheetApply.addEventListener("click", applySelectedMonthFromSheet);
  elements.monthScopeMonth.addEventListener("click", () => setMonthSheetScope("month"));
  elements.monthScopeAll.addEventListener("click", () => setMonthSheetScope("all"));
  elements.monthYearPrev.addEventListener("click", () => shiftMonthPickerYear(-1));
  elements.monthYearNext.addEventListener("click", () => shiftMonthPickerYear(1));
  elements.monthPickerGrid.addEventListener("click", handleMonthGridClick);
  elements.calendarGrid.addEventListener("click", handleCalendarDayClick);
  elements.calendarDetailBackdrop.addEventListener("click", () => closeCalendarDetailSheet());
  elements.calendarDetailClose.addEventListener("click", () => closeCalendarDetailSheet());
  elements.summaryMonth.addEventListener("change", handleSummaryMonthChange);
  elements.filterMonth.addEventListener("change", renderTransactions);
  elements.filterScope.addEventListener("change", renderTransactions);
  elements.filterType.addEventListener("change", handleFilterTypeChange);
  elements.filterCategory.addEventListener("change", renderTransactions);
  elements.filterPaymentMethod.addEventListener("change", renderTransactions);
  elements.searchInput.addEventListener("input", renderTransactions);
  elements.exportButton.addEventListener("click", exportData);
  elements.importButton.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", importData);
  elements.resetButton.addEventListener("click", resetAllData);
  elements.installButton.addEventListener("click", handleInstallClick);
  elements.transactionList.addEventListener("click", handleTransactionAction);
  elements.calendarDetailList.addEventListener("click", handleTransactionAction);

  document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener("change", syncEntryCategoryOptions);
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    updateInstallHint();
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    showToast("홈 화면 앱으로 설치되었습니다.");
    updateInstallHint();
  });

  window.addEventListener("resize", syncCompactHeadline);
}

// [Codex] Monthly Balance는 모바일 폭에서 한 줄 compact 상태로 전환해 달력 영역을 더 넓게 확보합니다.
function syncCompactHeadline() {
  elements.headlineCard.classList.toggle("is-compact", window.innerWidth <= 480);
}

function handleEntrySubmit(event) {
  event.preventDefault();

  const payload = getEntryPayload();
  if (!payload) {
    return;
  }

  if (editingTransactionId) {
    appState.transactions = appState.transactions.map((transaction) =>
      transaction.id === editingTransactionId ? { ...transaction, ...payload } : transaction
    );
    showToast("거래를 수정했습니다.");
  } else {
    appState.transactions.unshift({
      id: createId(),
      createdAt: new Date().toISOString(),
      ...payload,
    });
    showToast("거래를 저장했습니다.");
  }

  persistState();
  resetEntryForm();
  closeCalendarDetailSheet({ rerender: false });
  renderAll();
  setActiveMobileView("summary");
}

function handleSummaryMonthChange() {
  // [Codex] 상단 월을 바꾸면 홈 요약과 내역 월 필터를 함께 맞춰 앱형 흐름이 끊기지 않게 유지합니다.
  elements.filterMonth.value = getSummaryMonth();
  renderSummary();
  renderTransactions();
}

function handleFilterTypeChange() {
  syncFilterCategoryOptions();
  renderTransactions();
}

// [Codex] 달력 날짜 칸은 한 번 탭하면 바로 기록으로 가고, 두 번 탭할 때만 상세를 열도록 제스처를 단순화했습니다.
function handleCalendarDayClick(event) {
  const dayButton = event.target.closest(".calendar-day[data-date]");
  if (!dayButton) {
    return;
  }

  const dateKey = dayButton.dataset.date;
  if (!dateKey) {
    return;
  }

  const now = Date.now();
  const isDoubleTap = lastCalendarTapDate === dateKey && now - lastCalendarTapAt < 260;
  lastCalendarTapDate = dateKey;
  lastCalendarTapAt = now;

  if (calendarClickTimer) {
    window.clearTimeout(calendarClickTimer);
    calendarClickTimer = null;
  }

  if (isDoubleTap) {
    toggleCalendarDetailSheet(dateKey);
    return;
  }

  calendarClickTimer = window.setTimeout(() => {
    openEntryForDate(dateKey);
    calendarClickTimer = null;
  }, 180);
}

// [Codex] 홈 달력의 + 버튼은 선택된 날짜가 있으면 그 날짜로, 없으면 현재 월 기준 가장 자연스러운 날짜로 바로 기록 화면을 엽니다.
function handleSummaryQuickEntry() {
  openEntryForDate(getQuickEntryDateForSummaryMonth());
}

function getQuickEntryDateForSummaryMonth() {
  const summaryMonth = getSummaryMonth();
  const today = getLocalDateString(new Date());

  if (activeCalendarDate && activeCalendarDate.startsWith(summaryMonth)) {
    return activeCalendarDate;
  }

  if (today.startsWith(summaryMonth)) {
    return today;
  }

  return `${summaryMonth}-01`;
}

function handleTransactionAction(event) {
  const actionButton = event.target.closest("button");
  if (!actionButton) {
    return;
  }

  const item = actionButton.closest(".transaction-item");
  if (!item) {
    return;
  }

  const transactionId = item.dataset.transactionId;
  const transaction = appState.transactions.find((entry) => entry.id === transactionId);
  if (!transaction) {
    return;
  }

  if (actionButton.classList.contains("edit-button")) {
    if (elements.calendarDetailList.contains(actionButton)) {
      closeCalendarDetailSheet({ rerender: false });
    }
    startEditingTransaction(transaction);
    return;
  }

  if (actionButton.classList.contains("delete-button")) {
    const confirmed = window.confirm("이 거래를 삭제할까요?");
    if (!confirmed) {
      return;
    }

    appState.transactions = appState.transactions.filter((entry) => entry.id !== transactionId);
    persistState();

    if (editingTransactionId === transactionId) {
      resetEntryForm();
    }

    renderAll();
    showToast("거래를 삭제했습니다.");
  }
}

function getEntryPayload() {
  const type = getSelectedType();
  const amount = normalizeAmount(elements.amountInput.value);
  const category = elements.categoryInput.value;
  const paymentMethod = elements.paymentMethodInput.value;
  const date = elements.dateInput.value;
  const memo = elements.memoInput.value.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("금액을 0보다 크게 입력하세요.");
    return null;
  }

  if (!date) {
    showToast("날짜를 선택하세요.");
    return null;
  }

  if (!category) {
    showToast("카테고리를 선택하세요.");
    return null;
  }

  if (!PAYMENT_METHOD_MAP[paymentMethod]) {
    showToast("사용 수단을 선택하세요.");
    return null;
  }

  return {
    type,
    amount,
    category,
    paymentMethod,
    date,
    memo,
    updatedAt: new Date().toISOString(),
  };
}

function startEditingTransaction(transaction) {
  editingTransactionId = transaction.id;
  setSelectedType(transaction.type);
  syncEntryCategoryOptions(transaction.category);

  elements.amountInput.value = transaction.amount;
  elements.paymentMethodInput.value = transaction.paymentMethod || "cash";
  elements.dateInput.value = transaction.date;
  elements.memoInput.value = transaction.memo;
  elements.formModeLabel.textContent = "거래 수정 중";
  elements.submitButton.textContent = "수정 저장";
  elements.cancelEditButton.hidden = false;
  closeCalendarDetailSheet({ rerender: false });
  // [Codex] 수정 진입 시 기록 화면으로 바로 이동해 탭 기반 구조에서도 편집 흐름이 자연스럽게 이어지게 합니다.
  setActiveMobileView("entry");
  getMobileViewPanel("entry")?.scrollTo({ top: 0, behavior: "smooth" });
}

function resetEntryForm() {
  editingTransactionId = null;
  elements.entryForm.reset();
  setSelectedType("expense");
  elements.dateInput.value = getLocalDateString(new Date());
  elements.paymentMethodInput.value = "cash";
  elements.formModeLabel.textContent = "새 거래 추가";
  elements.submitButton.textContent = "저장";
  elements.cancelEditButton.hidden = true;
  syncEntryCategoryOptions();
}

function renderAll() {
  renderSummary();
  renderTransactions();
}

function initializeMobileViewer() {
  // [Codex] 하단 탭바와 본문 패널을 직접 토글하는 방식으로 화면 전환 구조를 단순화했습니다.
  isLedgerSearchOpen = Boolean(elements.searchInput.value.trim());
  setActiveMobileView(activeMobileView);
  syncMonthPickerSelection(getSummaryMonth());
  updateLedgerFilterUi();
}

function handleViewTargetClick(event) {
  const targetButton = event.target.closest("[data-view-target]");
  if (!targetButton) {
    return;
  }

  setActiveMobileView(targetButton.dataset.viewTarget);
}

function getMobileViewPanel(viewName) {
  return elements.mobileViewPanels.find((panel) => panel.dataset.viewPanel === viewName);
}

function setActiveMobileView(viewName) {
  const targetPanel = getMobileViewPanel(viewName);
  if (!targetPanel) {
    return;
  }

  activeMobileView = viewName;
  updateMobileViewerButtons();
  elements.mobileViewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel === targetPanel);
  });
}

function updateMobileViewerButtons() {
  elements.mobileViewButtons.forEach((button) => {
    const isActive = button.dataset.viewTarget === activeMobileView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderSummary() {
  const monthKey = getSummaryMonth();
  const monthTransactions = getTransactionsForMonth(monthKey);
  const income = sumTransactions(monthTransactions, "income");
  const expense = sumTransactions(monthTransactions, "expense");
  const balance = income - expense;

  elements.statBalance.textContent = formatCurrency(balance);
  elements.statIncome.textContent = formatCurrency(income);
  elements.statExpense.textContent = formatCurrency(expense);
  elements.headerMonthLabel.textContent = `${formatMonthLabel(monthKey)} 가계부`;
  elements.calendarMonthCaption.textContent = `${formatMonthLabel(monthKey)} 기준`;
  elements.analysisMonthLabel.textContent = `${formatMonthLabel(monthKey)} 기준`;
  renderCalendarView(monthTransactions, monthKey);
  renderFlowChart(monthTransactions, monthKey);
  renderCategoryBreakdown(monthTransactions);

  // [Codex] 날짜 상세 시트가 열린 상태에서는 월 이동이나 데이터 변경 뒤에도 같은 날짜 내용을 즉시 다시 맞춰줍니다.
  if (!elements.calendarDetailSheet.hidden && activeCalendarDate) {
    if (activeCalendarDate.startsWith(monthKey)) {
      renderCalendarDetailSheet(activeCalendarDate);
    } else {
      closeCalendarDetailSheet({ rerender: false });
    }
  }
}

function renderCategoryBreakdown(monthTransactions) {
  const expenseTransactions = monthTransactions.filter((transaction) => transaction.type === "expense");
  const totalExpense = sumTransactions(expenseTransactions, "expense");
  elements.categoryBreakdown.replaceChildren();

  if (expenseTransactions.length === 0) {
    elements.categoryBreakdown.appendChild(createEmptyState("아직 지출 데이터가 없습니다."));
    return;
  }

  const totalsByCategory = expenseTransactions.reduce((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
    return accumulator;
  }, {});

  Object.entries(totalsByCategory)
    .sort((left, right) => right[1] - left[1])
    .forEach(([categoryName, amount]) => {
      const fragment = elements.categoryItemTemplate.content.cloneNode(true);
      fragment.querySelector(".category-name").textContent = categoryName;
      fragment.querySelector(".category-value").textContent = `${formatCurrency(amount)} · ${Math.round(
        (amount / totalExpense) * 100
      )}%`;
      fragment.querySelector(".category-bar-fill").style.width = `${(amount / totalExpense) * 100}%`;
      elements.categoryBreakdown.appendChild(fragment);
    });
}

// [Codex] 홈 달력은 날짜별 수입/지출 합계를 같은 칸에 넣어 월간 흐름을 한 번에 읽을 수 있게 구성했습니다.
// [Codex] 통계 탭에는 현재 월을 주차 단위로 묶은 수입·지출 막대를 그려서 숫자 표기와 함께 흐름을 한 번에 읽게 합니다.
function renderFlowChart(monthTransactions, monthKey) {
  const weeklyFlow = buildWeeklyFlow(monthTransactions, monthKey);
  const maxAmount = weeklyFlow.reduce((maxValue, week) => Math.max(maxValue, week.income, week.expense), 0);

  elements.flowChartCaption.textContent = `${formatMonthLabel(monthKey)} 주차별 흐름`;
  elements.flowChart.replaceChildren();

  if (maxAmount === 0) {
    elements.flowChart.appendChild(createEmptyState("아직 이번 달 흐름을 그릴 거래가 없습니다."));
    return;
  }

  weeklyFlow.forEach((week) => {
    const column = document.createElement("article");
    column.className = "flow-column";
    column.setAttribute(
      "aria-label",
      `${week.label} 수입 ${formatCurrency(week.income)}, 지출 ${formatCurrency(week.expense)}`
    );

    const bars = document.createElement("div");
    bars.className = "flow-bars";

    const incomeBar = document.createElement("span");
    incomeBar.className = "flow-bar income";
    incomeBar.style.height = `${Math.max((week.income / maxAmount) * 100, week.income > 0 ? 10 : 0)}%`;

    const expenseBar = document.createElement("span");
    expenseBar.className = "flow-bar expense";
    expenseBar.style.height = `${Math.max((week.expense / maxAmount) * 100, week.expense > 0 ? 10 : 0)}%`;

    const meta = document.createElement("div");
    meta.className = "flow-meta";

    const label = document.createElement("strong");
    label.className = "flow-label";
    label.textContent = week.label;

    const value = document.createElement("span");
    value.className = "flow-value";
    value.textContent = `${formatCalendarAmount(week.income)} / ${formatCalendarAmount(week.expense)}`;

    bars.append(incomeBar, expenseBar);
    meta.append(label, value);
    column.append(bars, meta);
    elements.flowChart.appendChild(column);
  });
}

function buildWeeklyFlow(monthTransactions, monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);
  const weeklyFlow = Array.from({ length: weekCount }, (_, index) => ({
    label: `${index + 1}주`,
    income: 0,
    expense: 0,
  }));

  monthTransactions.forEach((transaction) => {
    const day = Number(transaction.date.slice(-2));
    const weekIndex = Math.floor((firstWeekday + day - 1) / 7);
    weeklyFlow[weekIndex][transaction.type] += transaction.amount;
  });

  return weeklyFlow;
}

function renderCalendarView(monthTransactions, monthKey) {
  elements.calendarGrid.replaceChildren();

  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = firstDate.getDay();
  const leadingDays = firstWeekday;
  const trailingDays = (7 - ((leadingDays + daysInMonth) % 7 || 7)) % 7;
  const transactionSummaryMap = summarizeTransactionsByDate(monthTransactions);
  const today = getLocalDateString(new Date());

  for (let index = 0; index < leadingDays + daysInMonth + trailingDays; index += 1) {
    const dayOffset = index - leadingDays + 1;
    const currentDate = new Date(year, month - 1, dayOffset);
    const cellDate = getLocalDateString(currentDate);
    const isCurrentMonth = currentDate.getMonth() === month - 1;
    const summary = transactionSummaryMap.get(cellDate) || { income: 0, expense: 0, count: 0 };

    const dayCell = document.createElement("button");
    dayCell.type = "button";
    dayCell.className = "calendar-day";
    if (!isCurrentMonth) {
      dayCell.classList.add("is-outside");
      dayCell.disabled = true;
    } else {
      dayCell.dataset.date = cellDate;
      dayCell.setAttribute("aria-label", getCalendarDayAriaLabel(cellDate, summary));
    }
    if (cellDate === today) {
      dayCell.classList.add("is-today");
    }
    if (summary.count > 0) {
      dayCell.classList.add("has-entry");
    }
    if (activeCalendarDate === cellDate) {
      dayCell.classList.add("is-selected");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = String(currentDate.getDate());

    const dayMeta = document.createElement("div");
    dayMeta.className = "calendar-day-meta";

    if (summary.count > 0 && isCurrentMonth) {
      const incomeLine = document.createElement("span");
      incomeLine.className = "calendar-day-line income";
      incomeLine.textContent = summary.income > 0 ? formatCalendarAmount(summary.income) : "";

      const expenseLine = document.createElement("span");
      expenseLine.className = "calendar-day-line expense";
      expenseLine.textContent = summary.expense > 0 ? formatCalendarAmount(summary.expense) : "";

      dayMeta.append(incomeLine, expenseLine);
    } else if (isCurrentMonth) {
      const emptyLine = document.createElement("span");
      emptyLine.className = "calendar-day-line";
      emptyLine.textContent = "";
      dayMeta.append(emptyLine);
    }

    dayCell.append(dayNumber, dayMeta);
    elements.calendarGrid.appendChild(dayCell);
  }
}

// [Codex] 달력 상세 시트는 선택한 날짜의 거래 수와 수입/지출 합계를 먼저 보여주고, 아래에서 같은 카드 목록을 이어서 확인하게 합니다.
function renderCalendarDetailSheet(dateKey) {
  const transactions = getTransactionsForDate(dateKey);
  const income = sumTransactions(transactions, "income");
  const expense = sumTransactions(transactions, "expense");
  const balance = income - expense;
  const balanceTone = balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral";

  elements.calendarDetailDate.textContent = formatDate(dateKey);
  // [Codex] 날짜 상세 상단은 기록 수를 빼고 수입, 지출, 순잔액만 빠르게 읽히도록 더 간략한 요약으로 줄였습니다.
  elements.calendarDetailMetrics.replaceChildren(
    createCalendarDetailMetric("수입", formatCurrency(income), "income"),
    createCalendarDetailMetric("지출", formatCurrency(expense), "expense")
  );
  elements.calendarDetailNote.className = `calendar-detail-note is-${balanceTone}`;
  elements.calendarDetailNote.textContent = transactions.length
    ? `순잔액 ${formatSignedCurrency(balance)}`
    : "선택한 날짜에 아직 거래가 없습니다.";

  elements.calendarDetailList.replaceChildren();
  if (transactions.length === 0) {
    elements.calendarDetailList.appendChild(createEmptyState("선택한 날짜에 아직 거래가 없습니다."));
    return;
  }

  buildCategoryGroups(transactions).forEach((group) => {
    elements.calendarDetailList.appendChild(createCalendarCategoryGroup(group));
  });
}

function createCalendarDetailMetric(label, value, toneClass = "") {
  const card = document.createElement("article");
  card.className = "metric-chip calendar-detail-metric";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  if (toneClass) {
    valueElement.classList.add(toneClass);
  }

  card.append(labelElement, valueElement);
  return card;
}

// [Codex] 날짜 상세 목록은 카테고리별로 묶어 같은 소비 맥락을 한 번에 확인하게 하고, 각 묶음 합계도 바로 보여줍니다.
function createCalendarCategoryGroup(group) {
  const section = document.createElement("section");
  section.className = "calendar-category-group";

  const header = document.createElement("div");
  header.className = "calendar-category-header";

  const title = document.createElement("strong");
  title.textContent = group.category;

  const meta = document.createElement("span");
  meta.className = `calendar-category-total ${group.total > 0 ? "income" : group.total < 0 ? "expense" : ""}`.trim();
  meta.textContent = `${group.items.length}건 · ${formatSignedCurrency(group.total)}`;

  const body = document.createElement("div");
  body.className = "calendar-category-body";

  group.items.forEach((transaction) => {
    body.appendChild(createTransactionItemElement(transaction, { showDate: false }));
  });

  header.append(title, meta);
  section.append(header, body);
  return section;
}

function buildCategoryGroups(transactions) {
  const grouped = transactions.reduce((accumulator, transaction) => {
    const groupKey = transaction.category;
    if (!accumulator.has(groupKey)) {
      accumulator.set(groupKey, {
        category: groupKey,
        items: [],
        total: 0,
      });
    }

    const group = accumulator.get(groupKey);
    group.items.push(transaction);
    group.total += transaction.type === "income" ? transaction.amount : -transaction.amount;
    return accumulator;
  }, new Map());

  return [...grouped.values()].sort((left, right) => Math.abs(right.total) - Math.abs(left.total));
}

function formatSignedCurrency(value) {
  if (value > 0) {
    return `+ ${formatCurrency(value)}`;
  }

  if (value < 0) {
    return `- ${formatCurrency(Math.abs(value))}`;
  }

  return formatCurrency(0);
}

function createTransactionItemElement(transaction, options = {}) {
  const { showDate = true } = options;
  const fragment = elements.transactionItemTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".transaction-item");
  const amountElement = fragment.querySelector(".transaction-amount");
  const badgeElement = fragment.querySelector(".transaction-badge");
  const dateElement = fragment.querySelector(".transaction-date");
  const memoElement = fragment.querySelector(".transaction-memo");

  item.dataset.transactionId = transaction.id;
  amountElement.textContent = `${transaction.type === "income" ? "+" : "-"} ${formatCurrency(transaction.amount)}`;
  amountElement.classList.add(transaction.type);
  badgeElement.textContent = `${transaction.type === "income" ? "수입" : "지출"} · ${transaction.category} · ${getPaymentMethodLabel(
    transaction.paymentMethod
  )}`;
  memoElement.textContent = transaction.memo || "메모 없음";

  if (showDate) {
    dateElement.textContent = formatDate(transaction.date);
  } else {
    item.classList.add("transaction-item-compact");
    dateElement.remove();
  }

  return item;
}

// [Codex] 내역 도구막대는 달력 버튼 텍스트, 검색창 펼침 상태, 검색 활성 여부를 같이 갱신해 현재 필터 조건을 바로 읽게 합니다.
function updateLedgerFilterUi() {
  const isMonthScope = elements.filterScope.value !== "all";
  const monthKey = elements.filterMonth.value || getSummaryMonth();
  const isSearchActive = isLedgerSearchOpen || Boolean(elements.searchInput.value.trim());

  elements.ledgerMonthLabel.textContent = isMonthScope ? formatMonthLabel(monthKey) : "전체 기간";
  elements.ledgerMonthButton.setAttribute(
    "aria-label",
    isMonthScope ? `${formatMonthLabel(monthKey)} 내역 필터` : "전체 기간 내역 필터"
  );
  elements.ledgerSearchField.hidden = !isLedgerSearchOpen;
  elements.ledgerSearchButton.classList.toggle("is-active", isSearchActive);
  elements.ledgerMonthButton.classList.toggle("is-active", !isMonthScope);
}

function toggleLedgerSearch() {
  if (isLedgerSearchOpen) {
    if (elements.searchInput.value.trim()) {
      elements.searchInput.value = "";
      renderTransactions();
    }
    isLedgerSearchOpen = false;
    updateLedgerFilterUi();
    return;
  }

  isLedgerSearchOpen = true;
  updateLedgerFilterUi();
  window.setTimeout(() => {
    elements.searchInput.focus();
  }, 0);
}

function renderTransactions() {
  const transactions = getFilteredTransactions();
  elements.transactionList.replaceChildren();
  updateLedgerFilterUi();
  elements.filterCount.textContent = `${transactions.length}건 표시 중`;

  if (transactions.length === 0) {
    elements.transactionList.appendChild(createLedgerEmptyState());
    return;
  }

  const groups = transactions.reduce((accumulator, transaction) => {
    if (!accumulator.has(transaction.date)) {
      accumulator.set(transaction.date, []);
    }

    accumulator.get(transaction.date).push(transaction);
    return accumulator;
  }, new Map());

  groups.forEach((items, dateKey) => {
    const group = document.createElement("section");
    group.className = "ledger-group";

    const header = document.createElement("div");
    header.className = "ledger-group-header";

    const title = document.createElement("strong");
    title.textContent = formatDate(dateKey);

    const total = items.reduce(
      (sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount),
      0
    );
    const totalText = document.createElement("span");
    totalText.textContent = `${items.length}건 · ${total >= 0 ? "+" : "-"} ${formatCurrency(Math.abs(total))}`;

    const body = document.createElement("div");
    body.className = "ledger-group-body";

    header.append(title, totalText);
    group.append(header, body);

    items.forEach((transaction) => {
      const fragment = elements.transactionItemTemplate.content.cloneNode(true);
      const item = fragment.querySelector(".transaction-item");
      const amountElement = fragment.querySelector(".transaction-amount");
      const badgeElement = fragment.querySelector(".transaction-badge");
      const dateElement = fragment.querySelector(".transaction-date");
      const memoElement = fragment.querySelector(".transaction-memo");

      item.dataset.transactionId = transaction.id;
      amountElement.textContent = `${transaction.type === "income" ? "+" : "-"} ${formatCurrency(transaction.amount)}`;
      amountElement.classList.add(transaction.type);
      badgeElement.textContent = `${transaction.type === "income" ? "수입" : "지출"} · ${transaction.category} · ${getPaymentMethodLabel(
        transaction.paymentMethod
      )}`;
      dateElement.textContent = formatDate(transaction.date);
      memoElement.textContent = transaction.memo || "메모 없음";

      body.appendChild(fragment);
    });

    elements.transactionList.appendChild(group);
  });
}

function getFilteredTransactions() {
  const scope = elements.filterScope.value;
  const monthKey = elements.filterMonth.value;
  const type = elements.filterType.value;
  const category = elements.filterCategory.value;
  const paymentMethod = elements.filterPaymentMethod.value;
  const searchKeyword = elements.searchInput.value.trim().toLowerCase();

  return [...appState.transactions]
    .filter((transaction) => {
      if (scope === "month" && monthKey && !transaction.date.startsWith(monthKey)) {
        return false;
      }

      if (type !== "all" && transaction.type !== type) {
        return false;
      }

      if (category !== "all" && transaction.category !== category) {
        return false;
      }

      if (paymentMethod !== "all" && transaction.paymentMethod !== paymentMethod) {
        return false;
      }

      if (
        searchKeyword &&
        !`${transaction.memo} ${transaction.category} ${getPaymentMethodLabel(transaction.paymentMethod)}`
          .toLowerCase()
          .includes(searchKeyword)
      ) {
        return false;
      }

      return true;
    })
    .sort(sortTransactions);
}

function summarizeTransactionsByDate(transactions) {
  return transactions.reduce((accumulator, transaction) => {
    if (!accumulator.has(transaction.date)) {
      accumulator.set(transaction.date, { income: 0, expense: 0, count: 0 });
    }

    const summary = accumulator.get(transaction.date);
    summary[transaction.type] += transaction.amount;
    summary.count += 1;
    return accumulator;
  }, new Map());
}

function syncEntryCategoryOptions(selectedValue) {
  populateCategorySelect(elements.categoryInput, getSelectedType(), selectedValue);
}

function syncFilterCategoryOptions() {
  const filterType = elements.filterType.value;
  const categoryOptions =
    filterType === "all"
      ? [...CATEGORY_MAP.expense, ...CATEGORY_MAP.income]
      : CATEGORY_MAP[filterType];

  populateCategorySelect(elements.filterCategory, "all", elements.filterCategory.value, categoryOptions);
}

function populateCategorySelect(selectElement, type, selectedValue, customOptions) {
  const options = customOptions || CATEGORY_MAP[type];
  const currentValue = selectedValue && options.includes(selectedValue) ? selectedValue : options[0];
  const filterValue = selectedValue && options.includes(selectedValue) ? selectedValue : "all";
  selectElement.replaceChildren();

  if (selectElement === elements.filterCategory) {
    selectElement.appendChild(new Option("전체", "all"));
  }

  options.forEach((categoryName) => {
    selectElement.appendChild(new Option(categoryName, categoryName));
  });

  selectElement.value = selectElement === elements.filterCategory ? filterValue : currentValue;
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Money Pocket",
    state: appState,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `money-pocket-backup-${getLocalDateString(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("백업 파일을 내보냈습니다.");
}

// [Codex] JSON 가져오기는 구조를 검증한 뒤 전체 상태를 교체하도록 해 데이터 손상을 줄였습니다.
async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const nextState = normalizeState(parsed.state || parsed);
    const confirmed = window.confirm("현재 데이터를 가져온 파일 내용으로 교체할까요?");
    if (!confirmed) {
      return;
    }

    appState = nextState;
    persistState();
    resetEntryForm();
    // [Codex] 복원 직후에도 가장 최근 데이터 월로 맞춰 사용자가 즉시 복원 결과를 확인할 수 있게 합니다.
    setActiveMonth(getLatestDataMonth(appState) || getCurrentMonthKey());
    renderAll();
    showToast("백업 파일을 복원했습니다.");
  } catch (error) {
    console.error(error);
    showToast("JSON 파일을 읽지 못했습니다.");
  } finally {
    event.target.value = "";
  }
}

function resetAllData() {
  const confirmed = window.confirm("모든 거래와 예산 데이터를 삭제할까요?");
  if (!confirmed) {
    return;
  }

  appState = createDefaultState();
  persistState();
  resetEntryForm();
  // [Codex] 전체 초기화 뒤에는 현재 월로 되돌려 새 기록 시작 지점을 명확하게 맞춥니다.
  setActiveMonth(getCurrentMonthKey());
  renderAll();
  showToast("모든 데이터를 삭제했습니다.");
}

function handleInstallClick() {
  if (!installPromptEvent) {
    showToast("Safari 공유 메뉴에서 홈 화면에 추가를 사용하세요.");
    return;
  }

  installPromptEvent.prompt();
  installPromptEvent.userChoice.finally(() => {
    installPromptEvent = null;
    updateInstallHint();
  });
}

function updateInstallHint() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (isStandalone) {
    elements.installButton.hidden = true;
    elements.installHint.textContent = "현재 홈 화면 앱으로 실행 중입니다.";
    return;
  }

  if (installPromptEvent) {
    elements.installButton.hidden = false;
    elements.installHint.textContent = "지원되는 브라우저에서는 버튼으로 바로 설치할 수 있습니다.";
    return;
  }

  elements.installButton.hidden = true;
  elements.installHint.textContent = isIos
    ? "iPhone Safari의 공유 버튼에서 홈 화면에 추가를 선택하면 앱처럼 사용할 수 있습니다."
    : "브라우저 메뉴의 설치 또는 홈 화면 추가 기능을 사용하세요.";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("sw.js").catch((error) => {
    console.error(error);
  });
}

function getTransactionsForMonth(monthKey) {
  return appState.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

function getTransactionsForDate(dateKey) {
  return appState.transactions.filter((transaction) => transaction.date === dateKey).sort(sortTransactions);
}

function getSummaryMonth() {
  return elements.summaryMonth.value || getLatestDataMonth() || getCurrentMonthKey();
}

// [Codex] 거래와 예산을 함께 기준으로 잡아 사용자가 마지막으로 관리하던 월을 기본 진입점으로 사용합니다.
function getLatestDataMonth(sourceState = appState) {
  const transactionMonths = sourceState.transactions.map((transaction) => transaction.date.slice(0, 7));
  const budgetMonths = Object.keys(sourceState.budgets);
  const monthCandidates = [...new Set([...transactionMonths, ...budgetMonths])]
    .filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey))
    .sort();

  return monthCandidates[monthCandidates.length - 1] || "";
}

function getCurrentMonthKey() {
  return getLocalDateString(new Date()).slice(0, 7);
}

function setActiveMonth(monthKey) {
  const nextMonthKey = monthKey || getLatestDataMonth() || getCurrentMonthKey();
  elements.summaryMonth.value = nextMonthKey;
  elements.filterMonth.value = nextMonthKey;
  syncMonthPickerSelection(nextMonthKey);
}

function getSelectedType() {
  return document.querySelector('input[name="type"]:checked').value;
}

function setSelectedType(type) {
  const target = document.querySelector(`input[name="type"][value="${type}"]`);
  if (target) {
    target.checked = true;
  }
}

function sumTransactions(transactions, type) {
  return transactions.reduce((sum, transaction) => {
    if (type && transaction.type !== type) {
      return sum;
    }

    return sum + transaction.amount;
  }, 0);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2200);
}

function createEmptyState(message, tagName = "div") {
  const element = document.createElement(tagName);
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function getPaymentMethodLabel(value) {
  return PAYMENT_METHOD_MAP[value] || PAYMENT_METHOD_MAP.cash;
}

function getSummaryNote({ balance, monthKey, latestDataMonth, transactionCount }) {
  if (transactionCount === 0) {
    if (latestDataMonth && latestDataMonth !== monthKey) {
      return `${formatMonthLabel(latestDataMonth)} 데이터가 가장 최근입니다.`;
    }

    return "이 월에는 아직 거래가 없습니다.";
  }

  return balance >= 0 ? "이번 달 잔액이 플러스입니다." : "이번 달 지출이 수입보다 많습니다.";
}

// [Codex] 월 필터가 비어 있을 때 최근 기록 월로 바로 이동할 수 있게 해 사용자가 직접 월을 다시 찾는 수고를 줄입니다.
function createLedgerEmptyState() {
  const latestDataMonth = getLatestDataMonth();
  const selectedMonth = elements.filterMonth.value;
  const isMonthScope = elements.filterScope.value === "month";

  if (!isMonthScope || !latestDataMonth || latestDataMonth === selectedMonth || appState.transactions.length === 0) {
    return createEmptyState("조건에 맞는 거래가 없습니다.");
  }

  const emptyState = createEmptyState(`${formatMonthLabel(selectedMonth)}에는 거래가 없습니다.`);
  const hint = document.createElement("p");
  hint.className = "empty-state-hint";
  hint.textContent = `가장 최근 거래는 ${formatMonthLabel(latestDataMonth)}에 있습니다.`;

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.className = "secondary-button empty-state-action";
  actionButton.textContent = `${formatMonthLabel(latestDataMonth)} 보기`;
  actionButton.addEventListener("click", () => {
    setActiveMonth(latestDataMonth);
    setActiveMobileView("ledger");
    renderAll();
  });

  emptyState.append(hint, actionButton);
  return emptyState;
}

// [Codex] 상단 달력 아이콘은 연도와 월을 명시적으로 선택하는 시트로 연결해 iPhone에서도 연도 변경이 바로 가능하게 했습니다.
// [Codex] 선택한 날짜를 별도 하단 시트로 띄워 홈 달력 안에서 바로 확인하고, 닫으면 선택 강조도 함께 정리합니다.
function openEntryForDate(dateKey) {
  if (calendarClickTimer) {
    window.clearTimeout(calendarClickTimer);
    calendarClickTimer = null;
  }

  lastCalendarTapDate = "";
  lastCalendarTapAt = 0;
  resetEntryForm();
  elements.dateInput.value = dateKey;
  closeCalendarDetailSheet({ rerender: false });
  setActiveMobileView("entry");
  getMobileViewPanel("entry")?.scrollTo({ top: 0, behavior: "smooth" });
}

// [Codex] 상세 시트는 같은 날짜를 다시 열면 닫히도록 토글해 두 번 탭과 길게 누름이 같은 동작으로 읽히게 맞춥니다.
function toggleCalendarDetailSheet(dateKey) {
  if (!elements.calendarDetailSheet.hidden && activeCalendarDate === dateKey) {
    closeCalendarDetailSheet();
    return;
  }

  openCalendarDetailSheet(dateKey);
}

function openCalendarDetailSheet(dateKey) {
  activeCalendarDate = dateKey;
  elements.calendarDetailSheet.hidden = false;
  renderSummary();
}

function closeCalendarDetailSheet(options = {}) {
  const { rerender = true } = options;
  if (calendarClickTimer) {
    window.clearTimeout(calendarClickTimer);
    calendarClickTimer = null;
  }

  elements.calendarDetailSheet.hidden = true;
  activeCalendarDate = "";
  elements.calendarGrid.querySelectorAll(".calendar-day.is-selected").forEach((dayCell) => {
    dayCell.classList.remove("is-selected");
  });

  if (rerender) {
    renderSummary();
  }
}

function getCalendarDayAriaLabel(dateKey, summary) {
  if (summary.count === 0) {
    return `${formatDate(dateKey)} 거래 없음`;
  }

  return `${formatDate(dateKey)} 거래 ${summary.count}건, 수입 ${formatCurrency(summary.income)}, 지출 ${formatCurrency(
    summary.expense
  )}`;
}

function openMonthSheet() {
  populateMonthPickerYears();
  syncMonthPickerFromSummaryMonth();
  elements.monthSheet.hidden = false;
}

function closeMonthSheet() {
  elements.monthSheet.hidden = true;
}

function applySelectedMonthFromSheet() {
  const year = elements.monthPickerYear.value;
  const month = elements.monthPickerMonth.value;
  if (!year || !month) {
    return;
  }

  setActiveMonth(`${year}-${month}`);
  renderAll();
  closeMonthSheet();
}

function syncMonthPickerFromSummaryMonth() {
  const [year, month] = getSummaryMonth().split("-");
  populateMonthPickerYears();
  elements.monthPickerYear.value = year;
  elements.monthPickerMonth.value = month;
}

function populateMonthPickerYears() {
  const currentYear = Number(getCurrentMonthKey().slice(0, 4));
  const latestYear = Number((getLatestDataMonth() || getCurrentMonthKey()).slice(0, 4));
  const selectedYear = Number(getSummaryMonth().slice(0, 4));
  const startYear = Math.min(currentYear, latestYear, selectedYear) - 5;
  const endYear = Math.max(currentYear, latestYear, selectedYear) + 5;

  if (elements.monthPickerYear.options.length === endYear - startYear + 1) {
    return;
  }

  elements.monthPickerYear.replaceChildren();
  for (let year = endYear; year >= startYear; year -= 1) {
    elements.monthPickerYear.appendChild(new Option(`${year}년`, String(year)));
  }
}

// [Codex] 월 선택 시트는 상단 요약 월 변경과 내역 기간 필터를 같은 컴포넌트로 재사용하되, 내역에서는 전체 기간 토글까지 함께 다룹니다.
function openMonthSheet(target = "summary") {
  monthSheetTarget = target;
  pendingMonthSheetScope = target === "ledger" ? elements.filterScope.value || "month" : "month";

  const targetMonth = target === "ledger" ? elements.filterMonth.value || getSummaryMonth() : getSummaryMonth();
  syncMonthPickerSelection(targetMonth);
  updateMonthSheetUi();
  elements.monthSheet.hidden = false;
}

function closeMonthSheet() {
  elements.monthSheet.hidden = true;
  monthSheetTarget = "summary";
  pendingMonthSheetScope = "month";
  pendingMonthSheetYear = "";
  pendingMonthSheetMonth = "";
}

function applySelectedMonthFromSheet() {
  if (monthSheetTarget === "ledger") {
    elements.filterScope.value = pendingMonthSheetScope;

    if (pendingMonthSheetScope === "month") {
      const year = pendingMonthSheetYear || elements.monthPickerYear.value;
      const month = pendingMonthSheetMonth || elements.monthPickerMonth.value;
      if (!year || !month) {
        return;
      }

      elements.filterMonth.value = `${year}-${month}`;
    }

    renderTransactions();
    closeMonthSheet();
    return;
  }

  const year = pendingMonthSheetYear || elements.monthPickerYear.value;
  const month = pendingMonthSheetMonth || elements.monthPickerMonth.value;
  if (!year || !month) {
    return;
  }

  setActiveMonth(`${year}-${month}`);
  renderAll();
  closeMonthSheet();
}

function setMonthSheetScope(scope) {
  pendingMonthSheetScope = scope === "all" ? "all" : "month";
  updateMonthSheetUi();
}

function updateMonthSheetUi() {
  const showScopeToggle = monthSheetTarget === "ledger";
  const isMonthScope = pendingMonthSheetScope === "month";

  elements.monthScopeSwitch.hidden = !showScopeToggle;
  elements.monthPickerFields.hidden = showScopeToggle && !isMonthScope;
  elements.monthScopeMonth.classList.toggle("is-active", isMonthScope);
  elements.monthScopeAll.classList.toggle("is-active", !isMonthScope);
  elements.monthSheetApply.textContent = showScopeToggle && !isMonthScope ? "전체 기간 보기" : "적용";
}

function syncMonthPickerSelection(monthKey) {
  const safeMonthKey = monthKey || getSummaryMonth();
  const [year, month] = safeMonthKey.split("-");
  populateMonthPickerYears(safeMonthKey);
  elements.monthPickerYear.value = year;
  elements.monthPickerMonth.value = month;
  pendingMonthSheetYear = year;
  pendingMonthSheetMonth = month;
  syncMonthPickerGridUi();
}

function populateMonthPickerYears(referenceMonth = getSummaryMonth()) {
  const currentYear = Number(getCurrentMonthKey().slice(0, 4));
  const latestYear = Number((getLatestDataMonth() || getCurrentMonthKey()).slice(0, 4));
  const selectedYear = Number((referenceMonth || getSummaryMonth()).slice(0, 4));
  const startYear = Math.min(currentYear, latestYear, selectedYear) - 5;
  const endYear = Math.max(currentYear, latestYear, selectedYear) + 5;

  elements.monthPickerYear.replaceChildren();
  for (let year = endYear; year >= startYear; year -= 1) {
    elements.monthPickerYear.appendChild(new Option(`${year}년`, String(year)));
  }
}

// [Codex] 월 선택 시트는 연도 스텝과 12개월 버튼을 같은 패널에 보여줘서 상단과 내역 필터 모두 같은 달력 스타일로 고르게 합니다.
function shiftMonthPickerYear(delta) {
  const baseYear = Number(pendingMonthSheetYear || elements.monthPickerYear.value || getCurrentMonthKey().slice(0, 4));
  const nextYear = String(baseYear + delta);
  const nextMonth = pendingMonthSheetMonth || elements.monthPickerMonth.value || "01";

  populateMonthPickerYears(`${nextYear}-${nextMonth}`);
  pendingMonthSheetYear = nextYear;
  elements.monthPickerYear.value = nextYear;
  syncMonthPickerGridUi();
}

function handleMonthGridClick(event) {
  const monthButton = event.target.closest("[data-month-value]");
  if (!monthButton) {
    return;
  }

  const nextMonth = monthButton.dataset.monthValue;
  if (!nextMonth) {
    return;
  }

  pendingMonthSheetMonth = nextMonth;
  elements.monthPickerMonth.value = nextMonth;
  syncMonthPickerGridUi();
}

function syncMonthPickerGridUi() {
  const selectedYear = pendingMonthSheetYear || elements.monthPickerYear.value || getCurrentMonthKey().slice(0, 4);
  const selectedMonth = pendingMonthSheetMonth || elements.monthPickerMonth.value || "01";

  elements.monthPickerYearLabel.textContent = `${selectedYear}년`;
  elements.monthPickerGrid.replaceChildren();

  Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).forEach((monthValue) => {
    const monthButton = document.createElement("button");
    monthButton.type = "button";
    monthButton.className = "month-chip";
    monthButton.dataset.monthValue = monthValue;
    monthButton.setAttribute("role", "option");
    monthButton.setAttribute("aria-selected", String(monthValue === selectedMonth));
    monthButton.textContent = `${Number(monthValue)}월`;
    monthButton.classList.toggle("is-active", monthValue === selectedMonth);
    elements.monthPickerGrid.appendChild(monthButton);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

// [Codex] 달력 칸은 통화기호나 접두어 없이 숫자만 보여주도록 별도 포맷을 사용합니다.
function formatCalendarAmount(value) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

function formatMonthLabel(value) {
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function normalizeAmount(value) {
  return Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10);
}

function sortTransactions(left, right) {
  return `${right.date}-${right.createdAt}`.localeCompare(`${left.date}-${left.createdAt}`);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `tx-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultState();
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    return createDefaultState();
  }
}

function createDefaultState() {
  return {
    version: APP_STATE_VERSION,
    budgets: {},
    transactions: [],
  };
}

function normalizeState(value) {
  const nextState = createDefaultState();
  const source = value && typeof value === "object" ? value : {};
  const rawBudgets = source.budgets && typeof source.budgets === "object" ? source.budgets : {};
  const rawTransactions = Array.isArray(source.transactions) ? source.transactions : [];

  nextState.version = APP_STATE_VERSION;
  nextState.budgets = Object.fromEntries(
    Object.entries(rawBudgets)
      .map(([monthKey, amount]) => [monthKey, Number(amount)])
      .filter(([monthKey, amount]) => /^\d{4}-\d{2}$/.test(monthKey) && Number.isFinite(amount) && amount > 0)
  );

  nextState.transactions = rawTransactions
    .map((transaction) => ({
      id: String(transaction.id || createId()),
      type: transaction.type === "income" ? "income" : "expense",
      amount: Number(transaction.amount),
      category: String(transaction.category || "").trim(),
      paymentMethod: String(transaction.paymentMethod || "cash"),
      date: String(transaction.date || ""),
      memo: String(transaction.memo || "").trim(),
      createdAt: String(transaction.createdAt || new Date().toISOString()),
      updatedAt: String(transaction.updatedAt || new Date().toISOString()),
    }))
    .filter((transaction) => {
      const categories = CATEGORY_MAP[transaction.type];
      return (
        Number.isFinite(transaction.amount) &&
        transaction.amount > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) &&
        categories.includes(transaction.category) &&
        Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_MAP, transaction.paymentMethod)
      );
    })
    .sort(sortTransactions);

  return nextState;
}
