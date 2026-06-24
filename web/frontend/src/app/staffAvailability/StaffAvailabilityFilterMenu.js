"use client"

import { useEffect, useRef, useState } from "react"
import { FiChevronDown, FiFilter, FiSearch, FiX } from "react-icons/fi"
import Tooltip from "@/components/ui/Tooltip"
import styles from "./StaffAvailabilityFilterMenu.module.css"

const STATUS_OPTIONS = ["All", "Available", "Busy", "On Leave", "Out of Office"]
const MODULE_OPTIONS = ["All", "Case management", "Legal review", "Volunteer applications", "Project tracker"]
const LOAD_OPTIONS = ["All", "At capacity", "Near capacity", "Has conflicts"]

function SelectDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef(null)

  useEffect(() => {
    function outside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("mousedown", outside)
    return () => document.removeEventListener("mousedown", outside)
  }, [])

  const display = value || "All"
  const filtered = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.defaultFilter} ref={ref}>
      <button
        type="button"
        className={`${styles.defaultFilterBtn} ${display !== "All" ? styles.defaultFilterBtnActive : ""}`}
        onClick={() => {
          setOpen((current) => !current)
          setSearch("")
        }}
      >
        <span className={styles.defaultFilterLabel}>{label}</span>
        <span className={styles.defaultFilterValue}>{display}</span>
        <FiChevronDown size={13} />
      </button>

      {open && (
        <div className={styles.defaultFilterDropdown}>
          <div className={styles.officerSearchWrap}>
            <FiSearch size={13} className={styles.officerSearchIcon} />
            <input
              className={styles.officerSearchInput}
              value={search}
              placeholder={`Search ${label.toLowerCase()}...`}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.officerList}>
            {filtered.map((option) => (
              <button
                type="button"
                key={option}
                className={`${styles.officerOption} ${display === option ? styles.officerOptionActive : ""}`}
                onClick={() => {
                  onChange(option === "All" ? "" : option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className={styles.officerEmpty}>No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StaffAvailabilityFilterMenu({
  activeFilters,
  onFilterChange,
  onSearch,
  searchValue,
  roleOptions = ["All"],
}) {
  const activeFilterCount = Object.values(activeFilters || {}).filter(
    (value) => value && value !== "All"
  ).length
  const hasActiveControls = activeFilterCount > 0 || Boolean(searchValue)

  function setFilter(key, value) {
    onFilterChange({ ...(activeFilters || {}), [key]: value })
  }

  function clearAll() {
    onSearch("")
    onFilterChange({ status: "", role: "", module: "", load: "" })
  }

  return (
    <div className={styles.filterBarWrap}>
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} size={14} />
        <input
          className={styles.searchInput}
          value={searchValue || ""}
          placeholder="Search staff by name, email, role..."
          onChange={(event) => onSearch(event.target.value)}
        />
        {searchValue && (
          <button type="button" className={styles.searchClear} onClick={() => onSearch("")}>
            <FiX size={12} />
          </button>
        )}
      </div>

      <div className={styles.defaultFiltersRow}>
        <SelectDropdown
          label="Status"
          value={activeFilters?.status || ""}
          options={STATUS_OPTIONS}
          onChange={(value) => setFilter("status", value)}
        />
        <SelectDropdown
          label="Module"
          value={activeFilters?.module || ""}
          options={MODULE_OPTIONS}
          onChange={(value) => setFilter("module", value)}
        />
        <SelectDropdown
          label="Role"
          value={activeFilters?.role || ""}
          options={roleOptions}
          onChange={(value) => setFilter("role", value)}
        />
        <SelectDropdown
          label="Load"
          value={activeFilters?.load || ""}
          options={LOAD_OPTIONS}
          onChange={(value) => setFilter("load", value)}
        />

        {hasActiveControls && (
          <div className={styles.clearFilterSlot}>
            <Tooltip text="Clear search and all availability filters" position="bottom">
              <button type="button" className={styles.clearAllBtn} onClick={clearAll}>
                <FiFilter size={15} />
                {activeFilterCount > 0 && (
                  <span className={styles.filterBadge}>{activeFilterCount}</span>
                )}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
