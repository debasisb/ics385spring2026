# Code Review: basic-json (Week 8)

**Project:** UH Maui College Course Catalog — ICS 385 Week 8 Basic Assignment (JSON Fundamentals)  
**Reviewed:** March 4, 2026  
**Scope:** `week8/basic-json/` (index.html, styles.css, course-catalog.js, sample-data.json, README.md)

---

## 1. Executive Summary

The **basic-json** project is an interactive course catalog that demonstrates JSON parsing, validation, and dynamic UI from data. The codebase is well-structured, follows separation of concerns, and meets the assignment’s JSON fundamentals goals. The review highlights strengths and a short list of actionable improvements.

**Verdict:** **Approve** — Suitable for submission with minor optional improvements.

---

## 2. Project Overview

| Component | Purpose |
|-----------|---------|
| **index.html** | Single-page shell: header, controls, stats, course grid, detail modal, add-course modal, footer |
| **styles.css** | Layout, UH-themed variables, responsive breakpoints, accessibility styles |
| **course-catalog.js** | All app logic in a single `CourseCatalogManager` class |
| **sample-data.json** | Catalog data: 9 courses across ICS, MATH, ENG |
| **README.md** | Overview, features, setup, data schema, testing checklist |

---

## 3. Strengths

### 3.1 Architecture & Structure

- **Clear separation:** HTML structure, CSS presentation, and JavaScript behavior are cleanly separated. A single class (`CourseCatalogManager`) owns all app logic, making the flow easy to follow.
- **Logical grouping:** The JS file uses section comments (Initialisation, Data Loading, Validation, Search & Filter, Display, Modals, etc.), which improves navigability.

### 3.2 JSON & Data Handling

- **Robust loading:** `loadSampleData()` uses the Fetch API with a fallback to inline data when fetch fails (e.g. `file://`), so the app still works without a server.
- **Validation:** `validateCatalogStructure()` enforces required top-level fields and department shape; `validateCourseData()` validates individual courses and returns structured errors. This aligns well with the “JSON fundamentals” focus.
- **Type and schema checks:** Uses `Object.prototype.hasOwnProperty.call`, `Array.isArray`, and numeric bounds (e.g. credits 1–6, capacity/enrolled) appropriately.

### 3.3 Security

- **XSS mitigation:** User and JSON-sourced content injected into the DOM is passed through `escapeHTML()` (lines 309–318 in course-catalog.js), which escapes `&`, `<`, `>`, `"`, `'`. This reduces risk when rendering course data and form-driven content.

### 3.4 User Experience & Performance

- **Search caching:** Filter results are cached by a composite key (department | credits | search term), avoiding redundant filtering on repeated interactions.
- **Debounced search:** The search input uses a 250 ms debounce, reducing work during typing.
- **Notifications:** Success and error messages are shown in a dedicated area and auto-dismiss, with clear visual distinction (success vs error).

### 3.5 Accessibility

- **Semantic HTML:** Uses `<header>`, `<main>`, `<section>`, `<footer>`, and form labels.
- **ARIA:** Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; notification area uses `role="alert"` and `aria-live="polite"`.
- **Screen readers:** `.sr-only` labels for search and filters; controls have `aria-label` where needed.
- **Keyboard & focus:** Escape closes modals; focus is moved to the close button when a modal opens; `focus-visible` styles in CSS.
- **Form:** `novalidate` is used so custom validation can be applied consistently with inline error display.

### 3.6 Documentation

- **README:** Describes features, file structure, setup (Live Server, Python, Node, GitHub Pages), JSON schema, and a testing checklist. The note about `file://` and CORS is helpful.
- **JSDoc-style comments:** Key methods have brief descriptions and parameter notes.

---

## 4. Areas for Improvement

### 4.1 Department Filter Duplication (Low)

**Location:** `index.html` (lines 35–40), `course-catalog.js` `populateDepartmentFilter()` (lines 358–369).

**Issue:** The department `<select>` in HTML hardcodes “ICS”, “MATH”, “ENG”. The JS then repopulates options from the catalog (keeping only “All Departments”), so the initial markup is redundant and can get out of sync if the data source changes.

**Suggestion:** Consider starting with a single option, e.g. `<option value="all">All Departments</option>`, and let `populateDepartmentFilter()` add all department options from data. This keeps one source of truth.

### 4.2 Error-to-Field Mapping (Low)

**Location:** `course-catalog.js` `mapErrorsToFields()` (lines 441–469).

**Issue:** Field mapping relies on substring matching (e.g. `err.toLowerCase().includes(keyword.toLowerCase())`). If validation message text changes, mappings can break or map to the wrong field.

**Suggestion:** Prefer returning structured validation results (e.g. `{ field: 'courseCode', message: '...' }`) from `validateCourseData()` and map by field name instead of message content. This is a refinement rather than a blocker.

### 4.3 Statistics Refresh on Every Filter (Optional)

**Location:** `course-catalog.js` `updateDisplayStats()` (lines 351–355).

**Issue:** `updateDisplayStats()` calls `displayStatistics()`, which recomputes totals and average enrollment on every filter/search update. For the current small dataset this is fine; for much larger catalogs it could be optimized (e.g. cache totals and only refresh “Showing” when filters change).

**Suggestion:** No change required for the assignment; consider optimization only if the catalog grows significantly.

### 4.4 Schedule Time Validation

**Location:** `course-catalog.js` `validateCourseData()` (schedule block), `sample-data.json`.

**Observation:** The schema validates `schedule.days` and `schedule.capacity`/`enrolled` but does not require or validate `schedule.time`. The sample data and UI both use `time`; adding a simple presence check (e.g. required string) would make the contract explicit and avoid undefined display in the modal/card.

---

## 5. Code Quality Notes

- **Strict mode:** `'use strict'` is used (line 17), which is good practice.
- **Error handling:** Centralized `handleError()` classifies `SyntaxError`, missing fields, and network-related messages and logs details to the console while showing user-friendly notifications.
- **Modal cleanup:** Export creates a temporary anchor, triggers download, removes the node, and revokes the object URL, avoiding leaks.
- **CSS:** Variables, responsive grid (`minmax`, `auto-fill`/`auto-fit`), and breakpoints at 768px and 480px keep the layout maintainable and adaptable.

---

## 6. Testing Checklist (from README)

The README’s testing checklist is comprehensive and matches the implemented features (load JSON, invalid JSON handling, search by code/instructor/topic, department/credits filters, combined filter+search, detail modal, add course, validation errors, duplicate rejection, export, responsive layout). No gaps identified for the scope of the assignment.

---

## 7. Conclusion

The **basic-json** project clearly demonstrates JSON parsing, validation, and use of JSON to drive an interactive UI. Code organization, validation, security (escaping), and accessibility are strengths. The suggested improvements are minor and do not block approval. The project is in good shape for the Week 8 Basic – JSON Fundamentals assignment.

---

*End of code review.*
