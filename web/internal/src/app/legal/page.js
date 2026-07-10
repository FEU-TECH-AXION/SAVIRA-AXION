import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function LegalPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Legal</h1>
          <p>Legal personnel workspace</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="nav" aria-label="Internal sections">
        <Link href="/legal">Legal</Link>
      </nav>
      <section className="panel">
        <h2>Legal reviews</h2>
        <p>Placeholder for review queues, legal notes, and case guidance workflows.</p>
      </section>
    </main>
  );
}
