/**
 * 국방예산 분야별 · 신규사업 대시보드 & 인터랙티브 인포그래픽 엔진
 */

(function () {
  'use strict';

  // Global Application State
  const state = {
    rawData: [],
    normalizedData: [],
    filteredData: [],
    sortKey: 'seq',
    sortAsc: true,
    activeTab: 'tab-overview',
    
    // Interactive Infographic Selection State
    selectedCategory: 'ALL',          // 'ALL' or Category Name
    selectedNewProjectSeq: null,      // null or Project Seq
    infographicMode: 'ALL',           // 'ALL', 'CATEGORY', 'NEW_PROJECT'

    searchTerm: '',
    typeFilter: 'ALL',                // 'ALL', 'NEW', 'EXISTING'
    theme: localStorage.getItem('budget_dashboard_theme') || 'light',
    currentWorkbook: null,
    sheetNames: [],
    charts: {}
  };

  // Modern Visualization Color Palette
  const PALETTE = [
    '#1e3a8a', '#0284c7', '#059669', '#ea580c', '#7c3aed',
    '#db2777', '#d97706', '#4f46e5', '#0891b2', '#16a34a',
    '#ca8a04', '#e11d48', '#9333ea', '#2563eb', '#0d9488'
  ];

  const DOM = {};

  function initDOMElements() {
    DOM.dropZone = document.getElementById('dropZone');
    DOM.fileInput = document.getElementById('fileInput');
    DOM.sheetSelectorWrap = document.getElementById('sheetSelectorWrap');
    DOM.sheetSelect = document.getElementById('sheetSelect');
    DOM.currentFileName = document.getElementById('currentFileName');
    DOM.resetSampleBtn = document.getElementById('resetSampleBtn');
    DOM.themeToggleBtn = document.getElementById('themeToggleBtn');
    DOM.themeIconSun = document.getElementById('themeIconSun');
    DOM.themeIconMoon = document.getElementById('themeIconMoon');
    DOM.printBtn = document.getElementById('printBtn');
    DOM.templateDownloadBtn = document.getElementById('templateDownloadBtn');
    DOM.templateDropdownMenu = document.getElementById('templateDropdownMenu');

    // Infographic Controller & Board
    DOM.categoryChipsContainer = document.getElementById('categoryChipsContainer');
    DOM.newProjectChipsContainer = document.getElementById('newProjectChipsContainer');
    DOM.dynamicInfographicBoard = document.getElementById('dynamicInfographicBoard');

    // KPIs
    DOM.kpiTotal2027 = document.getElementById('kpiTotal2027');
    DOM.kpiTotal2026 = document.getElementById('kpiTotal2026');
    DOM.kpiTotalDiff = document.getElementById('kpiTotalDiff');
    DOM.kpiNetIncrease = document.getElementById('kpiNetIncrease');
    DOM.kpiNewProjectCount = document.getElementById('kpiNewProjectCount');
    DOM.kpiNewBudgetTotal = document.getElementById('kpiNewBudgetTotal');
    DOM.kpiNewBudgetShare = document.getElementById('kpiNewBudgetShare');
    DOM.kpiCategoryCount = document.getElementById('kpiCategoryCount');
    DOM.kpiTotalProjectCount = document.getElementById('kpiTotalProjectCount');
    DOM.kpiTopCategory = document.getElementById('kpiTopCategory');
    DOM.tabNewBadge = document.getElementById('tabNewBadge');

    // Nav Tabs
    DOM.navTabs = document.querySelectorAll('.nav-tab');
    DOM.tabPanes = document.querySelectorAll('.tab-pane');

    // Containers
    DOM.topIncreaseList = document.getElementById('topIncreaseList');
    DOM.overviewNewProjectsList = document.getElementById('overviewNewProjectsList');
    DOM.categorySelect = document.getElementById('categorySelect');
    DOM.categoryStatPill = document.getElementById('categoryStatPill');
    DOM.catPillCount = document.getElementById('catPillCount');
    DOM.categoryCardsGrid = document.getElementById('categoryCardsGrid');
    DOM.catDetailTitle = document.getElementById('catDetailTitle');
    DOM.newProjectsBannerTotal = document.getElementById('newProjectsBannerTotal');
    DOM.newCardsCount = document.getElementById('newCardsCount');
    DOM.newProjectCardsGrid = document.getElementById('newProjectCardsGrid');

    // Table
    DOM.tableSearchInput = document.getElementById('tableSearchInput');
    DOM.tableCategoryFilter = document.getElementById('tableCategoryFilter');
    DOM.tableTypeFilter = document.getElementById('tableTypeFilter');
    DOM.tableFilteredCount = document.getElementById('tableFilteredCount');
    DOM.tableTotalCount = document.getElementById('tableTotalCount');
    DOM.budgetTableBody = document.getElementById('budgetTableBody');
    DOM.tableHeaders = document.querySelectorAll('#budgetTable th[data-sort]');
    DOM.exportExcelBtn = document.getElementById('exportExcelBtn');
    DOM.exportCsvBtn = document.getElementById('exportCsvBtn');

    // Modal
    DOM.detailModal = document.getElementById('detailModal');
    DOM.modalCloseBtn = document.getElementById('modalCloseBtn');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.modalCategoryBadge = document.getElementById('modalCategoryBadge');
    DOM.modal2026 = document.getElementById('modal2026');
    DOM.modal2027 = document.getElementById('modal2027');
    DOM.modalDiff = document.getElementById('modalDiff');
    DOM.modalRate = document.getElementById('modalRate');
    DOM.modalDesc = document.getElementById('modalDesc');
    DOM.modalMetaList = document.getElementById('modalMetaList');
  }

  // Smart Column Normalization
  function normalizeData(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    return rawRows.map((row, index) => {
      let seq = index + 1;
      let category = '기타';
      let projectName = '';
      let unit = '억원';
      let budget2026 = 0;
      let budget2027 = 0;
      let diff = 0;
      let rate = '-';
      let desc = '';

      for (const [key, rawVal] of Object.entries(row)) {
        if (rawVal === null || rawVal === undefined) continue;
        const col = String(key).trim().toLowerCase();
        const strVal = String(rawVal).trim();

        if (col.includes('연번') || col === 'no' || col === '순번' || col === 'id') {
          const parsed = parseInt(strVal, 10);
          if (!isNaN(parsed)) seq = parsed;
        } else if (col.includes('분야') || col.includes('중점영역') || col.includes('영역')) {
          category = strVal;
        } else if (col.includes('세부') || col.includes('사업') || col.includes('지표') || col.includes('항목')) {
          projectName = strVal;
        } else if (col.includes('단위') || col.includes('구분')) {
          unit = strVal;
        } else if (col.includes('2026') || col.includes('전년') || col.includes('26년')) {
          budget2026 = parseNumber(rawVal);
        } else if (col.includes('2027') || col.includes('정부안') || col.includes('당해') || col.includes('27년')) {
          budget2027 = parseNumber(rawVal);
        } else if (col.includes('증감') || col.includes('차액') || col.includes('변동')) {
          diff = parseNumber(rawVal);
        } else if (col.includes('증가율') || col.includes('증감율') || col.includes('증가(%)') || col.includes('비율')) {
          rate = rawVal;
        } else if (col.includes('핵심') || col.includes('내용') || col.includes('원문') || col.includes('근거') || col.includes('비고') || col.includes('설명')) {
          desc = strVal;
        }
      }

      // Calculated fallback for diff
      if (diff === 0 && (budget2027 !== 0 || budget2026 !== 0)) {
        diff = Number((budget2027 - budget2026).toFixed(2));
      }

      // Check if project is 'New'
      const isNew = checkIfNew(rate, budget2026, budget2027, desc);

      // Format rate string
      let rateDisplay = '';
      if (typeof rate === 'number') {
        rateDisplay = `${(rate * 100).toFixed(1)}%`;
      } else {
        const rateStr = String(rate).trim();
        if (rateStr === '신규' || rateStr.toLowerCase() === 'new' || isNew) {
          rateDisplay = '신규';
        } else if (!isNaN(parseFloat(rateStr))) {
          const num = parseFloat(rateStr);
          rateDisplay = rateStr.includes('%') ? rateStr : `${(num * (num <= 1 ? 100 : 1)).toFixed(1)}%`;
        } else {
          rateDisplay = rateStr || (budget2026 > 0 ? `${((diff / budget2026) * 100).toFixed(1)}%` : '신규');
        }
      }

      return {
        seq,
        category: category || '미분류',
        projectName: projectName || `사업 ${seq}`,
        unit: unit || '억원',
        budget2026,
        budget2027,
        diff,
        rate: rateDisplay,
        desc: desc || '-',
        isNew
      };
    });
  }

  function parseNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  function checkIfNew(rate, b2026, b2027, desc) {
    const rateStr = String(rate).trim().toLowerCase();
    const descStr = String(desc).trim();
    if (rateStr.includes('신규') || rateStr === 'new') return true;
    if (descStr.includes('[신규') || descStr.includes('신규 R&D') || descStr.includes('신규 도입') || descStr.includes('신규 지원')) return true;
    if (b2026 === 0 && b2027 > 0) return true;
    return false;
  }

  function fmtNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }

  // =========================================================================
  // INTERACTIVE CONTROLLER: RENDER SELECTION CHIPS (분야 & 신규사업)
  // =========================================================================
  function renderSelectionChips() {
    const categories = Array.from(new Set(state.normalizedData.map(d => d.category)));
    const newProjects = state.normalizedData.filter(d => d.isNew);

    // 1. Render Category Chips
    let catChipsHtml = `
      <button type="button" class="chip-btn ${state.infographicMode === 'ALL' && state.selectedCategory === 'ALL' ? 'active' : ''}" onclick="selectCategoryChip('ALL')">
        전체 종합 인포그래픽
      </button>
    `;

    categories.forEach(cat => {
      const isSelected = state.infographicMode === 'CATEGORY' && state.selectedCategory === cat;
      const catCount = state.normalizedData.filter(d => d.category === cat).length;
      catChipsHtml += `
        <button type="button" class="chip-btn ${isSelected ? 'active' : ''}" onclick="selectCategoryChip('${escapeHtml(cat)}')">
          ${escapeHtml(cat)} <span class="chip-badge-num">${catCount}</span>
        </button>
      `;
    });
    DOM.categoryChipsContainer.innerHTML = catChipsHtml;

    // 2. Render New Project Chips
    let newChipsHtml = `
      <button type="button" class="chip-btn chip-new ${state.infographicMode === 'NEW_PROJECT' && state.selectedNewProjectSeq === 'ALL_NEW' ? 'active' : ''}" onclick="selectNewProjectChip('ALL_NEW')">
        ✨ 신규사업 총괄 개괄
      </button>
    `;

    newProjects.forEach(np => {
      const isSelected = state.infographicMode === 'NEW_PROJECT' && state.selectedNewProjectSeq === np.seq;
      const shortName = np.projectName.length > 12 ? np.projectName.slice(0, 12) + '...' : np.projectName;
      newChipsHtml += `
        <button type="button" class="chip-btn chip-new ${isSelected ? 'active' : ''}" title="${escapeHtml(np.projectName)}" onclick="selectNewProjectChip(${np.seq})">
          ${escapeHtml(shortName)} <span class="chip-badge-num">${fmtNum(np.budget2027)}억</span>
        </button>
      `;
    });
    DOM.newProjectChipsContainer.innerHTML = newChipsHtml;
  }

  // Handle Category Chip Click
  window.selectCategoryChip = function (catName) {
    state.selectedCategory = catName;
    state.selectedNewProjectSeq = null;
    state.infographicMode = (catName === 'ALL') ? 'ALL' : 'CATEGORY';

    renderSelectionChips();
    renderDynamicInfographic();

    // Synchronize filters
    DOM.categorySelect.value = catName;
    DOM.tableCategoryFilter.value = catName;
    filterAndRenderTable();
    renderCategoriesTab();
  };

  // Handle New Project Chip Click
  window.selectNewProjectChip = function (seqOrAll) {
    if (seqOrAll === 'ALL_NEW') {
      state.selectedNewProjectSeq = 'ALL_NEW';
      state.infographicMode = 'NEW_PROJECT';
      state.typeFilter = 'NEW';
      DOM.tableTypeFilter.value = 'NEW';
    } else {
      const targetSeq = parseInt(seqOrAll, 10);
      state.selectedNewProjectSeq = targetSeq;
      state.infographicMode = 'NEW_PROJECT';

      const found = state.normalizedData.find(d => d.seq === targetSeq);
      if (found) {
        state.selectedCategory = found.category;
        DOM.categorySelect.value = found.category;
      }
    }

    renderSelectionChips();
    renderDynamicInfographic();
    filterAndRenderTable();
  };

  // =========================================================================
  // DYNAMIC INFOGRAPHIC RENDERER
  // =========================================================================
  function renderDynamicInfographic() {
    const total2027All = state.normalizedData.reduce((acc, cur) => acc + cur.budget2027, 0);
    const newProjects = state.normalizedData.filter(d => d.isNew);
    const newTotalAll = newProjects.reduce((acc, cur) => acc + cur.budget2027, 0);

    // MODE 1: SINGLE NEW PROJECT SELECTED
    if (state.infographicMode === 'NEW_PROJECT' && typeof state.selectedNewProjectSeq === 'number') {
      const p = state.normalizedData.find(d => d.seq === state.selectedNewProjectSeq);
      if (p) {
        renderSingleNewProjectInfographic(p, total2027All, newTotalAll);
        return;
      }
    }

    // MODE 2: ALL NEW PROJECTS SUMMARY
    if (state.infographicMode === 'NEW_PROJECT' && state.selectedNewProjectSeq === 'ALL_NEW') {
      renderAllNewProjectsSummaryInfographic(newProjects, total2027All, newTotalAll);
      return;
    }

    // MODE 3: SPECIFIC CATEGORY SELECTED
    if (state.infographicMode === 'CATEGORY' && state.selectedCategory !== 'ALL') {
      const catItems = state.normalizedData.filter(d => d.category === state.selectedCategory);
      renderCategoryInfographic(state.selectedCategory, catItems, total2027All);
      return;
    }

    // MODE 4: DEFAULT ALL OVERVIEW INFOGRAPHIC
    renderAllOverviewInfographic(total2027All, newProjects, newTotalAll);
  }

  // 1. Single New Project Infographic
  function renderSingleNewProjectInfographic(project, totalAll, newTotalAll) {
    const catItems = state.normalizedData.filter(d => d.category === project.category);
    const catTotal = catItems.reduce((acc, c) => acc + c.budget2027, 0);
    const shareInCat = catTotal > 0 ? ((project.budget2027 / catTotal) * 100).toFixed(1) : '100';
    const shareInNew = newTotalAll > 0 ? ((project.budget2027 / newTotalAll) * 100).toFixed(1) : '0';

    DOM.dynamicInfographicBoard.innerHTML = `
      <div class="info-header">
        <div class="info-title-wrap">
          <div class="info-emblem emblem-orange">신규</div>
          <div>
            <div class="info-tagline text-orange">2027년 정부안 최초 편성 &middot; 전략 핵심사업</div>
            <h2 class="info-main-title">${escapeHtml(project.projectName)}</h2>
          </div>
        </div>
        <div class="info-mode-indicator">
          <span class="info-mode-pill pill-orange">✨ 신규사업 맞춤 인포그래픽</span>
          <button class="btn btn-sm btn-outline" onclick="openModalBySeq(${project.seq})">상세 원문 팝업 ↗</button>
        </div>
      </div>

      <div class="info-content-grid">
        <!-- Left Hero Big Number -->
        <div class="info-hero-stat-card">
          <div>
            <div class="info-stat-eyebrow">2027년 신규 투자 예산</div>
            <div class="info-hero-val" style="color: var(--accent-orange);">
              ${fmtNum(project.budget2027)}<span class="info-hero-unit">${escapeHtml(project.unit)}</span>
            </div>
            <span class="badge-diff positive" style="font-size:0.8rem;">
              전년(0원) 대비 +${fmtNum(project.budget2027)}억 순증 (신규편성)
            </span>
          </div>

          <div class="info-gauge-wrap">
            <div class="info-gauge-label-row">
              <span>소속분야 [${escapeHtml(project.category)}] 내 점유율</span>
              <strong>${shareInCat}%</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-orange" style="width: ${Math.min(100, shareInCat)}%;"></div>
            </div>

            <div class="info-gauge-label-row" style="margin-top: 0.65rem;">
              <span>전체 신규사업 예산 대비 비중</span>
              <strong>${shareInNew}%</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-orange" style="width: ${Math.min(100, shareInNew)}%;"></div>
            </div>
          </div>
        </div>

        <!-- Right Infographic Details -->
        <div class="info-details-pane">
          <!-- Official Press Quote Callout -->
          <div class="info-press-box border-orange">
            <div class="info-press-title-row">
              <span class="info-press-label text-orange">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                국방부 보도자료 박스 원문 근거
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">연번 ${project.seq}번 사업</span>
            </div>
            <p class="info-press-content">${escapeHtml(project.desc)}</p>
          </div>

          <!-- 3-Pillars Infographic Cards -->
          <div class="info-pillars-grid">
            <div class="info-pillar-card">
              <div class="info-pillar-title">소속 중점 영역</div>
              <div class="info-pillar-value" style="font-size: 0.95rem;">${escapeHtml(project.category)}</div>
              <div class="info-pillar-sub">총 분야예산 ${fmtNum(catTotal)}억원 중</div>
            </div>

            <div class="info-pillar-card">
              <div class="info-pillar-title">편성 성격</div>
              <div class="info-pillar-value" style="color: var(--accent-orange);">100% 신규 순증</div>
              <div class="info-pillar-sub">'26년 실적 없음 ('27 신규)</div>
            </div>

            <div class="info-pillar-card">
              <div class="info-pillar-title">정책 기대 효과</div>
              <div class="info-pillar-value" style="font-size: 0.9rem; color: #059669;">전투력·복무 혁신</div>
              <div class="info-pillar-sub">정부안 중점 투자 과제</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. All New Projects Summary Infographic
  function renderAllNewProjectsSummaryInfographic(newProjects, totalAll, newTotalAll) {
    const share = totalAll > 0 ? ((newTotalAll / totalAll) * 100).toFixed(1) : '0';

    DOM.dynamicInfographicBoard.innerHTML = `
      <div class="info-header">
        <div class="info-title-wrap">
          <div class="info-emblem emblem-orange">신규</div>
          <div>
            <div class="info-tagline text-orange">2027년 국방예산 정부안 핵심 동력</div>
            <h2 class="info-main-title">전체 신규사업 종합 인포그래픽 (${newProjects.length}개 핵심 과제)</h2>
          </div>
        </div>
        <div class="info-mode-indicator">
          <span class="info-mode-pill pill-orange">총 ${fmtNum(newTotalAll)}억원 투자</span>
          <button class="btn btn-sm btn-primary" onclick="switchTab('tab-new-projects')">신규사업 탭으로 이동 →</button>
        </div>
      </div>

      <div class="info-content-grid">
        <div class="info-hero-stat-card">
          <div>
            <div class="info-stat-eyebrow">신규사업 총 예산 규모</div>
            <div class="info-hero-val" style="color: var(--accent-orange);">
              ${fmtNum(newTotalAll)}<span class="info-hero-unit">억원</span>
            </div>
            <span class="badge-diff positive" style="font-size:0.8rem;">
              전체 예산 대비 ${share}% 점유 (전략적 마중물)
            </span>
          </div>

          <div class="info-gauge-wrap">
            <div class="info-gauge-label-row">
              <span>국방예산 내 신규사업 비중</span>
              <strong>${share}%</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-orange" style="width: ${Math.min(100, share * 3)}%;"></div>
            </div>
          </div>
        </div>

        <div class="info-details-pane">
          <div class="info-press-box border-orange">
            <div class="info-press-title-row">
              <span class="info-press-label text-orange">2027년 신규사업 투자 3대 핵심 방향</span>
            </div>
            <p class="info-press-content">
              ① <strong>첨단 국방기술 자립:</strong> 국방반도체 R&D(565억), 한국형 첨단항공엔진(90억), 고출력 레이저 하드킬(121억)<br>
              ② <strong>AI & 무인 복합전투:</strong> 피지컬 AI 실증사업(430억), AI 병무상담 챗봇(19억)<br>
              ③ <strong>장병 복무 체감복지:</strong> 단기복무 부사관 적금(189억), 병사 단체상해보험(69억), 전세자금 신규지원
            </p>
          </div>

          <div class="info-project-chips-list">
            ${newProjects.map(np => `
              <div class="info-sub-item-badge" onclick="selectNewProjectChip(${np.seq})">
                <span>✨ ${escapeHtml(np.projectName)}</span>
                <strong>${fmtNum(np.budget2027)}억</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 3. Specific Category Infographic
  function renderCategoryInfographic(categoryName, items, totalAll) {
    const total2027 = items.reduce((acc, c) => acc + c.budget2027, 0);
    const total2026 = items.reduce((acc, c) => acc + c.budget2026, 0);
    const diff = total2027 - total2026;
    const diffRate = total2026 > 0 ? ((diff / total2026) * 100).toFixed(1) : '-';
    const catShare = totalAll > 0 ? ((total2027 / totalAll) * 100).toFixed(1) : '0';

    const newInCat = items.filter(d => d.isNew);
    const newBudgetInCat = newInCat.reduce((acc, c) => acc + c.budget2027, 0);

    DOM.dynamicInfographicBoard.innerHTML = `
      <div class="info-header">
        <div class="info-title-wrap">
          <div class="info-emblem emblem-blue">분야</div>
          <div>
            <div class="info-tagline text-blue">국방 중점 투자 영역 인포그래픽</div>
            <h2 class="info-main-title">${escapeHtml(categoryName)}</h2>
          </div>
        </div>
        <div class="info-mode-indicator">
          <span class="info-mode-pill pill-blue">사업 ${items.length}개 / 신규 ${newInCat.length}개</span>
          <button class="btn btn-sm btn-outline" onclick="switchTab('tab-categories')">분야 차트 분석 ↗</button>
        </div>
      </div>

      <div class="info-content-grid">
        <div class="info-hero-stat-card">
          <div>
            <div class="info-stat-eyebrow">2027년 정부안 편성 총액</div>
            <div class="info-hero-val" style="color: #1e3a8a;">
              ${fmtNum(total2027)}<span class="info-hero-unit">억원</span>
            </div>
            <span class="badge-diff ${diff >= 0 ? 'positive' : 'negative'}" style="font-size:0.8rem;">
              전년 대비 ${diff >= 0 ? '+' : ''}${fmtNum(diff)}억원 (${diff >= 0 ? '+' : ''}${diffRate}%)
            </span>
          </div>

          <div class="info-gauge-wrap">
            <div class="info-gauge-label-row">
              <span>전체 국방예산 내 점유 비중</span>
              <strong>${catShare}%</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-blue" style="width: ${Math.min(100, catShare)}%;"></div>
            </div>

            <div class="info-gauge-label-row" style="margin-top: 0.65rem;">
              <span>분야 내 신규사업 예산 비중</span>
              <strong>${total2027 > 0 ? ((newBudgetInCat / total2027) * 100).toFixed(1) : 0}% (${fmtNum(newBudgetInCat)}억)</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-orange" style="width: ${total2027 > 0 ? (newBudgetInCat / total2027) * 100 : 0}%;"></div>
            </div>
          </div>
        </div>

        <div class="info-details-pane">
          <!-- Category Primary Basis Box -->
          <div class="info-press-box">
            <div class="info-press-title-row">
              <span class="info-press-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                대표 추진 근거 및 보도자료 요약
              </span>
            </div>
            <p class="info-press-content">${escapeHtml(items[0] ? items[0].desc : '세부사업별 집중 투자 추진')}</p>
          </div>

          <!-- Included Projects Pills -->
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.35rem; text-transform:uppercase;">
              분야 소속 세부사업 목록 (클릭 시 해당 사업 인포그래픽 전환)
            </div>
            <div class="info-project-chips-list">
              ${items.map(it => `
                <div class="info-sub-item-badge" onclick="${it.isNew ? `selectNewProjectChip(${it.seq})` : `openModalBySeq(${it.seq})`}">
                  ${it.isNew ? '<span style="color:var(--accent-orange); font-weight:bold;">✨ [신규]</span>' : ''}
                  <span>${escapeHtml(it.projectName)}</span>
                  <strong>${fmtNum(it.budget2027)}억</strong>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Default All Overview Infographic
  function renderAllOverviewInfographic(totalAll, newProjects, newTotalAll) {
    const total2026 = state.normalizedData.reduce((acc, cur) => acc + cur.budget2026, 0);
    const diff = totalAll - total2026;
    const diffPct = total2026 > 0 ? ((diff / total2026) * 100).toFixed(1) : '0.0';

    DOM.dynamicInfographicBoard.innerHTML = `
      <div class="info-header">
        <div class="info-title-wrap">
          <div class="info-emblem emblem-purple">국방</div>
          <div>
            <div class="info-tagline text-blue">2027년 국방예산 정부안 편성 종합 인포그래픽</div>
            <h2 class="info-main-title">자주국방 확립 &middot; AI 첨단과학기술군 &middot; 장병 복무혁신</h2>
          </div>
        </div>
        <div class="info-mode-indicator">
          <span class="info-mode-pill pill-blue">8개 중점영역 &middot; 22개 핵심사업</span>
        </div>
      </div>

      <div class="info-content-grid">
        <div class="info-hero-stat-card">
          <div>
            <div class="info-stat-eyebrow">2027년 정부안 총 규모</div>
            <div class="info-hero-val" style="color: #1e3a8a;">
              ${fmtNum(totalAll)}<span class="info-hero-unit">억원</span>
            </div>
            <span class="badge-diff positive" style="font-size:0.8rem;">
              전년 대비 +${fmtNum(diff)}억원 (+${diffPct}% 증액)
            </span>
          </div>

          <div class="info-gauge-wrap">
            <div class="info-gauge-label-row">
              <span>신규사업 집중 투자액</span>
              <strong style="color: var(--accent-orange);">${fmtNum(newTotalAll)}억원 (${newProjects.length}개)</strong>
            </div>
            <div class="info-gauge-bar-bg">
              <div class="info-gauge-bar-fill fill-orange" style="width: 25%;"></div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
              💡 위의 <strong>분야별 버튼</strong> 또는 <strong>신규사업 버튼</strong>을 클릭하면 해당 대상의 맞춤형 인포그래픽으로 즉각 변경됩니다.
            </p>
          </div>
        </div>

        <div class="info-details-pane">
          <div class="info-press-box">
            <div class="info-press-title-row">
              <span class="info-press-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                2027년 국방예산 핵심 투자 방향성
              </span>
            </div>
            <p class="info-press-content">
              KF-21 양산 및 전작권 전환 핵심전력 34.9% 대폭 증액, AI·유무인 복합체계(MUM-T) 55.5% 증액,
              국방반도체 및 차세대 항공엔진 등 미래 기술주권 확보와 장병 단체상해보험 신설 등 복무체감 복지를 획기적으로 개선합니다.
            </p>
          </div>

          <div class="info-pillars-grid">
            <div class="info-pillar-card" style="cursor: pointer;" onclick="selectCategoryChip('① 자주국방 & 전작권 전환')">
              <div class="info-pillar-title">자주국방 & 전작권</div>
              <div class="info-pillar-value">121,744 억</div>
              <div class="info-pillar-sub">+31,522억 (+34.9%)</div>
            </div>

            <div class="info-pillar-card" style="cursor: pointer;" onclick="selectCategoryChip('③ AI·유무인 복합체계(MUM-T)')">
              <div class="info-pillar-title">AI·유무인 복합체계</div>
              <div class="info-pillar-value">8,157 억</div>
              <div class="info-pillar-sub">+3,189억 (+64.2%)</div>
            </div>

            <div class="info-pillar-card" style="cursor: pointer;" onclick="selectCategoryChip('⑥ 미래 국방기술 주권 확보')">
              <div class="info-pillar-title">미래기술 & 신규R&D</div>
              <div class="info-pillar-value">776 억</div>
              <div class="info-pillar-sub">국방반도체·첨단엔진</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // CORE DASHBOARD PROCESSING & CHARTS
  // =========================================================================
  function processData(items) {
    state.normalizedData = items;
    populateCategoryDropdowns();
    updateKPIs();
    renderSelectionChips();
    renderDynamicInfographic();
    renderOverviewTab();
    renderCategoriesTab();
    renderNewProjectsTab();
    filterAndRenderTable();
  }

  function populateCategoryDropdowns() {
    const categories = Array.from(new Set(state.normalizedData.map(d => d.category)));

    DOM.categorySelect.innerHTML = '<option value="ALL">전체 분야 한눈에 보기</option>' +
      categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    DOM.tableCategoryFilter.innerHTML = '<option value="ALL">모든 분야 보기</option>' +
      categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    DOM.catPillCount.textContent = categories.length;
  }

  function updateKPIs() {
    const data = state.normalizedData;
    const total2027 = data.reduce((acc, cur) => acc + cur.budget2027, 0);
    const total2026 = data.reduce((acc, cur) => acc + cur.budget2026, 0);
    const netDiff = total2027 - total2026;
    const diffPct = total2026 > 0 ? ((netDiff / total2026) * 100).toFixed(1) : '0.0';

    const newProjects = data.filter(d => d.isNew);
    const newBudgetTotal = newProjects.reduce((acc, cur) => acc + cur.budget2027, 0);
    const newBudgetShare = total2027 > 0 ? ((newBudgetTotal / total2027) * 100).toFixed(1) : '0.0';

    const categories = Array.from(new Set(data.map(d => d.category)));

    const catMap = {};
    data.forEach(d => {
      catMap[d.category] = (catMap[d.category] || 0) + d.budget2027;
    });
    let topCatName = '-';
    let topCatVal = 0;
    for (const [k, v] of Object.entries(catMap)) {
      if (v > topCatVal) {
        topCatVal = v;
        topCatName = k;
      }
    }

    DOM.kpiTotal2027.textContent = fmtNum(total2027);
    DOM.kpiTotal2026.textContent = fmtNum(total2026);
    DOM.kpiNetIncrease.textContent = (netDiff >= 0 ? '+' : '') + fmtNum(netDiff);

    DOM.kpiTotalDiff.textContent = `${netDiff >= 0 ? '+' : ''}${fmtNum(netDiff)}억원 (${netDiff >= 0 ? '+' : ''}${diffPct}%)`;
    DOM.kpiTotalDiff.className = `badge-diff ${netDiff >= 0 ? 'positive' : 'negative'}`;

    DOM.kpiNewProjectCount.textContent = newProjects.length;
    DOM.kpiNewBudgetTotal.textContent = fmtNum(newBudgetTotal);
    DOM.kpiNewBudgetShare.textContent = `${newBudgetShare}%`;
    DOM.tabNewBadge.textContent = newProjects.length;

    DOM.kpiCategoryCount.textContent = categories.length;
    DOM.kpiTotalProjectCount.textContent = data.length;
    DOM.kpiTopCategory.textContent = `${topCatName} (${fmtNum(topCatVal)}억)`;

    DOM.newProjectsBannerTotal.textContent = fmtNum(newBudgetTotal);
    DOM.newCardsCount.textContent = newProjects.length;
  }

  // Tab 1: Overview Tab
  function renderOverviewTab() {
    const data = state.normalizedData;

    const catTotals = {};
    const cat2026 = {};
    data.forEach(d => {
      catTotals[d.category] = (catTotals[d.category] || 0) + d.budget2027;
      cat2026[d.category] = (cat2026[d.category] || 0) + d.budget2026;
    });

    const labels = Object.keys(catTotals);
    const vals2027 = labels.map(l => catTotals[l]);
    const vals2026 = labels.map(l => cat2026[l]);

    // Donut Chart
    destroyChart('categoryShareChart');
    const ctxShare = document.getElementById('categoryShareChart');
    if (ctxShare) {
      state.charts['categoryShareChart'] = new Chart(ctxShare, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: vals2027,
            backgroundColor: PALETTE.slice(0, labels.length),
            borderWidth: 2,
            borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim()
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                font: { family: 'Pretendard', size: 11 },
                color: getTextColor()
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const total = vals2027.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${fmtNum(val)}억원 (${pct}%)`;
                }
              }
            }
          },
          cutout: '62%'
        }
      });
    }

    // Compare Bar Chart
    destroyChart('categoryCompareChart');
    const ctxCompare = document.getElementById('categoryCompareChart');
    if (ctxCompare) {
      state.charts['categoryCompareChart'] = new Chart(ctxCompare, {
        type: 'bar',
        data: {
          labels: labels.map(l => l.length > 12 ? l.slice(0, 12) + '...' : l),
          datasets: [
            {
              label: '2026년',
              data: vals2026,
              backgroundColor: 'rgba(100, 116, 139, 0.65)',
              borderRadius: 4
            },
            {
              label: '2027년 정부안',
              data: vals2027,
              backgroundColor: 'rgba(30, 58, 138, 0.85)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: getTextColor(), font: { size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: getTextColor(),
                callback: v => fmtNum(v)
              },
              grid: { color: getGridColor() }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: getTextColor(), font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: context => ` ${context.dataset.label}: ${fmtNum(context.raw)}억원`
              }
            }
          }
        }
      });
    }

    // Top 5 Increased
    const sortedByDiff = [...data].sort((a, b) => b.diff - a.diff).slice(0, 5);
    DOM.topIncreaseList.innerHTML = sortedByDiff.map((p, idx) => `
      <div class="top-list-item" onclick="openModalBySeq(${p.seq})">
        <div class="top-item-left">
          <span class="top-rank-badge">${idx + 1}</span>
          <div>
            <div class="top-item-title">${escapeHtml(p.projectName)}</div>
            <div class="top-item-cat">${escapeHtml(p.category)}</div>
          </div>
        </div>
        <div class="top-item-right">
          <div class="top-item-val">${fmtNum(p.budget2027)}억원</div>
          <div class="top-item-diff badge-diff ${p.diff >= 0 ? 'positive' : 'negative'}">
            ${p.diff >= 0 ? '+' : ''}${fmtNum(p.diff)}억 (${p.rate})
          </div>
        </div>
      </div>
    `).join('');

    // Top 5 New
    const newProjects = data.filter(d => d.isNew).sort((a, b) => b.budget2027 - a.budget2027).slice(0, 5);
    DOM.overviewNewProjectsList.innerHTML = newProjects.map((p, idx) => `
      <div class="top-list-item" onclick="selectNewProjectChip(${p.seq})">
        <div class="top-item-left">
          <span class="top-rank-badge" style="background: var(--accent-orange);">${idx + 1}</span>
          <div>
            <div class="top-item-title">${escapeHtml(p.projectName)}</div>
            <div class="top-item-cat">${escapeHtml(p.category)}</div>
          </div>
        </div>
        <div class="top-item-right">
          <div class="top-item-val" style="color: var(--accent-orange);">${fmtNum(p.budget2027)}억원</div>
          <span class="badge-diff positive">신규 편성</span>
        </div>
      </div>
    `).join('');
  }

  // Tab 2: Categories Deep Dive
  function renderCategoriesTab() {
    const data = state.normalizedData;
    const catGroups = {};

    data.forEach(d => {
      if (!catGroups[d.category]) {
        catGroups[d.category] = {
          name: d.category,
          items: [],
          total2026: 0,
          total2027: 0,
          newCount: 0
        };
      }
      catGroups[d.category].items.push(d);
      catGroups[d.category].total2026 += d.budget2026;
      catGroups[d.category].total2027 += d.budget2027;
      if (d.isNew) catGroups[d.category].newCount++;
    });

    const groupsArray = Object.values(catGroups);

    DOM.categoryCardsGrid.innerHTML = groupsArray.map(g => {
      const diff = g.total2027 - g.total2026;
      const ratePct = g.total2026 > 0 ? ((diff / g.total2026) * 100).toFixed(1) : '-';
      const isSelected = state.selectedCategory === g.name;

      return `
        <div class="sector-card ${isSelected ? 'selected' : ''}" onclick="selectCategoryChip('${escapeHtml(g.name)}')">
          <div class="sector-card-top">
            <span class="sector-name">${escapeHtml(g.name)}</span>
            <span class="badge-diff ${diff >= 0 ? 'positive' : 'negative'}">
              ${diff >= 0 ? '+' : ''}${ratePct !== '-' ? ratePct + '%' : '신규'}
            </span>
          </div>
          <div class="sector-budget-row">
            <span style="font-size: 0.8rem; color: var(--text-muted);">'27년 예산</span>
            <span class="sector-budget-val">${fmtNum(g.total2027)} 억원</span>
          </div>
          <div class="sector-meta-line">
            '26년: ${fmtNum(g.total2026)}억 &middot; 증감: ${diff >= 0 ? '+' : ''}${fmtNum(diff)}억 &middot; 사업 ${g.items.length}개
            ${g.newCount > 0 ? ` &middot; <strong style="color:var(--accent-orange)">신규 ${g.newCount}개</strong>` : ''}
          </div>
        </div>
      `;
    }).join('');

    renderCategoryDetailChart();
  }

  function renderCategoryDetailChart() {
    let targetItems = [];
    if (state.selectedCategory === 'ALL') {
      targetItems = state.normalizedData;
      DOM.catDetailTitle.textContent = '전체 세부사업 예산 현황 TOP 10';
      targetItems = [...targetItems].sort((a, b) => b.budget2027 - a.budget2027).slice(0, 10);
    } else {
      targetItems = state.normalizedData.filter(d => d.category === state.selectedCategory);
      DOM.catDetailTitle.textContent = `[${state.selectedCategory}] 세부 사업별 예산 및 증감 구조`;
    }

    destroyChart('categoryDetailChart');
    const ctx = document.getElementById('categoryDetailChart');
    if (!ctx) return;

    const labels = targetItems.map(d => d.projectName.length > 14 ? d.projectName.slice(0, 14) + '...' : d.projectName);
    const vals2026 = targetItems.map(d => d.budget2026);
    const vals2027 = targetItems.map(d => d.budget2027);

    state.charts['categoryDetailChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '2026년',
            data: vals2026,
            backgroundColor: 'rgba(148, 163, 184, 0.7)',
            borderRadius: 4
          },
          {
            label: '2027년 정부안',
            data: vals2027,
            backgroundColor: 'rgba(2, 132, 199, 0.85)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: getTextColor(), font: { size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: getTextColor(),
              callback: v => fmtNum(v)
            },
            grid: { color: getGridColor() }
          }
        },
        plugins: {
          legend: {
            labels: { color: getTextColor() }
          },
          tooltip: {
            callbacks: {
              label: context => ` ${context.dataset.label}: ${fmtNum(context.raw)}억원`
            }
          }
        }
      }
    });
  }

  // Tab 3: New Projects
  function renderNewProjectsTab() {
    const newItems = state.normalizedData.filter(d => d.isNew).sort((a, b) => b.budget2027 - a.budget2027);

    // Ranking Chart
    destroyChart('newProjectsRankingChart');
    const ctxRank = document.getElementById('newProjectsRankingChart');
    if (ctxRank) {
      const topNew = newItems.slice(0, 8);
      state.charts['newProjectsRankingChart'] = new Chart(ctxRank, {
        type: 'bar',
        data: {
          labels: topNew.map(d => d.projectName.length > 15 ? d.projectName.slice(0, 15) + '...' : d.projectName),
          datasets: [{
            label: '2027년 신규 예산',
            data: topNew.map(d => d.budget2027),
            backgroundColor: 'rgba(234, 88, 12, 0.85)',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: getTextColor(), callback: v => fmtNum(v) },
              grid: { color: getGridColor() }
            },
            y: {
              ticks: { color: getTextColor(), font: { size: 11 } },
              grid: { display: false }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: context => ` 예산: ${fmtNum(context.raw)}억원`
              }
            }
          }
        }
      });
    }

    // Sector Distribution Chart
    destroyChart('newProjectsSectorChart');
    const ctxSector = document.getElementById('newProjectsSectorChart');
    if (ctxSector) {
      const catCount = {};
      newItems.forEach(d => {
        catCount[d.category] = (catCount[d.category] || 0) + d.budget2027;
      });
      const labels = Object.keys(catCount);
      const values = Object.values(catCount);

      state.charts['newProjectsSectorChart'] = new Chart(ctxSector, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: PALETTE.slice(0, labels.length),
            borderWidth: 2,
            borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim()
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, font: { size: 10 }, color: getTextColor() }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${fmtNum(ctx.raw)}억원`
              }
            }
          },
          cutout: '55%'
        }
      });
    }

    // Cards Grid
    DOM.newProjectCardsGrid.innerHTML = newItems.map(p => `
      <div class="new-project-card" onclick="selectNewProjectChip(${p.seq})">
        <div>
          <span class="new-card-badge">신규 편성</span>
          <h4 class="new-card-title">${escapeHtml(p.projectName)}</h4>
          <p class="new-card-cat">${escapeHtml(p.category)}</p>
          <div class="new-card-desc">${escapeHtml(p.desc)}</div>
        </div>
        <div class="new-card-footer">
          <span style="font-size:0.8rem; color:var(--text-muted)">'27년 신규예산</span>
          <span class="new-card-budget">${fmtNum(p.budget2027)} 억원</span>
        </div>
      </div>
    `).join('');
  }

  // Tab 4: Data Grid
  function filterAndRenderTable() {
    let items = [...state.normalizedData];

    if (state.selectedCategory && state.selectedCategory !== 'ALL') {
      items = items.filter(d => d.category === state.selectedCategory);
    }

    if (state.typeFilter === 'NEW') {
      items = items.filter(d => d.isNew);
    } else if (state.typeFilter === 'EXISTING') {
      items = items.filter(d => !d.isNew);
    }

    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      items = items.filter(d =>
        d.projectName.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term) ||
        d.desc.toLowerCase().includes(term)
      );
    }

    const key = state.sortKey;
    const asc = state.sortAsc ? 1 : -1;
    items.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * asc;
      if (va > vb) return 1 * asc;
      return 0;
    });

    state.filteredData = items;
    DOM.tableFilteredCount.textContent = items.length;
    DOM.tableTotalCount.textContent = state.normalizedData.length;

    if (items.length === 0) {
      DOM.budgetTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            검색 및 필터 조건에 부합하는 데이터가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    DOM.budgetTableBody.innerHTML = items.map(d => {
      const diffClass = d.diff > 0 ? 'badge-diff positive' : (d.diff < 0 ? 'badge-diff negative' : '');
      const diffPrefix = d.diff > 0 ? '+' : '';
      const isHighlighted = state.selectedNewProjectSeq === d.seq;

      return `
        <tr onclick="${d.isNew ? `selectNewProjectChip(${d.seq})` : `openModalBySeq(${d.seq})`}" style="${isHighlighted ? 'background: rgba(234, 88, 12, 0.12);' : ''}">
          <td style="font-weight: 600; color: var(--text-muted);">${d.seq}</td>
          <td><span class="badge-tag badge-cat">${escapeHtml(d.category)}</span></td>
          <td>
            <strong style="color: var(--text-main);">${escapeHtml(d.projectName)}</strong>
            ${d.isNew ? '<span class="badge-tag badge-new">신규</span>' : ''}
          </td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(d.unit)}</td>
          <td class="text-right" style="font-family: monospace;">${fmtNum(d.budget2026)}</td>
          <td class="text-right" style="font-family: monospace; font-weight: 700; color: #1e3a8a;">${fmtNum(d.budget2027)}</td>
          <td class="text-right" style="font-family: monospace;">
            <span class="${diffClass}">${diffPrefix}${fmtNum(d.diff)}</span>
          </td>
          <td class="text-right">
            ${d.isNew ? '<span class="badge-tag badge-new">신규</span>' : `<span style="font-size:0.8rem; font-weight:600;">${d.rate}</span>`}
          </td>
          <td style="max-width: 380px; white-space: normal; line-height: 1.4; font-size: 0.825rem; color: var(--text-main);">
            ${escapeHtml(d.desc)}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Modal Handling
  window.openModalBySeq = function (seq) {
    const item = state.normalizedData.find(d => d.seq === seq);
    if (!item) return;

    DOM.modalCategoryBadge.textContent = item.category;
    DOM.modalTitle.textContent = item.projectName;
    DOM.modal2026.textContent = `${fmtNum(item.budget2026)} ${item.unit}`;
    DOM.modal2027.textContent = `${fmtNum(item.budget2027)} ${item.unit}`;

    const diffPrefix = item.diff > 0 ? '+' : '';
    DOM.modalDiff.textContent = `${diffPrefix}${fmtNum(item.diff)} ${item.unit}`;
    DOM.modalRate.textContent = item.isNew ? '신규 편성' : item.rate;

    DOM.modalDesc.textContent = item.desc;

    DOM.modalMetaList.innerHTML = `
      <li>&bull; <strong>사업 상태:</strong> ${item.isNew ? '<span style="color:var(--accent-orange); font-weight:bold;">2027년 신규 추진 과제</span>' : '기존 계속사업 (전년 대비 변동)'}</li>
      <li>&bull; <strong>예산 단위:</strong> ${item.unit}</li>
      <li>&bull; <strong>순증감률:</strong> ${item.isNew ? '신규 편성 (100% 순증)' : item.rate}</li>
    `;

    DOM.detailModal.classList.remove('hidden');
  };

  window.closeModal = function () {
    DOM.detailModal.classList.add('hidden');
  };

  window.switchTab = function (tabId) {
    state.activeTab = tabId;
    DOM.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    DOM.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    setTimeout(() => {
      Object.values(state.charts).forEach(c => c && c.resize && c.resize());
    }, 50);
  };

  function destroyChart(id) {
    if (state.charts[id]) {
      state.charts[id].destroy();
      delete state.charts[id];
    }
  }

  function getTextColor() {
    return state.theme === 'dark' ? '#94a3b8' : '#64748b';
  }

  function getGridColor() {
    return state.theme === 'dark' ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
  }

  // File Parsing
  function handleFile(file) {
    if (!file) return;
    const name = file.name;
    DOM.currentFileName.textContent = `데이터: ${name} (${(file.size / 1024).toFixed(1)} KB)`;

    const ext = name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
          DOM.sheetSelectorWrap.classList.add('hidden');
          processData(normalizeData(results.data));
        },
        error: function (err) {
          alert('CSV 파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          state.currentWorkbook = workbook;
          state.sheetNames = workbook.SheetNames;

          if (workbook.SheetNames.length > 1) {
            DOM.sheetSelectorWrap.classList.remove('hidden');
            DOM.sheetSelect.innerHTML = workbook.SheetNames.map((s, idx) =>
              `<option value="${idx}">${escapeHtml(s)}</option>`
            ).join('');
          } else {
            DOM.sheetSelectorWrap.classList.add('hidden');
          }

          loadSheet(workbook, workbook.SheetNames[0]);
        } catch (err) {
          alert('엑셀 파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('.xlsx, .xls, .csv 형식의 파일만 지원합니다.');
    }
  }

  function loadSheet(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const normalized = normalizeData(json);
    processData(normalized);
  }

  function exportToExcel() {
    const data = state.filteredData.map(d => ({
      '연번': d.seq,
      '분야 (중점영역)': d.category,
      '세부 사업 / 주요 지표': d.projectName,
      '구분/단위': d.unit,
      '2026년 (A)': d.budget2026,
      '2027년 정부안 (B)': d.budget2027,
      '증감 (B-A)': d.diff,
      '증가율 (%)': d.rate,
      '신규여부': d.isNew ? '신규' : '지속',
      '핵심 내용 및 보도자료 박스 원문 근거': d.desc
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '국방예산_대시보드');
    XLSX.writeFile(wb, `국방예산_분석_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportToCSV() {
    const data = state.filteredData.map(d => ({
      '연번': d.seq,
      '분야': d.category,
      '세부사업': d.projectName,
      '단위': d.unit,
      '2026년': d.budget2026,
      '2027년 정부안': d.budget2027,
      '증감': d.diff,
      '증가율': d.rate,
      '신규여부': d.isNew ? '신규' : '지속',
      '핵심내용': d.desc
    }));

    const csvStr = Papa.unparse(data);
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `국방예산_분석_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('budget_dashboard_theme', state.theme);
    applyTheme();
  }

  function applyTheme() {
    document.body.className = `theme-${state.theme}`;
    if (state.theme === 'dark') {
      DOM.themeIconSun.classList.add('hidden');
      DOM.themeIconMoon.classList.remove('hidden');
    } else {
      DOM.themeIconSun.classList.remove('hidden');
      DOM.themeIconMoon.classList.add('hidden');
    }

    renderOverviewTab();
    renderCategoryDetailChart();
    renderNewProjectsTab();
    renderDynamicInfographic();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initEvents() {
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    DOM.themeToggleBtn.addEventListener('click', toggleTheme);
    DOM.printBtn.addEventListener('click', () => window.print());

    DOM.templateDownloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.templateDownloadBtn.parentElement.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      DOM.templateDownloadBtn.parentElement.classList.remove('active');
    });

    DOM.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('dragover');
    });

    DOM.dropZone.addEventListener('dragleave', () => {
      DOM.dropZone.classList.remove('dragover');
    });

    DOM.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    DOM.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    DOM.sheetSelect.addEventListener('change', (e) => {
      if (state.currentWorkbook) {
        const sheetName = state.sheetNames[e.target.value];
        loadSheet(state.currentWorkbook, sheetName);
      }
    });

    DOM.resetSampleBtn.addEventListener('click', () => {
      if (window.DEFAULT_BUDGET_DATA) {
        DOM.currentFileName.textContent = '데이터: 2027년 국방예산 정부안 (기본 데이터)';
        DOM.sheetSelectorWrap.classList.add('hidden');
        state.selectedCategory = 'ALL';
        state.selectedNewProjectSeq = null;
        state.infographicMode = 'ALL';
        processData(normalizeData(window.DEFAULT_BUDGET_DATA));
      }
    });

    DOM.categorySelect.addEventListener('change', (e) => {
      selectCategoryChip(e.target.value);
    });

    DOM.tableSearchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value;
      filterAndRenderTable();
    });

    DOM.tableCategoryFilter.addEventListener('change', (e) => {
      selectCategoryChip(e.target.value);
    });

    DOM.tableTypeFilter.addEventListener('change', (e) => {
      state.typeFilter = e.target.value;
      if (e.target.value === 'NEW') {
        selectNewProjectChip('ALL_NEW');
      } else {
        filterAndRenderTable();
      }
    });

    DOM.exportExcelBtn.addEventListener('click', exportToExcel);
    DOM.exportCsvBtn.addEventListener('click', exportToCSV);

    DOM.tableHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortKey = key;
          state.sortAsc = true;
        }
        filterAndRenderTable();
      });
    });

    DOM.modalCloseBtn.addEventListener('click', closeModal);
    DOM.detailModal.addEventListener('click', (e) => {
      if (e.target === DOM.detailModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function init() {
    initDOMElements();
    initEvents();
    applyTheme();

    if (window.DEFAULT_BUDGET_DATA && window.DEFAULT_BUDGET_DATA.length > 0) {
      processData(normalizeData(window.DEFAULT_BUDGET_DATA));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
