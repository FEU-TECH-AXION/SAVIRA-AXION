export const STATUS_COLORS = {
  "Submitted":             { bg: "#e0f2fe", color: "#0369a1" },
  "For Verification":      { bg: "#dbeafe", color: "#1e40af" },
  "Undergoing Review":     { bg: "#fef9c3", color: "#854d0e" },
  "Verified - True":       { bg: "#dcfce7", color: "#166534" },
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" },
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
  "Resolved":              { bg: "#ccfbf1", color: "#115e59" },
  "Withdrawn":             { bg: "#fef3c7", color: "#92400e" },
};

export const STATUS_GUIDE_STATUSES = [
  {
    status: "For Verification",
    title: "For Verification",
    summary: "Report is received.",
    details: [
      "Report is received.",
      "Intake officer logs the case.",
      "Basic details are checked: complainant identity, respondent identity if known, incident nature, urgency, and available evidence.",
      "Confidentiality and consent reminders are given.",
      "Case is queued for initial screening.",
    ],
  },
  {
    status: "Undergoing Review",
    title: "Undergoing Review",
    summary: "Intake team or case officer reviews whether the report is within SASHA’s scope.",
    details: [
      "Intake team or case officer reviews whether the report is within SASHA’s scope.",
      "Duplicate reports are checked.",
      "Immediate safety issues are identified.",
      "Missing information is listed.",
      "Survivor may be contacted for clarification.",
    ],
  },
  {
    status: "Verified - True",
    title: "Verified – True",
    summary: "The report is found sufficiently credible and within scope.",
    details: [
      "The report is found sufficiently credible and within scope.",
      "There is enough basis to treat it as a legitimate case for support, referral, or case development.",
      "This does not always mean the perpetrator is already legally proven guilty; it means the report passed SASHA’s verification threshold.",
    ],
  },
  {
    status: "Verified - False",
    title: "Verified – False",
    summary: "The report may be outside scope, unsupported after verification, clearly erroneous, duplicated, or unverifiable after reasonable efforts.",
    details: [
      "The report may be outside scope, unsupported after verification, clearly erroneous, duplicated, or unverifiable after reasonable efforts.",
      "The case is closed internally, but records should remain controlled and documented.",
      "This status should be used carefully to avoid appearing to discredit survivors unfairly.",
    ],
  },
  {
    status: "Under Case Evaluation",
    title: "Under Case Evaluation",
    summary: "The full case file is assessed.",
    details: [
      "The full case file is assessed.",
      "Team determines best pathway: internal referral, CODI, DSWD, PNP, BSP/GSP, school, workplace, or court.",
      "Evidence gaps and legal risks are identified.",
      "Survivor is informed of options.",
    ],
  },
  {
    status: "Case Filed",
    title: "Case Filed",
    summary: "Formal complaint is lodged with the appropriate body.",
    details: [
      "Formal complaint is lodged with the appropriate body.",
      "This may be:",
      "school/workplace CODI,",
      "PNP Women and Children Protection Desk,",
      "DSWD,",
      "BSP/GSP mechanism,",
      "prosecutor or court,",
      "other proper institution.",
      "Filing details, receiving officer, date, and reference number are recorded.",
    ],
  },
  {
    status: "Investigation Ongoing",
    title: "Investigation Ongoing",
    summary: "The receiving institution is already acting on the complaint.",
    details: [
      "The receiving institution is already acting on the complaint.",
      "Statements, documents, and evidence may be gathered.",
      "SASHA monitors progress and checks for survivor safety and procedural fairness.",
    ],
  },
  {
    status: "Hearing Ongoing",
    title: "Hearing Ongoing",
    summary: "The case has reached formal hearing, conference, or adjudication stage.",
    details: [
      "The case has reached formal hearing, conference, or adjudication stage.",
      "This may occur in a CODI process, administrative inquiry, or court proceeding.",
      "SASHA monitors schedule changes, attendance needs, and survivor support requirements.",
    ],
  },
  {
    status: "Dismissed",
    title: "Dismissed",
    summary: "The case is closed by the receiving body without liability or without proceeding further.",
    details: [
      "The case is closed by the receiving body without liability or without proceeding further.",
      "Reasons may include lack of jurisdiction, insufficient evidence, withdrawal, procedural defects, or failure to prosecute.",
      "SASHA should document the reason and assess whether any other remedy remains available.",
    ],
  },
  {
    status: "Perpetrator Convicted",
    title: "Perpetrator Convicted",
    summary: "Final decision establishes liability in the relevant forum.",
    details: [
      "Final decision establishes liability in the relevant forum.",
      "Conviction may be criminal, while some processes may instead produce an administrative finding of guilt.",
      "SASHA records outcome, sanctions, and any continuing survivor support needs.",
    ],
  },
];

export const PROCESS_MONITORING_SECTIONS = [
  {
    title: "Cases endorsed to DSWD",
    items: [
      "record date of endorsement,",
      "receiving office/person,",
      "referral reference number if any,",
      "next scheduled follow-up,",
      "whether survivor/family was contacted,",
      "whether services were actually provided.",
    ],
  },
  {
    title: "Cases endorsed to PNP Women’s Desk",
    items: [
      "station and desk details,",
      "blotter/reference number,",
      "assigned investigator,",
      "whether sworn statements were taken,",
      "whether medico-legal or evidence preservation was advised,",
      "whether case was forwarded to prosecutor.",
    ],
  },
  {
    title: "Cases endorsed to BSP/GSP",
    items: [
      "chapter/council/unit involved,",
      "receiving official,",
      "whether fact-finding started,",
      "interim safety measures,",
      "sanctions or inaction,",
      "closure report.",
    ],
  },
  {
    title: "Cases endorsed to workplace/school/entities CODI*",
    items: [
      "confirm complaint receipt,",
      "identify CODI focal person,",
      "track hearing/investigation schedule,",
      "request updates on status,",
      "check if anti-retaliation and confidentiality measures are observed,",
      "record final administrative decision.",
    ],
  },
  {
    title: "Cases filed in Court, (this is done with lawyer’s help)",
    items: [
      "case number and court branch,",
      "filing date,",
      "prosecutor/counsel details,",
      "hearing dates,",
      "postponements,",
      "witness preparation needs,",
      "final judgment or resolution.",
    ],
  },
];

export const STATUS_GUIDE_GLOSSARY = [
  {
    term: "DSWD",
    definition: "Department of Social Welfare and Development",
  },
  {
    term: "PNP Women's Desk",
    definition: "Philippine National Police Women and Children Protection Desk",
  },
  {
    term: "BSP/GSP",
    definition: "Boy Scouts of the Philippines / Girl Scouts of the Philippines",
  },
  {
    term: "CODI",
    definition: "Committee on Decorum and Investigation (school/workplace)",
  },
];
