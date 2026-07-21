"use client";

import Link from "next/link";
import { useState } from "react";
import { FaFilter, FaSearch, FaTimes } from "react-icons/fa";
import styles from "./events.module.css";

export default function EventFilters({ categories, activeCategories, searchValue }) {
  const [open, setOpen] = useState(false);
  const normalizedSearch = typeof searchValue === "string" ? searchValue : "";

  const getCategoryHref = (category) => {
    const query = new URLSearchParams();
    if (normalizedSearch) query.set("search", normalizedSearch);

    let nextCategories = [];
    if (category !== "All") {
      if (activeCategories.includes(category)) {
        nextCategories = activeCategories.filter((item) => item !== category);
      } else {
        nextCategories = [...activeCategories, category];
      }
    }

    nextCategories.forEach((item) => query.append("category", item));
    return `/events${query.toString() ? `?${query.toString()}` : ""}`;
  };

  const clearHref = normalizedSearch
    ? `/events?${new URLSearchParams({ search: normalizedSearch }).toString()}`
    : "/events";

  return (
    <div className={styles.filtersPanel}>
      <div className={styles.searchWrap}>
        <form action="/events" method="GET" className={styles.searchBox}>
          {activeCategories.map((category) => (
            <input key={category} type="hidden" name="category" value={category} />
          ))}
          <input
            type="text"
            name="search"
            defaultValue={normalizedSearch}
            placeholder="Search events..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} aria-label="Search">
            <FaSearch />
          </button>
        </form>
      </div>

      <div className={styles.filterMenuWrapper}>
        <button
          type="button"
          className={`${styles.filterMenuBtn} ${activeCategories.length > 0 || open ? styles.filterMenuBtnActive : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <FaFilter className={styles.filterIcon} aria-hidden="true" />
          <span className={styles.filterMenuBtnLabel}>Filters</span>
          {activeCategories.length > 0 && (
            <span className={styles.filterBadge}>{activeCategories.length}</span>
          )}
        </button>

        {open && (
          <div className={styles.categoryDropdown} role="dialog" aria-label="Event filters">
            <div className={styles.filterDropdownHeader}>
              <h4 className={styles.filterDropdownTitle}>Categories</h4>
              <button
                type="button"
                className={styles.filterDropdownClose}
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <FaTimes />
              </button>
            </div>
            <ul className={styles.categoryList}>
              {categories.map((category) => {
                const isActive =
                  category === "All"
                    ? activeCategories.length === 0
                    : activeCategories.includes(category);

                return (
                  <li key={category}>
                    <Link
                      href={getCategoryHref(category)}
                      scroll={false}
                      className={`${styles.categoryItem} ${isActive ? styles.categoryActive : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      {category}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className={styles.filterDropdownFooter}>
              {activeCategories.length > 0 ? (
                <Link href={clearHref} className={styles.filterClearBtn} onClick={() => setOpen(false)}>
                  Clear
                </Link>
              ) : (
                <button type="button" className={styles.filterClearBtn} disabled>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
