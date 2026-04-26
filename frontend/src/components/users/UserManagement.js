"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./UserManagement.module.css";
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
const PLACEHOLDER_USERS = [
  { id: 1,  name: "Alexa Gagan",   role: "Case Officer",            status: "Active",      dateCreated: "02/26/2026" },
  { id: 2,  name: "Marco Santos",  role: "Admin - Executive Officer",status: "Active",      dateCreated: "02/20/2026" },
  { id: 3,  name: "Lena Cruz",     role: "Member",                  status: "Inactive",    dateCreated: "01/15/2026" },
  { id: 4,  name: "Ryan Dela Paz", role: "Legal",              status: "Active",      dateCreated: "03/01/2026" },
  { id: 5,  name: "Sofia Reyes",   role: "Complainants",                 status: "Active",      dateCreated: "02/10/2026" },
  { id: 6,  name: "James Tan",     role: "Case Officer",            status: "Inactive",    dateCreated: "01/28/2026" },
  { id: 7,  name: "Maria Bautista",role: "Member",                  status: "Active",      dateCreated: "03/05/2026" },
  { id: 8,  name: "Carlo Navarro", role: "Volunteers",              status: "Active",      dateCreated: "02/14/2026" },
  { id: 9,  name: "Diana Flores",  role: "Complainants",                 status: "Inactive",    dateCreated: "01/09/2026" },
  { id: 10, name: "Ben Mercado",   role: "Case Officer",            status: "Active",      dateCreated: "03/10/2026" },
  { id: 11, name: "Trisha Abad",   role: "Admin - Executive Officer",status: "Active",     dateCreated: "02/02/2026" },
  { id: 12, name: "Noel Ramos",    role: "Legal",                  status: "Inactive",    dateCreated: "01/22/2026" },
  { id: 13, name: "Grace Ocampo",  role: "Volunteers",              status: "Active",      dateCreated: "03/08/2026" },
  { id: 14, name: "Andrei Lim",    role: "Complainants",                 status: "Active",      dateCreated: "02/27/2026" },
  { id: 15, name: "Camille Torres",role: "Case Officer",            status: "Active",      dateCreated: "01/30/2026" },
  { id: 16, name: "Hans Garcia",   role: "Member",                  status: "Inactive",    dateCreated: "03/03/2026" },
  { id: 17, name: "Issa Valdez",   role: "Volunteers",              status: "Active",      dateCreated: "02/18/2026" },
  { id: 18, name: "Leo Aquino",    role: "Complainants",                 status: "Active",      dateCreated: "01/11/2026" },
];
 
const ROLES = [
  "All",
  "Admin - Executive Officer",
  "Case Officer",
  "Legal",
  "Member",
  "Complainants",
  "Volunteers",
];
 
const PAGE_SIZE = 8;

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span className={isActive ? styles.badgeActive : styles.badgeInactive}>
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

// ── Action Card (Submit Report / Apply as Volunteer) ─────────────────────────
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
export default function AdminDashboard() {


  // TODO: replace with real auth / session data
  const user = { role: "admin", firstName: "Admin", lastName: "User" };

  // hasNew drives the orange dot — set to false to hide it
  const stats = [
    { num: 13, label: "Active", hasNew: false },
    { num: 67, label: "Deactivated",    hasNew: false  },
    { num: 12, label: "New Users",    hasNew: false  },
  ];
  
  const [users, setUsers]           = useState(PLACEHOLDER_USERS);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [activeRole, setActiveRole] = useState("All");
  const [page, setPage]             = useState(1);
 
  // ── Supabase fetch (swap placeholder above with this when ready) ────────────
  // useEffect(() => {
  //   async function fetchUsers() {
  //     setLoading(true);
  //     const { data, error } = await supabase
  //       .from("users")                  // ← your table name
  //       .select("id, name, role, status, created_at")
  //       .order("created_at", { ascending: false });
  //
  //     if (!error && data) {
  //       setUsers(
  //         data.map((u) => ({
  //           id:          u.id,
  //           name:        u.name,
  //           role:        u.role,
  //           status:      u.status,
  //           dateCreated: new Date(u.created_at).toLocaleDateString("en-US", {
  //             month: "2-digit", day: "2-digit", year: "numeric",
  //           }),
  //         }))
  //       );
  //     }
  //     setLoading(false);
  //   }
  //   fetchUsers();
  // }, []);

  // ── Filter + search ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole   = activeRole === "All" || u.role === activeRole;
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.role.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, activeRole, search]);
 
  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, activeRole]);
 
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
                User Management
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

          {/* ── What would you like to do? ── */}
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="UserIconCreate.png" alt="" className={styles.actionIconImg} />
                title="Create a User"
                description="Create an Admin, Member, Volunteer, Client/Victims"
                onView={() => router.push("/report")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="UserIconDelete.png" alt="" className={styles.actionIconImg} />
                title="Delete a User"
                description="Delete an Admin, Member, Volunteer, Client/Victims"
                onView={() => router.push("/volunteer")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="UserIconUpdate.png" alt="" className={styles.actionIconImg} />
                title="Update User Information"
                description="Update information of an Admin, Member, Volunteer, Client/Victims"
                onView={() => router.push("/volunteer")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="UserIconView.png" alt="" className={styles.actionIconImg} />
                title="View All Users"
                description="Sea All the Users: Admin, Member, Volunteer, Client/Victims"
                onView={() => router.push("/volunteer")}
              />
            </div>
          </div>
          </div>

          {/* ── All List ── */}
          <section className={styles.allList}>
      <div className="container-xl">
 
        {/* Section heading */}
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>All the List of Users</h2>
          <div className={styles.headingLine} />
        </div>
 
        <div className={styles.layout}>
 
          {/* ── Table ── */}
          <div className={styles.tableWrap}>
            {loading ? (
              <div className={styles.loadingState}>Loading users…</div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Date Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyState}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.role}</td>
                          <td><StatusBadge status={u.status} /></td>
                          <td>{u.dateCreated}</td>
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
                {ROLES.filter((r) => r !== "All").map((role) => (
                  <button
                    key={role}
                    className={`${styles.roleBtn} ${activeRole === role ? styles.roleBtnActive : ""}`}
                    onClick={() => setActiveRole(activeRole === role ? "All" : role)}
                  >
                    {role}
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