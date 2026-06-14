"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import FilterMenu from "./FilterMenu";
import styles from "./volunteerRanking.module.css";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function formatScore(value, suffix = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}${suffix}`;
}

function StatusPill({ value }) {
  const status = value ? value.replace("_", " ") : "pending";
  return <span className={styles.statusPill}>{status}</span>;
}

export default function VolunteerRanking() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  useEffect(() => {
    async function fetchRankings() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/volunteer_applications/rankings/list`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${getCookie("token")}` },
        });
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
    return list;
  }, [rows, search, filters]);

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer")}><IoIosArrowBack /> Back to Volunteer Management</button>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Volunteer Applicant Rankings</h1>
          <p className={styles.subtitle}>Screening, hybrid essay, interview, and priority scores in one comparison table.</p>
        </div>
      </section>

      <section className={styles.toolbar}>
        <FilterMenu
          activeFilters={filters}
          onFilterChange={setFilters}
          onSearch={setSearch}
          searchValue={search}
        />
      </section>

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
                  <th>Rank</th>
                  <th>Application</th>
                  <th>Applicant</th>
                  <th>Status</th>
                  <th>Screening</th>
                  <th>Human Essay</th>
                  <th>NLP Essay</th>
                  <th>Hybrid Essay</th>
                  <th>Interview</th>
                  <th>Priority</th>
                  <th>Total</th>
                  <th>Evaluators</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.application_id} onClick={() => router.push(`/volunteer/view?id=${row.application_id}`)}>
                    <td className={styles.rankCell}>#{row.rank}</td>
                    <td>APP-{String(row.application_id).padStart(4, "0")}</td>
                    <td>
                      <div className={styles.nameStack}>
                        <strong>{row.name || "—"}</strong>
                        <span>{row.email || "—"}</span>
                      </div>
                    </td>
                    <td><StatusPill value={row.application_status} /></td>
                    <td>{formatScore(row.screening_score, "/30")}</td>
                    <td>{formatScore(row.human_essay_score, "/100")}</td>
                    <td>{formatScore(row.nlp_essay_score, "/100")}</td>
                    <td>{formatScore(row.hybrid_essay_score, "/100")}</td>
                    <td>{formatScore(row.interview_score, "/10")}</td>
                    <td>{formatScore(row.priority_bonus)}</td>
                    <td className={styles.totalCell}>{formatScore(row.total_score, "/106")}</td>
                    <td>{row.evaluator_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
