"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiUsers } from "react-icons/fi";
import { fetchChapter } from "@/lib/api";
import styles from "./ViewChapter.module.css";

const OFFICER_ROLES = [
  "Chairperson",
  "Vice Chairperson",
  "Secretary-General",
  "Education and Research Committee Chair",
  "Publication Committee Chair",
  "Membership Committee Chair",
];

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeadingText}>{title}</h2>
      {children}
    </section>
  );
}

function DetailGrid({ rows }) {
  return (
    <div className={styles.detailGrid}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.detailItem}>
          <p className={styles.detailKey}>{label}</p>
          <p className={styles.detailVal}>{value || "-"}</p>
        </div>
      ))}
    </div>
  );
}

function Requirement({ done, label }) {
  return (
    <div className={`${styles.screeningGridRow} ${done ? styles.requirementDone : ""}`}>
      <span className={styles.screeningGridLabel}>{label}</span>
      <span className={styles.yesNoBadge} style={{ background: done ? "#d1fae5" : "#fee2e2", color: done ? "#065f46" : "#991b1b" }}>
        {done ? "Complete" : "Pending"}
      </span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ViewChapter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("id");
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chapterId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    fetchChapter(chapterId)
      .then((record) => setChapter(record))
      .catch((err) => setError(err.message || "Unable to load chapter."))
      .finally(() => setLoading(false));
  }, [chapterId]);

  const stats = useMemo(() => {
    const members = Array.isArray(chapter?.members) ? chapter.members : [];
    return {
      members,
      memberCount: members.length,
      oathCount: members.filter((member) => member.oathTaken).length,
      cocCount: members.filter((member) => member.organizingCommittee).length,
      ogCount: members.filter((member) => member.organizingGroup).length,
      officersFilled: Object.values(chapter?.officers || {}).filter(Boolean).length,
    };
  }, [chapter]);

  if (loading || error || !chapter) {
    return (
      <main className={styles.pageWrapper}>
        <div className={styles.applicationShell}>
          <button className={styles.backBtn} onClick={() => router.push("/volunteer/chapters")}>
            <FiArrowLeft /> Back to Chapter Building
          </button>
          <div className={styles.emptyState}>
            {loading ? "Loading chapter..." : error || "Chapter record was not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.applicationShell}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/chapters")}>
          <FiArrowLeft /> Back to Chapter Building
        </button>

        <section className={styles.heroCard}>
          <div>
            <p className={styles.kicker}>SASHA Chapter Building</p>
            <h1 className={styles.applicantName}>{chapter.chapterName || "Untitled chapter"}</h1>
            <p className={styles.applicantMeta}>{chapter.formationLevel} - {chapter.location || "No location set"}</p>
          </div>
          <span className={styles.statusBadgeDynamic}>{chapter.status || "Formation in Progress"}</span>
        </section>

        <Section title="Formation Profile">
          <DetailGrid
            rows={[
              ["Chapter ID", chapter.id],
              ["Contact Person", chapter.contactPerson],
              ["Higher SASHA Guide / Mentor", chapter.higherStructureRepresentative],
              ["Target Launch Date", formatDate(chapter.targetLaunchDate)],
              ["Affiliate Organization", chapter.affiliateOrganization ? "Yes" : "No"],
              ["Affiliate Active Members", chapter.affiliateOrganization ? chapter.affiliateActiveMembers || "0" : "-"],
            ]}
          />
        </Section>

        <Section title="Readiness Checklist">
          <div className={styles.screeningGridList}>
            <Requirement done={stats.memberCount >= 15} label="At least 15 members for chapter recognition" />
            <Requirement done={stats.cocCount >= 7} label="At least 7 COC members if still organizing" />
            <Requirement done={stats.ogCount >= 2} label="Organizing Group includes contact person and SASHA guide" />
            <Requirement done={stats.oathCount >= 15} label="At least 15 oath-taking members" />
            <Requirement done={stats.officersFilled === OFFICER_ROLES.length} label="Six core officers elected" />
            <Requirement done={chapter.nationalProgramAlignment} label="Programs aligned with SASHA National" />
          </div>
        </Section>

        <Section title="Process Milestones">
          <div className={styles.detailGrid}>
            {[
              ["Orientation Completed", chapter.orientationCompleted],
              ["Oath-Taking Completed", chapter.oathTakingCompleted],
              ["Members Expressed Support", chapter.pledgeSupportConfirmed],
              ["National Program Alignment", chapter.nationalProgramAlignment],
            ].map(([label, done]) => (
              <div key={label} className={styles.detailItem}>
                <p className={styles.detailKey}>{label}</p>
                <p className={styles.detailVal}>{done ? <FiCheckCircle /> : "-"} {done ? "Yes" : "No"}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Member Roster">
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Affiliation</th>
                  <th>Oath</th>
                  <th>COC</th>
                  <th>OG</th>
                </tr>
              </thead>
              <tbody>
                {stats.members.map((member) => (
                  <tr key={member.userId || member.fullName}>
                    <td><FiUsers /> {member.fullName}</td>
                    <td>{member.membershipType || "-"}</td>
                    <td>{member.affiliation || "-"}</td>
                    <td>{member.oathTaken ? "Yes" : "No"}</td>
                    <td>{member.organizingCommittee ? "Yes" : "No"}</td>
                    <td>{member.organizingGroup ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Officer Elections">
          <DetailGrid
            rows={OFFICER_ROLES.map((role) => {
              const selectedUserId = chapter.officers?.[role];
              const member = stats.members.find((item) => String(item.userId) === String(selectedUserId));
              return [role, member?.fullName || "-"];
            })}
          />
        </Section>

        <Section title="Recognition Notes">
          <p className={styles.longText}>{chapter.notes || "No recognition notes recorded."}</p>
        </Section>
      </div>
    </main>
  );
}
