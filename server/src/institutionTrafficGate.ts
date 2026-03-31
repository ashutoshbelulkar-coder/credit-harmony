/**
 * Member institutions must be **active** before they may use Data Submission API,
 * batch ingestion, or Enquiry API. Target error codes align with
 * `docs/technical/Global-API-Error-Dictionary.md`.
 */

export type InstitutionRow = {
  id?: number;
  institutionLifecycleStatus?: string;
  isDeleted?: boolean;
};

function send(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  statusCode: number,
  error: string,
  message: string
): void {
  reply.code(statusCode).send({ error, message });
}

/**
 * @returns `true` if the institution may receive traffic; `false` if a 403 was already sent.
 */
export function institutionActiveForTrafficOrError(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  inst: InstitutionRow | null | undefined
): boolean {
  if (!inst || inst.isDeleted) {
    send(
      reply,
      403,
      "ERR_INSTITUTION_NOT_FOUND",
      "Member institution could not be resolved for this request. Data Submission, batch, and Enquiry APIs require a valid member."
    );
    return false;
  }
  const s = String(inst.institutionLifecycleStatus ?? "").toLowerCase().replace(/\s+/g, "_");
  if (s === "active") return true;
  if (s === "suspended") {
    send(
      reply,
      403,
      "ERR_INSTITUTION_SUSPENDED",
      "This member institution is suspended. Data Submission API, batch ingestion, and Enquiry API calls are blocked until an operator reactivates the institution."
    );
    return false;
  }
  if (s === "pending" || s === "approval_pending") {
    send(
      reply,
      403,
      "ERR_INSTITUTION_PENDING_APPROVAL",
      "This member institution is pending approval. Data Submission API, batch ingestion, and Enquiry API are available only after the institution is approved and active."
    );
    return false;
  }
  if (s === "draft") {
    send(
      reply,
      403,
      "ERR_INSTITUTION_DRAFT",
      "This member institution is in draft and is not active. Complete onboarding and approval before using Data Submission, batch, or Enquiry APIs."
    );
    return false;
  }
  send(
    reply,
    403,
    "ERR_INSTITUTION_NOT_ACTIVE",
    "This member institution is not active. Data Submission API, batch ingestion, and Enquiry API require institutionLifecycleStatus active."
  );
  return false;
}
