"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FilterMenu from "./FilterMenu";
import styles from "./volunteerRanking.module.css";
import { FiArrowLeft, FiEye } from "react-icons/fi";
import { authFetch } from "@/lib/AuthContext";

const PAGE_SIZE = 10;

function formatScore(value, suffix = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}${suffix}`;
}

function displayTotalScore(row = {}) {
  const total = Number(row.total_score);
  if (!Number.isFinite(total)) return NaN;
  return Math.max(0, total - (Number(row.priority_bonus) || 0));
}

function getCommitmentPriorityLabel(hoursPerWeek) {
  const value = String(hoursPerWeek || "").trim().toLowerCase();
  if (!value) return "";

  const numericValue = Number(value.match(/\d+/)?.[0]);

  if (value.includes("more than 15") || value.includes(">15") || numericValue > 15) return "Highest priority";
  if (value.includes("10-15") || value.includes("10 to 15") || (numericValue >= 10 && numericValue <= 15)) {
    return "Highly acceptable";
  }
  if (value.includes("6-10") || value.includes("6 to 10") || (numericValue >= 6 && numericValue <= 10)) {
    return "Reasonable";
  }
  if (value.includes("less than 5") || value.includes("<5") || numericValue < 5) return "Very low";
  return "";
}

function getPriorityParts(row = {}) {
  const gender = String(row.gender_identity || "").trim() || "Gender not specified";
  const hours = String(row.hours_per_week || "").trim() || "Hours not specified";
  const priorityLabel = getCommitmentPriorityLabel(row.hours_per_week);
  const commitment = `${hours}${priorityLabel ? ` (${priorityLabel})` : ""}`;
  return {
    gender,
    commitment,
    text: `${gender} / ${commitment}`,
  };
}

function StatusPill({ value }) {
  const status = value ? value.replace("_", " ") : "pending";
  return <span className={styles.statusPill}>{status}</span>;
}

function formatList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "—";
  return value || "—";
}

function getDateRangeFromFilter(filterValue) {
  if (!filterValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate;
  let endDate;

  switch (filterValue) {
    case "today":
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case "thisWeek":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - today.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case "thisYear":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear() + 1, 0, 1);
      break;
    case "last30Days":
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      if (filterValue.startsWith("custom|")) {
        const [, start, end] = filterValue.split("|");
        startDate = new Date(`${start}T00:00:00`);
        endDate = new Date(`${end}T23:59:59`);
      }
  }

  return startDate && endDate ? { startDate, endDate } : null;
}

function isDateInRange(dateString, startDate, endDate) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date >= startDate && date <= endDate;
}

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = Math.min((current - 1) * pageSize + 1, totalRecords);
  const end = Math.min(current * pageSize, totalRecords);

  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    const set = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("...");
      pages.push(sorted[i]);
    }
  }

  return (
    <div className={styles.paginationBar}>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        {"<"}
      </button>
      <div className={styles.pageNumbers}>
        {pages.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          ) : (
            <button
              key={page}
              className={`${styles.pageBtn} ${page === current ? styles.pageBtnActive : ""}`}
              onClick={() => onChange(page)}
            >
              {page}
            </button>
          )
        )}
      </div>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        {">"}
      </button>
      <div className={styles.recordCount}>
        {start}-{end} out of {totalRecords} records
      </div>
    </div>
  );
}

const EXTRA_COLUMN_DEFS = {
  city: {
    label: "City",
    render: (row) => row.city || "—",
  },
  fieldsWithBackground: {
    label: "Fields with Background",
    render: (row) => formatList(row.fields_with_background),
  },
  fieldsOfInterest: {
    label: "Fields of Interest",
    render: (row) => formatList(row.fields_of_interest),
  },
};

export default function VolunteerRanking() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [extraColumns, setExtraColumns] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    async function fetchRankings() {
      try {
        const res = await authFetch(`/api/volunteer_applications/rankings/list`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to load rankings.");
        setRows(body.data || []);
      } catch (err) {
        setError(err.message || "Failed to load rankings.");
      } finally {
        setLoading(false);
      }
    }
    fetchRankings();
  }, []);

  const stats = useMemo(() => [
    { num: rows.length,                                                                       label: "Total Applicants" },
    { num: rows.filter(r => r.application_status === "approved").length,                      label: "Approved" },
    { num: rows.filter(r => r.application_status === "pending" || r.application_status === "reviewing").length, label: "Pending Review" },
  ], [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((row) =>
        String(row.application_id).includes(q) ||
        (row.name || "").toLowerCase().includes(q) ||
        (row.email || "").toLowerCase().includes(q)
      );
    }
    if (filters.status && filters.status !== "All") {
      list = list.filter((row) => (row.application_status || "").toLowerCase() === filters.status.toLowerCase().replace(" ", "_"));
    }
    if (filters.gender && filters.gender !== "All") {
      list = list.filter((row) => (row.gender_identity || "").toLowerCase() === filters.gender.toLowerCase());
    }
    if (filters.dateApplied) {
      const range = getDateRangeFromFilter(filters.dateApplied);
      if (range) {
        list = list.filter((row) => isDateInRange(row.created_at, range.startDate, range.endDate));
      }
    }
    if (filters.city && filters.city !== "All") {
      list = list.filter((row) => (row.city || "") === filters.city);
    }
    if (filters.fieldsWithBackground && filters.fieldsWithBackground !== "All") {
      list = list.filter((row) =>
        Array.isArray(row.fields_with_background) &&
        row.fields_with_background.some((field) =>
          String(field || "").toLowerCase().includes(filters.fieldsWithBackground.toLowerCase())
        )
      );
    }
    if (filters.fieldsOfInterest && filters.fieldsOfInterest !== "All") {
      list = list.filter((row) =>
        Array.isArray(row.fields_of_interest) &&
        row.fields_of_interest.some((field) =>
          String(field || "").toLowerCase().includes(filters.fieldsOfInterest.toLowerCase())
        )
      );
    }
    return list;
  }, [rows, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeExtraColumns = extraColumns.filter((key) => EXTRA_COLUMN_DEFS[key]);
  const allSelected = paginated.length > 0 && paginated.every((row) => selectedIds.has(row.application_id));
  const someSelected = !allSelected && paginated.some((row) => selectedIds.has(row.application_id));

  function handleFilterChange(nextFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function handleSearch(nextSearch) {
    setSearch(nextSearch);
    setPage(1);
  }

  function handleExtraColumnsChange(nextColumns) {
    setExtraColumns(nextColumns);
    setPage(1);
  }

  function toggleAllRows() {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allSelected) {
        paginated.forEach((row) => next.delete(row.application_id));
      } else {
        paginated.forEach((row) => next.add(row.application_id));
      }
      return next;
    });
  }

  function toggleRow(applicationId) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  function viewApplication(applicationId) {
    router.push(`/volunteer/view?id=${applicationId}`);
  }

  return (
    <main className={styles.pageWrapper}>

      {/* ── Hero Banner ── */}

    <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/volunteer")}
        >
          <FiArrowLeft /> Back to Volunteer Management
        </button>
      
      <section className={styles.hero}>
        <div>
          <span>Volunteer applications</span>
          <h1>Applicant Rankings</h1>
          <p>
            Compare screening, hybrid essay, interview, and priority scores in
            one ranking table.
          </p>
          {!loading && !error && (
            <div className={styles.heroStats}>
              {stats.map(({ num, label }) => (
                <div key={label} className={styles.heroStat}>
                  <strong>{num}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.inner}>
        {/* ── Toolbar (filter bar) ── */}
        <section className={styles.toolbar}>
          <FilterMenu
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            searchValue={search}
            onExtraColumnsChange={handleExtraColumnsChange}
          />
        </section>

        {/* ── Table ── */}
        <section className={styles.tableWrap}>
          {loading ? (
            <div className={styles.state}>Loading rankings...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : filtered.length === 0 ? (
            <div className={styles.state}>No applicants found.</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkTh}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={allSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = someSelected;
                        }}
                        onChange={toggleAllRows}
                        aria-label="Select all visible applications"
                      />
                    </th>
                    <th className={styles.rankTh}>Rank</th>
                    <th className={styles.appIdTh}>Application</th>
                    <th className={styles.applicantTh}>Applicant</th>
                    <th className={styles.statusTh}>Status</th>
                    {activeExtraColumns.map((key) => (
                      <th key={key} className={styles.optionalCol}>{EXTRA_COLUMN_DEFS[key].label}</th>
                    ))}
                    <th className={styles.scoreDetailCol}>Screening</th>
                    <th className={styles.scoreDetailCol}>Human Essay</th>
                    <th className={styles.scoreDetailCol}>NLP Essay</th>
                    <th className={styles.scoreDetailCol}>Hybrid Essay</th>
                    <th className={styles.scoreDetailCol}>Interview</th>
                    <th className={styles.priorityTh}>Priority</th>
                    <th className={styles.totalTh}>Total Score</th>
                    <th className={styles.evaluatorCol}>Evaluators</th>
                    <th className={styles.actionsTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => {
                    const isSelected = selectedIds.has(row.application_id);
                    const priority = getPriorityParts(row);
                    return (
                    <tr
                      key={row.application_id}
                      className={isSelected ? styles.rowSelected : ""}
                      onClick={() => viewApplication(row.application_id)}
                    >
                      <td className={styles.checkTd} onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={() => toggleRow(row.application_id)}
                          aria-label={`Select application ${row.application_id}`}
                        />
                      </td>
                      <td className={styles.rankCell}>#{row.rank}</td>
                      <td className={styles.appIdTd}>APP-{String(row.application_id).padStart(4, "0")}</td>
                      <td className={styles.applicantTd} title={[row.name, row.email].filter(Boolean).join(" - ")}>
                        <div className={styles.nameStack}>
                          <strong>{row.name || "—"}</strong>
                          <span>{row.email || "—"}</span>
                        </div>
                      </td>
                      <td className={styles.statusTd}><StatusPill value={row.application_status} /></td>
                      {activeExtraColumns.map((key) => {
                        const displayValue = EXTRA_COLUMN_DEFS[key].render(row);
                        return (
                          <td key={key} className={styles.optionalCell} title={displayValue}>
                            {displayValue}
                          </td>
                        );
                      })}
                      <td className={styles.scoreDetailCell}>{formatScore(row.screening_score, "/30")}</td>
                      <td className={styles.scoreDetailCell}>{formatScore(row.human_essay_score, "/100")}</td>
                      <td className={styles.scoreDetailCell}>{formatScore(row.nlp_essay_score, "/100")}</td>
                      <td className={styles.scoreDetailCell}>{formatScore(row.hybrid_essay_score, "/100")}</td>
                      <td className={styles.scoreDetailCell}>{formatScore(row.interview_score, "/10")}</td>
                      <td className={styles.priorityTd} title={priority.text}>
                        <span className={styles.priorityStack}>
                          <strong>{priority.gender}</strong>
                          <span>{priority.commitment}</span>
                        </span>
                      </td>
                      <td className={styles.totalCell}>{formatScore(displayTotalScore(row), "/100")}</td>
                      <td className={styles.evaluatorCell}>{row.evaluator_count || 0}</td>
                      <td className={styles.actionsTd} onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => viewApplication(row.application_id)}
                          aria-label={`View application ${row.application_id}`}
                          title="View application"
                        >
                          <FiEye size={15} aria-hidden="true" />
                          <span className={styles.viewBtnLabel}>View</span>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <Pagination
              current={currentPage}
              total={totalPages}
              totalRecords={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          )}
        </section>
      </div>
      </div>
    </main>
  );
}
