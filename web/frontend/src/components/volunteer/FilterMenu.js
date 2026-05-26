"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./FilterMenu.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected", "Withdrawn"];

const ORGANIZATION_OPTIONS = [
  "BSP",
  "GSP",
  "Other",
];

const DATE_RANGE_OPTIONS = [
  { label: "Today",        value: "today" },
  { label: "This Week",    value: "thisWeek" },
  { label: "This Month",   value: "thisMonth" },
  { label: "This Year",    value: "thisYear" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "Custom Range", value: "custom" },
];

// ─── Default Filter Button (Status / Organization / Date) ─────────────────────

function DefaultFilterBtn({ label, value, children, active }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.defaultFilterWrapper} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${active ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.defaultFilterLabel}>{label}</span>
        {value && <span className={styles.defaultFilterValue}>: {value}</span>}
        <span style={{ marginLeft: "auto", fontSize: "0.6rem", opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

// ─── Extra (removable) filter ─────────────────────────────────────────────────

function ExtraFilterBtn({ label, value, onRemove, children, active }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.extraFilterWrap} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${active ? styles.defaultFilterBtnActive : ""}`}
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.defaultFilterLabel}>{label}</span>
        {value && <span className={styles.defaultFilterValue}>: {value}</span>}
        <span style={{ marginLeft: "auto", fontSize: "0.6rem", opacity: 0.6 }}>▾</span>
      </button>
      <button
        className={styles.removeExtraBtn}
        onClick={onRemove}
        title={`Remove ${label} filter`}
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

// ─── FilterMenu (⊞ button with dropdown panel) ───────────────────────────────

function FilterMenuDropdown({ onAddFilter, activeExtras, onClose }) {
  const EXTRA_FILTER_DEFS = [
    { key: "organization", label: "Organization" },
    { key: "name",         label: "Name" },
    { key: "email",        label: "Email" },
    { key: "contact",      label: "Contact No." },
  ];

  return (
    <div className={styles.filterDropdown}>
      <div className={styles.filterDropdownHeader}>
        <p className={styles.filterDropdownTitle}>Add Filter</p>
        <button className={styles.filterDropdownClose} onClick={onClose}>
          <FiX size={14} />
        </button>
      </div>
      <p className={styles.filterDropdownHint}>Select a field to add as a filter column.</p>
      <div className={styles.filterFieldsList}>
        {EXTRA_FILTER_DEFS.map(({ key, label }) => {
          const alreadyAdded = activeExtras.includes(key);
          return (
            <div key={key} className={styles.filterField}>
              <label className={styles.filterFieldLabel}>
                <input
                  type="checkbox"
                  className={styles.filterFieldCheckbox}
                  checked={alreadyAdded}
                  onChange={() => onAddFilter(key)}
                />
                {label}
              </label>
            </div>
          );
        })}
      </div>
      <div className={styles.filterDropdownFooter}>
        <button
          className={styles.filterDoneBtn}
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main FilterMenu export ───────────────────────────────────────────────────

/**
 * Props:
 *   filters        — current filter state object
 *   onFilterChange — callback(updatedFilters)
 *   onSearch       — callback(searchString) for the search box
 *   searchValue    — controlled search string
 */
export default function FilterMenu({ filters, onFilterChange, onSearch, searchValue }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [extraFilters, setExtraFilters] = useState([]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterCount = Object.values(filters || {}).filter(Boolean).length;

  function setFilter(key, val) {
    onFilterChange({ ...filters, [key]: val || null });
  }

  function clearFilter(key) {
    const next = { ...filters };
    delete next[key];
    onFilterChange(next);
  }

  function toggleExtra(key) {
    setExtraFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    // Clear value when removing
    if (extraFilters.includes(key)) clearFilter(key);
  }

  function removeExtra(key) {
    setExtraFilters(prev => prev.filter(k => k !== key));
    clearFilter(key);
  }

  // Label helpers
  const statusLabel = filters?.status || null;
  const orgLabel    = filters?.organization || null;

  function dateLabel(val) {
    if (!val) return null;
    const opt = DATE_RANGE_OPTIONS.find(o => o.value === val);
    if (opt && opt.value !== "custom") return opt.label;
    if (val.startsWith("custom|")) {
      const parts = val.split("|");
      return parts.length === 3 ? `${parts[1]} → ${parts[2]}` : "Custom";
    }
    return null;
  }

  const EXTRA_LABEL_MAP = {
    organization: "Organization",
    name:         "Name",
    email:        "Email",
    contact:      "Contact No.",
  };

  return (
    <div className={styles.filterRow}>
      {/* Search box */}
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} size={14} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by name, email, or ID…"
          value={searchValue}
          onChange={e => onSearch(e.target.value)}
        />
        {searchValue && (
          <button className={styles.searchClear} onClick={() => onSearch("")}>
            <FiX size={12} />
          </button>
        )}
      </div>

      {/* ── Default filters ── */}

      {/* Status */}
      <DefaultFilterBtn
        label="Status"
        value={statusLabel}
        active={!!statusLabel}
      >
        {({ close }) => (
          <div className={styles.dateRangeOptions}>
            <button
              className={`${styles.selectOption} ${!filters?.status ? styles.selectOptionActive : ""}`}
              onClick={() => { clearFilter("status"); close(); }}
            >
              All Statuses
            </button>
            {APPLICATION_STATUSES.map(s => (
              <button
                key={s}
                className={`${styles.selectOption} ${filters?.status === s ? styles.selectOptionActive : ""}`}
                onClick={() => { setFilter("status", s); close(); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </DefaultFilterBtn>

      {/* Date Applied */}
      <DefaultFilterBtn
        label="Date Applied"
        value={dateLabel(filters?.dateApplied)}
        active={!!filters?.dateApplied}
      >
        {({ close }) => (
          <>
            <div className={styles.dateRangeOptions}>
              <button
                className={`${styles.selectOption} ${!filters?.dateApplied ? styles.selectOptionActive : ""}`}
                onClick={() => { clearFilter("dateApplied"); close(); }}
              >
                Any Time
              </button>
              {DATE_RANGE_OPTIONS.filter(o => o.value !== "custom").map(o => (
                <button
                  key={o.value}
                  className={`${styles.selectOption} ${filters?.dateApplied === o.value ? styles.selectOptionActive : ""}`}
                  onClick={() => { setFilter("dateApplied", o.value); close(); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {/* Custom range */}
            <div style={{ borderTop: "1px solid #e5e7eb", padding: "0.6rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280" }}>Custom Range</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                className={styles.dateInput}
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
            <div className={styles.defaultFilterFooter}>
              <button className={styles.clearBtn} onClick={() => { clearFilter("dateApplied"); setCustomStart(""); setCustomEnd(""); close(); }}>Clear</button>
              <button
                className={styles.doneBtn}
                onClick={() => {
                  if (customStart && customEnd) {
                    setFilter("dateApplied", `custom|${customStart}|${customEnd}`);
                  }
                  close();
                }}
              >
                Apply
              </button>
            </div>
          </>
        )}
      </DefaultFilterBtn>

      {/* ── Extra filters ── */}
      {extraFilters.map(key => (
        <ExtraFilterBtn
          key={key}
          label={EXTRA_LABEL_MAP[key]}
          value={filters?.[key] || null}
          onRemove={() => removeExtra(key)}
          active={!!filters?.[key]}
        >
          {({ close }) => {
            if (key === "organization") {
              return (
                <div className={styles.dateRangeOptions}>
                  <button
                    className={`${styles.selectOption} ${!filters?.organization ? styles.selectOptionActive : ""}`}
                    onClick={() => { clearFilter("organization"); close(); }}
                  >
                    All
                  </button>
                  {ORGANIZATION_OPTIONS.map(o => (
                    <button
                      key={o}
                      className={`${styles.selectOption} ${filters?.organization === o ? styles.selectOptionActive : ""}`}
                      onClick={() => { setFilter("organization", o); close(); }}
                    >
                      {o === "BSP" ? "Boy Scouts of the Philippines (BSP)" :
                       o === "GSP" ? "Girl Scouts of the Philippines (GSP)" : "Other"}
                    </button>
                  ))}
                </div>
              );
            }
            // Text inputs for name, email, contact
            return (
              <>
                <div className={styles.officerSearchWrap}>
                  <FiSearch className={styles.officerSearchIcon} size={13} />
                  <input
                    className={styles.officerSearchInput}
                    type="text"
                    placeholder={`Search ${EXTRA_LABEL_MAP[key]}…`}
                    value={filters?.[key] || ""}
                    onChange={e => setFilter(key, e.target.value)}
                  />
                </div>
                <div className={styles.defaultFilterFooter}>
                  <button className={styles.clearBtn} onClick={() => { clearFilter(key); close(); }}>Clear</button>
                  <button className={styles.doneBtn} onClick={close}>Done</button>
                </div>
              </>
            );
          }}
        </ExtraFilterBtn>
      ))}

      {/* ── Filter Menu (⊞) ── */}
      <div className={styles.filterMenuWrapper} ref={menuRef}>
        <button
          className={`${styles.filterMenuBtn} ${menuOpen ? styles.filterMenuBtnOpen : ""}`}
          onClick={() => setMenuOpen(o => !o)}
          title="Add filter"
          aria-label="Open filter menu"
        >
          <FiFilter size={15} />
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
        {menuOpen && (
          <FilterMenuDropdown
            onAddFilter={toggleExtra}
            activeExtras={extraFilters}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}