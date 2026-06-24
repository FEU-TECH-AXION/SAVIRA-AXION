"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./TaskFilterMenu.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_STATUSES = ["All", "Pending", "In Progress", "Completed", "Overdue", "Cancelled"];

const PRIORITY_OPTIONS = ["All", "Low", "Medium", "High", "Critical"];

const DUE_DATE_OPTIONS = [
  { label: "Today",             value: "today" },
  { label: "This Week",         value: "thisWeek" },
  { label: "This Month",        value: "thisMonth" },
  { label: "Overdue",           value: "overdue" },
  { label: "Custom Date Range", value: "custom" },
];

const SCOPE_OPTIONS = ["All", "Mine", "My Committee"];

// ─── DEFAULT_FILTERS (always visible in bar) ──────────────────────────────────

const DEFAULT_FILTERS = [
  {
    key:     "status",
    label:   "Status",
    type:    "select",
    options: TASK_STATUSES,
  },
  {
    key:     "priority",
    label:   "Priority",
    type:    "select",
    options: PRIORITY_OPTIONS,
  },
  {
    key:   "dueDate",
    label: "Due Date",
    type:  "dateRange",
  },
];

// ─── EXTRA_FILTER_FIELDS (available via "Add Filters" menu) ───────────────────

const ALL_FILTER_FIELDS = [
  {
    key:     "scope",
    label:   "Scope",
    type:    "select",
    options: SCOPE_OPTIONS,
  },
  {
    key:   "createdAt",
    label: "Created Date",
    type:  "dateRange",
  },
];

// ─── DateRangeDropdown ────────────────────────────────────────────────────────

function DateRangeDropdown({ field, value, onChange }) {
  const [open,        setOpen]        = useState(false);
  const [customMode,  setCustomMode]  = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [dateSearch,  setDateSearch]  = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const getDisplayLabel = () => {
    if (!value || value === "") return "All";
    const opt = DUE_DATE_OPTIONS.find(o => o.value === value);
    return opt ? opt.label : "Custom Range";
  };

  const filteredOptions = DUE_DATE_OPTIONS.filter(opt =>
    opt.label.toLowerCase().includes(dateSearch.toLowerCase())
  );

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${value && value !== "" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => { setOpen(o => !o); setDateSearch(""); setCustomMode(false); }}
      >
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>{getDisplayLabel()}</span>
        <FiChevronDown size={13} />
      </button>

      {open && (
        <div className={styles.defaultFilterDropdown} style={{ minWidth: 220 }}>
          {!customMode ? (
            <>
              <div className={styles.officerSearchWrap}>
                <FiSearch size={13} className={styles.officerSearchIcon} />
                <input
                  type="text"
                  className={styles.officerSearchInput}
                  placeholder="Search date range…"
                  value={dateSearch}
                  onChange={e => setDateSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.officerList}>
                {!dateSearch && (
                  <button
                    className={`${styles.officerOption} ${!value || value === "" ? styles.officerOptionActive : ""}`}
                    onClick={() => { onChange(""); setOpen(false); }}
                  >
                    All
                  </button>
                )}
                {filteredOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.officerOption} ${value === opt.value ? styles.officerOptionActive : ""}`}
                    onClick={() => {
                      if (opt.value === "custom") {
                        setCustomMode(true);
                      } else {
                        onChange(opt.value);
                        setOpen(false);
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <div className={styles.officerEmpty}>No options found</div>
                )}
              </div>
              <div className={styles.defaultFilterFooter}>
                <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: "12px" }}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.defaultFilterFooter}>
                <button
                  className={styles.clearBtn}
                  onClick={() => { setCustomMode(false); setCustomStart(""); setCustomEnd(""); }}
                >
                  Back
                </button>
                <button
                  className={styles.doneBtn}
                  onClick={() => {
                    if (customStart && customEnd) {
                      onChange(`custom|${customStart}|${customEnd}`);
                      setOpen(false);
                      setCustomMode(false);
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SelectDropdown ───────────────────────────────────────────────────────────

function SelectDropdown({ field, value, onChange }) {
  const [open,         setOpen]         = useState(false);
  const [selectSearch, setSelectSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const displayValue = value && value !== "All" ? value : "All";

  const filteredOptions = (field.options || []).filter(opt =>
    opt.toLowerCase().includes(selectSearch.toLowerCase())
  );

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${value && value !== "All" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => { setOpen(o => !o); setSelectSearch(""); }}
      >
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>{displayValue}</span>
        <FiChevronDown size={13} />
      </button>

      {open && (
        <div className={styles.defaultFilterDropdown} style={{ minWidth: 200 }}>
          <div className={styles.officerSearchWrap}>
            <FiSearch size={13} className={styles.officerSearchIcon} />
            <input
              type="text"
              className={styles.officerSearchInput}
              placeholder={`Search ${field.label}…`}
              value={selectSearch}
              onChange={e => setSelectSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.officerList}>
            {filteredOptions.map(opt => (
              <button
                key={opt}
                className={`${styles.officerOption} ${(value === opt || (!value && opt === "All")) ? styles.officerOptionActive : ""}`}
                onClick={() => { onChange(opt === "All" ? "" : opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className={styles.officerEmpty}>No options found</div>
            )}
          </div>
          <div className={styles.defaultFilterFooter}>
            <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DefaultFilterDropdown (router) ──────────────────────────────────────────

function DefaultFilterDropdown({ field, value, onChange }) {
  if (field.type === "dateRange") {
    return <DateRangeDropdown field={field} value={value} onChange={onChange} />;
  }
  return <SelectDropdown field={field} value={value} onChange={onChange} />;
}

// ─── Main TaskFilterMenu ──────────────────────────────────────────────────────

/**
 * Props:
 *  activeFilters  — object of { key: value }
 *  onFilterChange — (newFilters) => void
 *  onSearch       — (searchString) => void
 *  searchValue    — controlled search string
 */
export default function TaskFilterMenu({ activeFilters, onFilterChange, onSearch, searchValue }) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [extraFields, setExtraFields] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const activeFilterCount = Object.values(activeFilters || {}).filter(
    v => v && v !== "All" && v !== ""
  ).length;

  function handleClearAll() {
    const cleared = {};
    DEFAULT_FILTERS.forEach(f   => { cleared[f.key] = ""; });
    ALL_FILTER_FIELDS.forEach(f => { cleared[f.key] = ""; });
    onFilterChange(cleared);
    setExtraFields([]);
  }

  function toggleExtraField(key) {
    const next = extraFields.includes(key)
      ? extraFields.filter(k => k !== key)
      : [...extraFields, key];
    setExtraFields(next);
    if (extraFields.includes(key)) {
      onFilterChange({ ...(activeFilters || {}), [key]: "" });
    }
  }

  const extraFieldDefs = ALL_FILTER_FIELDS.filter(f => extraFields.includes(f.key));

  return (
    <div className={styles.filterBarWrap}>
      {/* ── Search box ── */}
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} size={14} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search task, project, assignee, or project ID…"
          value={searchValue || ""}
          onChange={e => onSearch(e.target.value)}
        />
        {searchValue && (
          <button className={styles.searchClear} onClick={() => onSearch("")}>
            <FiX size={12} />
          </button>
        )}
      </div>

      {/* ── Default filter dropdowns ── */}
      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map(field => (
          <DefaultFilterDropdown
            key={field.key}
            field={field}
            value={(activeFilters || {})[field.key] || ""}
            onChange={val => onFilterChange({ ...(activeFilters || {}), [field.key]: val })}
          />
        ))}

        {/* Extra fields added via filter menu */}
        {extraFieldDefs.map(field => (
          <div key={field.key} className={styles.extraFilterWrap}>
            <DefaultFilterDropdown
              field={field}
              value={(activeFilters || {})[field.key] || ""}
              onChange={val => onFilterChange({ ...(activeFilters || {}), [field.key]: val })}
            />
            <button
              className={styles.removeExtraBtn}
              onClick={() => toggleExtraField(field.key)}
              title={`Remove ${field.label} filter`}
            >
              <FiX size={12} />
            </button>
          </div>
        ))}

        {/* ── Filter Menu button ── */}
        <div className={styles.filterMenuWrapper} ref={menuRef}>
          <button
            className={`${styles.filterMenuBtn} ${menuOpen ? styles.filterMenuBtnOpen : ""}`}
            onClick={() => setMenuOpen(o => !o)}
            title="Add more filters"
            aria-label="Open filter menu"
          >
            <FiFilter size={15} />
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>

          {menuOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterDropdownHeader}>
                <h4 className={styles.filterDropdownTitle}>Add Filters</h4>
                <button
                  className={styles.filterDropdownClose}
                  onClick={() => setMenuOpen(false)}
                >
                  <FiX size={15} />
                </button>
              </div>
              <p className={styles.filterDropdownHint}>
                Select a field to add as a filter column.
              </p>
              <div className={styles.filterFieldsList}>
                {ALL_FILTER_FIELDS.map(({ key, label }) => {
                  const alreadyAdded = extraFields.includes(key);
                  return (
                    <div key={key} className={styles.filterField}>
                      <label className={styles.filterFieldLabel}>
                        <input
                          type="checkbox"
                          className={styles.filterFieldCheckbox}
                          checked={alreadyAdded}
                          onChange={() => toggleExtraField(key)}
                        />
                        {label}
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className={styles.filterDropdownFooter}>
                <button className={styles.filterClearBtn} onClick={handleClearAll}>
                  Clear All
                </button>
                <button
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