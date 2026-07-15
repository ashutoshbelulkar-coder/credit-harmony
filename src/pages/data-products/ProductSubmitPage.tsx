import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productMgmtStore,
  useProductMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import { toast } from "sonner";

export default function ProductSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useProductMgmtStore();
  const product = useProductMgmtVersion(id);
  const policies = productMgmtStore.getPolicies();

  const [justification, setJustification] = useState("");
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "POL_SINGLE");
  const [exceptionRequested, setExceptionRequested] = useState(false);
  const [exceptionJustification, setExceptionJustification] = useState("");

  if (!product) {
    return (
      <div className="py-20 text-center text-muted-foreground">Product not found.</div>
    );
  }

  if (product.status !== "draft") {
    return (
      <div className="space-y-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-muted-foreground">Only drafts can be submitted for approval.</p>
        <Button onClick={() => navigate(`/data-products/products/${product.id}`)}>
          Back to product
        </Button>
      </div>
    );
  }

  const fpConflict = productMgmtStore.findFingerprintConflict(
    product.definitionFingerprint,
    product.id,
    product.productCode
  );

  const submit = () => {
    if (!justification.trim()) {
      toast.error("Business justification is required");
      return;
    }
    const res = productMgmtStore.submitForApproval(product.id, {
      justification: justification.trim(),
      policyId,
      exceptionRequested: exceptionRequested || undefined,
      exceptionJustification: exceptionJustification.trim() || undefined,
    });
    if (!res.ok) {
      if (res.error === "name_conflict" && res.conflict) {
        toast.error(`Name conflicts with ${res.conflict.name}`, {
          action: {
            label: "Open",
            onClick: () => navigate(`/data-products/products/${res.conflict!.id}`),
          },
        });
      } else if (res.error === "fingerprint_conflict" && res.conflict) {
        toast.error(
          `Identical definition to ${res.conflict.name} v${res.conflict.version}. Request an exception or reuse that product.`
        );
        setExceptionRequested(true);
      } else toast.error("Submit failed");
      return;
    }
    toast.success("Submitted for approval");
    navigate(`/data-products/approvals/${res.cycle.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: product.name, href: `/data-products/products/${product.id}` },
          { label: "Submit for approval" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">Submit for approval</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Locks this draft and places an approval package in the queue.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            Package summary
            <ProductStatusBadge status={product.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-caption">
          <p>
            <span className="text-muted-foreground">Product:</span> {product.name} v
            {product.version}
          </p>
          <p>
            <span className="text-muted-foreground">Packets:</span> {product.packetIds.length}
          </p>
          <p className="font-mono">
            <span className="text-muted-foreground font-sans">Fingerprint:</span>{" "}
            {product.definitionFingerprint}
          </p>
          <p>
            <span className="text-muted-foreground">Owner:</span> {product.metadata.owner}
          </p>
          <Link
            className="text-primary hover:underline"
            to="/data-products/enquiry-simulation"
          >
            Optional: attach enquiry simulation evidence →
          </Link>
        </CardContent>
      </Card>

      {fpConflict && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-caption space-y-2">
          <p className="text-foreground font-medium">Duplicate definition detected</p>
          <p className="text-muted-foreground">
            Matches {fpConflict.name} v{fpConflict.version} ({fpConflict.productCode}). Reuse that
            product, or request a governed exception.
          </p>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={exceptionRequested}
              onCheckedChange={(c) => setExceptionRequested(!!c)}
            />
            Request exception (visible to approvers)
          </label>
          {exceptionRequested && (
            <Textarea
              placeholder="Exception justification…"
              value={exceptionJustification}
              onChange={(e) => setExceptionJustification(e.target.value)}
              rows={2}
            />
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Approval policy</Label>
            <Select value={policyId} onValueChange={setPolicyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.pattern})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Business justification</Label>
            <Textarea
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why should this version be approved?"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={submit}>Submit</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
