# Week 8 Basic – JSON Fundamentals
## ICS 385 Web Development and Administration
### UH Maui College Course Catalog System

---

## Overview

An interactive course catalog browser for University of Hawaii Maui College built to demonstrate JSON fundamentals: parsing, validation, dynamic HTML generation, search/filter, and data export.

---

## Features

| Feature | Description |
|---|---|
| **JSON Parsing & Validation** | Loads `sample-data.json` via Fetch API with full try/catch error handling and structural validation |
| **Dynamic Course Cards** | Responsive grid of cards generated entirely from JSON data |
| **Multi-field Search** | Real-time search across course code, title, description, instructor, topics, and department |
| **Department Filter** | Dropdown populated dynamically from catalog data |
| **Credits Filter** | Filter by credit hours (1–4) |
| **Search Caching** | Results cached by composite key (dept + credits + term) for performance |
| **Course Detail Modal** | Accessible modal with full course info, assignment list, and enrollment bar |
| **Add New Course** | Form with comprehensive client-side validation adds courses to the live catalog |
| **Export JSON** | Downloads the current (possibly modified) catalog as a formatted `.json` file |
| **Statistics Dashboard** | Live totals: courses, departments, average enrollment, and count currently shown |
| **Responsive Design** | 1–3 column grid adapts to mobile, tablet, and desktop |
| **Accessibility** | WCAG 2.1 AA: semantic HTML, aria-labels, focus management, keyboard navigation |

---

## File Structure

```
week8/basic-json/
├── index.html          # Main HTML page
├── styles.css          # Responsive CSS with UH color scheme
├── course-catalog.js   # CourseCatalogManager class + bootstrap
├── sample-data.json    # 9 courses across 3 departments (ICS, MATH, ENG)
└── README.md           # This file
```

---

## Setup Instructions

### Option 1 – Live Server (recommended)

Any static file server works. Using VS Code Live Server extension:

1. Open the `week8/basic-json/` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. The catalog loads automatically from `sample-data.json`.

Using Python:
```bash
cd week8/basic-json
python3 -m http.server 8080
# then open http://localhost:8080
```

Using Node.js `serve`:
```bash
npx serve week8/basic-json
```

### Option 2 – GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages → Source → main branch / root**.
3. Visit `https://<username>.github.io/<repo>/week8/basic-json/`.

> **Note:** Opening `index.html` directly via `file://` will trigger a CORS error on the Fetch call. The app automatically falls back to a small inline dataset so the page still works, but the full 9-course catalog requires a web server.

---

## JSON Data Structure

```json
{
  "university": "University of Hawaii Maui College",
  "semester": "Spring 2026",
  "lastUpdated": "2026-03-03",
  "departments": [
    {
      "code": "ICS",
      "name": "Information and Computer Sciences",
      "chair": "Dr. Jane Smith",
      "courses": [
        {
          "courseCode": "ICS 385",
          "title": "Web Development and Administration",
          "credits": 3,
          "description": "...",
          "prerequisites": ["ICS 320"],
          "instructor": { "name": "...", "email": "...", "office": "..." },
          "schedule": {
            "days": ["Tuesday"],
            "time": "4:30 PM - 5:45 PM",
            "location": "Online (Zoom)",
            "capacity": 25,
            "enrolled": 18
          },
          "isActive": true,
          "topics": ["HTML", "CSS", "JavaScript"],
          "assignments": [
            { "name": "Week 1 - Setup", "points": 1, "dueDate": "2026-01-19" }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "totalCourses": 9,
    "totalDepartments": 3,
    "totalCreditsOffered": 28,
    "academicYear": "2025-2026"
  }
}
```

**Departments included in `sample-data.json`:**

| Dept | Name | Courses |
|---|---|---|
| ICS | Information and Computer Sciences | ICS 110, ICS 211, ICS 320, ICS 385 |
| MATH | Mathematics | MATH 100, MATH 135, MATH 140 |
| ENG | English | ENG 100, ENG 200 |

---

## Key Implementation Details

### CourseCatalogManager Class

| Method | Purpose |
|---|---|
| `initializeApp()` | Sets up event listeners and loads sample data |
| `loadCourseData(jsonString)` | Parses JSON, validates structure, renders catalog |
| `validateCatalogStructure(data)` | Checks required top-level fields and department arrays |
| `validateCourseData(course)` | Full field validation; returns `{ isValid, errors }` |
| `getAllCourses()` | Flattens departments → flat course array with dept metadata |
| `applyFiltersAndSearch()` | Combines dept/credits filters + search with cache |
| `filterByDepartment(courses, code)` | Department-specific filtering |
| `filterByCredits(courses, credits)` | Credit-hour filtering |
| `searchCourses(courses, query)` | Multi-field case-insensitive search |
| `displayAllCourses()` | Renders filtered courses via DOM fragment |
| `createCourseCard(course)` | Builds card element with enrollment status |
| `displayStatistics()` | Updates stats dashboard from live data |
| `showCourseDetails(courseCode)` | Populates and opens the detail modal |
| `handleAddCourseSubmit()` | Validates form, adds course to catalog |
| `exportToJSON()` | Serialises catalog with `JSON.stringify` and downloads |
| `handleError(operation, error)` | Classifies errors, logs detail, shows user message |
| `escapeHTML(str)` | XSS-safe injection into `innerHTML` |

### Error Handling

- `SyntaxError` from `JSON.parse()` → "Invalid JSON format" message
- Missing required fields → lists specific field names
- Form validation → inline field-level error messages
- All errors logged with timestamp via `console.error`

---

## Testing Checklist

- [x] Valid JSON loads and displays all 9 courses
- [x] Invalid JSON string shows user-friendly error
- [x] Search by course code (e.g. "ICS")
- [x] Search by instructor name (e.g. "Debasis")
- [x] Search by topic (e.g. "SQL")
- [x] Department filter (ICS only)
- [x] Credits filter (4 credits only)
- [x] Combined filter + search
- [x] View details modal for each course
- [x] Add new course with valid data
- [x] Add course form validation errors shown inline
- [x] Duplicate course code rejected
- [x] Export JSON downloads formatted file
- [x] Responsive layout at 320px, 768px, 1200px

---

## Course Information

- **Course:** ICS 385 – Web Development and Administration
- **Instructor:** Dr. Debasis Bhattacharya (debasisb@hawaii.edu)
- **Assignment:** Week 8 Basic – JSON Fundamentals
- **Due:** Wednesday, March 5, 2026 at 11:00 PM
