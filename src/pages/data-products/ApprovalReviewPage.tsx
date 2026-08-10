import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  productMgmtStore,
  useProductMgmtStore,
} from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { SensitivityBadge } from "@/components/data-products/AttributeBadges";
import { ApprovalTypeBadge, PolicyChip } from "@/components/data-products/ApprovalBadges";
import { VersionComparePanel } from "@/components/data-products/VersionComparePanel";
import { catalogLabelForPacketId, formatImpactOption } from "@/data/data-products-mock";
import { LOCAL_CPO_LABEL, isAccessRequestCycle } from "@/data/product-management-types";
import { toast } from "sonner";

const SCOPE_LABEL: Record<string, string> = {
  SELF: "Self Data",
  NETWORK: "Network Data",
  CONSORTIUM: "Consortium Data",
  VERTICAL: "Vertical Data",
};

const DEMO_APPROVERS = ["Ananya Iyer", "Rahul Verma", "Meera Nair", "Karan Bose"];

export default function ApprovalReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const found = submissionId ? productMgmtStore.getSubmission(submissionId) : null;

  const { version, cycle } = found ?? {};
  const subscription = submissionId
    ? productMgmtStore.getSubscriptionForCycle(submissionId)
    : undefined;
  const defaultActor =
    DEMO_APPROVERS.find((n) => n !== cycle?.submittedBy) ?? "Approver";

  const [comment, setComment] = useState("");
  const [actor, setActor] = useState(defaultActor);

  if (!found || !version || !cycle) {
    return (
      <div className="py-20 text-center text-muted-foreground">Submission not found.</div>
    );
  }

  const accessRequest = isAccessRequestCycle(cycle, subscription);
  const parent = version.parentVersionId
    ? productMgmtStore.getVersion(version.parentVersionId)
    : null;
  const policies = productMgmtStore.getPolicies();
  const policy = policies.find((p) => p.id === cycle.policyId);

  const trimmedActor = actor.trim();
  const sodBlocked = trimmedActor.length > 0 && trimmedActor === cycle.submittedBy;
  const canDecide = trimmedActor.length > 0 && !sodBlocked;
  const rejectDisabled = !canDecide || !comment.trim();

  const decide = (decision: "approve" | "reject") => {
    if (!canDecide) {
      toast.error("Separation of duties: submitter cannot act as approver");
      return;
    }
    if (decision === "reject" && !comment.trim()) {
      toast.error("Rejection requires a comment");
      return;
    }
    const res = productMgmtStore.decideSubmission(cycle.id, {
      decision,
      comment,
      actor: trimmedActor,
      role: policy?.roles[0] ?? "Product Head",
    });
    if (!res.ok) {
      toast.error("Decision failed");
      return;
    }
    if (accessRequest) {
      toast.success(
        decision === "approve"
          ? `Access approved — ${subscription?.institutionName ?? "institution"} can now use v${version.version}`
          : "Access request rejected"
      );
    } else {
      toast.success(
        decision === "approve"
          ? "Approved — version is immutable Approved"
          : "Rejected — returned to Draft"
      );
    }
    navigate(`/data-products/products/${version.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "My approvals", href: "/data-products/approvals" },
          { label: `Review ${version.name}` },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 font-semibold text-foreground">{version.name}</h1>
            <ApprovalTypeBadge isAccessRequest={accessRequest} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ProductStatusBadge status={version.status} />
            <span className="text-caption text-muted-foreground">
              {version.productCode} · v{version.version}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/data-products/products/${version.id}`}>Open product</Link>
        </Button>
      </div>

      {accessRequest && subscription && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Subscription request</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-caption sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Institution:</span>{" "}
              {subscription.institutionName}
            </p>
            <p>
              <span className="text-muted-foreground">Business domain:</span>{" "}
              {subscription.businessDomain}
            </p>
            <p>
              <span className="text-muted-foreground">Application:</span> {subscription.application}
            </p>
            <p>
              <span className="text-muted-foreground">Usage period:</span>{" "}
              {subscription.usagePeriodMonths} months
            </p>
            <p>
              <span className="text-muted-foreground">Billing ref:</span> {subscription.billingRef}
            </p>
            <p>
              <span className="text-muted-foreground">Pinned version:</span> v{version.version} (
              {version.status})
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Purpose:</span> {subscription.purpose}
            </p>
            {subscription.notes && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Notes:</span> {subscription.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Metadata summary</CardTitle>
          </CardHeader>
          <CardContent className="text-caption space-y-1.5">
            <p className="text-muted-foreground">{version.description}</p>
            <p>
              <span className="text-muted-foreground">Business unit:</span>{" "}
              {version.metadata.businessUnit}
            </p>
            <p>
              <span className="text-muted-foreground">SAP item code:</span>{" "}
              {version.metadata.sapItemCode || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Target segment:</span>{" "}
              {version.metadata.targetSegment}
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sensitivity:</span>{" "}
              <SensitivityBadge value={version.metadata.sensitivity} />
            </p>
            <p>
              <span className="text-muted-foreground">Release note:</span>{" "}
              {version.metadata.releaseNote || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Owner:</span> {LOCAL_CPO_LABEL}
            </p>
            {!accessRequest && (
              <ul className="list-disc pl-4 text-foreground pt-1">
                {version.packetIds.map((pid) => (
                  <li key={pid}>{catalogLabelForPacketId(pid) ?? pid}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Retrieval &amp; enquiry settings</CardTitle>
          </CardHeader>
          <CardContent className="text-caption space-y-1.5">
            <p>
              <span className="text-muted-foreground">Scope:</span>{" "}
              {SCOPE_LABEL[version.enquiryConfig.scope] ?? version.enquiryConfig.scope}
            </p>
            <p>
              <span className="text-muted-foreground">Soft:</span>{" "}
              {formatImpactOption(version.enquiryConfig.soft, "Soft").replace(/^Soft:\s*/, "")}
            </p>
            <p>
              <span className="text-muted-foreground">Hard:</span>{" "}
              {formatImpactOption(version.enquiryConfig.hard, "Hard").replace(/^Hard:\s*/, "")}
            </p>
            <p>
              <span className="text-muted-foreground">Trended data:</span>{" "}
              {version.trendedConfig.enabled
                ? `Enabled · up to ${version.trendedConfig.maxHistoryMonths} months`
                : "Disabled"}
            </p>
            <p>
              <span className="text-muted-foreground">Retro retrieval:</span>{" "}
              {version.retroConfig?.enabled
                ? `Enabled · up to ${version.retroConfig.maxHistoryMonths} months`
                : "Disabled"}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Approval policy:</span>
              <PolicyChip policy={policy} policyId={cycle.policyId} />
              {policy && <span className="text-muted-foreground">{policy.name}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Justification</CardTitle>
        </CardHeader>
        <CardContent className="text-caption space-y-2">
          <p>
            <span className="text-muted-foreground">Submitted by:</span> {cycle.submittedBy}
          </p>
          <p>
            <span className="text-muted-foreground">Submitted:</span>{" "}
            {new Date(cycle.submittedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="text-foreground">{cycle.justification}</p>
          {cycle.exceptionRequested && (
            <p className="text-warning">
              Exception requested: {cycle.exceptionJustification || "—"}
            </p>
          )}
          {sodBlocked ? (
            <p className="text-caption text-destructive">
              Submitter: {cycle.submittedBy} — you cannot decide on your own submission (separation
              of duties).
            </p>
          ) : (
            <p className="text-caption text-success">
              Submitter: {cycle.submittedBy} — you are eligible to decide
            </p>
          )}
          {policy?.pattern === "quorum" && cycle.status === "pending" && (
            <p className="text-caption text-muted-foreground italic">
              Quorum policy · {policy.roles.join(", ")} — this demo completes the cycle on the first
              decision recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {!accessRequest && parent ? (
        <div>
          <h2 className="text-body font-semibold text-foreground mb-3">Diff vs previous version</h2>
          <VersionComparePanel a={parent} b={version} hidePickers />
        </div>
      ) : !accessRequest ? (
        <p className="text-caption text-muted-foreground">
          Initial version — no prior version to compare against.
        </p>
      ) : null}

      {cycle.decisions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Prior decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-caption">
            {cycle.decisions.map((d) => (
              <div key={d.id} className="rounded-md border border-border px-3 py-2">
                <p className="font-medium capitalize">
                  {d.decision} — {d.actor} ({d.role})
                </p>
                <p className="text-muted-foreground">{d.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {cycle.status === "pending" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-caption">Acting as (approver)</Label>
              <Input value={actor} onChange={(e) => setActor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption">Comment</Label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Required on reject; optional on approve"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {sodBlocked ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button disabled>Approve</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Separation of duties: {cycle.submittedBy} cannot approve their own submission.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button onClick={() => decide("approve")}>Approve</Button>
              )}
              {sodBlocked ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button variant="destructive" disabled>
                        Reject
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Separation of duties: {cycle.submittedBy} cannot reject their own submission.
                  </TooltipContent>
                </Tooltip>
              ) : rejectDisabled ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button variant="destructive" disabled>
                        Reject
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Rejection requires a comment.</TooltipContent>
                </Tooltip>
              ) : (
                <Button variant="destructive" onClick={() => decide("reject")}>
                  Reject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
