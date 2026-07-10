import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function CasesPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Cases</h1>
          <p>Case officer workspace</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="nav" aria-label="Internal sections">
        <Link href="/cases">Cases</Link>
      </nav>
      <section className="panel">
        <h2>Case management</h2>
        <p>Placeholder for internal case queues, assignments, interviews, and follow-ups.</p>
      </section>
    </main>
  );
}
