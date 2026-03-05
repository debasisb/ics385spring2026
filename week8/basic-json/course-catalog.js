/**
 * course-catalog.js
 * ICS 385 Week 8 Basic Assignment – JSON Fundamentals
 * UH Maui College Course Catalog System
 *
 * Implements CourseCatalogManager class with:
 *  - JSON parsing and validation with error handling
 *  - Dynamic course card creation and display
 *  - Search (multi-field) and filtering (department / credits)
 *  - Search result caching for performance
 *  - Course detail modal
 *  - Add-new-course form with full validation
 *  - Export catalog as formatted JSON file
 *  - Enrollment statistics dashboard
 */

'use strict';

class CourseCatalogManager {
  constructor() {
    this.courseCatalog = null;   // Parsed JSON catalog object
    this.filteredCourses = [];   // Currently displayed courses
    this.currentDeptFilter = 'all';
    this.currentCreditsFilter = 'all';
    this.currentSearchTerm = '';
    this.searchCache = new Map(); // Cache keyed by "dept|credits|term"

    this.initializeApp();
  }

  /* =====================================================
     INITIALISATION
     ===================================================== */

  initializeApp() {
    try {
      this.setupEventListeners();
      this.loadSampleData();      // Auto-load sample data on startup
    } catch (error) {
      this.handleError('Application initialization failed', error);
    }
  }

  setupEventListeners() {
    // Search input – live search with debounce
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.currentSearchTerm = searchInput.value;
        this.applyFiltersAndSearch();
      }, 250);
    });

    // Clear search button
    document.getElementById('clearSearchBtn').addEventListener('click', () => {
      searchInput.value = '';
      this.currentSearchTerm = '';
      this.applyFiltersAndSearch();
    });

    // Department filter
    document.getElementById('departmentFilter').addEventListener('change', (e) => {
      this.currentDeptFilter = e.target.value;
      this.applyFiltersAndSearch();
    });

    // Credits filter
    document.getElementById('creditsFilter').addEventListener('change', (e) => {
      this.currentCreditsFilter = e.target.value;
      this.applyFiltersAndSearch();
    });

    // Load sample data button
    document.getElementById('loadSampleBtn').addEventListener('click', () => {
      this.loadSampleData();
    });

    // Export JSON button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportToJSON();
    });

    // Add New Course button → open form modal
    document.getElementById('addCourseBtn').addEventListener('click', () => {
      this.openAddCourseModal();
    });

    // Close detail modal
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      this.closeModal('courseModal');
    });

    // Close add-course modal
    document.getElementById('closeAddModalBtn').addEventListener('click', () => {
      this.closeModal('addCourseModal');
    });
    document.getElementById('cancelAddBtn').addEventListener('click', () => {
      this.closeModal('addCourseModal');
    });

    // Close modals when clicking the dark backdrop
    document.getElementById('courseModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal('courseModal');
    });
    document.getElementById('addCourseModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal('addCourseModal');
    });

    // Keyboard: Escape closes open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('courseModal');
        this.closeModal('addCourseModal');
      }
    });

    // Add-course form submission
    document.getElementById('addCourseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddCourseSubmit();
    });
  }

  /* =====================================================
     DATA LOADING
     ===================================================== */

  /**
   * Fetches sample-data.json via the Fetch API and loads it.
   * Falls back to an inline mini-catalog if fetch fails (e.g. file://).
   */
  loadSampleData() {
    fetch('sample-data.json')
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(jsonString => {
        this.loadCourseData(jsonString);
      })
      .catch(() => {
        // Fallback: load a small inline catalog so the page always works
        this.loadCourseData(JSON.stringify(this.getInlineFallbackData()));
      });
  }

  /**
   * Parse and load a JSON string into the catalog.
   * Performs structural validation before accepting the data.
   *
   * @param {string} jsonString – Raw JSON text
   */
  loadCourseData(jsonString) {
    try {
      // Guard: must be a non-empty string
      if (!jsonString || typeof jsonString !== 'string') {
        throw new Error('Invalid input: JSON string required');
      }

      // Parse JSON – throws SyntaxError on bad format
      const data = JSON.parse(jsonString);

      // Validate catalog structure
      this.validateCatalogStructure(data);

      // Store and display
      this.courseCatalog = data;
      this.searchCache.clear(); // Invalidate cache on new data
      this.applyFiltersAndSearch();
      this.displayStatistics();
      this.populateDepartmentFilter();

      const count = this.getAllCourses().length;
      this.showNotification(
        'Course catalog loaded successfully with ' + count + ' courses.',
        'success'
      );
      console.log('Course catalog loaded:', data);

    } catch (error) {
      console.error('JSON parsing error:', error);
      this.handleError('Failed to load course data', error);
    }
  }

  /* =====================================================
     VALIDATION
     ===================================================== */

  /**
   * Validates the top-level catalog structure.
   * Throws descriptive errors so callers can surface them to users.
   */
  validateCatalogStructure(data) {
    const required = ['university', 'semester', 'departments', 'metadata'];
    const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(data, field));

    if (missing.length > 0) {
      throw new Error('Missing required fields: ' + missing.join(', '));
    }

    if (!Array.isArray(data.departments) || data.departments.length === 0) {
      throw new Error('Departments array is required and must contain at least one department');
    }

    // Validate each department
    data.departments.forEach((dept, idx) => {
      if (!dept.code || !dept.name || !Array.isArray(dept.courses)) {
        throw new Error('Department ' + idx + ' missing required fields (code, name, courses)');
      }
    });
  }

  /**
   * Validates a single course object.
   * Returns { isValid: boolean, errors: string[] }
   */
  validateCourseData(course) {
    const errors = [];

    // Required string fields
    ['courseCode', 'title', 'description'].forEach(field => {
      if (!course[field] || typeof course[field] !== 'string' || course[field].trim().length === 0) {
        errors.push('Missing or invalid field: ' + field);
      }
    });

    // Credits: integer 1-6
    if (!course.credits || !Number.isInteger(course.credits) || course.credits < 1 || course.credits > 6) {
      errors.push('Credits must be an integer between 1 and 6');
    }

    // Instructor object
    if (!course.instructor || typeof course.instructor !== 'object') {
      errors.push('Instructor information is required');
    } else {
      if (!course.instructor.name || !course.instructor.email) {
        errors.push('Instructor name and email are required');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (course.instructor.email && !emailRegex.test(course.instructor.email)) {
        errors.push('Invalid instructor email format');
      }
    }

    // Schedule object
    if (!course.schedule || typeof course.schedule !== 'object') {
      errors.push('Schedule information is required');
    } else {
      if (!Array.isArray(course.schedule.days) || course.schedule.days.length === 0) {
        errors.push('Schedule days must be a non-empty array');
      }
      if (typeof course.schedule.capacity !== 'number' || course.schedule.capacity < 1) {
        errors.push('Schedule capacity must be a positive number');
      }
      if (typeof course.schedule.enrolled !== 'number' || course.schedule.enrolled < 0) {
        errors.push('Schedule enrolled must be a non-negative number');
      }
      if (course.schedule.enrolled > course.schedule.capacity) {
        errors.push('Enrolled students cannot exceed capacity');
      }
    }

    // Topics array
    if (!Array.isArray(course.topics)) {
      errors.push('Topics must be an array');
    } else if (course.topics.length === 0) {
      errors.push('At least one topic is required');
    }

    return { isValid: errors.length === 0, errors };
  }

  /* =====================================================
     DATA ACCESS HELPERS
     ===================================================== */

  /** Returns a flat array of all courses, each augmented with dept info. */
  getAllCourses() {
    if (!this.courseCatalog) return [];

    const all = [];
    this.courseCatalog.departments.forEach(dept => {
      dept.courses.forEach(course => {
        all.push({
          ...course,
          departmentCode: dept.code,
          departmentName: dept.name
        });
      });
    });
    return all;
  }

  /* =====================================================
     SEARCH & FILTER
     ===================================================== */

  /**
   * Central method – applies all active filters and the search term,
   * then re-renders the course grid.
   */
  applyFiltersAndSearch() {
    const cacheKey = this.currentDeptFilter + '|' + this.currentCreditsFilter + '|' + this.currentSearchTerm.toLowerCase().trim();

    if (this.searchCache.has(cacheKey)) {
      this.filteredCourses = this.searchCache.get(cacheKey);
      this.displayAllCourses();
      return;
    }

    let results = this.getAllCourses();

    // Department filter
    results = this.filterByDepartment(results, this.currentDeptFilter);

    // Credits filter
    results = this.filterByCredits(results, this.currentCreditsFilter);

    // Search term
    results = this.searchCourses(results, this.currentSearchTerm);

    // Cache and display
    this.searchCache.set(cacheKey, results);
    this.filteredCourses = results;
    this.displayAllCourses();
  }

  /**
   * Filters a courses array by department code.
   * @param {Array}  courses
   * @param {string} deptCode – 'all' means no filter
   */
  filterByDepartment(courses, deptCode) {
    if (!deptCode || deptCode === 'all') return courses;
    return courses.filter(c => c.departmentCode === deptCode);
  }

  /**
   * Filters a courses array by credit hours.
   * @param {Array}  courses
   * @param {string} credits – 'all' means no filter
   */
  filterByCredits(courses, credits) {
    if (!credits || credits === 'all') return courses;
    const num = parseInt(credits, 10);
    return courses.filter(c => c.credits === num);
  }

  /**
   * Multi-field search: courseCode, title, description, instructor name,
   * topics, and department name.
   * @param {Array}  courses
   * @param {string} query
   */
  searchCourses(courses, query) {
    const term = (query || '').toLowerCase().trim();
    if (!term) return courses;

    return courses.filter(course =>
      course.courseCode.toLowerCase().includes(term) ||
      course.title.toLowerCase().includes(term) ||
      course.description.toLowerCase().includes(term) ||
      course.instructor.name.toLowerCase().includes(term) ||
      course.topics.some(t => t.toLowerCase().includes(term)) ||
      course.departmentName.toLowerCase().includes(term)
    );
  }

  /* =====================================================
     DISPLAY
     ===================================================== */

  /** Renders all courses in this.filteredCourses into the grid container. */
  displayAllCourses() {
    const container = document.getElementById('coursesContainer');
    if (!container) {
      console.error('Courses container not found');
      return;
    }

    container.innerHTML = '';

    if (this.filteredCourses.length === 0) {
      container.innerHTML = '<div class="no-results">No courses found matching your criteria.</div>';
      this.updateDisplayStats();
      return;
    }

    const fragment = document.createDocumentFragment();
    this.filteredCourses.forEach(course => {
      fragment.appendChild(this.createCourseCard(course));
    });
    container.appendChild(fragment);

    this.updateDisplayStats();
  }

  /**
   * Creates and returns a course card DOM element.
   * @param {Object} course – Course object (augmented with departmentCode/Name)
   * @returns {HTMLElement}
   */
  createCourseCard(course) {
    const enrollmentPercent = Math.round(
      (course.schedule.enrolled / course.schedule.capacity) * 100
    );
    const enrollmentStatus =
      enrollmentPercent >= 90 ? 'full' :
      enrollmentPercent >= 70 ? 'filling' : 'open';

    const enrollmentLabel =
      enrollmentStatus === 'full'    ? 'Nearly Full' :
      enrollmentStatus === 'filling' ? 'Filling Up'  : 'Open';

    const card = document.createElement('div');
    card.className = 'course-card';
    card.dataset.courseCode = course.courseCode;

    // Safely escape string content to prevent XSS
    card.innerHTML =
      '<div class="course-header">' +
        '<h3 class="course-code">' + this.escapeHTML(course.courseCode) + '</h3>' +
        '<span class="credits">' + course.credits + ' cr</span>' +
      '</div>' +
      '<h4 class="course-title">' + this.escapeHTML(course.title) + '</h4>' +
      '<p class="course-description">' + this.escapeHTML(this.truncateText(course.description, 110)) + '</p>' +
      '<div class="instructor-info"><strong>Instructor:</strong> ' + this.escapeHTML(course.instructor.name) + '</div>' +
      '<div class="schedule-info"><strong>Schedule:</strong> ' +
        this.escapeHTML(course.schedule.days.join(', ')) + ' &bull; ' +
        this.escapeHTML(course.schedule.time) +
      '</div>' +
      '<div class="enrollment-info ' + enrollmentStatus + '">' +
        'Enrolled: ' + course.schedule.enrolled + '/' + course.schedule.capacity +
        ' (' + enrollmentPercent + '%) &ndash; ' + enrollmentLabel +
      '</div>' +
      '<div class="topics">' +
        course.topics.map(t => '<span class="topic-tag">' + this.escapeHTML(t) + '</span>').join('') +
      '</div>' +
      '<button class="details-btn">View Details</button>';

    card.querySelector('.details-btn').addEventListener('click', () => {
      this.showCourseDetails(course.courseCode);
    });

    return card;
  }

  /** Updates the stats bar (total, departments, avg enrollment, showing). */
  displayStatistics() {
    if (!this.courseCatalog) return;

    const allCourses = this.getAllCourses();
    const totalDepts  = this.courseCatalog.departments.length;

    // Average enrollment across all courses
    const avgEnrollment = allCourses.length > 0
      ? Math.round(
          allCourses.reduce((sum, c) =>
            sum + (c.schedule.enrolled / c.schedule.capacity) * 100, 0
          ) / allCourses.length
        )
      : 0;

    this.setStatText('totalCourses', allCourses.length);
    this.setStatText('totalDepartments', totalDepts);
    this.setStatText('averageEnrollment', avgEnrollment + '%');
  }

  updateDisplayStats() {
    this.setStatText('displayedCourses', this.filteredCourses.length);
    // Refresh totals/avg as well (in case courses were added)
    this.displayStatistics();
  }

  setStatText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /** Repopulates the department filter <select> from current catalog data. */
  populateDepartmentFilter() {
    if (!this.courseCatalog) return;
    const select = document.getElementById('departmentFilter');

    // Keep only the first "All Departments" option, then rebuild
    while (select.options.length > 1) select.remove(1);

    this.courseCatalog.departments.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept.code;
      opt.textContent = dept.name + ' (' + dept.code + ')';
      select.appendChild(opt);
    });
  }

  /* =====================================================
     COURSE DETAIL MODAL
     ===================================================== */

  /**
   * Finds a course by code and renders its full details in the modal.
   * @param {string} courseCode
   */
  showCourseDetails(courseCode) {
    const course = this.getAllCourses().find(c => c.courseCode === courseCode);
    if (!course) {
      this.showNotification('Course not found: ' + courseCode, 'error');
      return;
    }

    const enrollmentPercent = Math.round(
      (course.schedule.enrolled / course.schedule.capacity) * 100
    );
    const enrollmentStatus =
      enrollmentPercent >= 90 ? 'full' :
      enrollmentPercent >= 70 ? 'filling' : 'open';

    const prereqs = course.prerequisites && course.prerequisites.length > 0
      ? course.prerequisites.join(', ')
      : 'None';

    const assignmentRows = (course.assignments || []).map(a =>
      '<div class="assignment-item">' +
        '<span>' + this.escapeHTML(a.name) + '</span>' +
        '<span>Due: ' + this.escapeHTML(a.dueDate) + '</span>' +
        '<span class="pts">' + a.points + ' pts</span>' +
      '</div>'
    ).join('');

    document.getElementById('modalBody').innerHTML =
      '<h2 id="modalTitle">' + this.escapeHTML(course.courseCode) + ' &ndash; ' + this.escapeHTML(course.title) + '</h2>' +
      '<p class="modal-subtitle">' + this.escapeHTML(course.departmentName) + ' &bull; ' + course.credits + ' Credits</p>' +

      '<div class="modal-section">' +
        '<h3>Description</h3>' +
        '<p>' + this.escapeHTML(course.description) + '</p>' +
      '</div>' +

      '<div class="modal-section">' +
        '<h3>Instructor</h3>' +
        '<p><strong>' + this.escapeHTML(course.instructor.name) + '</strong></p>' +
        '<p>Email: ' + this.escapeHTML(course.instructor.email) + '</p>' +
        (course.instructor.office ? '<p>Office: ' + this.escapeHTML(course.instructor.office) + '</p>' : '') +
      '</div>' +

      '<div class="modal-section">' +
        '<h3>Schedule</h3>' +
        '<p><strong>Days:</strong> ' + this.escapeHTML(course.schedule.days.join(', ')) + '</p>' +
        '<p><strong>Time:</strong> ' + this.escapeHTML(course.schedule.time) + '</p>' +
        '<p><strong>Location:</strong> ' + this.escapeHTML(course.schedule.location || 'TBD') + '</p>' +
        '<div class="enrollment-info ' + enrollmentStatus + '" style="margin-top:0.5rem">' +
          'Enrollment: ' + course.schedule.enrolled + ' / ' + course.schedule.capacity + ' (' + enrollmentPercent + '%)' +
        '</div>' +
      '</div>' +

      '<div class="modal-section">' +
        '<h3>Prerequisites</h3>' +
        '<p>' + this.escapeHTML(prereqs) + '</p>' +
      '</div>' +

      '<div class="modal-section">' +
        '<h3>Topics Covered</h3>' +
        '<div class="topics">' +
          course.topics.map(t => '<span class="topic-tag">' + this.escapeHTML(t) + '</span>').join('') +
        '</div>' +
      '</div>' +

      (assignmentRows
        ? '<div class="modal-section">' +
            '<h3>Assignments</h3>' +
            '<div class="assignment-list">' + assignmentRows + '</div>' +
          '</div>'
        : '');

    this.openModal('courseModal');
  }

  /* =====================================================
     ADD NEW COURSE FORM
     ===================================================== */

  openAddCourseModal() {
    document.getElementById('addCourseForm').reset();
    this.clearFormErrors();
    this.openModal('addCourseModal');
  }

  /**
   * Reads the add-course form, validates, builds a course object,
   * and inserts it into the appropriate department.
   */
  handleAddCourseSubmit() {
    this.clearFormErrors();

    const getValue = id => document.getElementById(id).value.trim();

    const deptCode = getValue('newDepartment');
    const course = {
      courseCode:    getValue('newCourseCode'),
      title:         getValue('newTitle'),
      description:   getValue('newDescription'),
      credits:       parseInt(getValue('newCredits'), 10) || 0,
      prerequisites: getValue('newPrerequisites')
        ? getValue('newPrerequisites').split(',').map(s => s.trim()).filter(Boolean)
        : [],
      instructor: {
        name:   getValue('newInstructorName'),
        email:  getValue('newInstructorEmail'),
        office: getValue('newInstructorOffice')
      },
      schedule: {
        days:     getValue('newScheduleDays')
          ? getValue('newScheduleDays').split(',').map(s => s.trim()).filter(Boolean)
          : [],
        time:     getValue('newScheduleTime'),
        location: getValue('newLocation'),
        capacity: parseInt(getValue('newCapacity'), 10) || 0,
        enrolled: 0
      },
      isActive: true,
      topics: getValue('newTopics')
        ? getValue('newTopics').split(',').map(s => s.trim()).filter(Boolean)
        : [],
      assignments: []
    };

    // Validate department selection
    if (!deptCode) {
      this.showFieldError('errDepartment', 'Please select a department');
      document.getElementById('newDepartment').classList.add('invalid');
      return;
    }

    // Validate the course object
    const { isValid, errors } = this.validateCourseData(course);

    if (!isValid) {
      this.mapErrorsToFields(errors);
      return;
    }

    // Check for duplicate course code
    const existing = this.getAllCourses().find(c => c.courseCode === course.courseCode);
    if (existing) {
      this.showFieldError('errCourseCode', 'Course code already exists');
      document.getElementById('newCourseCode').classList.add('invalid');
      return;
    }

    // Find the department and add the course
    const dept = this.courseCatalog.departments.find(d => d.code === deptCode);
    if (!dept) {
      this.showNotification('Selected department not found in catalog.', 'error');
      return;
    }

    dept.courses.push(course);

    // Update metadata
    this.courseCatalog.metadata.totalCourses += 1;
    this.courseCatalog.metadata.totalCreditsOffered += course.credits;

    // Refresh
    this.searchCache.clear();
    this.applyFiltersAndSearch();
    this.displayStatistics();
    this.closeModal('addCourseModal');
    this.showNotification(
      'Course "' + course.courseCode + ' – ' + course.title + '" added successfully!',
      'success'
    );
  }

  /**
   * Maps validation error strings to specific form field error spans.
   * Falls back to a generic notification for unrecognised errors.
   */
  mapErrorsToFields(errors) {
    const map = {
      'courseCode': 'errCourseCode',
      'title':      'errTitle',
      'description':'errDescription',
      'Credits':    'errCredits',
      'Instructor name': 'errInstructorName',
      'email':      'errInstructorEmail',
      'Schedule days': 'errScheduleDays',
      'Schedule capacity': 'errCapacity',
      'topics':     'errTopics'
    };

    let unhandled = [];
    errors.forEach(err => {
      let shown = false;
      Object.entries(map).forEach(([keyword, spanId]) => {
        if (err.toLowerCase().includes(keyword.toLowerCase())) {
          this.showFieldError(spanId, err);
          shown = true;
        }
      });
      if (!shown) unhandled.push(err);
    });

    if (unhandled.length > 0) {
      this.showNotification('Validation errors: ' + unhandled.join('; '), 'error');
    }
  }

  clearFormErrors() {
    document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.invalid').forEach(el => { el.classList.remove('invalid'); });
  }

  showFieldError(spanId, message) {
    const span = document.getElementById(spanId);
    if (span) span.textContent = message;
  }

  /* =====================================================
     EXPORT
     ===================================================== */

  /**
   * Serialises the current catalog to a formatted JSON string and
   * triggers a browser file download.
   */
  exportToJSON() {
    if (!this.courseCatalog) {
      this.showNotification('No catalog data to export.', 'error');
      return;
    }

    try {
      const jsonString = JSON.stringify(this.courseCatalog, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'course-catalog-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Catalog exported as JSON successfully.', 'success');
      console.log('Exported JSON:', jsonString);
    } catch (error) {
      this.handleError('Export failed', error);
    }
  }

  /* =====================================================
     MODAL HELPERS
     ===================================================== */

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      // Focus the close button for accessibility
      const closeBtn = modal.querySelector('.close-btn');
      if (closeBtn) closeBtn.focus();
    }
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  /* =====================================================
     NOTIFICATIONS & ERROR HANDLING
     ===================================================== */

  /**
   * Displays a transient notification banner.
   * @param {string} message
   * @param {'success'|'error'} type
   */
  showNotification(message, type) {
    const area = document.getElementById('notificationArea');
    if (!area) return;

    const note = document.createElement('div');
    note.className = 'notification ' + type;
    note.textContent = (type === 'success' ? '✓ ' : '✗ ') + message;
    area.appendChild(note);

    setTimeout(() => {
      note.style.opacity = '0';
      note.style.transition = 'opacity 0.4s';
      setTimeout(() => note.remove(), 400);
    }, 4000);
  }

  /**
   * Centralised error handler – logs technical details and shows a
   * user-friendly message.
   */
  handleError(operation, error) {
    let userMessage;

    if (error instanceof SyntaxError) {
      userMessage = 'Invalid JSON format: Please check your data structure.';
    } else if (error.message && error.message.includes('Missing required fields')) {
      userMessage = 'Data validation failed: ' + error.message;
    } else if (error.message && error.message.toLowerCase().includes('network')) {
      userMessage = 'Network error: Please check your connection.';
    } else {
      userMessage = operation + ' failed: ' + (error.message || 'Unknown error');
    }

    console.error('JSON Operation Error:', {
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    this.showNotification(userMessage, 'error');
  }

  /* =====================================================
     UTILITY HELPERS
     ===================================================== */

  /**
   * Truncates text to maxLength characters, appending '…' if needed.
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length <= maxLength ? text : text.slice(0, maxLength).trimEnd() + '…';
  }

  /**
   * Escapes HTML special characters to prevent XSS when injecting
   * user-sourced JSON values into innerHTML.
   */
  escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* =====================================================
     INLINE FALLBACK DATA
     ===================================================== */

  /**
   * Minimal catalog returned when sample-data.json cannot be fetched
   * (e.g. when opening index.html directly via file://).
   */
  getInlineFallbackData() {
    return {
      university: 'University of Hawaii Maui College',
      semester: 'Spring 2026',
      lastUpdated: '2026-03-03',
      departments: [
        {
          code: 'ICS',
          name: 'Information and Computer Sciences',
          chair: 'Dr. Jane Smith',
          courses: [
            {
              courseCode: 'ICS 385',
              title: 'Web Development and Administration',
              credits: 3,
              description: 'Detailed knowledge of web page authoring and server-side programming using HTML, CSS, JavaScript, and Node.js.',
              prerequisites: ['ICS 320'],
              instructor: {
                name: 'Dr. Debasis Bhattacharya',
                email: 'debasisb@hawaii.edu',
                office: 'Kaaike 114'
              },
              schedule: {
                days: ['Tuesday'],
                time: '4:30 PM - 5:45 PM',
                location: 'Online (Zoom)',
                capacity: 25,
                enrolled: 18
              },
              isActive: true,
              topics: ['HTML', 'CSS', 'JavaScript', 'Node.js', 'APIs', 'React'],
              assignments: [
                { name: 'Week 1 - Setup', points: 1, dueDate: '2026-01-19' },
                { name: 'Week 8 - JSON', points: 1, dueDate: '2026-03-05' }
              ]
            }
          ]
        },
        {
          code: 'MATH',
          name: 'Mathematics',
          chair: 'Dr. Robert Johnson',
          courses: [
            {
              courseCode: 'MATH 140',
              title: 'Calculus I',
              credits: 4,
              description: 'Limits, derivatives, applications of derivatives, introduction to integration.',
              prerequisites: ['MATH 135'],
              instructor: {
                name: 'Dr. Sarah Wilson',
                email: 'sarahw@hawaii.edu',
                office: 'Academic Center 201'
              },
              schedule: {
                days: ['Monday', 'Wednesday', 'Friday'],
                time: '10:00 AM - 10:50 AM',
                location: 'AC 105',
                capacity: 30,
                enrolled: 25
              },
              isActive: true,
              topics: ['Limits', 'Derivatives', 'Integration', 'Applications'],
              assignments: [
                { name: 'Homework 1', points: 10, dueDate: '2026-01-20' },
                { name: 'Midterm Exam', points: 100, dueDate: '2026-03-15' }
              ]
            }
          ]
        }
      ],
      metadata: {
        totalCourses: 2,
        totalDepartments: 2,
        totalCreditsOffered: 7,
        academicYear: '2025-2026'
      }
    };
  }
}

/* =====================================================
   Bootstrap – initialise after DOM is ready
   ===================================================== */
document.addEventListener('DOMContentLoaded', function () {
  window.app = new CourseCatalogManager();
});
