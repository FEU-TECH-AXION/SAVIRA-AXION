"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./CaseManagement.module.css";
import { FiSearch } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION
// Uncomment and configure when ready:
//
// import { createClient } from "@supabase/supabase-js";
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );
// ─────────────────────────────────────────────────────────────────────────────

// ── Placeholder data (replace with Supabase fetch) ───────────────────────────
const PLACEHOLDER_CASES = [
  { id: 1,  caseId: "00112233", reporterId: "12345678", region: "NCR", status: "Submitted",  assignedOfficer: "Alexa Gagan" },
  { id: 2,  caseId: "00112234", reporterId: "12345679", region: "NCR", status: "Active",      assignedOfficer: "Marco Santos" },
  { id: 3,  caseId: "00112235", reporterId: "12345680", region: "Region III", status: "Unassigned", assignedOfficer: "—" },
  { id: 4,  caseId: "00112236", reporterId: "12345681", region: "Region IV", status: "Verified True", assignedOfficer: "Ryan Dela Paz" },
  { id: 5,  caseId: "00112237", reporterId: "12345682", region: "NCR", status: "Dismissed",   assignedOfficer: "Sofia Reyes" },
  { id: 6,  caseId: "00112238", reporterId: "12345683", region: "Region VII", status: "Submitted", assignedOfficer: "James Tan" },
  { id: 7,  caseId: "00112239", reporterId: "12345684", region: "NCR", status: "Active",      assignedOfficer: "Maria Bautista" },
  { id: 8,  caseId: "00112240", reporterId: "12345685", region: "Region I", status: "Unassigned", assignedOfficer: "—" },
  { id: 9,  caseId: "00112241", reporterId: "12345686", region: "NCR", status: "Verified False", assignedOfficer: "Diana Flores" },
  { id: 10, caseId: "00112242", reporterId: "12345687", region: "Region VI", status: "Active", assignedOfficer: "Ben Mercado" },
  { id: 11, caseId: "00112243", reporterId: "12345688", region: "NCR", status: "Submitted",   assignedOfficer: "Trisha Abad" },
  { id: 12, caseId: "00112244", reporterId: "12345689", region: "Region XI", status: "Dismissed", assignedOfficer: "Noel Ramos" },
];

const STATUS_FILTERS = [
  "All",
  "Unassigned",
  "Verified True",
  "Verified False",
  "Active",
  "Dismissed",
];

const PAGE_SIZE = 8;

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const badgeClass =
    status === "Active"       ? styles.badgeActive :
    status === "Dismissed"    ? styles.badgeInactive :
    status === "Verified True"? styles.badgeVerifiedTrue :
    status === "Verified False"? styles.badgeVerifiedFalse :
    status === "Unassigned"   ? styles.badgeUnassigned :
    styles.badgeSubmitted ? styles.badgeSubmitted : "";

  return (
    <span className={badgeClass}>
      <span className={styles.badgeDot} />
      {status}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        ←
      </button>

      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}

      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}>
        <span className={styles.actionIcon}>{icon}</span>
      </div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>
          View &rarr;
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CaseManagement() {

  // TODO: replace with real auth / session data
  const user = { role: "admin", firstName: "Admin", lastName: "User" };

  // hasNew drives the orange dot — set to true to show it
  const stats = [
    { num: 6,  label: "Unassigned Cases", hasNew: true },
    { num: 6,  label: "Active Cases",     hasNew: true },
    { num: 12, label: "Total Cases",      hasNew: true },
  ];

  const [cases, setCases]           = useState(PLACEHOLDER_CASES);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage]             = useState(1);

  // ── Supabase fetch (swap placeholder above with this when ready) ────────────
  // useEffect(() => {
  //   async function fetchCases() {
  //     setLoading(true);
  //     const { data, error } = await supabase
  //       .from("cases")
  //       .select("id, case_id, reporter_id, region, status, assigned_officer")
  //       .order("created_at", { ascending: false });
  //
  //     if (!error && data) {
  //       setCases(
  //         data.map((c) => ({
  //           id:              c.id,
  //           caseId:          c.case_id,
  //           reporterId:      c.reporter_id,
  //           region:          c.region,
  //           status:          c.status,
  //           assignedOfficer: c.assigned_officer,
  //         }))
  //       );
  //     }
  //     setLoading(false);
  //   }
  //   fetchCases();
  // }, []);

  // ── Filter + search ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchFilter = activeFilter === "All" || c.status === activeFilter;
      const matchSearch =
        c.caseId.toLowerCase().includes(search.toLowerCase()) ||
        c.reporterId.toLowerCase().includes(search.toLowerCase()) ||
        c.region.toLowerCase().includes(search.toLowerCase()) ||
        c.assignedOfficer.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [cases, activeFilter, search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Navbar user={user} />

      <main className={styles.pageWrapper}>

        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Case Management
              </h1>

              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
                      {hasNew && <span className={styles.statDot} />}
                      <p className={styles.statNum}>{num}</p>
                      <p className={styles.statLabel}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── What would you like to do ── */}
        <div className="container-xl py-4">

          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconView.png" alt="" className={styles.actionIconImg} />}
                title="View Cases"
                description="Browse and review all submitted cases, including their current status, assigned officers, and reporter details."
                onView={() => router.push("/cases/view")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconAssign.png" alt="" className={styles.actionIconImg} />}
                title="Assign Cases"
                description="Assign unhandled cases to the appropriate case officers based on region, expertise, and availability."
                onView={() => router.push("/cases/assign")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconManage.png" alt="" className={styles.actionIconImg} />}
                title="Manage Case Status"
                description="Update the status of ongoing cases — mark them as active, resolved, dismissed, or escalated as needed."
                onView={() => router.push("/cases/manage")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconVerify.png" alt="" className={styles.actionIconImg} />}
                title="Verify Cases"
                description="Review and verify the authenticity of submitted case reports before they are processed or escalated."
                onView={() => router.push("/cases/verify")}
              />
            </div>
          </div>
        </div>

        {/* ── All List ── */}
        <section className={styles.allList}>
          <div className="container-xl">

            {/* Section heading */}
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Cases</h2>
              <div className={styles.headingLine} />
            </div>

            <div className={styles.layout}>

              {/* ── Table ── */}
              <div className={styles.tableWrap}>
                {loading ? (
                  <div className={styles.loadingState}>Loading cases…</div>
                ) : (
                  <>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Case ID</th>
                          <th>Reporter ID</th>
                          <th>Region</th>
                          <th>Status</th>
                          <th>Assigned Officer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={styles.emptyState}>
                              No cases found.
                            </td>
                          </tr>
                        ) : (
                          paginated.map((c) => (
                            <tr key={c.id}>
                              <td>{c.caseId}</td>
                              <td>{c.reporterId}</td>
                              <td>{c.region}</td>
                              <td><StatusBadge status={c.status} /></td>
                              <td>{c.assignedOfficer}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <Pagination
                      current={page}
                      total={totalPages}
                      onChange={setPage}
                    />
                  </>
                )}
              </div>

              {/* ── Sidebar ── */}
              <aside className={styles.sidebar}>

                {/* Search */}
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Search</h3>
                  <div className={styles.searchWrap}>
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                </div>

                {/* Sort By / Filter */}
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Sort By</h3>
                  <div className={styles.roleList}>
                    {STATUS_FILTERS.filter((f) => f !== "All").map((filter) => (
                      <button
                        key={filter}
                        className={`${styles.roleBtn} ${activeFilter === filter ? styles.roleBtnActive : ""}`}
                        onClick={() => setActiveFilter(activeFilter === filter ? "All" : filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

              </aside>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}