import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";
import { isAccessRequestCycle } from "@/data/product-management-types";
import { ApprovalTypeBadge, PolicyChip } from "@/components/data-products/ApprovalBadges";

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
          { label: "My approvals" },
        ]}
      />

      <div>
        <h1 className="text-h2 font-semibold text-foreground">My approvals</h1>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Pending version approvals and access requests routed to you. Separation of duties: the
          submitter cannot self-approve.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <EmptyState
            icon={ClipboardCheck}
            title="No pending approvals"
            description="Submit a draft for approval from the Product Configurator, or request access to a product, to populate this queue."
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full min-w-max">
            <thead className="bg-muted/80">
              <tr className="border-b border-border">
                {["Product", "Version", "Submitter", "Submitted", "Type", "Policy", ""].map((h) => (
                  <th
                    key={h || "action"}
                    className={cn(tableHeaderClasses, "px-4 py-3 text-left", h === "" && "text-right")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(({ version, cycle, subscription }) => {
                const policy = policies.find((p) => p.id === cycle.policyId);
                const accessRequest = isAccessRequestCycle(cycle, subscription);
                return (
                  <tr key={cycle.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-body text-foreground">{version.name}</div>
                      <div className="text-caption text-muted-foreground">
                        {version.productCode}
                        {subscription ? ` · ${subscription.institutionName}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-caption">v{version.version}</td>
                    <td className="px-4 py-3 text-caption text-foreground">{cycle.submittedBy}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">
                      {new Date(cycle.submittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalTypeBadge isAccessRequest={accessRequest} />
                    </td>
                    <td className="px-4 py-3">
                      <PolicyChip policy={policy} policyId={cycle.policyId} />
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
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
