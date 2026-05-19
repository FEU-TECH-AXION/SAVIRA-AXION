"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import styles from "./heatmap.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

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

const GENDER_OPTIONS = ["Male", "Female", "Non-Binary", "Prefer Not to Say"];
const AGE_RANGES = ["< 18", "18-25", "26-35", "36-45", "46-55", "56+"];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CONTAINER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function MapContainer({ reportCount }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

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
          style: "mapbox://styles/mapbox/streets-v12",
          center: [121.5, 12],
          zoom: 6,
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
    </div>
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FilterSection({ filters, onChange }) {
  return (
    <div className={styles.filterContainer}>
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

      <div className={styles.filterGroup}>
        <label>Perpetrator Gender</label>
        <select
          value={filters.perpetratorGender}
          onChange={(e) => onChange("perpetratorGender", e.target.value)}
        >
          <option value="">All</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Victim Gender</label>
        <select
          value={filters.victimGender}
          onChange={(e) => onChange("victimGender", e.target.value)}
        >
          <option value="">All</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Victim Age</label>
        <select
          value={filters.victimAge}
          onChange={(e) => onChange("victimAge", e.target.value)}
        >
          <option value="">All</option>
          {AGE_RANGES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <button
        className={styles.resetBtn}
        onClick={() =>
          onChange("reset", true)
        }
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: 121.5,
    latitude: 12,
    zoom: 6,
  });

  const [filters, setFilters] = useState({
    status: "",
    verification: "",
    perpetratorGender: "",
    victimGender: "",
    victimAge: "",
  });

  // Inject Mapbox CSS
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/mapbox-gl@3.6.0/dist/mapbox-gl.css";
    document.head.appendChild(link);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_URL}/api/case_reports/all`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`API Error ${res.status}:`, errorText);
          throw new Error(`Failed to fetch reports: ${res.status} ${res.statusText}`);
        }

        const response = await res.json();
        const reports = Array.isArray(response) ? response : (response.data || []);

        if (!Array.isArray(reports)) {
          throw new Error("Invalid response format from API");
        }

        // Enrich with mock demographic data (in production, this comes from database)
        const enriched = reports.map((report) => ({
          ...report,
          location: {
            city: report.incident_city || "Unknown",
            province: report.incident_province || "Unknown",
            coordinates: getCoordinatesForCity(report.incident_city),
          },
          demographics: {
            perpetratorGender: GENDER_OPTIONS[Math.floor(Math.random() * GENDER_OPTIONS.length)],
            victimGender: GENDER_OPTIONS[Math.floor(Math.random() * GENDER_OPTIONS.length)],
            victimAge: AGE_RANGES[Math.floor(Math.random() * AGE_RANGES.length)],
          },
          isVerified: report.case_status_id && 
            (report.case_status_id.includes("Verified") || 
             report.case_status_id.includes("Investigation") ||
             report.case_status_id.includes("Case Filed")),
        }));

        setData(enriched);
      } catch (err) {
        console.error("Error fetching heatmap data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // APPLY FILTERS
  // ──────────────────────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    return data.filter((report) => {
      if (filters.status && !report.case_status_id?.includes(filters.status)) return false;
      if (filters.verification === "verified" && !report.isVerified) return false;
      if (filters.verification === "unverified" && report.isVerified) return false;
      if (filters.perpetratorGender && report.demographics.perpetratorGender !== filters.perpetratorGender)
        return false;
      if (filters.victimGender && report.demographics.victimGender !== filters.victimGender) return false;
      if (filters.victimAge && report.demographics.victimAge !== filters.victimAge) return false;
      return true;
    });
  }, [data, filters]);

  // ──────────────────────────────────────────────────────────────────────────
  // AGGREGATE STATS
  // ──────────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const verified = filteredData.filter((d) => d.isVerified).length;
    const unverified = filteredData.length - verified;

    const locationStats = {};
    filteredData.forEach((d) => {
      const key = d.location.city;
      locationStats[key] = (locationStats[key] || 0) + 1;
    });

    const genderStats = { perpetrator: {}, victim: {} };
    filteredData.forEach((d) => {
      const pGender = d.demographics.perpetratorGender;
      const vGender = d.demographics.victimGender;
      genderStats.perpetrator[pGender] = (genderStats.perpetrator[pGender] || 0) + 1;
      genderStats.victim[vGender] = (genderStats.victim[vGender] || 0) + 1;
    });

    return {
      total: filteredData.length,
      verified,
      unverified,
      locationStats,
      genderStats,
    };
  }, [filteredData]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLE FILTER CHANGES
  // ──────────────────────────────────────────────────────────────────────────

  const handleFilterChange = (field, value) => {
    if (field === "reset") {
      setFilters({
        status: "",
        verification: "",
        perpetratorGender: "",
        victimGender: "",
        victimAge: "",
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
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Live Heatmap of Reports</h1>
        <p>Visualizing reports by location, demographics, and case status</p>
      </div>

      {/* STATS OVERVIEW */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Reports"
          value={stats.total}
          color="#3b82f6"
        />
        <StatCard
          title="Verified"
          value={stats.verified}
          subtext={`${Math.round((stats.verified / stats.total) * 100) || 0}% of total`}
          color="#10b981"
        />
        <StatCard
          title="Unverified"
          value={stats.unverified}
          subtext={`${Math.round((stats.unverified / stats.total) * 100) || 0}% of total`}
          color="#f59e0b"
        />
        <StatCard
          title="Unique Cities"
          value={Object.keys(stats.locationStats).length}
          color="#8b5cf6"
        />
      </div>

      {/* FILTERS */}
      <FilterSection filters={filters} onChange={handleFilterChange} />

      {/* MAP CONTAINER */}
      <div className={styles.mapContainer}>
        {MAPBOX_TOKEN ? (
          <MapContainer reportCount={filteredData.length} />
        ) : (
          <div className={styles.mapPlaceholder}>
            <p>Mapbox token not configured</p>
            <p className={styles.hint}>Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
          </div>
        )}
      </div>

      {/* DETAILED BREAKDOWN */}
      <div className={styles.breakdownContainer}>
        <div className={styles.breakdownSection}>
          <h3>Reports by City</h3>
          <div className={styles.breakdownList}>
            {Object.entries(stats.locationStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([city, count]) => (
                <div key={city} className={styles.breakdownItem}>
                  <span>{city}</span>
                  <div className={styles.bar}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${(count / Math.max(...Object.values(stats.locationStats))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className={styles.count}>{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className={styles.breakdownSection}>
          <h3>Perpetrator Gender</h3>
          <div className={styles.breakdownList}>
            {Object.entries(stats.genderStats.perpetrator).map(([gender, count]) => (
              <div key={`perp-${gender}`} className={styles.breakdownItem}>
                <span>{gender}</span>
                <span className={styles.count}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.breakdownSection}>
          <h3>Victim Gender</h3>
          <div className={styles.breakdownList}>
            {Object.entries(stats.genderStats.victim).map(([gender, count]) => (
              <div key={`vic-${gender}`} className={styles.breakdownItem}>
                <span>{gender}</span>
                <span className={styles.count}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

// Mock function to get coordinates for Philippine cities
function getCoordinatesForCity(city) {
  const cityCoords = {
    Manila: { lng: 120.9842, lat: 14.5995 },
    "Quezon City": { lng: 121.0376, lat: 14.6349 },
    Makati: { lng: 121.0193, lat: 14.5564 },
    Cebu: { lng: 123.8854, lat: 10.3157 },
    Davao: { lng: 125.3521, lat: 7.1315 },
    Cagayan: { lng: 121.7773, lat: 17.633 },
    Iloilo: { lng: 122.5597, lat: 10.6918 },
    Bacolod: { lng: 122.954, lat: 10.3906 },
    Zamboanga: { lng: 122.0719, lat: 6.9271 },
    GenSan: { lng: 125.1634, lat: 6.1219 },
  };

  return cityCoords[city] || { lng: 121.5, lat: 12 }; // Default to center of Philippines
}
