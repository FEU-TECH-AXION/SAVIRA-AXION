import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AdminPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Admin</h1>
          <p>Internal administration workspace</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="nav" aria-label="Internal sections">
        <Link href="/admin">Admin</Link>
        <Link href="/cases">Cases</Link>
        <Link href="/legal">Legal</Link>
        <Link href="/staff">Staff</Link>
      </nav>
      <section className="grid" aria-label="Admin overview">
        <article className="panel">
          <h2>User administration</h2>
          <p>Placeholder for internal account and role management workflows.</p>
        </article>
        <article className="panel">
          <h2>Operational oversight</h2>
          <p>Placeholder for cross-team status, reports, and internal controls.</p>
        </article>
      </section>
    </main>
  );
}
