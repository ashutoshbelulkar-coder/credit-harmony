import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { EnquiryFilters, type EnquiryChromeState } from "./EnquiryChrome";
import {
  formatCompact,
  formatPct1,
  type EnquiryMember,
  type EnquiryProductRow,
} from "./enquiryScaleMock";

export function EnquiryProducts({
  rows,
  catalog,
  chrome,
  onChromeChange,
  onSelectProduct,
}: {
  rows: EnquiryProductRow[];
  catalog: EnquiryMember[];
  chrome: EnquiryChromeState;
  onChromeChange: (partial: Partial<EnquiryChromeState>) => void;
  onSelectProduct: (productId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <EnquiryFilters catalog={catalog} state={chrome} onChange={onChromeChange} />
      <p className="text-caption text-muted-foreground">
        Product enquiries exceed enquiries because one enquiry can request up to 10 products.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95">
              <tr className="border-b border-border">
                <th className={cn("whitespace-nowrap px-4 py-3 text-left", tableHeaderClasses)}>Product</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Enquiries</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Served %</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>NO_DATA %</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Failed %</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>P95 ms</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-right", tableHeaderClasses)}>Members</th>
                <th className={cn("whitespace-nowrap px-4 py-3 text-left", tableHeaderClasses)}>Top failure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-caption text-muted-foreground">
                    No traffic in the selected scope
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.productId} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        className="text-left text-caption font-medium text-foreground hover:underline"
                        onClick={() => onSelectProduct(r.productId)}
                      >
                        {r.productId} — {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">
                      {formatCompact(r.productEnquiries)}
                    </td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{formatPct1(r.servedPct)}</td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{formatPct1(r.noDataPct)}</td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{formatPct1(r.failedPct)}</td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{r.p95Retrieval}</td>
                    <td className="px-4 py-3 text-right text-caption tabular-nums">{r.membersUsing}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-caption">{r.topFailure}</td>
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
