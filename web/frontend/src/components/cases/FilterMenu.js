"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter, FiX, FiChevronDown } from "react-icons/fi";
import styles from "./CaseManagement.module.css";

const FILTER_FIELDS = [
  { key: "status", label: "Case Status", type: "select", options: ["All", "For Verification", "Undergoing Review", "Verified - True", "Verified - False", "Under Case Evaluation", "Case Filed", "Investigation Ongoing", "Hearing Ongoing", "Dismissed", "Perpetrator Convicted"] },
  { key: "assignedOfficer", label: "Case Officer", type: "text" },
  { key: "violenceType", label: "Violence Type", type: "text" },
  { key: "region", label: "Region", type: "text" },
  { key: "dateSubmitted", label: "Submission Date", type: "text" },
  { key: "reporterId", label: "Reporter ID", type: "text" },
];

export default function FilterMenu({ activeFilters, onFilterChange, onDone }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState(Object.keys(activeFilters).filter(k => activeFilters[k]));
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFieldToggle = (fieldKey) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const handleFieldValueChange = (fieldKey, value) => {
    onFilterChange({ ...activeFilters, [fieldKey]: value });
  };

  const handleDone = () => {
    onDone();
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedFields([]);
    const cleared = {};
    FILTER_FIELDS.forEach(f => { cleared[f.key] = ""; });
    onFilterChange(cleared);
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== "All" && v !== "").length;

  return (
    <div className={styles.filterMenuWrapper} ref={menuRef}>
      <button
        className={styles.filterMenuBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Open filter menu"
      >
        <FiFilter size={18} />
        {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.filterDropdown}>
          <div className={styles.filterDropdownHeader}>
            <h4 className={styles.filterDropdownTitle}>Add Filters</h4>
            <button
              className={styles.filterDropdownClose}
              onClick={() => setIsOpen(false)}
            >
              <FiX size={16} />
            </button>
          </div>

          <div className={styles.filterFieldsList}>
            {FILTER_FIELDS.map((field) => {
              const isSelected = selectedFields.includes(field.key);
              return (
                <div key={field.key} className={styles.filterField}>
                  <label className={styles.filterFieldLabel}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFieldToggle(field.key)}
                      className={styles.filterFieldCheckbox}
                    />
                    <span>{field.label}</span>
                  </label>

                  {isSelected && (
                    <div className={styles.filterFieldInput}>
                      {field.type === "select" ? (
                        <select
                          value={activeFilters[field.key] || ""}
                          onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                          className={styles.filterFieldSelect}
                        >
                          <option value="">Any</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Search ${field.label}…`}
                          value={activeFilters[field.key] || ""}
                          onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                          className={styles.filterFieldTextInput}
                        />
                      )}
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
  );
}
