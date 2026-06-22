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
      "Awaiting New Slots",
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

  if (field.type === "dateRange") {
    const DATE_RANGE_OPTIONS = [
      { label: "Today", value: "today" },
      { label: "This Week", value: "thisWeek" },
      { label: "This Month", value: "thisMonth" },
      { label: "This Year", value: "thisYear" },
      { label: "Last 30 Days", value: "last30Days" },
      { label: "Custom Date Range", value: "custom" },
    ];

    const [customMode, setCustomMode] = useState(false);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [dateSearch, setDateSearch] = useState("");

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
                    >
                      All
                    </button>
                  )}
                  {filteredDateOptions.map(opt => (
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
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
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
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.defaultFilterFooter}>
                  <button
                    className={styles.clearBtn}
                    onClick={() => {
                      setCustomMode(false);
                      setCustomStart("");
                      setCustomEnd("");
                    }}
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

  // select type — with search, scrollable list, and clear button (matches officer filter)
  const [selectSearch, setSelectSearch] = useState("");
  const filteredOptions = (field.options || []).filter(opt =>
    opt.toLowerCase().includes(selectSearch.toLowerCase())
  );

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        className={`${styles.defaultFilterBtn} ${value && value !== "All" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => { setOpen(!open); setSelectSearch(""); }}
      >
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>
          {displayValue}
        </span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown} style={{ minWidth: 220 }}>
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
            <button className={styles.clearBtn} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterMenu({ filters, onFilterChange, onClearAll }) {
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

  const activeFilterCount = Object.values(filters).filter(
    v => v && v !== "All" && v !== ""
  ).length;

  function handleClearAll() {
    const cleared = {};
    ALL_FILTER_FIELDS.forEach(f => { cleared[f.key] = ""; });
    DEFAULT_FILTERS.forEach(f => { cleared[f.key] = ""; });
    onClearAll();
    setExtraFields([]);
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
      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map(field => (
          <DefaultFilterDropdown
            key={field.key}
            field={field}
            value={filters[field.key] || ""}
            onChange={val => onFilterChange(field.key, val)}
          />
        ))}

        {extraFieldDefs.map(field => (
          <div key={field.key} className={styles.extraFilterWrap}>
            <DefaultFilterDropdown
              field={field}
              value={filters[field.key] || ""}
              onChange={val => onFilterChange(field.key, val)}
            />
            <button
              className={styles.removeExtraBtn}
              onClick={() => {
                toggleExtraField(field.key);
                onFilterChange(field.key, "");
              }}
              title={`Remove ${field.label} filter`}
            >
              <FiX size={12} />
            </button>
          </div>
        ))}

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
                Select fields to narrow down the table.
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
                <button className={styles.filterDoneBtn} onClick={() => setMenuOpen(false)}>
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
