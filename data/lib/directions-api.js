/**
 * Get biking directions for two points
 */

// Dependencies
const path = require('path');
const _ = require('lodash');
const hash = require('object-hash');
const fetch = require('node-fetch');
const fileCache = require('node-file-cache');
const debug = require('debug')('directions');
require('dotenv').load();

// Setup cache
const cache = fileCache.create({
  file: path.join(__dirname, '..', '..', '.cache-fetch'),
  life: 60 * 60 * 24 * 20
});

// Cached fetch
// Coordinates shoud be [[lon, lat], [lon, lat], ...]
async function cachedFetch(coordinates = [], options = {}) {
  options.alternatives = _.isBoolean(options.alternatives)
    ? options.alternatives
    : true;
  options.overview = options.overview || 'full';
  options.geometries = options.geometries || 'geojson';

  // Create key
  let key = hash({
    coordinates,
    options
  });

  // Invalidate cache
  if (options.invalidateCache) {
    debug(`Invalidate cache: ${key}`);
    cache.expire(key);
  }

  // Check cache
  if (cache.get(key)) {
    debug(`Cache hit: ${key}`);
    return cache.get(key);
  }

  // Make sure we have a key
  if (!options.apiKey && !process.env.MAPBOX_API_KEY) {
    throw new Error(
      'API key not given as options.apiKey or MAPBOX_API_KEY environment variable.'
    );
  }

  // Make URI
  let apiCoordinates = _.map(coordinates, c => `${c[0]},${c[1]}`).join(';');
  let uri = `https://api.mapbox.com/directions/v5/mapbox/cycling/${apiCoordinates}?access_token=${options.mapboxApiKey ||
    process.env.MAPBOX_API_KEY}`;
  uri += options.alternatives ? '&alternatives=true' : '';
  uri += options.overview ? `&overview=${options.overview}` : '';
  uri += options.geometries ? `&geometries=${options.geometries}` : '';

  // Make fetch
  debug(`Fetch: ${uri}`);
  let response = await fetch(uri);
  if (!response) {
    throw new Error('No response found');
  }
  if (response.status >= 300) {
    let parsed = await response.json();
    throw new Error(
      `Response ${response.status} (${response.statusText}): ${
        parsed && parsed.message ? parsed.message : '[no message]'
      }`
    );
  }

  // Parse
  let parsed = await response.json();

  // Check code
  if (!parsed.code.match(/ok/i)) {
    debug(parsed);
    throw new Error(`Response code: ${parsed.code}`);
  }

  // Cache
  debug(`Cache set: ${key}`);
  cache.set(key, parsed);
  return parsed;
}

// Export
module.exports = cachedFetch;
