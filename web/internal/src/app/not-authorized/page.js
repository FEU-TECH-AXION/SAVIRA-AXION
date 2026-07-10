import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main className="shell">
      <section className="panel">
        <h1>Not authorized</h1>
        <p>Your account does not have permission to access that internal section.</p>
        <p>
          <Link href="/login">Return to sign in</Link>
        </p>
      </section>
    </main>
  );
}
