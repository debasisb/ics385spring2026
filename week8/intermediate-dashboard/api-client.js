/**
 * api-client.js
 * ICS 385 Week 8 Intermediate Assignment – Multi-API Dashboard
 * Unified API client with caching, rate limiting, timeout, and fallback data
 */

'use strict';

class UnifiedApiClient {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.rateLimiters = new Map();
    this.initializeRateLimiters();
  }

  /* =====================================================
     RATE LIMITING
     ===================================================== */

  initializeRateLimiters() {
    Object.keys(this.config.apis).forEach(service => {
      this.rateLimiters.set(service, {
        requests: [],
        limit:  this.config.apis[service].rateLimit.requests,
        period: this.config.apis[service].rateLimit.period
      });
    });
  }

  checkRateLimit(service) {
    const limiter = this.rateLimiters.get(service);
    const now = Date.now();
    limiter.requests = limiter.requests.filter(t => now - t < limiter.period);
    return limiter.requests.length < limiter.limit;
  }

  updateRateLimit(service) {
    this.rateLimiters.get(service).requests.push(Date.now());
  }

  /* =====================================================
     CACHING
     ===================================================== */

  getCacheKey(service, endpoint, params) {
    return service + ':' + endpoint + ':' + JSON.stringify(params);
  }

  isValidCache(cacheKey) {
    if (!this.cache.has(cacheKey)) return false;
    return Date.now() - this.cache.get(cacheKey).timestamp < this.config.app.cacheExpiry;
  }

  cacheResponse(cacheKey, data) {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  clearCache(service) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(service + ':')) this.cache.delete(key);
    }
  }

  /* =====================================================
     CORE REQUEST
     ===================================================== */

  async makeRequest(service, endpoint, params = {}, options = {}) {
    try {
      if (!this.checkRateLimit(service)) {
        throw new Error('Rate limit exceeded for ' + service + '. Please wait.');
      }

      const cacheKey = this.getCacheKey(service, endpoint, params);
      if (this.isValidCache(cacheKey)) {
        console.log('[Cache HIT]', service, endpoint);
        return this.cache.get(cacheKey).data;
      }

      const requestConfig = this.buildRequest(service, endpoint, params, options);

      // Timeout via AbortController
      const controller = new AbortController();
      const timeoutId  = setTimeout(
        () => controller.abort(),
        this.config.apis[service].timeout
      );

      const response = await fetch(requestConfig.url, {
        ...requestConfig.options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${service} API error: ${response.status} – ${response.statusText}`);
      }

      const data = await response.json();
      this.cacheResponse(cacheKey, data);
      this.updateRateLimit(service);
      return data;

    } catch (error) {
      console.error('[API Error]', service, endpoint, error.message);
      return this.handleApiError(service, endpoint, error);
    }
  }

  buildRequest(service, endpoint, params, options) {
    const apiConfig = this.config.apis[service];
    let url = apiConfig.baseUrl + endpoint;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    switch (service) {
      case 'openWeather': {
        const p = new URLSearchParams({ ...params, appid: apiConfig.key, units: 'imperial' });
        url += '?' + p.toString();
        break;
      }
      case 'rapidApi':
        headers['X-RapidAPI-Key']  = apiConfig.key;
        headers['X-RapidAPI-Host'] = apiConfig.host;
        break;
      case 'jokeApi':
        if (Object.keys(params).length > 0) {
          url += '?' + new URLSearchParams(params).toString();
        }
        break;
    }

    return { url, options: { method: 'GET', headers } };
  }

  /* =====================================================
     ERROR HANDLING – FALLBACK DATA
     ===================================================== */

  handleApiError(service, endpoint, error) {
    const timestamp = new Date().toISOString();
    console.error('[API Error Details]', { service, endpoint, error: error.message, timestamp });

    switch (service) {
      case 'openWeather':
        return {
          name: 'Kahului',
          main: { temp: 78, humidity: 65 },
          weather: [{ description: 'partly cloudy', icon: '02d' }],
          wind: { speed: 12 },
          error: true,
          message: 'Live weather unavailable – showing cached estimate'
        };

      case 'rapidApi':
        return {
          value: "Chuck Norris doesn't need a browser. The internet sends HIM requests.",
          error: true,
          message: 'Chuck Norris API temporarily unavailable'
        };

      case 'jokeApi':
        return {
          joke: 'Why do programmers prefer dark mode? Because light attracts bugs!',
          type: 'single',
          error: true,
          message: 'Programming jokes temporarily unavailable'
        };

      default:
        throw error;
    }
  }

  /* =====================================================
     CONVENIENCE METHODS
     ===================================================== */

  async getWeather(city = 'Kahului') {
    return this.makeRequest('openWeather', '/weather', { q: city + ',US,HI' });
  }

  async getChuckNorrisJoke() {
    return this.makeRequest('rapidApi', '/jokes/random');
  }

  async getProgrammingJoke() {
    return this.makeRequest('jokeApi', '/joke/Programming', { type: 'single' });
  }

  /**
   * Fetch both jokes concurrently; each resolves independently so one
   * failing doesn't block the other.
   */
  async getAllJokes() {
    const [chuck, programming] = await Promise.allSettled([
      this.getChuckNorrisJoke(),
      this.getProgrammingJoke()
    ]);
    return {
      chuck:       chuck.status       === 'fulfilled' ? chuck.value       : null,
      programming: programming.status === 'fulfilled' ? programming.value : null
    };
  }
}
