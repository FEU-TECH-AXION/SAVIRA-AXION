"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./heatmap.module.css";

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

// ─────────────────────────────────────────────────────────────────────────────
// MAP CONTAINER
// ─────────────────────────────────────────────────────────────────────────────

function MapContainer({ heatmapData, reportCount, aggregation }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const heatmapDataRef = useRef(heatmapData);

  useEffect(() => {
    heatmapDataRef.current = heatmapData;
  }, [heatmapData]);

  useEffect(() => {
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
        map.current.on("load", () => {
          addHeatmapLayer(map.current, heatmapDataRef.current);
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  useEffect(() => {
    if (map.current && heatmapData) {
      if (map.current.isStyleLoaded()) {
        updateHeatmapLayer(map.current, heatmapData);
      } else {
        const handleStyleLoad = () => updateHeatmapLayer(map.current, heatmapData);
        map.current.once("style.load", handleStyleLoad);
        return () => { if (map.current) map.current.off("style.load", handleStyleLoad); };
      }
    }
  }, [heatmapData, aggregation]);

  return (
    <div ref={mapContainer} className={styles.mapInner}>
      {/* Reports count badge */}
      <div style={{
        position: "absolute", bottom: "1rem", left: "1rem",
        background: "white", padding: "0.6rem 1rem",
        borderRadius: "10px", fontSize: "0.78rem",
        color: "#6b7280", zIndex: 10,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <strong style={{ color: "#037F81" }}>Reports shown:</strong> {reportCount}
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: "1rem", right: "1rem",
        background: "white", padding: "0.75rem 1rem",
        borderRadius: "10px", fontSize: "0.75rem",
        color: "#6b7280", zIndex: 10,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <div style={{ marginBottom: "0.5rem", fontWeight: 700, color: "#1a1a1a" }}>Density</div>
        {[
          { color: "#ef4444", label: "High" },
          { color: "#eab308", label: "Medium" },
          { color: "#22c55e", label: "Low" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: color, borderRadius: "3px" }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function addHeatmapLayer(map, heatmapData) {
  const sourceId = "heatmap-source";
  const heatmapLayerId = "heatmap-layer";
  const circleLayerId = "heatmap-point-layer";

  if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId);
  if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  const features = (heatmapData || []).map((point) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [point.coordinates.lng, point.coordinates.lat] },
    properties: { name: point.name, density: point.density, intensity: point.intensity },
  }));

  const maxDensity = Math.max(1, ...features.map((f) => f.properties.density || 0));

  map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features } });

  map.addLayer({
    id: heatmapLayerId, type: "heatmap", source: sourceId, maxzoom: 16,
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "density"], 0, 0, maxDensity, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 2, 15, 4],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(219,234,254,0)",
        0.1, "rgba(147,197,253,0.4)",
        0.25, "rgba(34,197,94,0.65)",
        0.45, "rgba(234,179,8,0.8)",
        0.65, "rgba(249,115,22,0.9)",
        0.85, "rgba(239,68,68,0.95)",
        1.0, "rgba(185,28,28,1)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 9, 50, 11, 80, 13, 110, 15, 150],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 14, 0.7, 16, 0],
    },
  });

  map.addLayer({
    id: circleLayerId, type: "circle", source: sourceId, minzoom: 13,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 4, 16, 10],
      "circle-color": ["interpolate", ["linear"], ["get", "density"], 0, "rgba(34,197,94,0.4)", maxDensity, "rgba(239,68,68,0.4)"],
      "circle-stroke-color": "rgba(255,255,255,0.6)",
      "circle-stroke-width": 1,
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.4],
    },
  });
}

function updateHeatmapLayer(map, heatmapData) {
  addHeatmapLayer(map, heatmapData);
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
  const citiesInRegion = filters.region
    ? regions.find((r) => r.key === filters.region)?.cities || []
    : cities;

  return (
    <div className={styles.filterContainer}>
      {[
        {
          label: "Region", key: "region",
          options: regions.map((r) => ({ value: r.key, label: r.label })),
          placeholder: "All Regions",
          onChange: (v) => { onChange("region", v); onChange("city", ""); },
        },
        {
          label: "City", key: "city",
          options: citiesInRegion.map((c) => ({ value: c, label: c })),
          placeholder: "All Cities",
        },
        {
          label: "Council", key: "council",
          options: councils.map((c) => ({ value: c, label: c })),
          placeholder: "All Councils",
        },
        {
          label: "Status", key: "status",
          options: statuses.map((s) => ({ value: s, label: s })),
          placeholder: "All Statuses",
        },
        {
          label: "Verification", key: "verification",
          options: [{ value: "verified", label: "Verified" }, { value: "unverified", label: "Unverified" }],
          placeholder: "All",
        },
      ].map(({ label, key, options, placeholder, onChange: customOnChange }) => (
        <div key={key} className={styles.filterGroup}>
          <label className={styles.filterLabel}>{label}</label>
          <select
            className={styles.filterSelect}
            value={filters[key]}
            onChange={(e) => customOnChange ? customOnChange(e.target.value) : onChange(key, e.target.value)}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
      <button className={styles.resetBtn} onClick={() => onChange("reset", true)}>
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
  const [meta, setMeta] = useState({ regions: [], cities: [], councils: [], statuses: [] });

  const [filters, setFilters] = useState({
    region: "", city: "", council: "", status: "", verification: "",
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
        const statuses = Array.isArray(statusRows) ? statusRows.map((r) => r.status_name).filter(Boolean) : [];
        setMeta({ regions: geo.regions || [], cities: geo.cities || [], councils: geo.councils || [], statuses });
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
        if (filters.verification) queryParams.append("verification", filters.verification);

        const res = await fetch(`${API_URL}/api/case_reports/heatmap/data?${queryParams}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`Failed to fetch heatmap data: ${res.status} ${res.statusText}`);

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
      setFilters({ region: "", city: "", council: "", status: "", verification: "" });
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
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem" }}>
                Your session may have expired. Please{" "}
                <a href="/login" style={{ color: "#037F81", textDecoration: "underline" }}>
                  log in again
                </a>.
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
                  <p className={styles.heroStatNum}>{heatmapData.filter((d) => d.density > 0).length}</p>
                  <p className={styles.heroStatLabel}>Locations with Cases</p>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className={styles.heroStatCard}>
                  <p className={styles.heroStatNum}>{Math.max(...heatmapData.map((d) => d.density), 0)}</p>
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
        <FilterSection filters={filters} onChange={handleFilterChange} meta={meta} />

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
              <p className={styles.hint}>Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
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
              Top {aggregation === "city" ? "Cities" : aggregation === "region" ? "Regions" : "Councils"} by Density
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
                          backgroundColor: getColorForIntensity(location.intensity),
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