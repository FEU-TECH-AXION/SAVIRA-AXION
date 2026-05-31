/**
 * NCR (National Capital Region) Geographic Data
 * 
 * Includes all cities and municipalities within Metro Manila with their
 * geographic coordinates and hierarchical structure for heatmap filtering
 */

const NCR_GEOGRAPHY = {
  regions: {
    "Eastern Zone": {
      label: "Eastern Zone",
      coordinates: { lng: 121.15, lat: 14.55 },
      cities: {
        "Marikina": { lng: 121.4337, lat: 14.6426, type: "city", council: "Council I" },
        "Pasig": { lng: 121.5773, lat: 14.5794, type: "city", council: "Council II" },
        "Cainta": { lng: 121.6129, lat: 14.5633, type: "municipality", council: "Council II" },
        "Taytay": { lng: 121.6376, lat: 14.5850, type: "municipality", council: "Council II" },
        "Rizal": { lng: 121.7267, lat: 14.6233, type: "municipality", council: "Council II" },
      },
    },
    "Western Zone": {
      label: "Western Zone",
      coordinates: { lng: 120.85, lat: 14.55 },
      cities: {
        "Manila": { lng: 120.9842, lat: 14.5995, type: "city", council: "Council I" },
        "Quezon City": { lng: 121.0376, lat: 14.6349, type: "city", council: "Council I" },
        "Valenzuela": { lng: 120.9833, lat: 14.7667, type: "city", council: "Council IV" },
        "Malabon": { lng: 120.9833, lat: 14.6833, type: "city", council: "Council III" },
        "Navotas": { lng: 120.8667, lat: 14.6667, type: "city", council: "Council III" },
        "Caloocan": { lng: 121.0333, lat: 14.7167, type: "city", council: "Council IV" },
      },
    },
    "Central Zone": {
      label: "Central Zone",
      coordinates: { lng: 121.05, lat: 14.50 },
      cities: {
        "Makati": { lng: 121.0193, lat: 14.5564, type: "city", council: "Council I" },
        "Pasay": { lng: 120.9754, lat: 14.5347, type: "city", council: "Council I" },
        "San Juan": { lng: 121.0233, lat: 14.5763, type: "city", council: "Council II" },
        "Mandaluyong": { lng: 121.0301, lat: 14.5825, type: "city", council: "Council II" },
        "Taguig": { lng: 121.0575, lat: 14.5180, type: "city", council: "Council I" },
      },
    },
    "Southern Zone": {
      label: "Southern Zone",
      coordinates: { lng: 120.90, lat: 14.35 },
      cities: {
        "Las Piñas": { lng: 120.99424, lat: 14.44431, type: "city", council: "Council II" },
        "Parañaque": { lng: 120.9914, lat: 14.5008, type: "city", council: "Council II" },
        "Muntinlupa": { lng: 121.0402, lat: 14.3829, type: "city", council: "Council II" },
        // "Bacoor": { lng: 120.7625, lat: 14.4189, type: "city", council: "Council V" },
        // "Cavite City": { lng: 120.8955, lat: 14.3014, type: "city", council: "Council V" },
      },
    },
  },
};

/**
 * Get all NCR cities with their coordinates
 * @returns {Array} Array of cities with coordinates and metadata
 */
function getAllNCRCities() {
  const cities = [];
  Object.values(NCR_GEOGRAPHY.regions).forEach((region) => {
    Object.entries(region.cities).forEach(([cityName, data]) => {
      cities.push({
        name: cityName,
        region: region.label,
        ...data,
      });
    });
  });
  return cities;
}

/**
 * Get all NCR regions
 * @returns {Array} Array of regions with labels
 */
function getAllNCRRegions() {
  return Object.entries(NCR_GEOGRAPHY.regions).map(([key, data]) => ({
    key,
    label: data.label,
  }));
}

/**
 * Get cities by region
 * @param {string} regionKey - Region key (e.g., "Eastern Zone")
 * @returns {Array} Array of cities in the region
 */
function getCitiesByRegion(regionKey) {
  const region = NCR_GEOGRAPHY.regions[regionKey];
  if (!region) return [];
  return Object.entries(region.cities).map(([name, data]) => ({
    name,
    region: region.label,
    ...data,
  }));
}

/**
 * Get all unique councils in NCR
 * @returns {Array} Array of unique councils
 */
function getAllNCRCouncils() {
  const councils = new Set();
  Object.values(NCR_GEOGRAPHY.regions).forEach((region) => {
    Object.values(region.cities).forEach((city) => {
      if (city.council) councils.add(city.council);
    });
  });
  return Array.from(councils).sort();
}

/**
 * Get cities by council
 * @param {string} council - Council name (e.g., "Council I")
 * @returns {Array} Array of cities in the council
 */
function getCitiesByCouncil(council) {
  const cities = [];
  Object.values(NCR_GEOGRAPHY.regions).forEach((region) => {
    Object.entries(region.cities).forEach(([name, data]) => {
      if (data.council === council) {
        cities.push({
          name,
          region: region.label,
          ...data,
        });
      }
    });
  });
  return cities;
}

/**
 * Get city coordinates by name
 * @param {string} cityName - City name
 * @returns {Object|null} Coordinates or null if not found
 */
function getCityCoordinates(cityName) {
  const cities = getAllNCRCities();
  const city = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  return city ? { lng: city.lng, lat: city.lat } : null;
}

module.exports = {
  NCR_GEOGRAPHY,
  getAllNCRCities,
  getAllNCRRegions,
  getCitiesByRegion,
  getAllNCRCouncils,
  getCitiesByCouncil,
  getCityCoordinates,
};
