import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";

export default function ApprovalQueuePage() {
  const navigate = useNavigate();
  useProductMgmtStore();
  const items = productMgmtStore.getPendingSubmissions();
  const policies = productMgmtStore.getPolicies();

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Approval Queue" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">Approval Queue</h1>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Pending product and version approvals (demo). Separation of duties: submitter cannot
          self-approve.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full min-w-max">
          <thead className="bg-muted/80">
            <tr className="border-b border-border">
              {["Product", "Version", "Policy", "Submitted", "Status", ""].map((h) => (
                <th
                  key={h || "a"}
                  className={cn(tableHeaderClasses, "px-4 py-3 text-left", h === "" && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-caption text-muted-foreground">
                  No pending approvals. Submit a draft from Product Configurator to populate this
                  queue.
                </td>
              </tr>
            ) : (
              items.map(({ version, cycle }) => {
                const policy = policies.find((p) => p.id === cycle.policyId);
                return (
                  <tr key={cycle.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-body text-foreground">{version.name}</div>
                      <div className="text-caption text-muted-foreground">{version.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-caption">v{version.version}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {policy?.pattern ?? cycle.policyId}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">
                      {new Date(cycle.submittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      <div>by {cycle.submittedBy}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={version.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/data-products/approvals/${cycle.id}`)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
