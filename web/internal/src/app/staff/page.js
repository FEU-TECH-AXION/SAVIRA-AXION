import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function StaffPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Staff</h1>
          <p>Staff operations workspace</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="nav" aria-label="Internal sections">
        <Link href="/staff">Staff</Link>
      </nav>
      <section className="panel">
        <h2>Staff operations</h2>
        <p>Placeholder for projects, volunteer coordination, and support workflows.</p>
      </section>
    </main>
  );
}
