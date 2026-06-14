"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { IoIosWarning } from "react-icons/io";
import ChapterTable from "@/components/chapterBuilding/ChapterTable";
import FilterMenu from "@/components/chapterBuilding/FilterMenu";
import { fetchChapters } from "@/lib/api";
import styles from "./ChapterManagement.module.css";

const PAGE_SIZE = 10;

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

function countOfficers(officers = {}) {
  return Object.values(officers).filter(Boolean).length;
}

function normalizeChapter(raw) {
  const members = Array.isArray(raw.members) ? raw.members.filter((member) => member.userId || member.fullName) : [];
  const memberCount = members.length;
  const cocCount = members.filter((member) => member.organizingCommittee).length;
  const ogCount = members.filter((member) => member.organizingGroup).length;
  const oathCount = members.filter((member) => member.oathTaken).length;
  const officersFilled = countOfficers(raw.officers);
  const readyForRecognition =
    memberCount >= 15 &&
    oathCount >= 15 &&
    officersFilled >= 6 &&
    raw.orientationCompleted &&
    raw.oathTakingCompleted &&
    raw.pledgeSupportConfirmed &&
    raw.nationalProgramAlignment;

  let status = raw.status || "Formation in Progress";
  if (memberCount > 40) status = "Needs Division";
  else if (readyForRecognition) status = raw.recognizedAt ? "Recognized" : "Ready for Recognition";
  else if (cocCount >= 7 && ogCount >= 2) status = "COC Organizing";

  return {
    ...raw,
    id: raw.id || `CH-${Date.now()}`,
    members,
    memberCount,
    cocCount,
    ogCount,
    oathCount,
    officersFilled,
    readyForRecognition,
    overCapacity: memberCount > 40,
    status,
  };
}

export default function ChapterManagementPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [extraColumns, setExtraColumns] = useState([]);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  function loadChapters() {
    setLoading(true);
    setError("");
    fetchChapters()
      .then((records) => {
        setChapters((Array.isArray(records) ? records : []).map(normalizeChapter));
      })
      .catch((err) => {
        setError(err.message || "Unable to load chapter records.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadChapters();
  }, []);

  const filtered = useMemo(() => {
    let list = [...chapters];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((chapter) =>
        [
          chapter.id,
          chapter.chapterName,
          chapter.location,
          chapter.contactPerson,
          chapter.higherStructureRepresentative,
          chapter.formationLevel,
          chapter.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeFilters.status) {
      list = list.filter((chapter) => chapter.status === activeFilters.status);
    }
    if (activeFilters.formationLevel) {
      list = list.filter((chapter) => chapter.formationLevel === activeFilters.formationLevel);
    }
    if (activeFilters.targetLaunchDate) {
      const range = getDateRangeFromFilter(activeFilters.targetLaunchDate);
      if (range) list = list.filter((chapter) => isDateInRange(chapter.targetLaunchDate, range.startDate, range.endDate));
    }
    if (activeFilters.location) {
      list = list.filter((chapter) => (chapter.location || "").toLowerCase().includes(activeFilters.location.toLowerCase()));
    }
    if (activeFilters.contactPerson) {
      list = list.filter((chapter) => (chapter.contactPerson || "").toLowerCase().includes(activeFilters.contactPerson.toLowerCase()));
    }
    if (activeFilters.mentor) {
      list = list.filter((chapter) =>
        (chapter.higherStructureRepresentative || "").toLowerCase().includes(activeFilters.mentor.toLowerCase())
      );
    }
    if (activeFilters.readyOnly) {
      list = list.filter((chapter) => chapter.readyForRecognition);
    }
    if (activeFilters.overCapacity) {
      list = list.filter((chapter) => chapter.overCapacity);
    }

    list.sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (["memberCount", "officersFilled"].includes(sortField)) {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }
      if (["targetLaunchDate", "createdAt"].includes(sortField)) {
        av = new Date(av).getTime() || 0;
        bv = new Date(bv).getTime() || 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [chapters, search, activeFilters, sortField, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, activeFilters, sortField]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(
    () => [
      { num: chapters.length, label: "Chapter Records" },
      { num: chapters.filter((chapter) => chapter.status === "COC Organizing").length, label: "COC Organizing" },
      { num: chapters.filter((chapter) => chapter.readyForRecognition).length, label: "Ready for Recognition" },
    ],
    [chapters]
  );

  function handleSort(field) {
    setSortDir((prev) => (sortField === field && prev === "asc" ? "desc" : "asc"));
    setSortField(field);
  }

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.heroBanner}>
        <div className="container-xl">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Chapter Building</h1>
            <div className="row g-3 justify-content-center">
              {stats.map(({ num, label }) => (
                <div key={label} className="col-12 col-md-4">
                  <div className={styles.statCard}>
                    <p className={styles.statNum}>{num}</p>
                    <p className={styles.statLabel}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.allList}>
        <div className="container-xl">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>All Chapter Formations</h2>
            <div className={styles.addChapterButton}>
              <button className="btn btn-outline-secondary me-2" onClick={loadChapters}>
                <FiRefreshCw /> Refresh
              </button>
              <button className="btn btn-primary" 
                onClick={() => router.push("/volunteer/chapters/create")} 
                style={{ backgroundColor: "#037F81" }}>
                <FiPlus /> Add Chapter
              </button>
            </div>
          </div>

          <div className={styles.tableTopBar}>
            <FilterMenu
              activeFilters={activeFilters}
              onFilterChange={(filters) => {
                setActiveFilters(filters);
                setPage(1);
              }}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchValue={search}
              onExtraColumnsChange={setExtraColumns}
            />
          </div>

          {error && (
            <div className={styles.errorState}>
              <IoIosWarning /> {error}
            </div>
          )}

          {loading ? (
            <div className={styles.loadingState}>Loading chapter records...</div>
          ) : (
            <ChapterTable
              paginated={paginated}
              page={page}
              totalPages={totalPages}
              totalRecords={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onRowClick={(chapter) => router.push(`/volunteer/chapters/view?id=${chapter.id}`)}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              extraColumns={extraColumns}
            />
          )}
        </div>
      </section>
    </main>
  );
}
