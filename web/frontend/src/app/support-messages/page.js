"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiMail, FiRefreshCcw, FiMessageSquare, FiAlertCircle, FiInbox } from "react-icons/fi";
import { authFetch, useAuth } from "@/lib/AuthContext";
import styles from "./supportMessages.module.css";

const SOURCE_LABELS = {
  contact: "Contact Us",
  bug_report: "Bug Report",
};

function senderName(message) {
  return [message?.first_name, message?.last_name].filter(Boolean).join(" ") || message?.email || "Unknown sender";
}

function isImageAttachment(message) {
  return String(message?.attachment_mime_type || "").startsWith("image/");
}

export default function SupportMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => messages.find((message) => message.message_id === selectedId) || messages[0],
    [messages, selectedId]
  );
  const stats = useMemo(() => [
    { label: "Open", num: messages.filter((message) => message.status === "open").length },
    { label: "Bug Reports", num: messages.filter((message) => message.source === "bug_report").length },
    { label: "Total Messages", num: messages.length },
  ], [messages]);

  const loadMessages = useCallback(async ({ showBusy = true } = {}) => {
    if (showBusy) setBusy(true);
    setError("");
    try {
      const res = await authFetch(`/api/support/messages?source=${source}&status=${status}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load support messages.");
      setMessages(data.data || []);
      setSelectedId((current) => current || data.data?.[0]?.message_id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showBusy) setBusy(false);
    }
  }, [source, status]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role_name?.toLowerCase() !== "admin") {
      router.push("/dashboard");
      return;
    }
    let cancelled = false;

    async function fetchMessages() {
      try {
        const res = await authFetch(`/api/support/messages?source=${source}&status=${status}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load support messages.");
        if (cancelled) return;
        setMessages(data.data || []);
        setSelectedId((current) => current || data.data?.[0]?.message_id || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [loading, router, source, status, user]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await authFetch(`/api/support/messages/${selected.message_id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reply),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send reply.");
      setMessages((items) => items.map((item) => item.message_id === data.data.message_id ? data.data : item));
      setReply({ subject: "", message: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const markResolved = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await authFetch(`/api/support/messages/${selected.message_id}/resolve`, {
        method: "PATCH",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not mark message as resolved.");
      setMessages((items) => items.map((item) => item.message_id === data.data.message_id ? data.data : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.heroBanner}>
        <div className="container-xl">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Support Messages</h1>
            <div className={styles.statGrid}>
              {stats.map(({ label, num }) => (
                <div key={label} className={styles.statCard}>
                  <p className={styles.statNum}>{num}</p>
                  <p className={styles.statLabel}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.allList}>
        <div className="container-xl">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>All Support Concerns</h2>
            <div className={styles.headingLine} />
          </div>

          <div className={styles.tableTopBar}>
            <div className={styles.filterGroup}>
              <label>
                Source
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="all">All sources</option>
                  <option value="contact">Contact Us</option>
                  <option value="bug_report">Bug Reports</option>
                </select>
              </label>
              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
            </div>
            <button type="button" className={styles.btnSecondary} onClick={loadMessages} disabled={busy}>
              <FiRefreshCcw /> Refresh
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.layout}>
            <aside className={styles.list}>
              <div className={styles.panelHeader}>
                <FiInbox />
                <span>Inbox</span>
              </div>
              {messages.length === 0 ? (
                <div className={styles.empty}>No messages found.</div>
              ) : messages.map((message) => (
                <button
                  key={message.message_id}
                  type="button"
                  className={`${styles.listItem} ${selected?.message_id === message.message_id ? styles.listItemActive : ""}`}
                  onClick={() => setSelectedId(message.message_id)}
                >
                  <span className={message.source === "bug_report" ? styles.sourceBug : styles.sourceContact}>
                    {message.source === "bug_report" ? <FiAlertCircle /> : <FiMessageSquare />}
                    {SOURCE_LABELS[message.source] || message.source}
                  </span>
                  <strong>{message.subject || "No subject"}</strong>
                  <span>{senderName(message)}</span>
                  <small className={styles[`status-${message.status}`]}>{message.status}</small>
                </button>
              ))}
            </aside>

            <section className={styles.detail}>
          {selected ? (
            <>
              <div className={styles.detailTop}>
                <div>
                  <span className={selected.source === "bug_report" ? styles.sourceBug : styles.sourceContact}>
                    {selected.source === "bug_report" ? <FiAlertCircle /> : <FiMessageSquare />}
                    {SOURCE_LABELS[selected.source] || selected.source}
                  </span>
                  <h2>{selected.subject || "No subject"}</h2>
                  <p>{senderName(selected)}</p>
                  <p>{selected.email}{selected.phone ? ` | ${selected.phone}` : ""}</p>
                </div>
                <button type="button" className={styles.resolveButton} onClick={markResolved} disabled={busy || selected.status === "resolved"}>
                  <FiCheck /> Mark Resolved
                </button>
              </div>

              <div className={styles.messageBody}>{selected.message}</div>
              {selected.page_url && <p className={styles.meta}>Page: {selected.page_url}</p>}
              {selected.attachment_name && (
                <div className={styles.attachmentBox}>
                  <p className={styles.meta}>Attachment: {selected.attachment_name}</p>
                  {selected.attachment_url && isImageAttachment(selected) ? (
                    <a href={selected.attachment_url} target="_blank" rel="noreferrer" className={styles.attachmentImageLink}>
                      <img src={selected.attachment_url} alt={selected.attachment_name} className={styles.attachmentImage} />
                    </a>
                  ) : selected.attachment_url ? (
                    <a href={selected.attachment_url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                      Open attachment
                    </a>
                  ) : null}
                </div>
              )}

              <form className={styles.replyForm} onSubmit={sendReply}>
                <h3><FiMail /> Reply</h3>
                <input
                  value={reply.subject}
                  onChange={(e) => setReply((p) => ({ ...p, subject: e.target.value }))}
                  placeholder={`Re: ${selected.subject || "SAVIRA support"}`}
                />
                <textarea
                  value={reply.message}
                  onChange={(e) => setReply((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Write your reply..."
                  rows={7}
                  required
                />
                <button type="submit" className={styles.sendButton} disabled={busy}>
                  {busy ? "Sending..." : "Send Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.empty}>Select a message to view details.</div>
          )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
