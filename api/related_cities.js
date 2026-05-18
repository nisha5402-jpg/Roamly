// ═══════════════════════════════════════════════════════════════════════════
// api/related_cities.js — curated city groupings for internal linking
// PURPOSE: Build a strong internal linking mesh by exposing related cities
//          on city pages and persona-specific city groupings on persona pages.
//
// USED BY: api/city.js, api/persona.js
//
// AUTHOR: Claude Opus 4.7 (May 2026)
// MAINTAINER NOTES FOR SONNET 4.6:
//   - All keys must exist in roamly_scores.json. If you rename a city, update here too.
//   - POPULAR_CITIES is a 12-city anchor list used as fallback when same-country
//     yields fewer than 4 cities. Order matters — first ones surface most often.
//   - PERSONA_CITY_GROUPS is hand-curated for AEO authority on persona queries.
//     E.g. people who search "best European cities for foodies" should land on
//     pages featuring Bologna, San Sebastian, Naples, etc. This is editorial.
// ═══════════════════════════════════════════════════════════════════════════

// Anchor list — 12 broadly recognisable European city destinations.
// Used as fallback when a city's country has < 4 other entries.
var POPULAR_CITIES = [
  'paris', 'rome', 'barcelona', 'amsterdam', 'berlin', 'lisbon',
  'london', 'prague', 'vienna', 'copenhagen', 'madrid', 'florence'
];

// Persona-specific city groupings — hand-curated for AEO authority.
// Each persona surfaces 6 cities with strong reputation for that travel style.
// All keys must exist in roamly_scores.json.
var PERSONA_CITY_GROUPS = {
  foodie: [
    'bologna',         // Italian food capital
    'san_sebastian',   // pintxos + Michelin density
    'naples',          // pizza + street food
    'lyon',            // French gastronomy capital
    'palermo',         // Sicilian street food
    'copenhagen'       // new Nordic / Noma
  ],
  family: [
    'copenhagen',      // family-friendly, safe, parks
    'amsterdam',       // canals, museums, easy mobility
    'vienna',          // imperial parks, kid culture
    'munich',          // English Garden, beer halls
    'stockholm',       // safe, green, ABBA museum
    'lucerne'          // alpine + lake, easy day trips
  ],
  culture: [
    'rome',            // ancient + Vatican
    'florence',        // Renaissance heart
    'paris',           // Louvre + Musée d'Orsay
    'vienna',          // Habsburg legacy
    'athens',          // classical antiquity
    'prague'           // medieval old town
  ],
  solo: [
    'lisbon',          // walkable, safe, social
    'amsterdam',       // English-friendly, walkable
    'berlin',          // open vibe, easy transit
    'barcelona',       // beach + city, friendly
    'copenhagen',      // safe, English universal
    'edinburgh'        // walkable, pubs, history
  ]
};

// Pick `n` related cities for a given city. Strategy:
//   1. Same-country cities first (semantic relevance + country-cluster SEO)
//   2. Top up from POPULAR_CITIES (anchor list, breadth)
//   3. Always exclude the current city
function getRelatedCities(cityKey, allCities, n) {
  n = n || 5;
  var current = allCities[cityKey];
  if (!current) return [];

  var sameCountry = Object.keys(allCities).filter(function(k){
    return k !== cityKey && allCities[k].country === current.country;
  });

  var picks = sameCountry.slice(0, n);

  if (picks.length < n) {
    POPULAR_CITIES.forEach(function(k){
      if (picks.length >= n) return;
      if (k === cityKey) return;
      if (picks.indexOf(k) > -1) return;
      if (allCities[k]) picks.push(k);
    });
  }

  return picks.map(function(k){
    return {key:k, name:allCities[k].name, country:allCities[k].country};
  });
}

// Get persona-specific city recommendations for a given persona, excluding current city.
function getPersonaCities(persona, currentCityKey, allCities) {
  var group = PERSONA_CITY_GROUPS[persona] || [];
  return group
    .filter(function(k){ return k !== currentCityKey && allCities[k]; })
    .slice(0, 6)
    .map(function(k){
      return {key:k, name:allCities[k].name, country:allCities[k].country};
    });
}

module.exports = {
  getRelatedCities: getRelatedCities,
  getPersonaCities: getPersonaCities,
  POPULAR_CITIES: POPULAR_CITIES,
  PERSONA_CITY_GROUPS: PERSONA_CITY_GROUPS
};
