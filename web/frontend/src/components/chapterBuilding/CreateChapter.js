"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiPlus,
  FiSave,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { createChapter, fetchChapter, fetchUsers, updateChapter } from "@/lib/api";
import styles from "./CreateChapter.module.css";

const DRAFT_KEY = "savira_chapter_formation_workspace";

const OFFICER_ROLES = [
  "Chairperson",
  "Vice Chairperson",
  "Secretary-General",
  "Education and Research Committee Chair",
  "Publication Committee Chair",
  "Membership Committee Chair",
];

const FORMATION_LEVELS = [
  "School / Scouting Unit",
  "Community",
  "City / Municipal",
  "Provincial",
  "Regional",
  "Affiliate Organization",
];

const blankMember = {
  userId: "",
  fullName: "",
  nickname: "",
  birthday: "",
  age: "",
  affiliation: "",
  // reason: "",
  oathTaken: false,
  organizingGroup: false,
  organizingCommittee: false,
};

const initialState = {
  chapterName: "",
  formationLevel: "School / Scouting Unit",
  location: "",
  contactPerson: "",
  higherStructureRepresentative: "",
  targetLaunchDate: "",
  orientationCompleted: false,
  oathTakingCompleted: false,
  pledgeSupportConfirmed: false,
  nationalProgramAlignment: false,
  affiliateOrganization: false,
  affiliateActiveMembers: "",
  members: [
    { ...blankMember, organizingGroup: true, organizingCommittee: true },
  ],
  officers: Object.fromEntries(OFFICER_ROLES.map((role) => [role, ""])),
  notes: "",
};

function normalizeChapterForm(chapter) {
  return {
    ...initialState,
    ...chapter,
    members: Array.isArray(chapter?.members) && chapter.members.length > 0
      ? chapter.members.map((member) => ({
        ...blankMember,
        ...member,
        userId: member.userId ? String(member.userId) : "",
        age: member.age != null ? String(member.age) : "",
      }))
      : [{ ...blankMember, organizingGroup: true, organizingCommittee: true }],
    officers: {
      ...initialState.officers,
      ...Object.fromEntries(
        Object.entries(chapter?.officers || {}).map(([role, userId]) => [
          role,
          userId ? String(userId) : "",
        ])
      ),
    },
    affiliateActiveMembers: chapter?.affiliateActiveMembers != null
      ? String(chapter.affiliateActiveMembers)
      : "",
  };
}

function calcAge(birthday) {
  if (!birthday) return "";
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return String(age);
}

function membershipType(ageValue) {
  const age = Number(ageValue);
  if (!ageValue || Number.isNaN(age)) return "Unclassified";
  if (age <= 12) return "Probationary";
  if (age >= 13 && age <= 35) return "Regular";
  return "Honorary";
}

function getRoleName(user) {
  return user?.role_name || user?.roles?.role_name || user?.role || "";
}

function getUserName(user) {
  const name = [user?.first_name, user?.middle_name, user?.last_name, user?.extension_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return name || user?.user_name || user?.email || "Unnamed staff";
}

function getStaffAffiliation(user) {
  return user?.staff?.committees?.committee_name || user?.committee || "";
}

function Field({ label, children, hint }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`${styles.stat} ${tone ? styles[`stat_${tone}`] : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Requirement({ done, title, detail }) {
  return (
    <div className={`${styles.requirement} ${done ? styles.requirementDone : ""}`}>
      <span className={styles.requirementIcon}>{done ? <FiCheckCircle /> : null}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function ChapterFormationPageContent({ mode = "create" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("id");
  const isEdit = mode === "edit";
  const [form, setForm] = useState(initialState);
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffError, setStaffError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (isEdit) return;
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) setForm({ ...initialState, ...JSON.parse(raw) });
      } catch {
        setForm(initialState);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    if (!chapterId) {
      const timer = window.setTimeout(() => {
        setSaveError("No chapter was selected for editing.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let mounted = true;
    const timer = window.setTimeout(() => {
      fetchChapter(chapterId)
        .then((chapter) => {
          if (!mounted) return;
          setForm(normalizeChapterForm(chapter));
        })
        .catch((err) => {
          if (!mounted) return;
          setSaveError(err.message || "Unable to load chapter for editing.");
        });
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [chapterId, isEdit]);

  useEffect(() => {
    let mounted = true;

    async function loadStaffUsers() {
      try {
        const users = await fetchUsers();
        if (!mounted) return;
        setStaffUsers(
          (Array.isArray(users) ? users : [])
            .filter((user) => getRoleName(user).toLowerCase() === "staff")
            .filter((user) => user.is_active !== false)
            .map((user) => ({
              ...user,
              displayName: getUserName(user),
              affiliation: getStaffAffiliation(user),
            }))
        );
      } catch (err) {
        if (!mounted) return;
        setStaffError(err.message || "Unable to load staff users.");
      }
    }

    loadStaffUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const members = form.members.filter((m) => m.userId && m.fullName.trim());
    const oathMembers = members.filter((m) => m.oathTaken);
    const regularMembers = members.filter((m) => membershipType(m.age) === "Regular");
    const ogMembers = members.filter((m) => m.organizingGroup);
    const cocMembers = members.filter((m) => m.organizingCommittee);
    const officersFilled = OFFICER_ROLES.filter((role) => form.officers[role]?.trim());

    const chapterReady =
      oathMembers.length >= 15 &&
      form.orientationCompleted &&
      form.oathTakingCompleted &&
      form.pledgeSupportConfirmed &&
      form.nationalProgramAlignment &&
      officersFilled.length === OFFICER_ROLES.length;

    const cocReady =
      cocMembers.length >= 7 &&
      ogMembers.length >= 2 &&
      !!form.contactPerson.trim() &&
      !!form.higherStructureRepresentative.trim();

    return {
      members,
      oathMembers,
      regularMembers,
      ogMembers,
      cocMembers,
      officersFilled,
      chapterReady,
      cocReady,
      overCapacity: members.length > 40,
      cityEligible: form.formationLevel === "City / Municipal" && members.length >= 45,
      affiliateReady: form.affiliateOrganization && Number(form.affiliateActiveMembers) >= 15,
    };
  }, [form]);

  const selectedStaffIds = useMemo(
    () => new Set(form.members.map((member) => String(member.userId)).filter(Boolean)),
    [form.members]
  );

  const selectedRegularStaffMembers = useMemo(
    () => stats.members.filter((member) => membershipType(member.age) === "Regular"),
    [stats.members]
  );

  function availableStaffForMember(currentUserId) {
    return staffUsers.filter(
      (user) => String(user.user_id) === String(currentUserId) || !selectedStaffIds.has(String(user.user_id))
    );
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMember(index, patch) {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    }));
  }

  function selectStaffMember(index, userId) {
    const staff = staffUsers.find((user) => String(user.user_id) === String(userId));
    if (!staff) {
      updateMember(index, { ...blankMember });
      return;
    }

    updateMember(index, {
      userId: String(staff.user_id),
      fullName: staff.displayName,
      nickname: staff.user_name || "",
      affiliation: staff.affiliation,
    });
  }

  function addMember() {
    setForm((prev) => ({ ...prev, members: [...prev.members, { ...blankMember }] }));
  }

  function removeMember(index) {
    setForm((prev) => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }));
  }

  function getChapterStatus(record) {
    if (record.members.length > 40) return "Needs Division";
    if (
      record.members.length >= 15 &&
      record.members.filter((member) => member.oathTaken).length >= 15 &&
      Object.values(record.officers).filter(Boolean).length >= OFFICER_ROLES.length &&
      record.orientationCompleted &&
      record.oathTakingCompleted &&
      record.pledgeSupportConfirmed &&
      record.nationalProgramAlignment
    ) {
      return "Ready for Recognition";
    }
    if (
      record.members.filter((member) => member.organizingCommittee).length >= 7 &&
      record.members.filter((member) => member.organizingGroup).length >= 2
    ) {
      return "COC Organizing";
    }
    return "Formation in Progress";
  }

  function getCurrentUserId() {
    try {
      const raw = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user="))
        ?.split("=")[1];
      return raw ? JSON.parse(decodeURIComponent(raw))?.user_id || "" : "";
    } catch {
      return "";
    }
  }

  async function saveDraft() {
    if (isEdit && !chapterId) {
      setSaveError("No chapter was selected for editing.");
      return;
    }

    setSaving(true);
    setSaveError("");
    const cleanedMembers = form.members
      .filter((member) => member.userId && member.fullName.trim())
      .map((member) => ({
        ...member,
        membershipType: membershipType(member.age),
      }));

    const record = {
      ...form,
      members: cleanedMembers,
      createdByUserId: getCurrentUserId(),
    };

    record.status = getChapterStatus(record);

    try {
      if (isEdit) {
        await updateChapter(chapterId, record);
      } else {
        await createChapter(record);
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      }
      setSavedAt(new Date().toLocaleString("en-PH"));
      router.push("/volunteer/chapters");
    } catch (err) {
      setSaveError(err.message || (isEdit ? "Unable to update chapter." : "Unable to save chapter."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/chapters")}>
          <FiArrowLeft /> Back to Chapter Building
        </button>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Volunteer Chapter Formation</p>
            <h1>{isEdit ? "Edit Chapter Building Workspace" : "SASHA Chapter Building Workspace"}</h1>
            <p>
              {isEdit
                ? "Update this chapter formation while keeping the same readiness, roster, officer, and recognition workflow."
                : "Organize accepted volunteers into a chapter, Chapter Organizing Committee, or higher-level formation while checking the membership, oath-taking, officer, and recognition requirements."}
            </p>
          </div>
          <button className={styles.saveBtn} onClick={saveDraft} disabled={saving}>
            <FiSave /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Chapter"}
          </button>
        </section>

        {saveError && <div className={styles.warning}>{saveError}</div>}
        {savedAt && <div className={styles.savedBanner}>Chapter record {isEdit ? "updated" : "saved"} at {savedAt}.</div>}

        <section className={styles.statsGrid}>
          <Stat label="Total Members" value={stats.members.length} tone={stats.overCapacity ? "warn" : ""} />
          <Stat label="Oath-Taking Complete" value={stats.oathMembers.length} />
          <Stat label="Regular Voting Members" value={stats.regularMembers.length} />
          <Stat label="COC Members" value={stats.cocMembers.length} />
          <Stat label="OG Members" value={stats.ogMembers.length} />
          <Stat label="Officers Elected" value={`${stats.officersFilled.length}/6`} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Formation Profile</h2>
            <span className={styles.panelHint}>Minimum 15 members for chapter recognition</span>
          </div>
          <div className={styles.formGrid}>
            <Field label="Proposed Chapter / Formation Name">
              <input value={form.chapterName} onChange={(e) => update("chapterName", e.target.value)} placeholder="e.g. Manila Science High School SASHA" />
            </Field>
            <Field label="Formation Level">
              <select value={form.formationLevel} onChange={(e) => update("formationLevel", e.target.value)}>
                {FORMATION_LEVELS.map((level) => <option key={level}>{level}</option>)}
              </select>
            </Field>
            <Field label="School, Community, City, Council, Province, or Region">
              <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Primary locality or institution" />
            </Field>
            <Field label="Assigned Contact Person">
              <select value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)}>
                <option value="">Select staff contact person</option>
                {staffUsers.map((staff) => (
                  <option key={`contact-${staff.user_id}`} value={staff.displayName}>
                    {staff.displayName}{staff.email ? ` - ${staff.email}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Higher SASHA Guide / Mentor">
              <select value={form.higherStructureRepresentative} onChange={(e) => update("higherStructureRepresentative", e.target.value)}>
                <option value="">Select staff guide / mentor</option>
                {staffUsers.map((staff) => (
                  <option key={`mentor-${staff.user_id}`} value={staff.displayName}>
                    {staff.displayName}{staff.email ? ` - ${staff.email}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target Launch Date">
              <input type="date" value={form.targetLaunchDate} onChange={(e) => update("targetLaunchDate", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Readiness Checklist</h2>
            <span className={styles.panelHint}>{stats.chapterReady ? "Ready for recognition" : stats.cocReady ? "COC ready, continue recruitment" : "Formation in progress"}</span>
          </div>
          <div className={styles.requirementGrid}>
            <Requirement done={stats.members.length >= 15} title="15-member chapter threshold" detail="A SASHA Chapter is composed of at least fifteen members." />
            <Requirement done={stats.cocMembers.length >= 7} title="COC fallback threshold" detail="If not fully formed, create a Chapter Organizing Committee with at least seven members." />
            <Requirement done={stats.ogMembers.length >= 2} title="Organizing Group present" detail="The OG includes the contact person and a guide from a higher SASHA structure." />
            <Requirement done={stats.oathMembers.length >= 15} title="Oath under the SASHA flag" detail="Members must take the oath before formal chapter recognition." />
            <Requirement done={stats.officersFilled.length === OFFICER_ROLES.length} title="Officer slate completed" detail="Recognized chapters elect six core officers." />
            <Requirement done={form.nationalProgramAlignment} title="Programs aligned" detail="Chapter initiatives must remain consistent with national programs and policies." />
          </div>
          {stats.overCapacity && (
            <div className={styles.warning}>
              This roster exceeds 40 members. Consider dividing members into two or more chapters by geography, academic strand, or level.
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Chapter Process Milestones</h2>
            <span className={styles.panelHint}>Orientation, oath-taking, launch, and recognition</span>
          </div>
          <div className={styles.checkRow}>
            {[
              ["orientationCompleted", "Orientation completed"],
              ["oathTakingCompleted", "Oath-taking completed"],
              ["pledgeSupportConfirmed", "Members expressed support and commitment"],
              ["nationalProgramAlignment", "Programs and actions aligned with SASHA National"],
              ["affiliateOrganization", "Existing organization applying as affiliate"],
            ].map(([key, label]) => (
              <label key={key} className={styles.checkPill}>
                <input type="checkbox" checked={!!form[key]} onChange={(e) => update(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
          {form.affiliateOrganization && (
            <div className={styles.formGridCompact}>
              <Field label="Affiliate Active Members" hint="Affiliate organizations need at least 15 active members.">
                <input type="number" min="0" value={form.affiliateActiveMembers} onChange={(e) => update("affiliateActiveMembers", e.target.value)} />
              </Field>
              <Requirement done={stats.affiliateReady} title="Affiliate threshold" detail="All members must submit information, attend orientation, and take the pledge." />
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Member Roster</h2>
            <button className={styles.secondaryBtn} onClick={addMember}><FiPlus /> Add Member</button>
          </div>
          <div className={styles.memberList}>
            {form.members.map((member, index) => (
              <div key={index} className={styles.memberCard}>
                <div className={styles.memberTop}>
                  <strong><FiUsers /> Member {index + 1}</strong>
                  <button className={styles.iconBtn} onClick={() => removeMember(index)} aria-label="Remove member"><FiTrash2 /></button>
                </div>
                {staffError && <div className={styles.warning}>{staffError}</div>}
                <div className={styles.memberGrid}>
                  <Field label="Staff User">
                    <select value={member.userId} onChange={(e) => selectStaffMember(index, e.target.value)}>
                      <option value="">Select staff user</option>
                      {availableStaffForMember(member.userId).map((staff) => (
                        <option key={staff.user_id} value={staff.user_id}>
                          {staff.displayName}{staff.email ? ` - ${staff.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Full Name">
                    <input value={member.fullName} readOnly placeholder="Select a staff user" />
                  </Field>
                  <Field label="Nickname">
                    <input value={member.nickname} onChange={(e) => updateMember(index, { nickname: e.target.value })} />
                  </Field>
                  <Field label="Birthday">
                    <input type="date" value={member.birthday} onChange={(e) => updateMember(index, { birthday: e.target.value, age: calcAge(e.target.value) })} />
                  </Field>
                  <Field label="Age">
                    <input type="number" value={member.age} onChange={(e) => updateMember(index, { age: e.target.value })} />
                  </Field>
                  <Field label="School / Scouting Unit / Community">
                    <input value={member.affiliation} onChange={(e) => updateMember(index, { affiliation: e.target.value })} />
                  </Field>
                  {/* <Field label="Reason for Joining">
                    <input value={member.reason} onChange={(e) => updateMember(index, { reason: e.target.value })} />
                  </Field> */}
                </div>
                <div className={styles.memberFooter}>
                  <span className={styles.typeBadge}>{membershipType(member.age)}</span>
                  <label><input type="checkbox" checked={member.oathTaken} onChange={(e) => updateMember(index, { oathTaken: e.target.checked })} /> Oath taken</label>
                  <label><input type="checkbox" checked={member.organizingGroup} onChange={(e) => updateMember(index, { organizingGroup: e.target.checked })} /> OG</label>
                  <label><input type="checkbox" checked={member.organizingCommittee} onChange={(e) => updateMember(index, { organizingCommittee: e.target.checked })} /> COC</label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Officer Elections</h2>
            <span className={styles.panelHint}>Only regular members vote and may be elected</span>
          </div>
          <div className={styles.formGrid}>
            {OFFICER_ROLES.map((role) => (
              <Field key={role} label={role}>
                <select value={form.officers[role] || ""} onChange={(e) => update("officers", { ...form.officers, [role]: e.target.value })}>
                  <option value="">Select elected staff officer</option>
                  {selectedRegularStaffMembers.map((member) => (
                    <option key={`${role}-${member.userId}`} value={member.userId}>{member.fullName}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Recognition Notes</h2>
            <span className={styles.panelHint}>Evaluation, modules, and next expansion work</span>
          </div>
          <textarea
            className={styles.notes}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Document orientation notes, launch plans, educational modules provided, neighboring schools or communities for expansion, or guidance from SASHA National."
          />
        </section>
      </div>
    </main>
  );
}

export default function ChapterFormationPage({ mode = "create" }) {
  return (
    <Suspense fallback={null}>
      <ChapterFormationPageContent mode={mode} />
    </Suspense>
  );
}