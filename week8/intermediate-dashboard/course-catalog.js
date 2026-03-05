/**
 * course-catalog.js
 * ICS 385 Week 8 Intermediate Assignment – Multi-API Dashboard
 * Course data manager: JSON loading, validation, search, and filter.
 * Pure data layer – no direct DOM manipulation – used by dashboard.js.
 */

'use strict';

class CourseDataManager {
  constructor() {
    this.catalogData   = null;   // Full parsed catalog object
    this.searchCache   = new Map();
  }

  /* =====================================================
     LOAD & VALIDATE
     ===================================================== */

  async loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    const text = await response.text();
    return this.loadFromString(text);
  }

  loadFromString(jsonString) {
    const data = JSON.parse(jsonString); // SyntaxError propagates to caller
    this.validateCatalogStructure(data);
    this.catalogData = data;
    this.searchCache.clear();
    return data;
  }

  validateCatalogStructure(data) {
    const required = ['university', 'semester', 'departments'];
    const missing  = required.filter(f => !(f in data));
    if (missing.length) throw new Error('Missing catalog fields: ' + missing.join(', '));
    if (!Array.isArray(data.departments)) throw new Error('"departments" must be an array');
    data.departments.forEach((dept, i) => {
      if (!dept.code || !Array.isArray(dept.courses)) {
        throw new Error(`Department[${i}] missing "code" or "courses"`);
      }
    });
  }

  validateCourseData(course) {
    const errors = [];
    if (!course.courseCode || typeof course.courseCode !== 'string')
      errors.push('courseCode is required');
    if (!course.title || typeof course.title !== 'string')
      errors.push('title is required');
    if (typeof course.credits !== 'number' || course.credits < 1)
      errors.push('credits must be a positive number');
    if (!course.instructor || !course.instructor.name)
      errors.push('instructor.name is required');
    if (!course.schedule || typeof course.schedule.capacity !== 'number')
      errors.push('schedule.capacity is required');
    return { isValid: errors.length === 0, errors };
  }

  /* =====================================================
     DATA ACCESS
     ===================================================== */

  getAllCourses() {
    if (!this.catalogData) return [];
    return this.catalogData.departments.flatMap(dept =>
      dept.courses.map(c => ({
        ...c,
        departmentCode: dept.code,
        departmentName: dept.name
      }))
    );
  }

  getDepartments() {
    if (!this.catalogData) return [];
    return this.catalogData.departments.map(d => ({ code: d.code, name: d.name }));
  }

  getCourseByCode(code) {
    return this.getAllCourses().find(c => c.courseCode === code) || null;
  }

  /* =====================================================
     SEARCH & FILTER
     ===================================================== */

  search(query, deptFilter = 'all', creditsFilter = 'all') {
    const cacheKey = `${deptFilter}|${creditsFilter}|${query.trim().toLowerCase()}`;
    if (this.searchCache.has(cacheKey)) return this.searchCache.get(cacheKey);

    let courses = this.getAllCourses();

    if (deptFilter !== 'all') {
      courses = courses.filter(c => c.departmentCode === deptFilter);
    }

    if (creditsFilter !== 'all') {
      const credits = parseInt(creditsFilter, 10);
      courses = courses.filter(c => c.credits === credits);
    }

    const term = query.trim().toLowerCase();
    if (term) {
      courses = courses.filter(c =>
        c.courseCode.toLowerCase().includes(term)  ||
        c.title.toLowerCase().includes(term)       ||
        (c.description || '').toLowerCase().includes(term) ||
        (c.instructor?.name || '').toLowerCase().includes(term) ||
        (c.departmentCode || '').toLowerCase().includes(term) ||
        (c.topics || []).some(t => t.toLowerCase().includes(term))
      );
    }

    this.searchCache.set(cacheKey, courses);
    return courses;
  }

  /* =====================================================
     MUTATIONS
     ===================================================== */

  addCourse(deptCode, course) {
    if (!this.catalogData) throw new Error('No catalog loaded');
    const { isValid, errors } = this.validateCourseData(course);
    if (!isValid) throw new Error('Validation failed: ' + errors.join('; '));

    const dept = this.catalogData.departments.find(d => d.code === deptCode);
    if (!dept) throw new Error('Department not found: ' + deptCode);

    const duplicate = dept.courses.find(c => c.courseCode === course.courseCode);
    if (duplicate) throw new Error('Course code already exists: ' + course.courseCode);

    dept.courses.push(course);
    this.searchCache.clear();
  }

  /* =====================================================
     STATISTICS
     ===================================================== */

  getStats() {
    const courses = this.getAllCourses();
    const totalEnrolled  = courses.reduce((s, c) => s + (c.schedule?.enrolled  || 0), 0);
    const totalCapacity  = courses.reduce((s, c) => s + (c.schedule?.capacity || 0), 0);
    return {
      totalCourses:    courses.length,
      totalDepartments: this.catalogData?.departments?.length || 0,
      totalEnrolled,
      totalCapacity,
      avgCapacityPct: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0
    };
  }

  /* =====================================================
     EXPORT
     ===================================================== */

  exportJSON() {
    if (!this.catalogData) throw new Error('No catalog loaded');
    const blob = new Blob(
      [JSON.stringify(this.catalogData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'campus-catalog-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
