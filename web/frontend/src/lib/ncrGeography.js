/**
 * NCR Geographic Data for Frontend
 * 
 * Mirror of backend geographic data for UI rendering
 */

export const NCR_REGIONS = [
  {
    key: "Eastern Zone",
    label: "Eastern Zone",
    cities: ["Marikina", "Pasig", "Cainta", "Taytay", "Rizal"],
  },
  {
    key: "Western Zone",
    label: "Western Zone",
    cities: ["Manila", "Quezon City", "Valenzuela", "Malabon", "Navotas", "Caloocan"],
  },
  {
    key: "Central Zone",
    label: "Central Zone",
    cities: ["Makati", "Pasay", "San Juan", "Mandaluyong", "Taguig"],
  },
  {
    key: "Southern Zone",
    label: "Southern Zone",
    cities: ["Las Piñas", "Parañaque", "Muntinlupa", "Bacoor", "Cavite City"],
  },
];

export const NCR_COUNCILS = [
  "Council I",
  "Council II",
  "Council III",
  "Council IV",
  "Council V",
];

export const ALL_NCR_CITIES = [
  "Marikina",
  "Pasig",
  "Cainta",
  "Taytay",
  "Rizal",
  "Manila",
  "Quezon City",
  "Valenzuela",
  "Malabon",
  "Navotas",
  "Caloocan",
  "Makati",
  "Pasay",
  "San Juan",
  "Mandaluyong",
  "Taguig",
  "Las Piñas",
  "Parañaque",
  "Muntinlupa",
  "Bacoor",
  "Cavite City",
];

/**
 * Get cities for a specific region
 */
export function getCitiesByRegion(region) {
  const regionData = NCR_REGIONS.find((r) => r.key === region);
  return regionData?.cities || [];
}

/**
 * Get region for a specific city
 */
export function getRegionByCity(city) {
  const region = NCR_REGIONS.find((r) => r.cities.includes(city));
  return region?.key || null;
}
