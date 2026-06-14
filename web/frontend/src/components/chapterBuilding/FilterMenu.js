"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiFilter, FiSearch, FiX } from "react-icons/fi";
import styles from "./FilterMenu.module.css";

const CHAPTER_STATUSES = [
  "All",
  "Formation in Progress",
  "COC Organizing",
  "Ready for Recognition",
  "Recognized",
  "Needs Division",
];

const FORMATION_LEVELS = [
  "All",
  "School / Scouting Unit",
  "Community",
  "City / Municipal",
  "Provincial",
  "Regional",
  "Affiliate Organization",
];

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "thisWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "Custom Date Range", value: "custom" },
];

const DEFAULT_FILTERS = [
  { key: "status", label: "Status", type: "select", options: CHAPTER_STATUSES },
  { key: "formationLevel", label: "Level", type: "select", options: FORMATION_LEVELS },
  { key: "targetLaunchDate", label: "Target Launch", type: "dateRange" },
];

const ALL_FILTER_FIELDS = [
  { key: "location", label: "Location", type: "text" },
  { key: "contactPerson", label: "Contact Person", type: "text" },
  { key: "mentor", label: "SASHA Guide", type: "text" },
  { key: "readyOnly", label: "Ready for Recognition", type: "boolean" },
  { key: "overCapacity", label: "Needs Division", type: "boolean" },
];

function DateRangeDropdown({ field, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function outside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const display = DATE_RANGE_OPTIONS.find((option) => option.value === value)?.label || (value ? "Custom Range" : "All");

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button className={`${styles.defaultFilterBtn} ${value ? styles.defaultFilterBtnActive : ""}`} onClick={() => setOpen((prev) => !prev)}>
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>{display}</span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown} style={{ minWidth: 220 }}>
          {!customMode ? (
            <>
              <div className={styles.officerList}>
                <button className={styles.officerOption} onClick={() => { onChange(""); setOpen(false); }}>All</button>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.officerOption} ${value === option.value ? styles.officerOptionActive : ""}`}
                    onClick={() => {
                      if (option.value === "custom") setCustomMode(true);
                      else {
                        onChange(option.value);
                        setOpen(false);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: "12px" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Start Date</label>
                <input className={styles.dateInput} type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "10px 0 4px" }}>End Date</label>
                <input className={styles.dateInput} type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </div>
              <div className={styles.defaultFilterFooter}>
                <button className={styles.clearBtn} onClick={() => setCustomMode(false)}>Back</button>
                <button
                  className={styles.doneBtn}
                  onClick={() => {
                    if (!customStart || !customEnd) return;
                    onChange(`custom|${customStart}|${customEnd}`);
                    setOpen(false);
                    setCustomMode(false);
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

function SelectDropdown({ field, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function outside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const options = (field.options || []).filter((option) => option.toLowerCase().includes(query.toLowerCase()));
  const display = value || "All";

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button className={`${styles.defaultFilterBtn} ${value ? styles.defaultFilterBtnActive : ""}`} onClick={() => { setOpen((prev) => !prev); setQuery(""); }}>
        <span className={styles.defaultFilterLabel}>{field.label}</span>
        <span className={styles.defaultFilterValue}>{display}</span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className={styles.defaultFilterDropdown} style={{ minWidth: 220 }}>
          <div className={styles.officerSearchWrap}>
            <FiSearch size={13} className={styles.officerSearchIcon} />
            <input className={styles.officerSearchInput} placeholder={`Search ${field.label}...`} value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
          </div>
          <div className={styles.officerList}>
            {options.map((option) => (
              <button
                key={option}
                className={`${styles.officerOption} ${(value === option || (!value && option === "All")) ? styles.officerOptionActive : ""}`}
                onClick={() => {
                  onChange(option === "All" ? "" : option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BooleanFilter({ field, value, onChange }) {
  return (
    <label className={styles.filterFieldLabel}>
      <input
        type="checkbox"
        className={styles.filterFieldCheckbox}
        checked={value === true}
        onChange={(event) => onChange(event.target.checked ? true : "")}
      />
      {field.label}
    </label>
  );
}

function TextFilter({ field, value, onChange }) {
  return (
    <div className={styles.searchWrap}>
      <input
        className={styles.searchInput}
        type="text"
        placeholder={field.label}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function FilterControl({ field, value, onChange }) {
  if (field.type === "dateRange") return <DateRangeDropdown field={field} value={value} onChange={onChange} />;
  if (field.type === "boolean") return <BooleanFilter field={field} value={value} onChange={onChange} />;
  if (field.type === "text") return <TextFilter field={field} value={value} onChange={onChange} />;
  return <SelectDropdown field={field} value={value} onChange={onChange} />;
}

export default function FilterMenu({ activeFilters = {}, onFilterChange, onSearch, searchValue, onExtraColumnsChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [extraFields, setExtraFields] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    function outside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const activeFilterCount = Object.values(activeFilters).filter((value) => value && value !== "All").length;
  const extraFieldDefs = ALL_FILTER_FIELDS.filter((field) => extraFields.includes(field.key));

  function setFilter(key, value) {
    onFilterChange({ ...activeFilters, [key]: value });
  }

  function toggleExtraField(key) {
    const next = extraFields.includes(key)
      ? extraFields.filter((fieldKey) => fieldKey !== key)
      : [...extraFields, key];
    setExtraFields(next);
    onExtraColumnsChange?.(next.filter((fieldKey) => ["location", "contactPerson", "mentor"].includes(fieldKey)));
    if (extraFields.includes(key)) setFilter(key, "");
  }

  function clearAll() {
    setExtraFields([]);
    onExtraColumnsChange?.([]);
    onFilterChange({});
    onSearch("");
  }

  return (
    <div className={styles.filterBarWrap}>
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} size={14} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search chapter, locality, contact person, or SASHA guide..."
          value={searchValue || ""}
          onChange={(event) => onSearch(event.target.value)}
        />
        {searchValue && (
          <button className={styles.searchClear} onClick={() => onSearch("")}>
            <FiX size={12} />
          </button>
        )}
      </div>

      <div className={styles.defaultFiltersRow}>
        {DEFAULT_FILTERS.map((field) => (
          <FilterControl key={field.key} field={field} value={activeFilters[field.key] || ""} onChange={(value) => setFilter(field.key, value)} />
        ))}

        {extraFieldDefs.map((field) => (
          <div key={field.key} className={styles.extraFilterWrap}>
            <FilterControl field={field} value={activeFilters[field.key] || ""} onChange={(value) => setFilter(field.key, value)} />
            <button className={styles.removeExtraBtn} onClick={() => toggleExtraField(field.key)} title={`Remove ${field.label}`}>
              <FiX size={12} />
            </button>
          </div>
        ))}

        <div className={styles.filterMenuWrapper} ref={menuRef}>
          <button className={`${styles.filterMenuBtn} ${menuOpen ? styles.filterMenuBtnOpen : ""}`} onClick={() => setMenuOpen((prev) => !prev)}>
            <FiFilter size={15} />
            {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
          </button>
          {menuOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterDropdownHeader}>
                <h4 className={styles.filterDropdownTitle}>Add Chapter Filters</h4>
                <button className={styles.filterDropdownClose} onClick={() => setMenuOpen(false)}>
                  <FiX size={15} />
                </button>
              </div>
              <p className={styles.filterDropdownHint}>Choose chapter-building fields to filter or show as columns.</p>
              <div className={styles.filterFieldsList}>
                {ALL_FILTER_FIELDS.map(({ key, label }) => (
                  <div key={key} className={styles.filterField}>
                    <label className={styles.filterFieldLabel}>
                      <input
                        type="checkbox"
                        className={styles.filterFieldCheckbox}
                        checked={extraFields.includes(key)}
                        onChange={() => toggleExtraField(key)}
                      />
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              <div className={styles.filterDropdownFooter}>
                <button className={styles.filterClearBtn} onClick={clearAll}>Clear All</button>
                <button className={styles.filterDoneBtn} onClick={() => setMenuOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
