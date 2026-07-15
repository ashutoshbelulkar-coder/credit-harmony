import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";

export default function ApprovalPoliciesPage() {
  useProductMgmtStore();
  const policies = productMgmtStore.getPolicies();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl pb-6">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Approval Policies" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">Approval policies</h1>
        <p className="mt-0.5 text-caption text-muted-foreground">
          RBAC-resolved policy patterns (read-only demo). Changing policies would be audited in
          production; no code change required per BRD FR-009.
        </p>
      </div>

      <div className="space-y-4">
        {policies.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {p.name}
                <Badge variant="outline" className="text-[10px] capitalize">
                  {p.pattern}
                </Badge>
                {p.separationOfDuties && (
                  <Badge variant="secondary" className="text-[10px]">
                    SoD
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-caption space-y-2 text-muted-foreground">
              <p className="text-foreground">{p.description}</p>
              <p>
                <span className="font-medium text-foreground">Trigger:</span> {p.trigger}
              </p>
              <p>
                <span className="font-medium text-foreground">Approver roles:</span>{" "}
                {p.roles.join(" → ")}
              </p>
              <p className="font-mono text-[10px]">{p.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
