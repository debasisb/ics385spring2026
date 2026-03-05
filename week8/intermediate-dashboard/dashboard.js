/**
 * dashboard.js
 * ICS 385 Week 8 Intermediate Assignment – Multi-API Dashboard
 * Main dashboard controller – orchestrates all widgets and API calls
 */

'use strict';

class CampusDashboard {
  constructor() {
    this.config      = appConfig;            // SecureConfig instance (config.js)
    this.apiClient   = new UnifiedApiClient(this.config); // api-client.js
    this.courseData  = new CourseDataManager();           // course-catalog.js
    this.lastUpdated = new Map();
    this.refreshTimers = new Map();
    this.initialize();
  }

  /* =====================================================
     BOOT
     ===================================================== */

  async initialize() {
    try {
      this.setupEventListeners();
      this.showLoadingState();
      this.initializeApiKeySetup();
      await this.loadInitialData();
      this.startAutoRefresh();
      this.showWelcomeMessage();
    } catch (error) {
      this.handleInitializationError(error);
    } finally {
      this.hideLoadingState();
    }
  }

  initializeApiKeySetup() {
    if (!this.config.areApiKeysConfigured()) {
      this.showApiKeySetupModal();
    }
  }

  async loadInitialData() {
    await this.loadCourseData();
    // Weather and jokes run concurrently
    await Promise.allSettled([
      this.loadWeatherData(),
      this.loadHumorData()
    ]);
    this.updateDashboardStats();
  }

  /* =====================================================
     COURSE DATA
     ===================================================== */

  async loadCourseData() {
    try {
      await this.courseData.loadFromUrl('./sample-data.json');
      this.renderCourseWidget();
    } catch (error) {
      console.error('[Dashboard] Course data failed:', error);
      this.showWidgetError('coursesContainer', 'Unable to load course catalog.');
    }
  }

  renderCourseWidget(query = '', dept = 'all', credits = 'all') {
    const container = document.getElementById('coursesContainer');
    if (!container) return;

    const courses = this.courseData.search(query, dept, credits);

    if (courses.length === 0) {
      container.innerHTML = '<p class="no-results">No courses match your search.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    courses.forEach(c => fragment.appendChild(this.createCourseCard(c)));
    container.innerHTML = '';
    container.appendChild(fragment);

    // Populate department dropdown once
    const deptSelect = document.getElementById('departmentFilter');
    if (deptSelect && deptSelect.options.length <= 1) {
      this.courseData.getDepartments().forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.code;
        opt.textContent = d.name;
        deptSelect.appendChild(opt);
      });
    }
  }

  createCourseCard(course) {
    const enrolled  = course.schedule?.enrolled  || 0;
    const capacity  = course.schedule?.capacity  || 1;
    const pct       = Math.round((enrolled / capacity) * 100);
    const statusCls = pct >= 90 ? 'full' : pct >= 70 ? 'high' : 'available';

    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-card-header">
        <span class="course-code">${this.esc(course.courseCode)}</span>
        <span class="dept-badge">${this.esc(course.departmentCode)}</span>
      </div>
      <h4 class="course-title">${this.esc(course.title)}</h4>
      <p class="course-instructor">${this.esc(course.instructor?.name || '')}</p>
      <p class="course-desc">${this.esc((course.description || '').slice(0, 100))}…</p>
      <div class="enrollment-bar">
        <div class="bar-fill ${statusCls}" style="width:${pct}%"></div>
      </div>
      <div class="course-meta">
        <span>${enrolled}/${capacity} enrolled</span>
        <span>${course.credits} cr</span>
      </div>`;
    return card;
  }

  /* =====================================================
     WEATHER WIDGET
     ===================================================== */

  async loadWeatherData() {
    try {
      const city = this.config.getAppConfig().defaultCity;
      const data = await this.apiClient.getWeather(city);
      this.displayWeatherWidget(data);
      this.lastUpdated.set('weather', Date.now());
    } catch (error) {
      console.error('[Dashboard] Weather failed:', error);
      this.displayWeatherError();
    }
  }

  displayWeatherWidget(data) {
    const el = document.getElementById('weather-widget');
    if (!el) return;
    const isErr  = data.error;
    const temp   = Math.round(data.main?.temp   || 0);
    const humid  = data.main?.humidity || '--';
    const wind   = data.wind?.speed    || '--';
    const desc   = data.weather?.[0]?.description || '';
    const icon   = data.weather?.[0]?.icon;
    const iconSrc = icon
      ? `https://openweathermap.org/img/wn/${icon}@2x.png`
      : '';

    el.innerHTML = `
      <div class="widget-header">
        <h3>Campus Weather</h3>
        <span class="last-updated">${this.getTimeAgo('weather')}</span>
      </div>
      <div class="weather-content${isErr ? ' error-state' : ''}">
        ${iconSrc ? `<img src="${iconSrc}" alt="${this.esc(desc)}" class="weather-icon">` : ''}
        <div class="weather-main">
          <div class="location">${this.esc(data.name || 'Kahului')}, HI</div>
          <div class="temperature">${temp}°F</div>
          <div class="description">${this.esc(desc)}</div>
        </div>
        <div class="weather-details">
          <span>Humidity: ${humid}%</span>
          <span>Wind: ${wind} mph</span>
        </div>
        ${isErr ? `<p class="error-message">${this.esc(data.message)}</p>` : ''}
      </div>`;
  }

  displayWeatherError() {
    const el = document.getElementById('weather-widget');
    if (el) el.innerHTML = `
      <div class="widget-header"><h3>Campus Weather</h3></div>
      <div class="weather-content error-state">
        <p class="error-message">Weather data unavailable. Check your OpenWeatherMap API key.</p>
        <button class="refresh-btn" onclick="dashboard.loadWeatherData()">Retry</button>
      </div>`;
  }

  /* =====================================================
     HUMOR WIDGET
     ===================================================== */

  async loadHumorData() {
    try {
      const jokes = await this.apiClient.getAllJokes();
      this.displayHumorWidget(jokes);
      this.lastUpdated.set('humor', Date.now());
    } catch (error) {
      console.error('[Dashboard] Humor failed:', error);
      this.displayHumorError();
    }
  }

  displayHumorWidget(jokes) {
    const el = document.getElementById('humor-widget');
    if (!el) return;

    const chuckText = jokes.chuck
      ? this.esc(jokes.chuck.value || jokes.chuck.joke || 'No fact available')
      : 'Chuck Norris API unavailable';

    const progText = jokes.programming
      ? this.esc(
          jokes.programming.joke ||
          (jokes.programming.setup + ' ' + jokes.programming.delivery) ||
          'No joke available'
        )
      : 'Programming jokes API unavailable';

    el.innerHTML = `
      <div class="widget-header">
        <h3>Campus Humor</h3>
        <button class="refresh-btn" onclick="dashboard.refreshHumor()">New Jokes</button>
      </div>
      <div class="humor-content">
        <div class="joke-section">
          <h4>Chuck Norris Fact</h4>
          <p class="joke-text">${chuckText}</p>
        </div>
        <div class="joke-section">
          <h4>Programming Humor</h4>
          <p class="joke-text">${progText}</p>
        </div>
      </div>`;
  }

  displayHumorError() {
    const el = document.getElementById('humor-widget');
    if (el) el.innerHTML = `
      <div class="widget-header"><h3>Campus Humor</h3></div>
      <div class="humor-content error-state">
        <p class="error-message">Humor data unavailable.</p>
        <button class="refresh-btn" onclick="dashboard.refreshHumor()">Retry</button>
      </div>`;
  }

  /* =====================================================
     STATISTICS WIDGET
     ===================================================== */

  updateDashboardStats() {
    const stats       = this.courseData.getStats();
    const apiStatus   = this.lastUpdated.has('weather') ? 'Connected' : 'Offline';

    this.setText('total-courses',  stats.totalCourses);
    this.setText('total-students', stats.totalEnrolled);
    this.setText('avg-capacity',   stats.avgCapacityPct + '%');
    this.setText('api-status',     apiStatus);
  }

  /* =====================================================
     REFRESH & AUTO-REFRESH
     ===================================================== */

  startAutoRefresh() {
    const interval = this.config.getAppConfig().refreshInterval;
    this.refreshTimers.set('weather',
      setInterval(() => this.loadWeatherData(), interval)
    );
    this.refreshTimers.set('time',
      setInterval(() => this.updateTimeDisplays(), 60 * 1000)
    );
  }

  stopAutoRefresh() {
    this.refreshTimers.forEach(id => clearInterval(id));
    this.refreshTimers.clear();
  }

  async refreshWeather() {
    this.apiClient.clearCache('openWeather');
    await this.loadWeatherData();
    this.updateDashboardStats();
  }

  async refreshHumor() {
    const btn = document.querySelector('#humor-widget .refresh-btn');
    if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
    this.apiClient.clearCache('rapidApi');
    this.apiClient.clearCache('jokeApi');
    try {
      await this.loadHumorData();
    } finally {
      // Button is re-created by displayHumorWidget, so no need to reset
    }
  }

  updateTimeDisplays() {
    const weatherTime = document.querySelector('#weather-widget .last-updated');
    if (weatherTime) weatherTime.textContent = this.getTimeAgo('weather');
  }

  /* =====================================================
     QUICK ACTIONS
     ===================================================== */

  addNewCourse() {
    document.getElementById('addCourseModal').style.display = 'flex';
  }

  submitNewCourse() {
    const code    = document.getElementById('newCourseCode').value.trim().toUpperCase();
    const title   = document.getElementById('newCourseTitle').value.trim();
    const credits = parseInt(document.getElementById('newCourseCredits').value, 10);
    const dept    = document.getElementById('newCourseDept').value;
    const instrName = document.getElementById('newCourseInstructor').value.trim();
    const errEl   = document.getElementById('addCourseError');

    const course = {
      courseCode: code,
      title,
      credits,
      description: document.getElementById('newCourseDesc').value.trim(),
      prerequisites: [],
      instructor: { name: instrName, email: '', office: '' },
      schedule: { days: [], time: '', location: '', capacity: 25, enrolled: 0 },
      isActive: true,
      topics: [],
      assignments: []
    };

    try {
      this.courseData.addCourse(dept, course);
      document.getElementById('addCourseModal').style.display = 'none';
      document.getElementById('addCourseForm').reset();
      this.renderCourseWidget();
      this.updateDashboardStats();
      this.showToast('Course added successfully!', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  }

  exportData() {
    try {
      this.courseData.exportJSON();
      this.showToast('Course catalog exported as JSON.', 'success');
    } catch (err) {
      this.showToast('Export failed: ' + err.message, 'error');
    }
  }

  /* =====================================================
     API KEY MANAGEMENT
     ===================================================== */

  showApiKeySetupModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) modal.style.display = 'flex';
  }

  saveApiKeys() {
    const owKey  = document.getElementById('openWeatherKey').value.trim();
    const rapKey = document.getElementById('rapidApiKey').value.trim();
    const errEl  = document.getElementById('apiKeyError');

    if (!owKey && !rapKey) {
      errEl.textContent = 'Please enter at least one API key.';
      errEl.style.display = 'block';
      return;
    }
    if (owKey)  localStorage.setItem('openweather_api_key', owKey);
    if (rapKey) localStorage.setItem('rapidapi_api_key',    rapKey);

    document.getElementById('apiKeyModal').style.display = 'none';
    this.showToast('API keys saved. Reloading data…', 'success');
    // Reload data with the new keys (no full page reload needed)
    this.apiClient.cache.clear();
    Promise.allSettled([this.loadWeatherData(), this.loadHumorData()])
      .then(() => this.updateDashboardStats());
  }

  /* =====================================================
     UI HELPERS
     ===================================================== */

  setupEventListeners() {
    // Course search / filter
    const searchInput = document.getElementById('courseSearch');
    const deptFilter  = document.getElementById('departmentFilter');
    const creditFilter = document.getElementById('creditsFilter');
    let debounce;

    const applyFilters = () => {
      const q  = searchInput?.value  || '';
      const d  = deptFilter?.value   || 'all';
      const cr = creditFilter?.value || 'all';
      this.renderCourseWidget(q, d, cr);
    };

    searchInput?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(applyFilters, 300);
    });
    deptFilter?.addEventListener('change',  applyFilters);
    creditFilter?.addEventListener('change', applyFilters);

    // Header buttons
    document.getElementById('settingsBtn')
      ?.addEventListener('click', () => this.showApiKeySetupModal());
    document.getElementById('refreshAllBtn')
      ?.addEventListener('click', () => this.refreshAll());

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  }

  async refreshAll() {
    this.showToast('Refreshing all data…', 'info');
    this.apiClient.cache.clear();
    await Promise.allSettled([
      this.loadWeatherData(),
      this.loadHumorData()
    ]);
    this.updateDashboardStats();
  }

  showLoadingState() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hideLoadingState() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  showErrorState(msg) {
    this.showToast(msg, 'error');
  }

  showWidgetError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<p class="error-message">${this.esc(msg)}</p>`;
  }

  showWelcomeMessage() {
    const city = this.config.getAppConfig().defaultCity;
    this.showToast(`Welcome to the UH Maui Campus Dashboard – ${city}!`, 'info');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, this.config.getUiConfig().toastDuration);
  }

  handleInitializationError(error) {
    console.error('[Dashboard] Init failed:', error);
    const container = document.getElementById('dashboard-container');
    if (container) {
      container.innerHTML = `
        <div class="init-error">
          <h2>Dashboard Failed to Initialize</h2>
          <p>${this.esc(error.message)}</p>
          <button onclick="location.reload()">Retry</button>
        </div>`;
    }
  }

  getTimeAgo(service) {
    if (!this.lastUpdated.has(service)) return 'Never updated';
    const mins = Math.floor((Date.now() - this.lastUpdated.get(service)) / 60000);
    return mins === 0 ? 'Just now' : `${mins} min ago`;
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /** XSS-safe text injection */
  esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Boot after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new CampusDashboard();
});
