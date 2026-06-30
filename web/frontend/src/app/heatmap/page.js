"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./heatmap.module.css";
import { IoIosWarning } from "react-icons/io";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

import {
  loadChoropleth,
  setupHoverInteraction,
  removeWaterLayer,
  getColorForIntensity,
} from "@/lib/choroplethUtils";

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
      removeWaterLayer(map.current);
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
  const { regions = [], cities = [], caseTypes = [], statuses = [] } = meta;
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
          label: "Status",
          key: "status",
          options: STATUS_OPTIONS,
          placeholder: "All",
        },
        {
          label: "Case Type",
          key: "case_type",
          options: caseTypes.map((type) => ({ value: type, label: type })),
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
    caseTypes: [],
    statuses: [],
  });

  const [filters, setFilters] = useState({
    region: "",
    city: "",
    case_type: "",
    status: "",
    verification: "",
    victim_gender: "",
    perpetrator_gender: "",
  });

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [geoRes, statusRes, caseTypeRes] = await Promise.all([
          fetch(`${API_URL}/api/case_reports/heatmap/meta`),
          fetch(`${API_URL}/api/case_status`),
          fetch(`${API_URL}/api/case_types`),
        ]);
        const geo = geoRes.ok ? await geoRes.json() : {};
        const statusRows = statusRes.ok ? await statusRes.json() : [];
        const caseTypeRows = caseTypeRes.ok ? await caseTypeRes.json() : [];
        const statuses = Array.isArray(statusRows)
          ? statusRows.map((r) => r.status_name).filter(Boolean)
          : [];
        const caseTypes = Array.isArray(caseTypeRows)
          ? caseTypeRows
              .map((r) => r.case_type_name || r.name || r.type || r.label)
              .filter(Boolean)
          : [];
        setMeta({
          regions: geo.regions || [],
          cities: geo.cities || [],
          caseTypes,
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
        if (filters.status) queryParams.append("status", filters.status);
        if (filters.case_type) queryParams.append("case_type", filters.case_type);
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
        case_type: "",
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
