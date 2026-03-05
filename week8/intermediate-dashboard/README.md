# Week 8 Intermediate – Multi-API Dashboard
## ICS 385 Web Development and Administration
### UH Maui College Integrated Campus Dashboard

---

## Overview

A comprehensive campus dashboard integrating three APIs with secure credential management:

| Component | Source | Auth |
|---|---|---|
| Course Management | Local JSON | None |
| Campus Weather | OpenWeatherMap | API Key |
| Programming Humor | JokeAPI (v2.jokeapi.dev) | None |
| Chuck Norris Facts | RapidAPI | API Key + Headers |

---

## File Structure

```
week8/intermediate-dashboard/
├── index.html          # Dashboard HTML – widgets, modals, layout
├── styles.css          # Responsive CSS (UH green/gold theme)
├── config.js           # SecureConfig – localStorage-based key management
├── api-client.js       # UnifiedApiClient – caching, rate limiting, fallbacks
├── course-catalog.js   # CourseDataManager – pure data layer
├── dashboard.js        # CampusDashboard – orchestrates all widgets
├── sample-data.json    # 9 courses across ICS, MATH, ENG
├── .env.example        # API key template (never commit .env)
├── .gitignore          # Excludes .env
└── README.md           # This file
```

---

## Quick Start

### GitHub Pages (no setup needed)
Visit: `https://debasisb.github.io/ics385spring2026/week8/intermediate-dashboard/`

- JokeAPI works automatically (no key required)
- Click **⚙ Settings** to enter your OpenWeatherMap + RapidAPI keys
- Keys are stored in browser `localStorage` only – never transmitted

### Local Dev Server
```bash
cd week8/intermediate-dashboard
python3 -m http.server 8080
# open http://localhost:8080
```

---

## API Key Setup

### OpenWeatherMap (weather widget)
1. Sign up free at https://openweathermap.org/api
2. Go to **API Keys** in your account
3. Copy your key and paste it in the dashboard **Settings** modal

### RapidAPI – Chuck Norris (humor widget)
1. Create account at https://rapidapi.com
2. Search for **Chuck Norris Jokes** by matchilling → Subscribe (free)
3. Copy your `X-RapidAPI-Key` and paste it in the **Settings** modal

### JokeAPI (programming jokes)
No registration needed – works out of the box.

---

## Security Architecture

- API keys are **never** hard-coded in JavaScript files
- Keys live in browser `localStorage` only, isolated to your origin
- `.env` is in `.gitignore`; `.env.example` shows the template
- `XSS protection`: all user-supplied and API strings pass through `esc()` before `innerHTML` injection

---

## Features

| Feature | Description |
|---|---|
| **Multi-API** | OpenWeatherMap, JokeAPI, Chuck Norris (RapidAPI) |
| **Secure Config** | localStorage key storage, modal setup UI |
| **Caching** | 10-min in-memory cache per API endpoint |
| **Rate Limiting** | Sliding-window rate limiter per service |
| **Fallback Data** | Each API has realistic fallback on failure |
| **Promise.allSettled** | Weather + jokes load concurrently, one failure doesn't block the other |
| **Course Widget** | Real-time search + dept/credit filters with result caching |
| **Add Course** | Modal form with full client-side validation |
| **Export JSON** | Downloads the current catalog as formatted `.json` |
| **Statistics** | Live totals: courses, enrolled students, avg capacity %, API status |
| **Auto Refresh** | Weather refreshes every 10 minutes automatically |
| **Toast Notifications** | Non-blocking success/error/info feedback |
| **Responsive** | 3-column → 2-column → 1-column grid, works on mobile |
| **Accessibility** | ARIA roles, semantic HTML, keyboard navigation |

---

## Course Information

- **Course:** ICS 385 – Web Development and Administration
- **Instructor:** Dr. Debasis Bhattacharya (debasisb@hawaii.edu)
- **Assignment:** Week 8 Intermediate – Multi-API Dashboard
- **Due:** Sunday, March 9, 2026 at 11:59 PM
