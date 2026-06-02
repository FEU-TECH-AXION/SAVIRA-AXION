"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./FilterMenu.module.css";

const DEFAULT_FILTERS = [
  {
    key: "interviewStatus",
    label: "Interview Status",
    type: "select",
    options: [
      "All",
      "Invited",
      "Scheduled",
      "Confirmed",
      "Completed",
      "Cancelled",
      "Expired",
      "Rejected",
    ],
  },
  {
    key: "dateRange",
    label: "Interview Date",
    type: "dateRange",
  },
];

const ALL_FILTER_FIELDS = [
  {
    key: "interviewType",
    label: "Interview Type",
    type: "select",
    options: ["All", "Initial", "Follow-up", "Confirmation"],
  },
];

export default function FilterMenu({ filters, onFilterChange, onClearAll }) {
  const [expanded, setExpanded] = useState(null);
  const [showAddFilters, setShowAddFilters] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setExpanded(null);
        setShowAddFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = Object.values(filters).some((v) => v && v !== "All");

  return (
    <div className={styles.filterBarWrap} ref={containerRef}>
      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map((filter) => {
          const currentValue = filters[filter.key] || "All";
          const isActive = currentValue !== "All" && currentValue;

          if (filter.type === "dateRange") {
            return (
              <div key={filter.key} className={styles.defaultFilter}>
                <button
                  className={`${styles.defaultFilterBtn} ${isActive ? styles.defaultFilterBtnActive : ""}`}
                  onClick={() => setExpanded(expanded === filter.key ? null : filter.key)}
                >
                  <span className={styles.defaultFilterLabel}>{filter.label}</span>
                  {isActive && (
                    <span className={styles.defaultFilterValue}>{currentValue}</span>
                  )}
                  <FiChevronDown size={14} />
                </button>
                {expanded === filter.key && (
                  <div className={styles.defaultFilterDropdown}>
                    <DateRangeFilter
                      value={currentValue}
                      onChange={(val) => {
                        onFilterChange(filter.key, val);
                        setExpanded(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={filter.key} className={styles.defaultFilter}>
              <button
                className={`${styles.defaultFilterBtn} ${isActive ? styles.defaultFilterBtnActive : ""}`}
                onClick={() => setExpanded(expanded === filter.key ? null : filter.key)}
              >
                <span className={styles.defaultFilterLabel}>{filter.label}</span>
                {isActive && (
                  <span className={styles.defaultFilterValue}>{currentValue}</span>
                )}
                <FiChevronDown size={14} />
              </button>
              {expanded === filter.key && (
                <div className={styles.defaultFilterDropdown}>
                  {filter.options.map((opt) => (
                    <button
                      key={opt}
                      className={`${styles.selectOption} ${currentValue === opt ? styles.selectOptionActive : ""}`}
                      onClick={() => {
                        onFilterChange(filter.key, opt);
                        setExpanded(null);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          className={styles.filterMenuBtn}
          onClick={() => setShowAddFilters(!showAddFilters)}
          title="Add more filters"
        >
          <FiFilter size={16} />
        </button>
      </div>

      {showAddFilters && (
        <div className={styles.addFiltersDropdown}>
          {ALL_FILTER_FIELDS.map((field) => (
            <button
              key={field.key}
              className={styles.addFilterOption}
              onClick={() => {
                setShowAddFilters(false);
                setExpanded(field.key);
              }}
            >
              + {field.label}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button
          className={styles.clearAllBtn}
          onClick={() => {
            onClearAll();
            setExpanded(null);
          }}
        >
          <FiX size={14} /> Clear All
        </button>
      )}
    </div>
  );
}

function DateRangeFilter({ value, onChange }) {
  const [mode, setMode] = useState("preset");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const presets = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "thisWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Last 30 Days", value: "last30Days" },
  ];

  return (
    <div className={styles.dateRangeFilter}>
      <div className={styles.dateRangeMode}>
        <button
          className={mode === "preset" ? styles.dateRangeModeActive : ""}
          onClick={() => setMode("preset")}
        >
          Presets
        </button>
        <button
          className={mode === "custom" ? styles.dateRangeModeActive : ""}
          onClick={() => setMode("custom")}
        >
          Custom
        </button>
      </div>

      {mode === "preset" ? (
        <div className={styles.presetOptions}>
          {presets.map((p) => (
            <button
              key={p.value}
              className={`${styles.presetOption} ${value === p.value ? styles.presetOptionActive : ""}`}
              onClick={() => onChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.customDateInputs}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.dateInput}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.dateInput}
          />
          <button
            className={styles.applyCustomBtn}
            onClick={() => {
              if (startDate && endDate) {
                onChange(`custom|${startDate}|${endDate}`);
              }
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
