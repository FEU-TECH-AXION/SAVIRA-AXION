"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./heatmap.module.css";
import { NCR_REGIONS, NCR_COUNCILS, ALL_NCR_CITIES, getCitiesByRegion } from "@/lib/ncrGeography";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CASE_STATUSES = [
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
];

function getColorForIntensity(intensity) {
  if (intensity >= 0.7) return "#ef4444";
  if (intensity >= 0.5) return "#f97316";
  if (intensity >= 0.3) return "#eab308";
  if (intensity >= 0.15) return "#22c55e";
  return "#dbeafe";
}

function MapContainer({ heatmapData, reportCount, aggregation }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

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
          addHeatmapLayer(map.current, heatmapData);
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

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded && map.current.isStyleLoaded() && heatmapData) {
      updateHeatmapLayer(map.current, heatmapData);
    }
  }, [heatmapData, aggregation]);

  return (
    <div ref={mapContainer} className={styles.mapInner}>
      <div style={{
        position: "absolute",
        bottom: "1rem",
        left: "1rem",
        background: "white",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        color: "#6b7280",
        zIndex: 10,
      }}>
        <strong>Reports shown:</strong> {reportCount}
      </div>
      <div style={{
        position: "absolute",
        bottom: "1rem",
        right: "1rem",
        background: "white",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.7rem",
        color: "#6b7280",
        zIndex: 10,
      }}>
        <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Density:</div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
          <div style={{ width: "1rem", height: "1rem", backgroundColor: "#ef4444", borderRadius: "2px" }} />
          <span>High</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
          <div style={{ width: "1rem", height: "1rem", backgroundColor: "#eab308", borderRadius: "2px" }} />
          <span>Medium</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ width: "1rem", height: "1rem", backgroundColor: "#22c55e", borderRadius: "2px" }} />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}

function addHeatmapLayer(map, heatmapData) {
  if (!heatmapData || heatmapData.length === 0) return;

  const sourceId = "heatmap-source";
  const layerId = "heatmap-layer";

  if (map.getSource(sourceId)) {
    map.removeLayer(layerId);
    map.removeSource(sourceId);
  }

  const features = heatmapData.map((point) => ({
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

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features,
    },
  });

  map.addLayer({
    id: layerId,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "density"],
        0, 5,
        50, 20,
      ],
      "circle-color": [
        "case",
        [">=", ["get", "intensity"], 0.7],
        "#ef4444",
        [">=", ["get", "intensity"], 0.5],
        "#f97316",
        [">=", ["get", "intensity"], 0.3],
        "#eab308",
        [">=", ["get", "intensity"], 0.15],
        "#22c55e",
        "#dbeafe",
      ],
      "circle-opacity": 0.7,
      "circle-stroke-width": 2,
      "circle-stroke-color": "white",
    },
  });

  map.on("click", layerId, (e) => {
    const properties = e.features[0].properties;
    new window.mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`<div style="font-size: 0.875rem; color: #1f2937;"><strong>${properties.name}</strong><br/>Cases: ${properties.density}</div>`)
      .addTo(map);
  });

  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
}

function updateHeatmapLayer(map, heatmapData) {
  const sourceId = "heatmap-source";

  if (map.getSource(sourceId)) {
    const features = heatmapData.map((point) => ({
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

    map.getSource(sourceId).setData({
      type: "FeatureCollection",
      features,
    });
  }
}

function StatCard({ title, value, subtext, color }) {
  return (
    <div className={styles.statCard}>
      <div style={{ color, fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" }}>
        {title}
      </div>
      {subtext && <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{subtext}</div>}
    </div>
  );
}

function FilterSection({ filters, onChange }) {
  const citiesInRegion = filters.region ? getCitiesByRegion(filters.region) : [];

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
          {NCR_REGIONS.map((r) => (
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
          {filters.region ? (
            citiesInRegion.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))
          ) : (
            ALL_NCR_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))
          )}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Council</label>
        <select
          value={filters.council}
          onChange={(e) => onChange("council", e.target.value)}
        >
          <option value="">All Councils</option>
          {NCR_COUNCILS.map((c) => (
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
          {CASE_STATUSES.map((s) => (
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

export default function HeatmapPage() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalReports, setTotalReports] = useState(0);
  const [aggregation, setAggregation] = useState("city");

  const [filters, setFilters] = useState({
    region: "",
    city: "",
    council: "",
    status: "",
    verification: "",
  });

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/mapbox-gl@3.6.0/dist/mapbox-gl.css";
    document.head.appendChild(link);
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

        const res = await fetch(
          `${API_URL}/api/case_reports/heatmap/data?${queryParams}`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`API Error ${res.status}:`, errorText);
          throw new Error(`Failed to fetch heatmap data: ${res.status} ${res.statusText}`);
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
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem" }}>
                Your session may have expired. Please <a href="/login" style={{ color: "#3b82f6", textDecoration: "underline" }}>log in again</a>.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🌡️ NCR Heatmap - Case Density Visualization</h1>
        <p>Weather-style heatmap showing case concentration by location (Red = High density, Green = Low density)</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Total Reports"
          value={totalReports}
          color="#3b82f6"
        />
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

      <FilterSection filters={filters} onChange={handleFilterChange} />

      <div style={{ padding: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600, color: "#374151", marginRight: "1rem" }}>View by:</label>
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

      <div className={styles.breakdownContainer}>
        <div className={styles.breakdownSection}>
          <h3>Top {aggregation === "city" ? "Cities" : aggregation === "region" ? "Regions" : "Councils"} by Density</h3>
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
                        width: `${(location.intensity) * 100}%`,
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
  );
}
