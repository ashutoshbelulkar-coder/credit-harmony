/**
 * Canonical attribute dictionary for the Product Configurator contract UI.
 * Demo seed — not the dictionary-maintenance surface.
 */

export const DICTIONARY_VERSION = "v12";
export const SUBJECT_PACKET_ID = "subject";
export const CROSS_ASSET_PACKET_ID = "cross_asset_analytics";

export type SubjectScope = "INDIVIDUAL" | "COMPANY" | "BOTH";
export type AttributeSensitivity = "Standard" | "PII" | "Sensitive-PII";
export type AttributeStatus = "active" | "pending" | "deprecated";
export type AttributeDataType =
  | "string"
  | "long"
  | "decimal"
  | "boolean"
  | "date"
  | "timestamp"
  | "json"
  | "enum";
export type AttributeClass = "Business" | "Identifier" | "Edge" | "Feature" | "Observation";
export type PacketLane = "Subject" | "Assets" | "Analytics";

export interface DictionaryEventStream {
  id: string;
  label: string;
  description: string;
}

export interface DictionaryPacket {
  id: string;
  label: string;
  description: string;
  populatedBy: string[];
  subjectScopes: SubjectScope[];
  lane: PacketLane;
  eventStreams: DictionaryEventStream[];
  responseKey: string;
}

export interface DictionaryAttribute {
  id: string;
  packetId: string;
  eventStreamId?: string;
  qualifier: string;
  label: string;
  group: string;
  dataType: AttributeDataType;
  sensitivity: AttributeSensitivity;
  specialCategory: boolean;
  status: AttributeStatus;
  mode: "SNAPSHOT" | "TRENDED";
  sources: string[];
  class: AttributeClass;
  system?: boolean;
  derived?: boolean;
  basedOn?: string[];
  supersededBy?: string;
  definition: string;
}

function attr(
  packetId: string,
  qualifier: string,
  label: string,
  group: string,
  extra: Partial<DictionaryAttribute> & Pick<DictionaryAttribute, "dataType">
): DictionaryAttribute {
  const id = extra.id ?? `${packetId === "subject" ? "subject" : packetId === "cross_asset_analytics" ? "feature" : packetId}.${qualifier}`;
  return {
    id,
    packetId,
    qualifier,
    label,
    group,
    sensitivity: "Standard",
    specialCategory: false,
    status: "active",
    mode: "SNAPSHOT",
    sources: [],
    class: "Business",
    definition: label,
    ...extra,
  };
}

export const DICTIONARY_PACKETS: DictionaryPacket[] = [
  {
    id: SUBJECT_PACKET_ID,
    label: "Subject as reported",
    description: "Per-provider subject record as reported — not a merged golden profile.",
    populatedBy: ["CSDF", "AA", "BNPL"],
    subjectScopes: ["INDIVIDUAL", "COMPANY", "BOTH"],
    lane: "Subject",
    eventStreams: [],
    responseKey: "subjectAsReported",
  },
  {
    id: "credit_facility",
    label: "Credit facility",
    description: "Loans, BNPL and revolving facilities originated by contributing lenders.",
    populatedBy: ["CSDF"],
    subjectScopes: ["INDIVIDUAL", "COMPANY", "BOTH"],
    lane: "Assets",
    eventStreams: [
      {
        id: "repayment_history",
        label: "Repayment history",
        description: "Period-level repayment and DPD events for the facility.",
      },
    ],
    responseKey: "creditFacilities",
  },
  {
    id: "bank_account",
    label: "Bank account",
    description: "Deposit and current accounts with nested transaction streams.",
    populatedBy: ["AA", "CSDF"],
    subjectScopes: ["INDIVIDUAL", "COMPANY", "BOTH"],
    lane: "Assets",
    eventStreams: [
      {
        id: "transactions",
        label: "Transactions",
        description: "Posted credits and debits on the account.",
      },
    ],
    responseKey: "bankAccounts",
  },
  {
    id: "telco_profile",
    label: "Telco profile",
    description: "Mobile connection, billing and payment behaviour.",
    populatedBy: [],
    subjectScopes: ["INDIVIDUAL"],
    lane: "Assets",
    eventStreams: [],
    responseKey: "telcoProfiles",
  },
  {
    id: "identity_document",
    label: "Identity document",
    description: "KYC identity documents as submitted by a provider.",
    populatedBy: ["CSDF"],
    subjectScopes: ["INDIVIDUAL", "COMPANY", "BOTH"],
    lane: "Assets",
    eventStreams: [],
    responseKey: "identityDocuments",
  },
  {
    id: "gst_registration",
    label: "GST registration",
    description: "GSTIN registration, turnover and filing regularity for entities.",
    populatedBy: ["CSDF"],
    subjectScopes: ["COMPANY"],
    lane: "Assets",
    eventStreams: [
      {
        id: "filings",
        label: "Filings",
        description: "GST return filing events by period.",
      },
    ],
    responseKey: "gstRegistrations",
  },
  {
    id: CROSS_ASSET_PACKET_ID,
    label: "Cross-asset analytics",
    description: "Features computed across more than one asset type.",
    populatedBy: ["computed"],
    subjectScopes: ["INDIVIDUAL", "COMPANY", "BOTH"],
    lane: "Analytics",
    eventStreams: [],
    responseKey: "analytics",
  },
];

export const DICTIONARY_ATTRIBUTES: DictionaryAttribute[] = [
  // ── Subject as reported ─────────────────────────────────────
  attr("subject", "full_name", "Full name", "Name", {
    dataType: "string",
    sensitivity: "PII",
    sources: ["CSDF", "AA", "BNPL"],
    class: "Business",
    definition: "Full legal name as reported by the provider.",
  }),
  attr("subject", "first_name", "First name", "Name", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "Given name as reported.",
  }),
  attr("subject", "last_name", "Last name", "Name", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "Family name as reported.",
  }),
  attr("subject", "dob", "Date of birth", "Biographical", {
    dataType: "date",
    sensitivity: "PII",
    sources: ["CSDF", "AA", "BNPL"],
    definition: "Date of birth as reported by the provider.",
  }),
  attr("subject", "gender", "Gender", "Biographical", {
    dataType: "string",
    sensitivity: "PII",
    sources: ["CSDF"],
    definition: "Gender as reported.",
  }),
  attr("subject", "mobile", "Mobile", "Contact", {
    dataType: "string",
    sensitivity: "PII",
    sources: ["CSDF", "AA", "BNPL"],
    definition: "Primary mobile number as reported.",
  }),
  attr("subject", "email", "Email", "Contact", {
    dataType: "string",
    sensitivity: "PII",
    sources: ["CSDF", "AA"],
    definition: "Email address as reported.",
  }),
  attr("subject", "address_line", "Address line", "Address", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "Street address as reported.",
  }),
  attr("subject", "city", "City", "Address", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "City as reported.",
  }),
  attr("subject", "postal_code", "Postal code", "Address", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "Postal code as reported.",
  }),
  attr("subject", "country", "Country", "Address", {
    dataType: "string",
    sources: ["CSDF", "AA"],
    definition: "ISO country code as reported.",
  }),
  attr("subject", "pan", "PAN", "Identifiers", {
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF", "AA"],
    class: "Identifier",
    definition: "Permanent Account Number. Served tokenised.",
  }),
  attr("subject", "national_id", "National ID", "Identifiers", {
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF"],
    class: "Identifier",
    definition: "National identity number. Served tokenised.",
  }),
  attr("subject", "passport_no", "Passport number", "Identifiers", {
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF"],
    class: "Identifier",
    definition: "Passport number. Served tokenised.",
  }),
  attr("subject", "provider_id", "Provider", "Provider", {
    dataType: "string",
    sources: ["CSDF", "AA", "BNPL"],
    system: true,
    definition: "Institution that originated this subject record.",
  }),
  attr("subject", "reported_at", "Reported at", "Provider", {
    dataType: "timestamp",
    sources: ["CSDF", "AA", "BNPL"],
    system: true,
    definition: "When the provider last reported this subject record.",
  }),

  // ── Credit facility ─────────────────────────────────────────
  attr("credit_facility", "contract_type", "Contract type", "Account", {
    id: "credit.contract_type",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "Facility type (domain: ContractTypeDomain).",
  }),
  attr("credit_facility", "contract_status", "Contract status", "Account", {
    id: "credit.contract_status",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "Current status of the facility.",
  }),
  attr("credit_facility", "contract_role", "Contract role", "Account", {
    id: "credit.contract_role",
    dataType: "string",
    sources: ["CSDF"],
    definition: "Subject role on the facility (e.g. BORROWER).",
  }),
  attr("credit_facility", "financed_amount", "Financed amount", "Amounts", {
    id: "credit.financed_amount",
    dataType: "decimal",
    sources: ["CSDF"],
    definition: "Original financed amount.",
  }),
  attr("credit_facility", "outstanding_balance", "Outstanding balance", "Amounts", {
    id: "credit.outstanding_balance",
    dataType: "decimal",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Current outstanding principal.",
  }),
  attr("credit_facility", "overdue_payments_amount", "Overdue payments amount", "Amounts", {
    id: "credit.overdue_payments_amount",
    dataType: "decimal",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Amount currently overdue.",
  }),
  attr("credit_facility", "monthly_payment_amount", "Monthly payment amount", "Amounts", {
    id: "credit.monthly_payment_amount",
    dataType: "decimal",
    sources: ["CSDF"],
    definition: "Contractual instalment amount.",
  }),
  attr("credit_facility", "overdue_days", "Overdue days", "Counters", {
    id: "credit.overdue_days",
    dataType: "long",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Current days past due.",
  }),
  attr("credit_facility", "installments_number", "Installments number", "Counters", {
    id: "credit.installments_number",
    dataType: "long",
    sources: ["CSDF"],
    definition: "Number of contractual instalments.",
  }),
  attr("credit_facility", "contract_start_date", "Contract start date", "Dates", {
    id: "credit.contract_start_date",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Facility start date.",
  }),
  attr("credit_facility", "contract_end_actual_date", "Contract end actual date", "Dates", {
    id: "credit.contract_end_actual_date",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Actual close date when applicable.",
  }),
  attr("credit_facility", "last_payment_date", "Last payment date", "Dates", {
    id: "credit.last_payment_date",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Date of the most recent payment.",
  }),
  attr("credit_facility", "dpd_max", "Max DPD", "Derived", {
    id: "feature.dpd_max",
    dataType: "long",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    definition: "Maximum days past due computed from this packet.",
  }),
  attr("credit_facility", "account_number", "Account number", "Identifiers", {
    id: "credit.account_number",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF"],
    class: "Identifier",
    definition: "Facility account number. Served tokenised.",
  }),
  attr("credit_facility", "current_balance", "Current balance", "Amounts", {
    id: "credit.current_balance",
    dataType: "decimal",
    status: "deprecated",
    sources: [],
    supersededBy: "credit.outstanding_balance",
    definition: "Deprecated — superseded by outstanding_balance.",
  }),
  attr("credit_facility", "bureau_score", "Bureau score", "Derived", {
    id: "credit.bureau_score",
    dataType: "long",
    status: "pending",
    sources: [],
    class: "Feature",
    derived: true,
    definition: "Pending approval — not yet servable.",
  }),
  attr("credit_facility", "period", "Period", "Repayment history", {
    id: "credit.repayment_period",
    eventStreamId: "repayment_history",
    dataType: "string",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Repayment period (YYYY-MM).",
  }),
  attr("credit_facility", "amount_paid", "Amount paid", "Repayment history", {
    id: "credit.amount_paid",
    eventStreamId: "repayment_history",
    dataType: "decimal",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Amount paid in the period.",
  }),
  attr("credit_facility", "dpd", "DPD", "Repayment history", {
    id: "credit.repayment_dpd",
    eventStreamId: "repayment_history",
    dataType: "long",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Days past due at period end.",
  }),
  attr("credit_facility", "payment_status", "Payment status", "Repayment history", {
    id: "credit.repayment_payment_status",
    eventStreamId: "repayment_history",
    dataType: "enum",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Period payment status.",
  }),

  // ── Bank account ────────────────────────────────────────────
  attr("bank_account", "account_type", "Account type", "Account", {
    id: "bank.account_type",
    dataType: "enum",
    sources: ["AA", "CSDF"],
    definition: "Account type (e.g. SAVINGS).",
  }),
  attr("bank_account", "account_subtype", "Account subtype", "Account", {
    id: "bank.account_subtype",
    dataType: "string",
    sources: ["AA"],
    definition: "Account subtype.",
  }),
  attr("bank_account", "currency", "Currency", "Account", {
    id: "bank.currency",
    dataType: "string",
    sources: ["AA", "CSDF"],
    definition: "Account currency.",
  }),
  attr("bank_account", "current_balance", "Current balance", "Account", {
    id: "bank.current_balance",
    dataType: "decimal",
    mode: "TRENDED",
    sources: ["AA", "CSDF"],
    definition: "Latest available balance.",
  }),
  attr("bank_account", "drawing_limit", "Drawing limit", "Account", {
    id: "bank.drawing_limit",
    dataType: "decimal",
    sources: ["AA"],
    definition: "Overdraft or drawing limit.",
  }),
  attr("bank_account", "balance_datetime", "Balance datetime", "Dates", {
    id: "bank.balance_datetime",
    dataType: "timestamp",
    sources: ["AA"],
    definition: "Timestamp of the reported balance.",
  }),
  attr("bank_account", "account_number", "Account number", "Identifiers", {
    id: "bank.account_number",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["AA", "CSDF"],
    class: "Identifier",
    definition: "Bank account number. Served tokenised.",
  }),
  attr("bank_account", "ifsc", "IFSC", "Identifiers", {
    id: "bank.ifsc",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["AA"],
    class: "Identifier",
    definition: "IFSC code. Served tokenised.",
  }),
  attr("bank_account", "txn_date", "Transaction date", "Transactions", {
    id: "bank.txn_date",
    eventStreamId: "transactions",
    dataType: "date",
    mode: "TRENDED",
    sources: ["AA"],
    definition: "Posted transaction date.",
  }),
  attr("bank_account", "amount", "Amount", "Transactions", {
    id: "bank.txn_amount",
    eventStreamId: "transactions",
    dataType: "decimal",
    mode: "TRENDED",
    sources: ["AA"],
    definition: "Transaction amount.",
  }),
  attr("bank_account", "type", "Type", "Transactions", {
    id: "bank.txn_type",
    eventStreamId: "transactions",
    dataType: "enum",
    sources: ["AA"],
    definition: "CREDIT or DEBIT.",
  }),
  attr("bank_account", "narration", "Narration", "Transactions", {
    id: "bank.txn_narration",
    eventStreamId: "transactions",
    dataType: "string",
    sources: ["AA"],
    definition: "Bank narration text.",
  }),
  attr("bank_account", "balance_after", "Balance after", "Transactions", {
    id: "bank.balance_after",
    eventStreamId: "transactions",
    dataType: "decimal",
    sources: ["AA"],
    definition: "Running balance after the posting.",
  }),

  // ── Telco profile ──────────────────────────────────────────
  attr("telco_profile", "connection_type", "Connection type", "Line", {
    id: "telco.connection_type",
    dataType: "enum",
    definition: "Prepaid or postpaid.",
  }),
  attr("telco_profile", "plan_type", "Plan type", "Line", {
    id: "telco.plan_type",
    dataType: "string",
    definition: "Commercial plan type.",
  }),
  attr("telco_profile", "tenure_months", "Tenure months", "Line", {
    id: "telco.tenure_months",
    dataType: "long",
    definition: "Months on the current connection.",
  }),
  attr("telco_profile", "bill_amount", "Bill amount", "Line", {
    id: "telco.bill_amount",
    dataType: "decimal",
    mode: "TRENDED",
    definition: "Latest billed amount.",
  }),
  attr("telco_profile", "payment_status", "Payment status", "Line", {
    id: "telco.payment_status",
    dataType: "enum",
    definition: "Latest bill payment status.",
  }),
  attr("telco_profile", "days_past_due", "Days past due", "Line", {
    id: "telco.days_past_due",
    dataType: "long",
    mode: "TRENDED",
    definition: "Current bill days past due.",
  }),
  attr("telco_profile", "identity_trust", "Identity trust", "Derived", {
    id: "feature.identity_trust",
    dataType: "decimal",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    definition: "Identity-trust feature computed from this packet.",
  }),
  attr("telco_profile", "score", "Score", "Derived", {
    id: "feature.telco_score",
    dataType: "long",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    definition: "Telco behavioural score computed from this packet.",
  }),

  // ── Identity document ────────────────────────────────────────
  attr("identity_document", "document_type", "Document type", "Document", {
    id: "identity.document_type",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "Type of identity document.",
  }),
  attr("identity_document", "issue_date", "Issue date", "Document", {
    id: "identity.issue_date",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Document issue date.",
  }),
  attr("identity_document", "expiry_date", "Expiry date", "Document", {
    id: "identity.expiry_date",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Document expiry date.",
  }),
  attr("identity_document", "issuing_authority", "Issuing authority", "Document", {
    id: "identity.issuing_authority",
    dataType: "string",
    sources: ["CSDF"],
    definition: "Authority that issued the document.",
  }),
  attr("identity_document", "document_number", "Document number", "Identifiers", {
    id: "identity.document_number",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF"],
    class: "Identifier",
    definition: "Document number. Served tokenised.",
  }),
  attr("identity_document", "photo_ref", "Photo reference", "Identifiers", {
    id: "identity.photo_ref",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    specialCategory: true,
    sources: ["CSDF"],
    class: "Identifier",
    definition: "Biometric / photo reference. Special category.",
  }),

  // ── GST registration ──────────────────────────────────────
  attr("gst_registration", "gstin", "GSTIN", "Identifiers", {
    id: "gst.gstin",
    dataType: "string",
    sensitivity: "Sensitive-PII",
    sources: ["CSDF"],
    class: "Identifier",
    definition: "GST identification number. Served tokenised.",
  }),
  attr("gst_registration", "legal_name", "Legal name", "Registration", {
    id: "gst.legal_name",
    dataType: "string",
    sensitivity: "PII",
    sources: ["CSDF"],
    definition: "Registered legal name.",
  }),
  attr("gst_registration", "trade_name", "Trade name", "Registration", {
    id: "gst.trade_name",
    dataType: "string",
    sources: ["CSDF"],
    definition: "Trading name.",
  }),
  attr("gst_registration", "registration_status", "Registration status", "Registration", {
    id: "gst.registration_status",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "GST registration status.",
  }),
  attr("gst_registration", "turnover_band", "Turnover band", "Registration", {
    id: "gst.turnover_band",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "Reported turnover band.",
  }),
  attr("gst_registration", "filing_regularity", "Filing regularity", "Derived", {
    id: "feature.gst_filing_regularity",
    dataType: "decimal",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    definition: "Filing regularity feature computed from this packet.",
  }),
  attr("gst_registration", "period", "Period", "Filings", {
    id: "gst.filing_period",
    eventStreamId: "filings",
    dataType: "string",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "GST return period.",
  }),
  attr("gst_registration", "return_type", "Return type", "Filings", {
    id: "gst.return_type",
    eventStreamId: "filings",
    dataType: "enum",
    sources: ["CSDF"],
    definition: "GST return type.",
  }),
  attr("gst_registration", "filing_date", "Filing date", "Filings", {
    id: "gst.filing_date",
    eventStreamId: "filings",
    dataType: "date",
    sources: ["CSDF"],
    definition: "Date the return was filed.",
  }),
  attr("gst_registration", "delay_days", "Delay days", "Filings", {
    id: "gst.delay_days",
    eventStreamId: "filings",
    dataType: "long",
    mode: "TRENDED",
    sources: ["CSDF"],
    definition: "Days late relative to due date.",
  }),

  // ── Cross-asset analytics ────────────────────────────────────
  attr("cross_asset_analytics", "risk_tier", "Risk tier", "Features", {
    id: "feature.risk_tier",
    dataType: "string",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    basedOn: ["credit_facility", "bank_account", "telco_profile"],
    definition: "Cross-asset risk tier.",
  }),
  attr("cross_asset_analytics", "income_band", "Income band", "Features", {
    id: "feature.income_band",
    dataType: "string",
    status: "pending",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    basedOn: ["bank_account", "credit_facility"],
    definition: "Pending approval — not yet servable.",
  }),
  attr("cross_asset_analytics", "segment", "Segment", "Features", {
    id: "feature.segment",
    dataType: "string",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    basedOn: ["credit_facility", "bank_account"],
    definition: "Cross-asset customer segment.",
  }),
  attr("cross_asset_analytics", "age_band", "Age band", "Features", {
    id: "feature.age_band",
    dataType: "string",
    sources: ["computed"],
    class: "Feature",
    derived: true,
    basedOn: ["subject"],
    definition: "Age band derived from subject date of birth.",
  }),
];

const PACKET_BY_ID = new Map(DICTIONARY_PACKETS.map((p) => [p.id, p]));
const ATTR_BY_ID = new Map(DICTIONARY_ATTRIBUTES.map((a) => [a.id, a]));

export function getDictionaryPacket(id: string): DictionaryPacket | undefined {
  return PACKET_BY_ID.get(id);
}

export function getDictionaryAttribute(id: string): DictionaryAttribute | undefined {
  return ATTR_BY_ID.get(id);
}

export function attributesForPacket(packetId: string): DictionaryAttribute[] {
  return DICTIONARY_ATTRIBUTES.filter((a) => a.packetId === packetId);
}

export function dictionaryPacketLabel(packetId: string): string | undefined {
  return PACKET_BY_ID.get(packetId)?.label;
}

export function packetAppliesToScope(packet: DictionaryPacket, scope: SubjectScope): boolean {
  if (scope === "BOTH") return true;
  return packet.subjectScopes.includes(scope) || packet.subjectScopes.includes("BOTH");
}

export function packetScopeTag(packet: DictionaryPacket): "Ind" | "Co" | null {
  const hasInd = packet.subjectScopes.includes("INDIVIDUAL") || packet.subjectScopes.includes("BOTH");
  const hasCo = packet.subjectScopes.includes("COMPANY") || packet.subjectScopes.includes("BOTH");
  if (hasInd && hasCo) return null;
  if (hasInd) return "Ind";
  if (hasCo) return "Co";
  return null;
}

export function toCamelResponseKey(qualifier: string): string {
  return qualifier.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
