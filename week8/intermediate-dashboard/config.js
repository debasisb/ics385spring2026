/**
 * config.js
 * ICS 385 Week 8 Intermediate Assignment – Multi-API Dashboard
 * Secure configuration management using localStorage as client-side env storage
 */

'use strict';

class SecureConfig {
  constructor() {
    this.config = this.loadConfiguration();
    // Note: validateConfiguration() is called by the dashboard, not here,
    // so the app loads even when keys are not yet configured.
  }

  loadConfiguration() {
    return {
      apis: {
        openWeather: {
          // Keys read live from localStorage so they update after saveApiKeys()
          get key() { return localStorage.getItem('openweather_api_key') || ''; },
          baseUrl: 'https://api.openweathermap.org/data/2.5',
          endpoints: { current: '/weather', forecast: '/forecast' },
          rateLimit: { requests: 60, period: 60000 },
          timeout: 5000
        },
        rapidApi: {
          get key() { return localStorage.getItem('rapidapi_api_key') || ''; },
          host: 'matchilling-chuck-norris-jokes-v1.p.rapidapi.com',
          baseUrl: 'https://matchilling-chuck-norris-jokes-v1.p.rapidapi.com',
          endpoints: { random: '/jokes/random', categories: '/jokes/categories' },
          rateLimit: { requests: 100, period: 60000 },
          timeout: 3000
        },
        jokeApi: {
          // JokeAPI requires no key
          baseUrl: 'https://v2.jokeapi.dev',
          endpoints: { joke: '/joke/Programming', categories: '/categories' },
          rateLimit: { requests: 120, period: 60000 },
          timeout: 3000
        }
      },
      app: {
        name: 'UH Maui Campus Dashboard',
        version: '1.0.0',
        defaultCity: 'Kahului',
        refreshInterval: 10 * 60 * 1000, // 10 minutes
        cacheExpiry:     10 * 60 * 1000, // 10 minutes
        maxRetries: 3,
        retryDelay: 1000
      },
      ui: {
        animationDuration: 300,
        toastDuration: 5000,
        modalTimeout: 10000,
        loadingDelay: 500
      }
    };
  }

  /** Check whether a specific service's API key is stored */
  hasApiKey(service) {
    return !!localStorage.getItem(service + '_api_key');
  }

  /** Returns true only when both paid-API keys are present */
  areApiKeysConfigured() {
    return this.hasApiKey('openweather') && this.hasApiKey('rapidapi');
  }

  getApiConfig(service) {
    if (!this.config.apis[service]) {
      throw new Error('Unknown API service: ' + service);
    }
    return this.config.apis[service];
  }

  getAppConfig() { return this.config.app; }
  getUiConfig()  { return this.config.ui; }
}

// Single global instance
const appConfig = new SecureConfig();
