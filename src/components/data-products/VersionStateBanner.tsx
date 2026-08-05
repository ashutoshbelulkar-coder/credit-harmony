import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { DemoProductVersion, Subscription } from "@/data/product-management-types";
import { latestActiveVersion } from "@/components/data-products/lifecycle-menu";
import { cn } from "@/lib/utils";

function windDownDays(version: DemoProductVersion): number | null {
  if (!version.deprecationNoticeAt || !version.deprecationWindowDays) return null;
  const noticeAt = new Date(version.deprecationNoticeAt).getTime();
  const deadline = noticeAt + version.deprecationWindowDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
}

function notMigratedCount(version: DemoProductVersion, subscriptions: Subscription[]): number {
  return subscriptions.filter(
    (s) => s.pinnedVersionId === version.id && s.status === "active"
  ).length;
}

/**
 * Banner under the title row when the selected version is not the latest Active.
 * Informational only — at most one link; actions live in Manage.
 */
export function VersionStateBanner({
  product,
  siblings,
  subscriptions,
}: {
  product: DemoProductVersion;
  siblings: DemoProductVersion[];
  subscriptions: Subscription[];
}) {
  const latestActive = latestActiveVersion(siblings);
  const isLatestActive = !!latestActive && product.id === latestActive.id;

  if (isLatestActive) return null;

  // Viewing an Active that is not the latest Active still gets a banner? F4 says
  // "whenever the selected version is not the latest Active" — so yes for older Actives too,
  // but F4 only lists status-specific copy for Deprecated, Pending, Inactive, Archived, Draft.
  // For a non-latest Active, no specific copy — skip (concurrent Active notice handles that).
  if (product.status === "active") return null;

  const pendingCycle = product.approvalCycles.find(
    (c) => c.status === "pending" && !c.subscriptionId
  );

  let tone: string;
  let body: ReactNode;
  let link: { to: string; label: string } | null = null;

  switch (product.status) {
    case "deprecated": {
      tone = "border-warning/40 bg-warning/10 text-foreground";
      const days = windDownDays(product);
      const notMigrated = notMigratedCount(product, subscriptions);
      body = (
        <>
          Viewing v{product.version} — deprecated.
          {days !== null && (
            <>
              {" "}
              Wind-down ends in {days} day{days !== 1 ? "s" : ""} · {notMigrated} consumer
              {notMigrated !== 1 ? "s" : ""} not migrated.
            </>
          )}
        </>
      );
      if (latestActive) {
        link = {
          to: `/data-products/products/${latestActive.id}`,
          label: `View successor v${latestActive.version}`,
        };
      }
      break;
    }
    case "pending_approval": {
      tone = "border-primary/40 bg-primary/10 text-foreground";
      body = <>Under review — content locked.</>;
      if (pendingCycle) {
        link = {
          to: `/data-products/approvals/${pendingCycle.id}`,
          label: "Open approval",
        };
      }
      break;
    }
    case "inactive": {
      tone = "border-border bg-muted/50 text-muted-foreground";
      body = <>Deactivated — serves no consumers. Reversible under authorisation.</>;
      break;
    }
    case "archived": {
      tone = "border-border bg-muted/50 text-muted-foreground";
      body = <>Archived — retained for audit and lineage. Terminal.</>;
      break;
    }
    case "draft": {
      tone = "border-warning/40 bg-warning/10 text-foreground";
      body = <>Draft — private to the owning team.</>;
      link = {
        to: `/data-products/products/${product.id}/edit`,
        label: "Edit draft",
      };
      break;
    }
    case "approved": {
      tone = "border-border bg-muted/50 text-muted-foreground";
      body = <>Approved — awaiting activation.</>;
      break;
    }
    default:
      return null;
  }

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-caption", tone)}>
      <span>{body}</span>
      {link && (
        <>
          {" "}
          <Link to={link.to} className="font-medium text-primary underline-offset-2 hover:underline">
            {link.label}
          </Link>
        </>
      )}
    </div>
  );
}
