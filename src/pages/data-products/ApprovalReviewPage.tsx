import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  productMgmtStore,
  useProductMgmtStore,
} from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { catalogLabelForPacketId } from "@/data/data-products-mock";
import { toast } from "sonner";

export default function ApprovalReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const found = submissionId ? productMgmtStore.getSubmission(submissionId) : null;
  const [comment, setComment] = useState("");
  const [actor, setActor] = useState("Ananya Iyer");

  if (!found) {
    return (
      <div className="py-20 text-center text-muted-foreground">Submission not found.</div>
    );
  }

  const { version, cycle } = found;
  const prior = version.parentVersionId
    ? productMgmtStore.getVersion(version.parentVersionId)
    : null;

  const decide = (decision: "approve" | "reject") => {
    if (actor.trim() === cycle.submittedBy) {
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
      actor: actor.trim(),
      role: "Product Head",
    });
    if (!res.ok) {
      toast.error("Decision failed");
      return;
    }
    toast.success(
      decision === "approve"
        ? "Approved — version is immutable Approved"
        : "Rejected — returned to Draft"
    );
    navigate(`/data-products/products/${version.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Approval Queue", href: "/data-products/approvals" },
          { label: `Review ${version.name}` },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">{version.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <ProductStatusBadge status={version.status} />
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/data-products/products/${version.id}`}>Open product</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Definition</CardTitle>
          </CardHeader>
          <CardContent className="text-caption space-y-1">
            <p className="text-muted-foreground">{version.description}</p>
            <ul className="list-disc pl-4 text-foreground">
              {version.packetIds.map((pid) => (
                <li key={pid}>{catalogLabelForPacketId(pid) ?? pid}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Justification</CardTitle>
          </CardHeader>
          <CardContent className="text-caption space-y-2">
            <p>
              <span className="text-muted-foreground">Submitted by:</span> {cycle.submittedBy}
            </p>
            <p className="text-foreground">{cycle.justification}</p>
            {cycle.exceptionRequested && (
              <p className="text-warning">
                Exception requested: {cycle.exceptionJustification || "—"}
              </p>
            )}
            {prior && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={`/data-products/products/${version.id}/versions/compare?a=${prior.id}&b=${version.id}`}
                >
                  Compare with previous version
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

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
              <Label>Acting as (approver)</Label>
              <Input value={actor} onChange={(e) => setActor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Comment</Label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Required on reject; optional on approve"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => decide("approve")}>Approve</Button>
              <Button variant="destructive" onClick={() => decide("reject")}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
