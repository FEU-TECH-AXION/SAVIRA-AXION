export const PUBLIC_UPDATE_TEMPLATES = {
  endorsement_saved: [
    {
      id: "referred",
      label: "Referred for follow-up",
      build: ({ institution }) => `Your case has been referred to ${institution} for further action.`,
    },
    {
      id: "endorsed_contact",
      label: "Endorsed, expect contact",
      build: ({ institution }) => `Your case has been endorsed to ${institution}. They may reach out regarding next steps.`,
    },
    { id: "custom", label: "Write a custom message", build: null },
  ],
  referral_endorsed: [
    {
      id: "referred",
      label: "Referred for further action",
      build: ({ institution }) => `Your case has been referred to ${institution} for further action.`,
    },
    { id: "custom", label: "Write a custom message", build: null },
  ],
  monitoring_update_added: [
    {
      id: "followed_up",
      label: "Followed up, no major change",
      build: ({ institution }) =>
        `We followed up on your case with ${institution || "the relevant office"}. We'll let you know as soon as there's a development.`,
    },
    {
      id: "progress",
      label: "There's a new development",
      build: () =>
        `There's a new development in your case. Please reach out to your case officer if you'd like more details.`,
    },
    { id: "custom", label: "Write a custom message", build: null },
  ],
  paralegal_record_saved: [
    { id: "assigned", label: "Paralegal assigned", build: () => "A paralegal has been assigned to help prepare your case." },
    { id: "ready", label: "File ready for lawyer review", build: () => "Your case file has been reviewed and is now ready for legal review." },
    { id: "custom", label: "Write a custom message", build: null },
  ],
};

// Paralegal templates must never interpolate evidence items, survivor disclosures,
// incident details, internal notes, or explanation fields. Those remain internal.
