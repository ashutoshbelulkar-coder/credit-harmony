import { SensitivityBadge } from "@/components/data-products/AttributeBadges";
import {
  CROSS_ASSET_PACKET_ID,
  SUBJECT_PACKET_ID,
  getDictionaryAttribute,
  getDictionaryPacket,
} from "@/data/attribute-dictionary";
import {
  includedAttributeIds,
  summarizeContract,
  type ContractSelection,
} from "@/lib/product-contract";

const SCOPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Individual",
  COMPANY: "Company",
  BOTH: "Both",
};

export function ContractReviewCard({
  selection,
  fingerprint,
}: {
  selection: ContractSelection;
  fingerprint: string;
}) {
  const summary = summarizeContract(selection);
  const included = includedAttributeIds(selection);

  return (
    <div className="rounded-lg border border-border/80 p-4 space-y-3">
      <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
        Contract
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
        <div>
          <dt className="text-muted-foreground">Subject scope</dt>
          <dd className="text-foreground">{SCOPE_LABEL[selection.subjectScope] ?? selection.subjectScope}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dictionary</dt>
          <dd className="text-foreground">{selection.dictionaryVersion}</dd>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2">
          <dt className="text-muted-foreground">Sensitivity</dt>
          <dd className="flex items-center gap-2">
            <SensitivityBadge value={summary.sensitivity} />
            <span className="text-muted-foreground">{summary.sensitivityReason}</span>
          </dd>
        </div>
      </dl>
      <ul className="space-y-1.5">
        {selection.packetIds.map((pid) => {
          const packet = getDictionaryPacket(pid);
          const attrs = included
            .map((id) => getDictionaryAttribute(id))
            .filter((a) => a?.packetId === pid);
          const streams = selection.eventStreamToggles[pid] ?? [];
          const sensitive = attrs.filter(
            (a) => a?.sensitivity === "Sensitive-PII" || a?.specialCategory
          );
          return (
            <li key={pid} className="rounded-md border border-border/70">
              <details open={pid === SUBJECT_PACKET_ID}>
                <summary className="cursor-pointer px-3 py-2 text-caption">
                  <span className="font-medium text-foreground">
                    {packet?.label ?? pid}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {attrs.length} attributes
                    {streams.length > 0 ? ` · ${streams.length} event stream(s)` : ""}
                    {sensitive.length > 0 ? ` · ${sensitive.length} Sensitive-PII` : ""}
                  </span>
                  {pid === SUBJECT_PACKET_ID && (
                    <span className="text-muted-foreground">
                      {" "}
                      · key {summary.reconciliation.met ? "✔" : "✖"}{" "}
                      {summary.reconciliation.met ? summary.reconciliation.summary : ""}
                    </span>
                  )}
                </summary>
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                  {attrs.map((a) =>
                    a ? (
                      <span
                        key={a.id}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {a.label}
                        {pid === CROSS_ASSET_PACKET_ID && a.basedOn?.length
                          ? ` · based on ${a.basedOn.join(", ")}`
                          : ""}
                      </span>
                    ) : null
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="text-caption text-muted-foreground">
        Fingerprint{" "}
        <span className="font-mono text-foreground">{fingerprint}</span>
      </p>
    </div>
  );
}
