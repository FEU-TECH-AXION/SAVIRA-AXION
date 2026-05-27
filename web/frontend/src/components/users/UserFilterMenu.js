"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./UserFilterMenu.module.css";

// ─── Default filter fields shown in the top bar ───────────────────────────────
// Role, Status, Date Created

const DEFAULT_FILTERS = [
  {
    key: "role",
    label: "Role",
    type: "select",
    options: ["All", "Admin", "Case Officer", "Legal Personnel", "Staff", "User"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["All", "Active", "Inactive"],
  },
  {
    key: "dateCreated",
    label: "Date Created",
    type: "dateRange",
  },
];

// ─── Additional filter fields (shown via Add Filters menu) ────────────────────
// Committee visible only when role = Staff; City; Verification Status

const COMMITTEES = ["Ways and Means", "Membership", "Publication", "Education and Research"];

const ADDITIONAL_FILTER_FIELDS = [
  {
    key: "committee",
    label: "Committee",
    type: "select",
    options: ["All", ...COMMITTEES],
    staffOnly: true,   // only shown when Role filter = Staff
  },
  {
    key: "city",
    label: "City",
    type: "text",
  },
  {
    key: "verificationStatus",
    label: "Verification Status",
    type: "select",
    options: ["All", "Verified", "Unverified"],
  },
];

// ─── Simple dropdown for select & dateRange filters ───────────────────────────

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

  if (field.type === "dateRange") {
    const DATE_RANGE_OPTIONS = [
      { label: "Today",        value: "today" },
      { label: "This Week",    value: "thisWeek" },
      { label: "This Month",   value: "thisMonth" },
      { label: "This Year",    value: "thisYear" },
      { label: "Last 30 Days", value: "last30Days" },
      { label: "Custom Range", value: "custom" },
    ];

    const [customMode, setCustomMode]   = useState(false);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd]     = useState("");
    const [dateSearch, setDateSearch]   = useState("");

    const getDisplayLabel = () => {
      if (!value || value === "") return "All";
      const opt = DATE_RANGE_OPTIONS.find(o => o.value === value);
      return opt ? opt.label : "Custom Range";
    };

    const filteredDateOptions = DATE_RANGE_OPTIONS.filter(opt =>
      opt.label.toLowerCase().includes(dateSearch.toLowerCase())
    );

    return (
      <div className={styles.defaultFilter} ref={ref}>
        <button
          className={`${styles.defaultFilterBtn} ${value && value !== "" ? styles.defaultFilterBtnActive : ""}`}
          onClick={() => { setOpen(!open); setDateSearch(""); setCustomMode(false); }}
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
                    >All</button>
                  )}
                  {filteredDateOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.officerOption} ${value === opt.value ? styles.officerOptionActive : ""}`}
                      onClick={() => {
                        if (opt.value === "custom") { setCustomMode(true); }
                        else { onChange(opt.value); setOpen(false); }
                      }}
                    >{opt.label}</button>
                  ))}
                  {filteredDateOptions.length === 0 && (
                    <div className={styles.officerEmpty}>No options found</div>
                  )}
                </div>
                <div className={styles.defaultFilterFooter}>
                  <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "12px" }}>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>Start Date</label>
                    <input type="date" className={styles.dateInput} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>End Date</label>
                    <input type="date" className={styles.dateInput} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  </div>
                </div>
                <div className={styles.defaultFilterFooter}>
                  <button className={styles.clearBtn} onClick={() => { setCustomMode(false); setCustomStart(""); setCustomEnd(""); }}>Back</button>
                  <button
                    className={styles.doneBtn}
                    onClick={() => {
                      if (customStart && customEnd) { onChange(`custom|${customStart}|${customEnd}`); setOpen(false); setCustomMode(false); }
                    }}
                  >Apply</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // select type
  const [selectSearch, setSelectSearch] = useState("");
  const filteredOptions = (field.options || []).filter(opt =>
    opt.toLowerCase().includes(selectSearch.toLowerCase())
  );
  const displayValue = value && value !== "All" && value !== "" ? value : "All";

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${value && value !== "All" && value !== "" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => { setOpen(!open); setSelectSearch(""); }}
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
              >{opt}</button>
            ))}
            {filteredOptions.length === 0 && (
              <div className={styles.officerEmpty}>No options found</div>
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

// ─── Main UserFilterMenu ──────────────────────────────────────────────────────

/**
 * Props:
 *  activeFilters    — object of { key: value }
 *  onFilterChange   — (newFilters) => void
 *  onDone           — () => void
 */
export default function UserFilterMenu({ activeFilters, onFilterChange, onDone }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [extraFields, setExtraFields] = useState([]);

  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== "All" && v !== "").length;

  // Committee filter only visible when Role = Staff
  const roleIsStaff = activeFilters.role === "Staff";

  const availableAdditional = ADDITIONAL_FILTER_FIELDS.filter(f => {
    if (f.staffOnly && !roleIsStaff) return false;
    return true;
  });

  function handleClearAll() {
    const cleared = {};
    [...DEFAULT_FILTERS, ...ADDITIONAL_FILTER_FIELDS].forEach(f => { cleared[f.key] = ""; });
    onFilterChange(cleared);
    setExtraFields([]);
  }

  function handleDone() {
    setMenuOpen(false);
    onDone && onDone();
  }

  function toggleExtraField(key) {
    setExtraFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const extraFieldDefs = availableAdditional.filter(f => extraFields.includes(f.key));

  return (
    <div className={styles.filterBarWrap}>
      {/* ── Default top-bar filter dropdowns ── */}
      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map(field => (
          <DefaultFilterDropdown
            key={field.key}
            field={field}
            value={activeFilters[field.key] || ""}
            onChange={val => onFilterChange({ ...activeFilters, [field.key]: val })}
          />
        ))}

        {/* Extra fields added via filter menu */}
        {extraFieldDefs.map(field => (
          <div key={field.key} className={styles.extraFilterWrap}>
            {field.type === "text" ? (
              <div className={styles.defaultFilter}>
                <input
                  type="text"
                  className={styles.defaultFilterBtn}
                  style={{ cursor: "text", minWidth: 120 }}
                  placeholder={field.label}
                  value={activeFilters[field.key] || ""}
                  onChange={e => onFilterChange({ ...activeFilters, [field.key]: e.target.value })}
                />
              </div>
            ) : (
              <DefaultFilterDropdown
                field={field}
                value={activeFilters[field.key] || ""}
                onChange={val => onFilterChange({ ...activeFilters, [field.key]: val })}
              />
            )}
            <button
              className={styles.removeExtraBtn}
              onClick={() => {
                toggleExtraField(field.key);
                onFilterChange({ ...activeFilters, [field.key]: "" });
              }}
              title={`Remove ${field.label} filter`}
            ><FiX size={12} /></button>
          </div>
        ))}

        {/* ── Filter Menu button ── */}
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
                <button className={styles.filterDropdownClose} onClick={() => setMenuOpen(false)}>
                  <FiX size={15} />
                </button>
              </div>

              <p className={styles.filterDropdownHint}>
                Select additional fields to narrow down the user list.
              </p>

              <div className={styles.filterFieldsList}>
                {availableAdditional.map(field => {
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
                        <span>
                          {field.label}
                          {field.staffOnly && (
                            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: 4 }}>
                              (Staff only)
                            </span>
                          )}
                        </span>
                      </label>
                      {isSelected && field.type === "text" && (
                        <div className={styles.filterFieldInput}>
                          <input
                            type="text"
                            placeholder={`Enter ${field.label}…`}
                            value={activeFilters[field.key] || ""}
                            onChange={e => onFilterChange({ ...activeFilters, [field.key]: e.target.value })}
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
                  <button className={styles.filterClearBtn} onClick={handleClearAll}>Clear All</button>
                )}
                <button className={styles.filterDoneBtn} onClick={handleDone}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}