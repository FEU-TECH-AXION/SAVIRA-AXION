"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./heatmap.module.css";
import { IoIosWarning } from "react-icons/io";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function getColorForIntensity(intensity) {
  if (intensity >= 0.7) return "#ef4444";
  if (intensity >= 0.5) return "#f97316";
  if (intensity >= 0.3) return "#eab308";
  if (intensity >= 0.15) return "#22c55e";
  return "#dbeafe";
}

/**
 * Determine which GeoJSON file to load based on aggregation level
 */
function getGeoJsonUrl(aggregation) {
  if (aggregation === "region") return "/geojson/ncr-regions.geojson";
  if (aggregation === "council") return "/geojson/ncr-councils.geojson";
  return "/geojson/ncr-cities.geojson";
}

/**
 * Normalise a name string for loose matching
 * (trim, lowercase, collapse whitespace)
 */
function normaliseName(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Join heatmap API density data onto GeoJSON features by name.
 * Returns a new FeatureCollection with density / intensity injected as properties.
 */
function joinDensityToGeoJSON(geojson, heatmapData) {
  const densityMap = new Map();
  (heatmapData || []).forEach((d) => {
    densityMap.set(normaliseName(d.name), {
      density: d.density,
      intensity: d.intensity,
    });
  });

  const maxDensity = Math.max(
    1,
    ...(heatmapData || []).map((d) => d.density || 0),
  );

  const features = geojson.features.map((feature) => {
    const featureName = normaliseName(feature.properties.name);
    const match = densityMap.get(featureName);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        density: match ? match.density : 0,
        intensity: match ? match.intensity : 0,
        maxDensity,
      },
    };
  });

  return { ...geojson, features };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHOROPLETH LAYER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_ID = "choropleth-source";
const FILL_LAYER_ID = "choropleth-fill";
const LINE_LAYER_ID = "choropleth-line";
const HIGHLIGHT_LAYER_ID = "choropleth-highlight";

function removeChoroplethLayers(map) {
  if (!map || !map.getStyle || !map.isStyleLoaded()) return;
  try {
    [HIGHLIGHT_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch (err) {
    // Style may be mid-teardown (Strict Mode double-mount / hot reload) —
    // safe to ignore, the map instance is going away anyway.
    console.warn("[removeChoroplethLayers] skipped:", err.message);
  }
}

/**
 * Add the choropleth fill/line/highlight layers using a local GeoJSON
 * source (with density already merged in via joinDensityToGeoJSON).
 */
function addChoroplethLayers(map, geojsonWithDensity) {
  removeChoroplethLayers(map);

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: geojsonWithDensity,
  });

  // Fill layer — color by density intensity
  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0,    "rgba(219,234,254,0.55)",
        0.15, "rgba(34,197,94,0.60)",
        0.3,  "rgba(234,179,8,0.68)",
        0.5,  "rgba(249,115,22,0.75)",
        0.7,  "rgba(239,68,68,0.82)",
        1.0,  "rgba(185,28,28,0.90)",
      ],
      "fill-opacity": 1,
    },
  });

  // Outline / border layer
  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": "#ffffff",
      "line-width": 1.5,
      "line-opacity": 0.85,
    },
  });

  // Hover highlight layer (initially nothing highlighted)
  map.addLayer({
    id: HIGHLIGHT_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    filter: ["==", "name", ""],
    paint: {
      "line-color": "#037F81",
      "line-width": 3,
      "line-opacity": 1,
    },
  });
}

/**
 * Fetch the appropriate GeoJSON boundary file, merge density data, and
 * render fill + line choropleth layers on the map.
 */
async function loadChoropleth(map, heatmapData, aggregation) {
  try {
    const url = getGeoJsonUrl(aggregation);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
    const geojson = await res.json();

    // The fetch above is async — by the time it resolves, the map instance
    // may have been removed (React Strict Mode double-mount, hot reload,
    // or navigating away). Bail out instead of touching a dead map.
    if (!map || map._removed || !map.getStyle) return;
    if (!map.isStyleLoaded()) {
      // Style isn't ready yet — wait for it, then retry once.
      map.once("style.load", () => loadChoropleth(map, heatmapData, aggregation));
      return;
    }

    const enriched = joinDensityToGeoJSON(geojson, heatmapData);
    addChoroplethLayers(map, enriched);

    // Fit map to boundaries
    const bounds = computeBounds(enriched);
    if (bounds) {
      map.fitBounds(bounds, { padding: 40, duration: 600 });
    }
  } catch (err) {
    // Log the full error (not just .message) so real Mapbox internal
    // errors show their stack trace in the console instead of being hidden.
    console.error("[loadChoropleth]", err);
  }
}

/**
 * Compute a [west, south, east, north] bounding box from a FeatureCollection.
 */
function computeBounds(geojson) {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(processCoords);
    }
  }

  geojson.features.forEach((f) => {
    if (f.geometry?.coordinates) processCoords(f.geometry.coordinates);
  });

  if (!isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Wire up hover + popup interactions after layers exist.
 * Re-attached every time layers are rebuilt.
 */
function setupHoverInteraction(map) {
  let hoveredName = null;

  // Clean up any previous listeners to avoid duplicates
  map.off("mousemove", FILL_LAYER_ID);
  map.off("mouseleave", FILL_LAYER_ID);

  map.on("mousemove", FILL_LAYER_ID, (e) => {
    if (!e.features?.length) return;
    map.getCanvas().style.cursor = "pointer";

    const feature = e.features[0];
    const name = feature.properties.name;
    const density = feature.properties.density ?? 0;

    if (name !== hoveredName) {
      hoveredName = name;
      // Highlight border
      if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
        map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", name]);
      }
    }

    // Show / update popup
    if (!map._choroplethPopup) {
      map._choroplethPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "choropleth-popup",
      });
    }

    map._choroplethPopup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="
          font-family: Inter, sans-serif;
          min-width: 140px;
          padding: 4px 2px;
        ">
          <strong style="font-size:0.85rem;color:#111;">${name}</strong>
          <div style="margin-top:4px;font-size:0.78rem;color:#6b7280;">
            ${density} case${density !== 1 ? "s" : ""}
          </div>
        </div>`,
      )
      .addTo(map);
  });

  map.on("mouseleave", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    hoveredName = null;
    if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
      map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", ""]);
    }
    if (map._choroplethPopup) {
      map._choroplethPopup.remove();
      map._choroplethPopup = null;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CONTAINER — uses the npm mapbox-gl package (no script-tag injection)
// ─────────────────────────────────────────────────────────────────────────────

function MapContainer({ heatmapData, reportCount, aggregation }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const heatmapDataRef = useRef(heatmapData);
  const aggregationRef = useRef(aggregation);

  useEffect(() => {
    heatmapDataRef.current = heatmapData;
  }, [heatmapData]);

  useEffect(() => {
    aggregationRef.current = aggregation;
  }, [aggregation]);

  // ── Initial map load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [121.0376, 14.5995],
      zoom: 10.5,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      loadChoropleth(
        map.current,
        heatmapDataRef.current,
        aggregationRef.current,
      );
      setupHoverInteraction(map.current);
    });

    return () => {
      if (map.current?._choroplethPopup) {
        map.current._choroplethPopup.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render choropleth when data or aggregation changes ──────────────────
  useEffect(() => {
    if (!map.current) return;

    const doUpdate = () => {
      loadChoropleth(map.current, heatmapData, aggregation);
    };

    if (map.current.isStyleLoaded()) {
      doUpdate();
    } else {
      map.current.once("style.load", doUpdate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapData, aggregation]);

  return (
    <div ref={mapContainer} className={styles.mapInner}>
      {/* Reports count badge */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          background: "white",
          padding: "0.6rem 1rem",
          borderRadius: "10px",
          fontSize: "0.78rem",
          color: "#6b7280",
          zIndex: 10,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <strong style={{ color: "#037F81" }}>Reports shown:</strong>{" "}
        {reportCount}
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          right: "1rem",
          background: "white",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          fontSize: "0.75rem",
          color: "#6b7280",
          zIndex: 10,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{ marginBottom: "0.5rem", fontWeight: 700, color: "#1a1a1a" }}
        >
          Density
        </div>
        {[
          { color: "#ef4444", label: "High (≥70%)" },
          { color: "#f97316", label: "Medium-High" },
          { color: "#eab308", label: "Medium" },
          { color: "#22c55e", label: "Low" },
          { color: "#dbeafe", label: "None" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "0.25rem",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                backgroundColor: color,
                borderRadius: "3px",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ title, value, subtext }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statNum}>{value}</p>
      <p className={styles.statLabel}>{title}</p>
      {subtext && <p className={styles.statSub}>{subtext}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FilterSection({ filters, onChange, meta }) {
  const { regions = [], cities = [], councils = [], statuses = [] } = meta;
  const ALL_STATUSES = [
    "Submitted",
    "For Verification",
    "Undergoing Review",
    "Verified - True",
    "Verified - False",
    "Under Case Evaluation",
    "Case Filed",
    "Investigation Ongoing",
    "Hearing Ongoing",
    "Dismissed",
    "Perpetrator Convicted",
    "Resolved",
    "Withdrawn",
  ];

  const STATUS_OPTIONS = ALL_STATUSES.map((status) => ({
    value: status,
    label: status,
  }));
  const citiesInRegion = filters.region
    ? regions.find((r) => r.key === filters.region)?.cities || []
    : cities;

  return (
    <div className={styles.filterContainer}>
      {[
        {
          label: "Region",
          key: "region",
          options: regions.map((r) => ({ value: r.key, label: r.label })),
          placeholder: "All Regions",
          onChange: (v) => {
            onChange("region", v);
            onChange("city", "");
          },
        },
        {
          label: "City",
          key: "city",
          options: citiesInRegion.map((c) => ({ value: c, label: c })),
          placeholder: "All Cities",
        },
        {
          label: "Council",
          key: "council",
          options: councils.map((c) => ({ value: c, label: c })),
          placeholder: "All Councils",
        },
        {
          label: "Status",
          key: "status",
          options: STATUS_OPTIONS,
          placeholder: "All",
        },
        {
          label: "Verification",
          key: "verification",
          options: [
            { value: "verified", label: "Verified" },
            { value: "unverified", label: "Unverified" },
          ],
          placeholder: "All",
        },
        {
          label: "Victim Gender",
          key: "victim_gender",
          options: [
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Non-binary", label: "Non-binary" },
            { value: "Prefer not to say", label: "Prefer not to say" },
          ],
          placeholder: "All",
        },
        {
          label: "Perpetrator Gender",
          key: "perpetrator_gender",
          options: [
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Non-binary", label: "Non-binary" },
            { value: "Prefer not to say", label: "Prefer not to say" },
          ],
          placeholder: "All",
        },
      ].map(
        ({ label, key, options, placeholder, onChange: customOnChange }) => (
          <div key={key} className={styles.filterGroup}>
            <label className={styles.filterLabel}>{label}</label>
            <select
              className={styles.filterSelect}
              value={filters[key]}
              onChange={(e) =>
                customOnChange
                  ? customOnChange(e.target.value)
                  : onChange(key, e.target.value)
              }
            >
              <option value="">{placeholder}</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ),
      )}
      <button
        className={styles.resetBtn}
        onClick={() => onChange("reset", true)}
      >
        Reset Filters
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HeatmapPage() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalReports, setTotalReports] = useState(0);
  const [aggregation, setAggregation] = useState("city");
  const [meta, setMeta] = useState({
    regions: [],
    cities: [],
    councils: [],
    statuses: [],
  });

  const [filters, setFilters] = useState({
    region: "",
    city: "",
    council: "",
    status: "",
    verification: "",
    victim_gender: "",
    perpetrator_gender: "",
  });

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [geoRes, statusRes] = await Promise.all([
          fetch(`${API_URL}/api/case_reports/heatmap/meta`),
          fetch(`${API_URL}/api/case_status`),
        ]);
        const geo = geoRes.ok ? await geoRes.json() : {};
        const statusRows = statusRes.ok ? await statusRes.json() : [];
        const statuses = Array.isArray(statusRows)
          ? statusRows.map((r) => r.status_name).filter(Boolean)
          : [];
        setMeta({
          regions: geo.regions || [],
          cities: geo.cities || [],
          councils: geo.councils || [],
          statuses,
        });
      } catch (err) {
        console.error("[fetchMeta]", err.message);
      }
    }
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        queryParams.append("aggregation", aggregation);
        if (filters.city) queryParams.append("city", filters.city);
        if (filters.region) queryParams.append("region", filters.region);
        if (filters.council) queryParams.append("council", filters.council);
        if (filters.status) queryParams.append("status", filters.status);
        if (filters.verification)
          queryParams.append("verification", filters.verification);
        if (filters.victim_gender)
          queryParams.append("victim_gender", filters.victim_gender);
        if (filters.perpetrator_gender)
          queryParams.append("perpetrator_gender", filters.perpetrator_gender);

        const res = await fetch(
          `${API_URL}/api/case_reports/heatmap/data?${queryParams}`,
          {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!res.ok)
          throw new Error(
            `Failed to fetch heatmap data: ${res.status} ${res.statusText}`,
          );

        const response = await res.json();
        setHeatmapData(response.data || []);
        setTotalReports(response.totalReports || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmapData();
  }, [filters, aggregation]);

  const handleFilterChange = (field, value) => {
    if (field === "reset") {
      setFilters({
        region: "",
        city: "",
        council: "",
        status: "",
        verification: "",
        victim_gender: "",
        perpetrator_gender: "",
      });
    } else {
      setFilters((prev) => ({ ...prev, [field]: value }));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Loading heatmap data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorStateContainer}>
          <div className={styles.errorState}>
            <h2>
              <IoIosWarning /> Error Loading Data
            </h2>
            <p>{error}</p>
            {error.includes("401") && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginTop: "1rem",
                }}
              >
                Your session may have expired. Please{" "}
                <a
                  href="/login"
                  style={{ color: "#037F81", textDecoration: "underline" }}
                >
                  log in again
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── Hero Banner ── */}
      <section className={styles.heroBanner}>
        <div className="container-xl">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Heatmap Visualization</h1>
            <div className="row g-3 justify-content-center">
              <div className="col-12 col-md-3">
                <div className={styles.heroStatCard}>
                  <p className={styles.heroStatNum}>{totalReports}</p>
                  <p className={styles.heroStatLabel}>Total Reports</p>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className={styles.heroStatCard}>
                  <p className={styles.heroStatNum}>
                    {heatmapData.filter((d) => d.density > 0).length}
                  </p>
                  <p className={styles.heroStatLabel}>Locations with Cases</p>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className={styles.heroStatCard}>
                  <p className={styles.heroStatNum}>
                    {Math.max(...heatmapData.map((d) => d.density), 0)}
                  </p>
                  <p className={styles.heroStatLabel}>Highest Density</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-xl py-4">
        {/* ── Filters ── */}
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Filters</h2>
          <div className={styles.headingLine} />
        </div>
        <FilterSection
          filters={filters}
          onChange={handleFilterChange}
          meta={meta}
        />

        {/* ── Aggregation Toggle ── */}
        <div className={styles.aggregationRow}>
          <span className={styles.aggregationLabel}>View by:</span>
          {["city", "region", "council"].map((agg) => (
            <button
              key={agg}
              onClick={() => setAggregation(agg)}
              className={`${styles.aggregationBtn} ${aggregation === agg ? styles.aggregationBtnActive : ""}`}
            >
              {agg.charAt(0).toUpperCase() + agg.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Map ── */}
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Map</h2>
          <div className={styles.headingLine} />
        </div>
        <div className={styles.mapContainer}>
          {MAPBOX_TOKEN ? (
            <MapContainer
              heatmapData={heatmapData}
              reportCount={totalReports}
              aggregation={aggregation}
            />
          ) : (
            <div className={styles.mapPlaceholder}>
              <p>Mapbox token not configured</p>
              <p className={styles.hint}>
                Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
              </p>
            </div>
          )}
        </div>

        {/* ── Density Breakdown ── */}
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Density Breakdown</h2>
          <div className={styles.headingLine} />
        </div>
        <div className={styles.breakdownContainer}>
          <div className={styles.breakdownSection}>
            <h3>
              Top{" "}
              {aggregation === "city"
                ? "Cities"
                : aggregation === "region"
                  ? "Regions"
                  : "Councils"}{" "}
              by Density
            </h3>
            <div className={styles.breakdownList}>
              {heatmapData
                .filter((d) => d.density > 0)
                .sort((a, b) => b.density - a.density)
                .slice(0, 10)
                .map((location) => (
                  <div key={location.name} className={styles.breakdownItem}>
                    <span>{location.name}</span>
                    <div className={styles.bar}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${location.intensity * 100}%`,
                          backgroundColor: getColorForIntensity(
                            location.intensity,
                          ),
                        }}
                      />
                    </div>
                    <span className={styles.count}>{location.density}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}