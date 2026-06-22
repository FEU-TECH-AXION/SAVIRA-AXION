export const WITHDRAWAL_ACTION = Object.freeze({
  ALLOW: "ALLOW",
  REQUIRE_APPROVAL: "REQUIRE_APPROVAL",
  BLOCK: "BLOCK",
});

const ALLOWED_STATUSES = new Set([
  "For Verification",
  "Undergoing Review",
  "Verified - True",
  "Under Case Evaluation",
]);

const APPROVAL_STATUSES = new Set([
  "Case Filed",
  "Investigation Ongoing",
]);

export function getWithdrawalActionType(status) {
  if (ALLOWED_STATUSES.has(status)) return WITHDRAWAL_ACTION.ALLOW;
  if (APPROVAL_STATUSES.has(status)) return WITHDRAWAL_ACTION.REQUIRE_APPROVAL;
  return WITHDRAWAL_ACTION.BLOCK;
}

export function getWithdrawalCopy(status) {
  const actionType = getWithdrawalActionType(status);
  if (status === "Verified - True") {
    return {
      actionType,
      buttonLabel: "Withdraw",
      title: "Withdraw Validated Case",
      description:
        "This case has already been verified as valid. Withdrawing it will archive the validated record and cannot be undone.",
      requiresAffidavit: false,
    };
  }
  if (status === "Case Filed") {
    return {
      actionType,
      buttonLabel: "Request Withdrawal",
      title: "Request Case Withdrawal",
      description:
        "This case has already been filed. Your request requires approval and an Affidavit of Desistance or equivalent official document.",
      requiresAffidavit: true,
    };
  }
  if (status === "Investigation Ongoing") {
    return {
      actionType,
      buttonLabel: "Request Withdrawal",
      title: "Request Case Withdrawal",
      description:
        "An investigation is active. Explain why you are requesting withdrawal; an administrator or case officer must approve it.",
      requiresAffidavit: false,
    };
  }
  return {
    actionType,
    buttonLabel: "Withdraw",
    title: "Withdraw Case Report",
    description:
      "This will archive the case and stop its current progress. The withdrawal is permanent and remains in the audit record.",
    requiresAffidavit: false,
  };
}
