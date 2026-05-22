"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./FilterMenu.module.css";

// ─── Default filter fields shown in the top bar ───────────────────────────────
// Matches the image: Case Status, Case Officer, Case Type, Submission Date

const DEFAULT_FILTERS = [
  {
    key: "status",
    label: "Case Status",
    type: "select",
    options: [
      "All",
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
    ],
  },
  {
    key: "assignedOfficer",
    label: "Case Officer",
    type: "officer",   // special: shows search + up-to-20 users
  },
  {
    key: "caseType",
    label: "Case Type",
    type: "select",
    options: ["All", "Inquiry", "Accommodation", "Investigation", "Complaint"],
  },
  {
    key: "dateSubmitted",
    label: "Submission Date",
    type: "date",
  },
];

// ─── All available fields for the "Add Filters" menu ─────────────────────────

const ALL_FILTER_FIELDS = [
  {
    key: "status",
    label: "Case Status",
    type: "select",
    options: [
      "All",
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
    ],
  },
  { key: "assignedOfficer", label: "Case Officer", type: "text" },
  { key: "caseType",        label: "Case Type",    type: "text" },
  { key: "dateSubmitted",   label: "Submission Date", type: "text" },
  { key: "violenceType",    label: "Violence Type",   type: "text" },
  { key: "region",          label: "Region",          type: "text" },
  { key: "reporterId",      label: "Reporter ID",     type: "text" },
];

// Placeholder officers list (up to 20 shown)
const OFFICERS_LIST = [
  "Alexa Gagan", "Marco Santos", "Ryan Dela Paz", "Ben Mercado", "Camille Torres",
  "Shannon Clark", "Brittany Fulman", "Derek Greene", "Noel Ramos", "Lena Cruz",
];

// ─── Simple dropdown for select & date filters ────────────────────────────────

function DefaultFilterDropdown({ field, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const displayValue = value && value !== "All" ? value : "All";

  if (field.type === "date") {
    return (
      <div className={styles.defaultFilter} ref={ref}>
        <button
          className={`${styles.defaultFilterBtn} ${value && value !== "All" ? styles.defaultFilterBtnActive : ""}`}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.defaultFilterLabel}>{field.label}</span>
          <FiChevronDown size={13} />
        </button>
        {open && (
          <div className={styles.defaultFilterDropdown}>
            <input
              type="date"
              className={styles.dateInput}
              value={value || ""}
              onChange={(e) => { onChange(e.target.value); }}
              autoFocus
            />
            <div className={styles.defaultFilterFooter}>
              <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
              <button className={styles.doneBtn} onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (field.type === "officer") {
    const [search, setSearch] = useState("");
    const filtered = OFFICERS_LIST.filter(o =>
      o.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 20);

    return (
      <div className={styles.defaultFilter} ref={ref}>
        <button
          className={`${styles.defaultFilterBtn} ${value && value !== "All" ? styles.defaultFilterBtnActive : ""}`}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.defaultFilterLabel}>{field.label}</span>
          <FiChevronDown size={13} />
        </button>
        {open && (
          <div className={styles.defaultFilterDropdown} style={{ minWidth: 220 }}>
            <div className={styles.officerSearchWrap}>
              <FiSearch size={13} className={styles.officerSearchIcon} />
              <input
                type="text"
                className={styles.officerSearchInput}
                placeholder="Search officers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.officerList}>
              <button
                className={`${styles.officerOption} ${!value || value === "All" ? styles.officerOptionActive : ""}`}
                onClick={() => { onChange("All"); setOpen(false); }}
              >
                All
              </button>
              {filtered.map(o => (
                <button
                  key={o}
                  className={`${styles.officerOption} ${value === o ? styles.officerOptionActive : ""}`}
                  onClick={() => { onChange(o); setOpen(false); }}
                >
                  {o}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className={styles.officerEmpty}>No officers found</div>
              )}
            </div>
            <div className={styles.defaultFilterFooter}>
              <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // select type
  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${value && value !== "All" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>
          {displayValue}
        </span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown}>
          {field.options.map(opt => (
            <button
              key={opt}
              className={`${styles.selectOption} ${(value === opt || (!value && opt === "All")) ? styles.selectOptionActive : ""}`}
              onClick={() => { onChange(opt === "All" ? "" : opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main FilterMenu ──────────────────────────────────────────────────────────

/**
 * Props:
 *  activeFilters    — object of { key: value }
 *  onFilterChange   — (newFilters) => void
 *  onDone           — () => void
 */
export default function FilterMenu({ activeFilters, onFilterChange, onDone }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Extra filter fields selected via the filter menu button
  const [extraFields, setExtraFields] = useState([]);

  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const activeFilterCount = Object.values(activeFilters).filter(
    v => v && v !== "All" && v !== ""
  ).length;

  function handleClearAll() {
    const cleared = {};
    ALL_FILTER_FIELDS.forEach(f => { cleared[f.key] = ""; });
    onFilterChange(cleared);
    setExtraFields([]);
  }

  function handleDone() {
    setMenuOpen(false);
    onDone && onDone();
  }

  function toggleExtraField(key) {
    setExtraFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const extraFieldDefs = ALL_FILTER_FIELDS.filter(
    f => !DEFAULT_FILTERS.find(d => d.key === f.key) && extraFields.includes(f.key)
  );

  return (
    <div className={styles.filterBarWrap}>
      {/* ── Default top-bar filter dropdowns (matching image) ── */}
      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map(field => (
          <DefaultFilterDropdown
            key={field.key}
            field={field}
            value={activeFilters[field.key] || ""}
            onChange={val => onFilterChange({ ...activeFilters, [field.key]: val })}
          />
        ))}

        {/* Extra fields that were added via filter menu */}
        {extraFieldDefs.map(field => (
          <div key={field.key} className={styles.extraFilterWrap}>
            <DefaultFilterDropdown
              field={field}
              value={activeFilters[field.key] || ""}
              onChange={val => onFilterChange({ ...activeFilters, [field.key]: val })}
            />
            <button
              className={styles.removeExtraBtn}
              onClick={() => {
                toggleExtraField(field.key);
                onFilterChange({ ...activeFilters, [field.key]: "" });
              }}
              title={`Remove ${field.label} filter`}
            >
              <FiX size={12} />
            </button>
          </div>
        ))}

        {/* ── Filter Menu button (⊞ icon) ── */}
        <div className={styles.filterMenuWrapper} ref={menuRef}>
          <button
            className={`${styles.filterMenuBtn} ${menuOpen ? styles.filterMenuBtnOpen : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
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
                Select fields to narrow down the grid. The filter menu includes all case fields.
              </p>

              <div className={styles.filterFieldsList}>
                {ALL_FILTER_FIELDS.filter(f => !DEFAULT_FILTERS.find(d => d.key === f.key)).map(field => {
                  const isSelected = extraFields.includes(field.key);
                  return (
                    <div key={field.key} className={styles.filterField}>
                      <label className={styles.filterFieldLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleExtraField(field.key)}
                          className={styles.filterFieldCheckbox}
                        />
                        <span>{field.label}</span>
                      </label>
                      {isSelected && (
                        <div className={styles.filterFieldInput}>
                          <input
                            type="text"
                            placeholder={`Search ${field.label}…`}
                            value={activeFilters[field.key] || ""}
                            onChange={e =>
                              onFilterChange({ ...activeFilters, [field.key]: e.target.value })
                            }
                            className={styles.filterFieldTextInput}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.filterDropdownFooter}>
                {activeFilterCount > 0 && (
                  <button className={styles.filterClearBtn} onClick={handleClearAll}>
                    Clear All
                  </button>
                )}
                <button className={styles.filterDoneBtn} onClick={handleDone}>
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