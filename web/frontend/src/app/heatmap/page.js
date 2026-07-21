"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./heatmap.module.css";
import { IoIosWarning } from "react-icons/io";
import { FiChevronDown, FiFilter, FiSearch, FiX } from "react-icons/fi";

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

function HeatmapFilterDropdown({ field, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [selectSearch, setSelectSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function outside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectedOption = field.options.find((option) => option.value === value);
  const displayValue = selectedOption?.label || field.placeholder;
  const filteredOptions = field.options.filter((option) =>
    option.label.toLowerCase().includes(selectSearch.toLowerCase()),
  );

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        type="button"
        className={`${styles.defaultFilterBtn} ${
          value ? styles.defaultFilterBtnActive : ""
        }`}
        onClick={() => {
          setOpen((current) => !current);
          setSelectSearch("");
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>{displayValue}</span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown} role="listbox">
          <div className={styles.filterSearchWrap}>
            <FiSearch size={13} className={styles.filterSearchIcon} />
            <input
              type="text"
              className={styles.filterSearchInput}
              placeholder={`Search ${field.label}...`}
              value={selectSearch}
              onChange={(event) => setSelectSearch(event.target.value)}
              autoFocus
            />
          </div>
          <button
            type="button"
            className={`${styles.filterOption} ${
              !value ? styles.filterOptionActive : ""
            }`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {field.placeholder}
          </button>
          {filteredOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`${styles.filterOption} ${
                value === option.value ? styles.filterOptionActive : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <div className={styles.filterEmpty}>No options found</div>
          )}
          <div className={styles.defaultFilterFooter}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({ filters, onChange, meta }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterBarSearch, setFilterBarSearch] = useState("");
  const menuRef = useRef(null);
  const { regions = [], cities = [], caseTypes = [] } = meta;
  const ALL_STATUSES = [
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
  const filterDefinitions = [
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
        { value: "LGBTQIA+ member", label: "LGBTQIA+ member" },
      ],
      placeholder: "All",
    },
    {
      label: "Perpetrator Gender",
      key: "perpetrator_gender",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "Unable to tell", label: "Unable to tell" },
      ],
      placeholder: "All",
    },
  ];
  const activeFilterCount = filterDefinitions.filter(
    ({ key }) => filters[key],
  ).length;
  const normalizedFilterSearch = filterBarSearch.trim().toLowerCase();
  const visibleFilterDefinitions = normalizedFilterSearch
    ? filterDefinitions.filter((field) => {
        const searchableText = [
          field.label,
          field.placeholder,
          ...field.options.map((option) => option.label),
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(normalizedFilterSearch);
      })
    : filterDefinitions;

  useEffect(() => {
    function outside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterBarWrap}>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search filters..."
            value={filterBarSearch}
            onChange={(event) => setFilterBarSearch(event.target.value)}
          />
          <span className={styles.searchIcon}>
            <FiSearch />
          </span>
        </div>

        <div className={styles.defaultFiltersRow}>
          {visibleFilterDefinitions.map((field) => (
            <HeatmapFilterDropdown
              key={field.key}
              field={field}
              value={filters[field.key]}
              onChange={(value) => onChange(field.key, value)}
            />
          ))}
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => onChange("reset", true)}
          >
            Reset Filters
          </button>
          {visibleFilterDefinitions.length === 0 && (
            <span className={styles.filterNoMatches}>No filters found</span>
          )}
        </div>

        <div className={styles.filterMenuWrapper} ref={menuRef}>
          <button
            type="button"
            className={`${styles.filterMenuBtn} ${
              menuOpen ? styles.filterMenuBtnOpen : ""
            }`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Open filter menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            <FiFilter size={15} />
            <span className={styles.filterMenuBtnLabel}>Filters</span>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>

          {menuOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterDropdownHeader}>
                <h4 className={styles.filterDropdownTitle}>Filters</h4>
                <button
                  type="button"
                  className={styles.filterDropdownClose}
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close filters"
                >
                  <FiX size={15} />
                </button>
              </div>
              <div className={styles.mobileSheetFilters}>
                {visibleFilterDefinitions.map((field) => (
                  <HeatmapFilterDropdown
                    key={`mobile-${field.key}`}
                    field={field}
                    value={filters[field.key]}
                    onChange={(value) => onChange(field.key, value)}
                  />
                ))}
                {visibleFilterDefinitions.length === 0 && (
                  <div className={styles.filterNoMatches}>
                    No filters found
                  </div>
                )}
              </div>
              <div className={styles.filterDropdownFooter}>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className={styles.filterClearBtn}
                    onClick={() => onChange("reset", true)}
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  className={styles.filterDoneBtn}
                  onClick={() => setMenuOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
        {/* <div className={styles.aggregationRow}>
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
        </div> */}

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
