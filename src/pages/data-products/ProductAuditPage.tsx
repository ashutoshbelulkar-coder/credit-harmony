import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { productMgmtStore, useProductMgmtStore } from "@/lib/product-management-demo-store";
import { Download } from "lucide-react";

export default function ProductAuditPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useProductMgmtStore();
  const productCodeFilter = params.get("productCode") ?? "";
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const events = productMgmtStore.getAuditEvents(
    productCodeFilter ? { productCode: productCodeFilter } : undefined
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        e.summary.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.productCode.toLowerCase().includes(q);
      const matchA = action === "all" || e.action === action;
      return matchQ && matchA;
    });
  }, [events, search, action]);

  const exportCsv = () => {
    const header = "at,actor,action,productCode,version,summary,justification\n";
    const rows = filtered
      .map((e) =>
        [
          e.at,
          e.actor,
          e.action,
          e.productCode,
          e.version,
          `"${e.summary.replace(/"/g, '""')}"`,
          `"${(e.justification ?? "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-audit-demo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const actions = [...new Set(events.map((e) => e.action))];

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Audit Trail" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Audit trail</h1>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Immutable demo event log across the product lifecycle
            {productCodeFilter ? ` · filtered to ${productCodeFilter}` : ""}.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search actor, summary, code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full min-w-max">
          <thead className="bg-muted/80">
            <tr className="border-b border-border">
              {["When", "Actor", "Action", "Product", "Summary", ""].map((h) => (
                <th
                  key={h || "x"}
                  className={cn(tableHeaderClasses, "px-4 py-3 text-left", !h && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-caption text-muted-foreground">
                  No audit events match.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-caption text-muted-foreground whitespace-nowrap">
                    {new Date(e.at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-caption">{e.actor}</td>
                  <td className="px-4 py-3 text-caption font-mono">{e.action}</td>
                  <td className="px-4 py-3 text-caption">
                    {e.productCode} v{e.version}
                  </td>
                  <td className="px-4 py-3 text-caption text-muted-foreground max-w-xs">
                    {e.summary}
                    {e.justification ? (
                      <span className="block text-muted-foreground/80">“{e.justification}”</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/data-products/products/${e.versionId}`)}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
