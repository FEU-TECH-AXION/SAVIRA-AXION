"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./heatmap.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Color mapping for heatmap intensity (weather-style: red → yellow → green)
function getColorForIntensity(intensity) {
  if (intensity >= 0.7) return "#ef4444"; // Red - high density
  if (intensity >= 0.5) return "#f97316"; // Orange
  if (intensity >= 0.3) return "#eab308"; // Yellow
  if (intensity >= 0.15) return "#22c55e"; // Green - low density
  return "#dbeafe"; // Light blue - minimal
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CONTAINER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function MapContainer({ heatmapData, reportCount, aggregation }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const heatmapDataRef = useRef(heatmapData);

  // Keep heatmapDataRef updated with latest data
  useEffect(() => {
    heatmapDataRef.current = heatmapData;
  }, [heatmapData]);

  useEffect(() => {
    // Load Mapbox GL from CDN
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
    script.async = true;
    script.onload = () => {
      const link = document.createElement("link");
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      if (mapContainer.current && !map.current && MAPBOX_TOKEN) {
        window.mapboxgl.accessToken = MAPBOX_TOKEN;
        map.current = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [121.0376, 14.5995],
          zoom: 11,
        });

        // Add heatmap layer once map loads
        map.current.on("load", () => {
          addHeatmapLayer(map.current, heatmapDataRef.current);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update heatmap when data changes
  useEffect(() => {
    if (map.current && heatmapData) {
      if (map.current.isStyleLoaded()) {
        updateHeatmapLayer(map.current, heatmapData);
      } else {
        const handleStyleLoad = () => {
          updateHeatmapLayer(map.current, heatmapData);
        };
        map.current.once("style.load", handleStyleLoad);
        return () => {
          if (map.current) map.current.off("style.load", handleStyleLoad);
        };
      }
    }
  }, [heatmapData, aggregation]);

  return (
    <div ref={mapContainer} className={styles.mapInner}>
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          background: "white",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          color: "#6b7280",
          zIndex: 10,
        }}
      >
        <strong>Reports shown:</strong> {reportCount}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          right: "1rem",
          background: "white",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.7rem",
          color: "#6b7280",
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Density:</div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.25rem",
          }}
        >
          <div
            style={{
              width: "1rem",
              height: "1rem",
              backgroundColor: "#ef4444",
              borderRadius: "2px",
            }}
          />
          <span>High</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.25rem",
          }}
        >
          <div
            style={{
              width: "1rem",
              height: "1rem",
              backgroundColor: "#eab308",
              borderRadius: "2px",
            }}
          />
          <span>Medium</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div
            style={{
              width: "1rem",
              height: "1rem",
              backgroundColor: "#22c55e",
              borderRadius: "2px",
            }}
          />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}

// Add heatmap layer to map
function addHeatmapLayer(map, heatmapData) {
  const sourceId = "heatmap-source";
  const heatmapLayerId = "heatmap-layer";
  const circleLayerId = "heatmap-point-layer";

  // Clean up existing layers and source if they exist
  if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
  if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  const features = (heatmapData || []).map((point) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.coordinates.lng, point.coordinates.lat],
    },
    properties: {
      name: point.name,
      density: point.density,
      intensity: point.intensity,
    },
  }));

  // Compute the real max density so weight always spans 0→1 relative to your data.
  // Fallback to 1 so we never divide by zero on empty data.
  const maxDensity = Math.max(
    1,
    ...features.map((f) => f.properties.density || 0),
  );

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features,
    },
  });

  // Native Mapbox heatmap layer — weather-radar style continuous density gradient.
  // Colors blend smoothly between nearby points (no hard outlines).
  map.addLayer({
    id: heatmapLayerId,
    type: "heatmap",
    source: sourceId,
    maxzoom: 16,
    paint: {
      // Weight scales relative to the ACTUAL max in this dataset.
      // This guarantees the hottest city always reaches full weight (1)
      // regardless of whether you have 2 cases or 200.
      "heatmap-weight": [
        "interpolate",
        ["linear"],
        ["get", "density"],
        0,
        0,
        maxDensity,
        1,
      ],
      // Boost overall intensity as you zoom in so blobs stay vivid.
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        1,
        9,
        2,
        15,
        4,
      ],
      // Color ramp: transparent → light-blue → green → yellow → orange → red.
      // Domain is heatmap-density (0 = no data, 1 = peak density).
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(219,234,254,0)", // fully transparent at 0
        0.1,
        "rgba(147,197,253,0.4)", // light blue
        0.25,
        "rgba(34,197,94,0.65)", // green
        0.45,
        "rgba(234,179,8,0.8)", // yellow
        0.65,
        "rgba(249,115,22,0.9)", // orange
        0.85,
        "rgba(239,68,68,0.95)", // red
        1.0,
        "rgba(185,28,28,1)", // deep red — absolute peak
      ],
      // Large radius so neighbouring NCR cities bleed into each other
      // creating the continuous hot-zone effect.
      "heatmap-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        15,
        9,
        50,
        11,
        80,
        13,
        110,
        15,
        150,
      ],
      // Keep fully visible at street zoom; fade only at very high zoom
      // where individual circle points take over.
      "heatmap-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        1,
        14,
        0.7,
        16,
        0,
      ],
    },
  });

  // Subtle circle overlay at high zoom so individual locations stay readable.
  map.addLayer({
    id: circleLayerId,
    type: "circle",
    source: sourceId,
    minzoom: 13,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 4, 16, 10],
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "density"],
        0,
        "rgba(34,197,94,0.4)",
        maxDensity,
        "rgba(239,68,68,0.4)",
      ],
      "circle-stroke-color": "rgba(255,255,255,0.6)",
      "circle-stroke-width": 1,
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.4],
    },
  });
}

// Update heatmap layer with new data.
// When data changes we rebuild the whole layer so heatmap-weight
// can be re-calibrated to the new dataset's max density.
function updateHeatmapLayer(map, heatmapData) {
  addHeatmapLayer(map, heatmapData);
}

function StatCard({ title, value, subtext, color }) {
  return (
    <div className={styles.statCard}>
      <div
        style={{
          color,
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#6b7280",
          marginBottom: "0.25rem",
        }}
      >
        {title}
      </div>
      {subtext && (
        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{subtext}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FilterSection({ filters, onChange, meta }) {
  const { regions = [], cities = [], councils = [], statuses = [] } = meta;

  // Derive cities visible under the selected region
  const citiesInRegion = filters.region
    ? regions.find((r) => r.key === filters.region)?.cities || []
    : cities;

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterGroup}>
        <label>Region (NCR)</label>
        <select
          value={filters.region}
          onChange={(e) => {
            onChange("region", e.target.value);
            onChange("city", "");
          }}
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>City</label>
        <select
          value={filters.city}
          onChange={(e) => onChange("city", e.target.value)}
        >
          <option value="">All Cities</option>
          {citiesInRegion.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Council</label>
        <select
          value={filters.council}
          onChange={(e) => onChange("council", e.target.value)}
        >
          <option value="">All Councils</option>
          {councils.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Status</label>
        <select
          value={filters.status}
          onChange={(e) => onChange("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Verification</label>
        <select
          value={filters.verification}
          onChange={(e) => onChange("verification", e.target.value)}
        >
          <option value="">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HeatmapPage() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalReports, setTotalReports] = useState(0);
  const [aggregation, setAggregation] = useState("city");

  // Meta: geography + statuses from the backend (replaces all hardcoded lists)
  const [meta, setMeta] = useState({
    regions: [],
    cities: [],
    councils: [],
    statuses: [],
  });
  const [metaLoading, setMetaLoading] = useState(true);

  const [filters, setFilters] = useState({
    region: "",
    city: "",
    council: "",
    status: "",
    verification: "",
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH FILTER METADATA (geography + statuses) — runs once on mount
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchMeta() {
      try {
        // Fetch geography and case-statuses in parallel
        const [geoRes, statusRes] = await Promise.all([
          fetch(`${API_URL}/api/case_reports/heatmap/meta`),
          fetch(`${API_URL}/api/case_status`),
        ]);

        const geo = geoRes.ok ? await geoRes.json() : {};
        const statusRows = statusRes.ok ? await statusRes.json() : [];

        // case_status rows look like: [{ case_status_id: 1, status_name: "For Verification" }, ...]
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
        // Fail silently — filters will just be empty but the map still works
      } finally {
        setMetaLoading(false);
      }
    }
    fetchMeta();
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH HEATMAP DATA
  // ──────────────────────────────────────────────────────────────────────────

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

        const res = await fetch(
          `${API_URL}/api/case_reports/heatmap/data?${queryParams}`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`API Error ${res.status}:`, errorText);
          throw new Error(
            `Failed to fetch heatmap data: ${res.status} ${res.statusText}`,
          );
        }

        const response = await res.json();
        setHeatmapData(response.data || []);
        setTotalReports(response.totalReports || 0);
      } catch (err) {
        console.error("Error fetching heatmap data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [filters, aggregation]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLE FILTER CHANGES
  // ──────────────────────────────────────────────────────────────────────────

  const handleFilterChange = (field, value) => {
    if (field === "reset") {
      setFilters({
        region: "",
        city: "",
        council: "",
        status: "",
        verification: "",
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
            <h2>⚠️ Error Loading Data</h2>
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
                  style={{ color: "#3b82f6", textDecoration: "underline" }}
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
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Heatmap Visualization</h1>
      </div>

      {/* STATS OVERVIEW */}
      <div className={styles.statsGrid}>
        <StatCard title="Total Reports" value={totalReports} color="#3b82f6" />
        <StatCard
          title="Locations with Cases"
          value={heatmapData.filter((d) => d.density > 0).length}
          color="#8b5cf6"
        />
        <StatCard
          title="Highest Density"
          value={Math.max(...heatmapData.map((d) => d.density), 0)}
          subtext="cases in one location"
          color="#ef4444"
        />
        <StatCard
          title="Aggregation"
          value={aggregation.charAt(0).toUpperCase() + aggregation.slice(1)}
          color="#10b981"
        />
      </div>

      {/* FILTERS */}
      <FilterSection
        filters={filters}
        onChange={handleFilterChange}
        meta={meta}
      />

      {/* AGGREGATION TOGGLE */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{ fontWeight: 600, color: "#374151", marginRight: "1rem" }}
        >
          View by:
        </label>
        {["city", "region", "council"].map((agg) => (
          <button
            key={agg}
            onClick={() => setAggregation(agg)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              backgroundColor: aggregation === agg ? "#3b82f6" : "white",
              color: aggregation === agg ? "white" : "#374151",
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {agg.charAt(0).toUpperCase() + agg.slice(1)}
          </button>
        ))}
      </div>

      {/* MAP CONTAINER */}
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

      {/* DETAILED BREAKDOWN */}
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
  );
}
