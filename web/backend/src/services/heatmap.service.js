/**
 * Heatmap Data Service
 * 
 * Provides methods to calculate heatmap data with density metrics
 * for geographic areas (cities, regions, councils)
 */

const { getAllNCRCities, getCitiesByRegion, getCitiesByCouncil } = require('../config/ncr-geography');

/**
 * Calculate case density for a given location
 * @param {Array} reports - All case reports
 * @param {string} locationType - Type of location ('city', 'region', 'council')
 * @param {string} locationValue - The location name
 * @returns {Object} Density data with count and intensity
 */
function calculateLocationDensity(reports, locationType, locationValue) {
  let relevantReports = [];

  if (locationType === 'city') {
    relevantReports = reports.filter(
      (r) => r.incident_city && r.incident_city.toLowerCase() === locationValue.toLowerCase()
    );
  } else if (locationType === 'region') {
    const citiesInRegion = getCitiesByRegion(locationValue);
    const cityNames = citiesInRegion.map((c) => c.name.toLowerCase());
    relevantReports = reports.filter(
      (r) => r.incident_city && cityNames.includes(r.incident_city.toLowerCase())
    );
  } else if (locationType === 'council') {
    const citiesInCouncil = getCitiesByCouncil(locationValue);
    const cityNames = citiesInCouncil.map((c) => c.name.toLowerCase());
    relevantReports = reports.filter(
      (r) => r.incident_city && cityNames.includes(r.incident_city.toLowerCase())
    );
  }

  const count = relevantReports.length;
  return {
    count,
    // Normalize intensity from 0 to 1 (will be used for color mapping)
    intensity: count > 0 ? Math.min(count / 50, 1) : 0,
  };
}

/**
 * Generate heatmap data for all NCR cities
 * @param {Array} reports - All case reports
 * @returns {Array} Heatmap points with coordinates and density
 */
function generateCityHeatmapData(reports) {
  const cities = getAllNCRCities();
  
  return cities.map((city) => {
    const density = calculateLocationDensity(reports, 'city', city.name);
    return {
      name: city.name,
      region: city.region,
      council: city.council,
      type: city.type,
      coordinates: {
        lng: city.lng,
        lat: city.lat,
      },
      density: density.count,
      intensity: density.intensity,
    };
  });
}

/**
 * Generate heatmap data aggregated by region
 * @param {Array} reports - All case reports
 * @returns {Array} Heatmap data aggregated by region
 */
function generateRegionHeatmapData(reports) {
  const regionKeys = Object.keys(require('../config/ncr-geography').NCR_GEOGRAPHY.regions);
  
  return regionKeys.map((regionKey) => {
    const { NCR_GEOGRAPHY } = require('../config/ncr-geography');
    const region = NCR_GEOGRAPHY.regions[regionKey];
    const density = calculateLocationDensity(reports, 'region', regionKey);
    
    return {
      name: region.label,
      key: regionKey,
      coordinates: region.coordinates,
      density: density.count,
      intensity: density.intensity,
    };
  });
}

/**
 * Generate heatmap data aggregated by council
 * @param {Array} reports - All case reports
 * @returns {Array} Heatmap data aggregated by council
 */
function generateCouncilHeatmapData(reports) {
  const { getAllNCRCouncils } = require('../config/ncr-geography');
  const councils = getAllNCRCouncils();
  
  return councils.map((council) => {
    const citiesInCouncil = require('../config/ncr-geography').getCitiesByCouncil(council);
    const avgLng = citiesInCouncil.reduce((sum, c) => sum + c.lng, 0) / citiesInCouncil.length;
    const avgLat = citiesInCouncil.reduce((sum, c) => sum + c.lat, 0) / citiesInCouncil.length;
    const density = calculateLocationDensity(reports, 'council', council);
    
    return {
      name: council,
      coordinates: { lng: avgLng, lat: avgLat },
      density: density.count,
      intensity: density.intensity,
    };
  });
}

const STATUS_MAP = {
  1:  "For Verification",
  2:  "Undergoing Review",
  3:  "Verified - True",
  4:  "Verified - False",
  5:  "Under Case Evaluation",
  6:  "Case Filed",
  7:  "Investigation Ongoing",
  8:  "Hearing Ongoing",
  9:  "Dismissed",
  10: "Perpetrator Convicted",
};

/**
 * Get filtered reports based on criteria
 * @param {Array} reports - All case reports
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered reports
 */
function getFilteredReports(reports, filters = {}) {
  let filtered = [...reports];

  if (filters.city) {
    filtered = filtered.filter(
      (r) => r.incident_city && r.incident_city.toLowerCase() === filters.city.toLowerCase()
    );
  }

  if (filters.region) {
    const citiesInRegion = getCitiesByRegion(filters.region);
    const cityNames = citiesInRegion.map((c) => c.name.toLowerCase());
    filtered = filtered.filter(
      (r) => r.incident_city && cityNames.includes(r.incident_city.toLowerCase())
    );
  }

  if (filters.council) {
    const citiesInCouncil = getCitiesByCouncil(filters.council);
    const cityNames = citiesInCouncil.map((c) => c.name.toLowerCase());
    filtered = filtered.filter(
      (r) => r.incident_city && cityNames.includes(r.incident_city.toLowerCase())
    );
  }

  if (filters.status) {
    filtered = filtered.filter((r) => STATUS_MAP[r.case_status_id] === filters.status);
  }

  if (filters.verification === 'verified') {
    filtered = filtered.filter((r) => {
      const statusName = STATUS_MAP[r.case_status_id] || '';
      const statuses = ['Verified', 'Investigation', 'Case Filed', 'Hearing', 'Convicted'];
      return statuses.some((s) => statusName.includes(s));
    });
  } else if (filters.verification === 'unverified') {
    filtered = filtered.filter((r) => {
      const statusName = STATUS_MAP[r.case_status_id] || '';
      const statuses = ['Verified', 'Investigation', 'Case Filed', 'Hearing', 'Convicted'];
      return !statuses.some((s) => statusName.includes(s));
    });
  }

  return filtered;
}

module.exports = {
  calculateLocationDensity,
  generateCityHeatmapData,
  generateRegionHeatmapData,
  generateCouncilHeatmapData,
  getFilteredReports,
};
