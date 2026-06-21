"use client";

import { useEffect, useMemo, useState } from "react";
import FilterMenu from "@/components/cases/history/FilterMenu";
import ReportStatusCard from "@/components/cases/history/ReportStatusCard";
import { FollowUpComposer } from "@/components/cases/FollowUps";
import {
  getDateRangeFromFilter,
  isReportInDateRange,
  normalizeReport,
} from "@/components/cases/history/reportHistoryData";
import styles from "./ReportHistory.module.css";

const INITIAL_FILTERS = {
  status: "",
  assignedOfficer: "",
  caseType: "",
  dateSubmitted: "",
  primaryCategory: "",
  city: "",
};

function matchesFilter(value, filter) {
  if (!filter || filter === "All") return true;
  return (value || "").toLowerCase().includes(filter.toLowerCase());
}

function matchesSearch(report, search) {
  if (!search) return true;
  const term = search.toLowerCase();

  return [
    report.caseId,
    String(report.id || ""),
    report.statusName,
    report.assignedPersonnel,
    report.city,
    report.description,
  ].some((value) => (value || "").toLowerCase().includes(term));
}

function filterReports(reports, filters, search) {
  return reports.filter((report) => {
    const dateRange = getDateRangeFromFilter(filters.dateSubmitted);

    return (
      matchesSearch(report, search) &&
      matchesFilter(report.statusName, filters.status) &&
      matchesFilter(report.assignedPersonnel, filters.assignedOfficer) &&
      matchesFilter(report.caseType, filters.caseType) &&
      matchesFilter(report.primaryCategory, filters.primaryCategory) &&
      matchesFilter(report.city, filters.city) &&
      (!filters.dateSubmitted ||
        isReportInDateRange(report.rawDateSubmitted, dateRange))
    );
  });
}

async function fetchReportDetails(API_URL, report) {
  const id = report.case_report_id || report.id;
  if (!id) return report;

  try {
    const res = await fetch(`${API_URL}/api/case_reports/${id}`, {
      credentials: "include",
    });

    if (!res.ok) return report;

    const json = await res.json();
    return { ...report, ...(json.data || {}) };
  } catch (_) {
    return report;
  }
}

export default function ReportHistoryPage() {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawReport, setWithdrawReport] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [followUpReport, setFollowUpReport] = useState(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Server error (${res.status})`);
        }

        const json = await res.json();
        const rows = Array.isArray(json) ? json : json.data || [];
        const detailedRows = await Promise.all(
          rows.map((report) => fetchReportDetails(API_URL, report))
        );

        setReports(detailedRows.map(normalizeReport));
      } catch (err) {
        setError(err.message || "Failed to load report history.");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  useEffect(() => {
    if (!withdrawReport) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !withdrawing) setWithdrawReport(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [withdrawReport, withdrawing]);

  const filteredReports = useMemo(
    () => filterReports(reports, filters, search),
    [reports, filters, search]
  );
  const officerOptions = useMemo(
    () => [...new Set(reports.map((report) => report.assignedPersonnel).filter(Boolean))],
    [reports]
  );

  async function handleWithdraw() {
    if (!withdrawReport?.id) return;

    setWithdrawing(true);
    setActionError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_reports/${withdrawReport.id}/withdraw`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to withdraw case.");

      setReports((current) =>
        current.map((report) =>
          report.id === withdrawReport.id
            ? {
                ...report,
                statusName: "Withdrawn",
                updatedAt: body.data?.updated_at || new Date().toISOString(),
              }
            : report
        )
      );
      setWithdrawReport(null);
    } catch (err) {
      setActionError(err.message || "Failed to withdraw case.");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageInner}>
        <div className="container-xl py-5">
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroContent}>
                <p className={styles.heroEyebrow}>
                  <span className={styles.heroLine} />
                  Report History
                </p>
                <h1 className={styles.heroTitle}>Your Reports</h1>
                <p className={styles.heroDesc}>
                  Track and view all of your submitted reports.
                </p>
              </div>
            </div>
          </section>

          <div className={styles.tableTopBar}>
            <FilterMenu
              activeFilters={filters}
              onFilterChange={(nextFilters) =>
                setFilters({ ...INITIAL_FILTERS, ...nextFilters })
              }
              officerOptions={officerOptions}
              searchValue={search}
              onSearchChange={setSearch}
            />
          </div>

          <div className="row g-3">
            {loading && <p>Loading report history...</p>}

            {error && (
              <div className="col-12">
                <div className={styles.errorAlert}>{error}</div>
              </div>
            )}

            {!loading && !error && reports.length === 0 && (
              <p>No reports submitted yet.</p>
            )}

            {!loading && !error && reports.length > 0 && filteredReports.length === 0 && (
              <p>No reports match the selected filters.</p>
            )}

            {filteredReports.map((report, index) => (
              <div className="col-12" key={report.id}>
                <ReportStatusCard
                  reportNumber={index + 1}
                  report={report}
                  onWithdraw={() => {
                    setActionError("");
                    setWithdrawReport(report);
                  }}
                  onFollowUp={() => setFollowUpReport(report)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {withdrawReport && (
        <div
          className={styles.modalOverlay}
          onMouseDown={() => !withdrawing && setWithdrawReport(null)}
        >
          <div
            className={styles.modalBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-case-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="withdraw-case-title" className={styles.modalTitle}>
              Withdraw Case Report
            </h2>
            <p className={styles.modalText}>
              Withdraw <strong>{withdrawReport.caseId}</strong>? This will stop
              its current progress. You can undo the withdrawal later from the
              report details page.
            </p>
            {actionError && <div className={styles.errorAlert}>{actionError}</div>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                disabled={withdrawing}
                onClick={() => setWithdrawReport(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDanger}
                disabled={withdrawing}
                onClick={handleWithdraw}
              >
                {withdrawing ? "Withdrawing..." : "Confirm Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
      <FollowUpComposer
        key={followUpReport?.id || "closed-follow-up"}
        open={Boolean(followUpReport)}
        onClose={() => setFollowUpReport(null)}
        caseId={followUpReport?.id}
        isStaff={false}
        reportData={followUpReport?.reportData}
        activeFollowUp={
          followUpReport?.followUpSummary?.type === "user_change_request" &&
          ["open", "responded"].includes(followUpReport?.followUpSummary?.status)
            ? followUpReport.followUpSummary
            : null
        }
        onCreated={(created) => {
          setReports((current) => current.map((report) =>
            report.id === followUpReport?.id
              ? { ...report, followUpSummary: created }
              : report
          ));
        }}
      />
    </main>
  );
}
