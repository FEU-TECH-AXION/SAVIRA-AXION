/**
 * web/frontend/src/components/projects/projectsData.js
 *
 * Shared source of truth for all SASHA projects.
 * Both page.js (landing) and events/page.js filter this list
 * to show only public + approved projects.
 *
 * In production, replace this with a Supabase real-time subscription
 * or server-side fetch, e.g.:
 *
 *   export async function getPublicProjects() {
 *     const { data } = await supabase
 *       .from("projects")
 *       .select("*")
 *       .eq("visibility", "public")
 *       .eq("approval_status", "approved")
 *       .order("date_start", { ascending: false });
 *     return data;
 *   }
 */

export const PLACEHOLDER_PROJECTS = [
  {
    id: 1,
    slug: "safe-spaces-summit",
    title: "Safe Spaces Summit",
    tagline: "Creating sanctuaries for survivors.",
    description:
      "A summit promoting safe spaces across communities. Participants will learn about reporting procedures and how to create safer environments.",
    category: "Youth Leadership Programs",
    dateStart: "2026-03-03",
    dateEnd: "2026-03-04",
    startTime: "08:00",
    endTime: "17:00",
    activityMode: "Face-to-face",
    venue: "SASHA Community Hall, Quezon City",
    onlinePlatform: "",
    onlineLink: "",
    targetParticipants: "Youth scouts aged 15–25",
    partnerOrganizations: "BSP National Council",
    status: "Active",
    dueDate: "2026-03-01",
    logisticalRequirements: "Venue setup, AV equipment, catering",
    financialRequirements: "Estimated ₱120,000 from chapter funds",
    operationalRequirements: "DSWD coordination, event permits",
    projectOfficers: ["Maria Santos", "Jose Reyes"],
    projectCommitteeMembers: ["Ana Cruz", "Pedro Lim", "Lea Bautista"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/safe-spaces-summit.png",
  },
  {
    id: 2,
    slug: "youth-against-abuse-summit",
    title: "Youth Against Abuse Summit",
    tagline: "Empowering voices, changing futures.",
    description:
      "A leadership summit empowering young advocates to stand against harassment and discrimination. The event features talks, workshops, and collaborative planning sessions.",
    category: "Legal & Policy Education",
    dateStart: "2026-03-03",
    dateEnd: "2026-03-04",
    startTime: "09:00",
    endTime: "16:00",
    activityMode: "Hybrid",
    venue: "Manila City Hall Auditorium",
    onlinePlatform: "Zoom",
    onlineLink: "https://zoom.us/j/example",
    targetParticipants: "Youth advocates, school administrators",
    partnerOrganizations: "UN Women Philippines, DSWD",
    status: "Active",
    dueDate: "2026-03-01",
    logisticalRequirements: "Zoom license, venue permits, signage",
    financialRequirements: "₱85,000 from UN Women grant",
    operationalRequirements: "Legal team briefing, media clearances",
    projectOfficers: ["Carla Mendoza"],
    projectCommitteeMembers: ["Ramon Torres", "Grace Villanueva"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/youth-summit.png",
  },
  {
    id: 3,
    slug: "know-your-rights-workshop",
    title: "Know Your Rights Workshop",
    tagline: "Knowledge is your first defense.",
    description:
      "An educational session focused on understanding legal protections against sexual harassment. Attendees will gain practical knowledge on reporting processes and survivor support.",
    category: "Legal & Policy Education",
    dateStart: "2025-03-01",
    dateEnd: "2025-03-31",
    startTime: "",
    endTime: "",
    activityMode: "Virtual",
    venue: "",
    onlinePlatform: "Facebook Live",
    onlineLink: "https://facebook.com/sasha",
    targetParticipants: "General public, social media audiences",
    partnerOrganizations: "",
    status: "Completed",
    dueDate: "2025-02-25",
    logisticalRequirements: "Social media assets, video production",
    financialRequirements: "₱30,000 for digital ads",
    operationalRequirements: "Content moderation plan",
    projectOfficers: ["Riza Dizon"],
    projectCommitteeMembers: ["Ben Santos"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/rights-workshop.png",
  },
  {
    id: 4,
    slug: "sasha-awareness-drive",
    title: "SASHA Awareness Drive",
    tagline: "Making noise for what matters.",
    description:
      "City-wide awareness initiative targeting key demographics in underserved communities.",
    category: "Awareness Campaign",
    dateStart: "2026-08-18",
    dateEnd: "2026-08-19",
    startTime: "08:00",
    endTime: "18:00",
    activityMode: "Face-to-face",
    venue: "Various barangays, Quezon City",
    onlinePlatform: "",
    onlineLink: "",
    targetParticipants: "Community members, LGUs",
    partnerOrganizations: "QC LGU, CHR Philippines",
    status: "Upcoming",
    dueDate: "2026-08-15",
    logisticalRequirements: "Mobile tarpaulins, booths, flyers, volunteers",
    financialRequirements: "₱200,000 from LGU partnership",
    operationalRequirements: "Barangay clearances, crowd management plan",
    projectOfficers: ["Lando Garcia", "Tina Cruz"],
    projectCommitteeMembers: ["Mia Soriano", "Dave Reyes", "Kris Lim"],
    visibility: "private",       // ← not public yet
    approvalStatus: "pending",
    image: "/project-4.jpg",
  },
];

/** Returns only events that should appear on public-facing pages */
export function getPublicApprovedProjects() {
  return PLACEHOLDER_PROJECTS.filter(
    (p) => p.visibility === "public" && p.approvalStatus === "approved"
  );
}