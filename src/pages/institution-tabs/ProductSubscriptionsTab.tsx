import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { getProductSubscriptions } from "@/data/institution-extensions-mock";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  institutionId: string;
}

const statusClass: Record<string, string> = {
  active: "bg-success/15 text-success",
  trial: "bg-primary/15 text-primary",
  suspended: "bg-muted text-muted-foreground",
};

export default function ProductSubscriptionsTab({ institutionId }: Props) {
  const rows = useMemo(
    () => getProductSubscriptions(institutionId),
    [institutionId]
  );

  return (
    <div className="space-y-4">
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <p className="text-caption text-muted-foreground py-6 text-center">
            No product subscriptions for this institution.
          </p>
        ) : (
          rows.map((r) => (
            <Card key={r.productId}>
              <CardContent className="pt-4 space-y-1">
                <p className="text-body font-medium text-foreground">
                  {r.productName}
                </p>
                <p className="text-caption text-muted-foreground">
                  Plan: {r.plan}
                </p>
                <p className="text-caption text-muted-foreground">
                  Usage: {r.usage}
                </p>
                <span
                  className={cn(
                    "inline-flex mt-1 px-2 py-0.5 rounded-full capitalize",
                    badgeTextClasses,
                    statusClass[r.status] ?? statusClass.active
                  )}
                >
                  {r.status}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Product name
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Plan
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Usage
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-caption text-muted-foreground"
                  >
                    No product subscriptions for this institution.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.productId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-body text-foreground">
                      {r.productName}
                    </td>
                    <td className="px-4 py-3 text-body text-muted-foreground">
                      {r.plan}
                    </td>
                    <td className="px-4 py-3 text-body text-muted-foreground">
                      {r.usage}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full capitalize",
                          badgeTextClasses,
                          statusClass[r.status] ?? statusClass.active
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
