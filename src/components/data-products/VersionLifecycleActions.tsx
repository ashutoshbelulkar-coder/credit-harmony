import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALLOWED_TRANSITIONS,
  BRD_STATUS_LABEL,
  type BrdLifecycleStatus,
  type DemoProductVersion,
} from "@/data/product-management-types";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import { toast } from "sonner";

const LIFECYCLE_TARGETS: BrdLifecycleStatus[] = [
  "active",
  "deprecated",
  "inactive",
  "archived",
];

function actionLabel(from: BrdLifecycleStatus, to: BrdLifecycleStatus): string {
  if (to === "active" && from === "deprecated") return "Reactivate";
  if (to === "active") return "Activate";
  if (to === "deprecated") return "Deprecate";
  if (to === "inactive") return "Make inactive";
  if (to === "archived") return "Archive";
  return BRD_STATUS_LABEL[to];
}

export function VersionLifecycleActions({
  product,
  viewingId,
}: {
  product: DemoProductVersion;
  viewingId?: string;
}) {
  const navigate = useNavigate();
  const [target, setTarget] = useState<BrdLifecycleStatus | null>(null);
  const [justification, setJustification] = useState("");
  const [windowDays, setWindowDays] = useState("90");
  const [emergency, setEmergency] = useState(false);
  const [confirmEmergency, setConfirmEmergency] = useState(false);

  const allowed = ALLOWED_TRANSITIONS[product.status] ?? [];
  const lifecycleActions = LIFECYCLE_TARGETS.filter((to) => allowed.includes(to));
  const pendingCycle = product.approvalCycles.find((c) => c.status === "pending");
  const canEdit = product.status === "draft";
  const canSubmit = product.status === "draft";

  const open = (to: BrdLifecycleStatus) => {
    setTarget(to);
    setJustification("");
    setWindowDays("90");
    setEmergency(false);
    setConfirmEmergency(false);
  };

  const submit = () => {
    if (!target) return;
    if (target === "inactive" && product.status === "active" && emergency && !confirmEmergency) {
      toast.error("Confirm emergency dual-control checkbox");
      return;
    }
    const res = productMgmtStore.transitionLifecycle(product.id, target, {
      justification,
      deprecationWindowDays: target === "deprecated" ? Number(windowDays) || 90 : undefined,
      emergency: emergency && product.status === "active",
    });
    if (!res.ok) {
      if (res.error === "justification_required") toast.error("Justification is required");
      else if (res.error === "concurrent_ceiling")
        toast.error("Concurrent Active ceiling (3) reached for this product");
      else if (res.error === "invalid_transition") toast.error("Invalid lifecycle transition");
      else toast.error("Transition failed");
      return;
    }
    toast.success(`v${product.version} → ${BRD_STATUS_LABEL[target]}`);
    setTarget(null);
  };

  const hasMenuItems =
    viewingId !== product.id ||
    canEdit ||
    canSubmit ||
    !!pendingCycle ||
    lifecycleActions.length > 0;

  if (!hasMenuItems) {
    return <span className="text-caption text-muted-foreground">—</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Version actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {viewingId !== product.id && (
            <DropdownMenuItem onClick={() => navigate(`/data-products/products/${product.id}`)}>
              View details
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem
              onClick={() => navigate(`/data-products/products/${product.id}/edit`)}
            >
              Edit draft
            </DropdownMenuItem>
          )}
          {canSubmit && (
            <DropdownMenuItem
              onClick={() => navigate(`/data-products/products/${product.id}/submit`)}
            >
              Submit for approval
            </DropdownMenuItem>
          )}
          {pendingCycle && (
            <DropdownMenuItem
              onClick={() => navigate(`/data-products/approvals/${pendingCycle.id}`)}
            >
              Open approval
            </DropdownMenuItem>
          )}
          {(viewingId !== product.id || canEdit || canSubmit || pendingCycle) &&
            lifecycleActions.length > 0 && <DropdownMenuSeparator />}
          {lifecycleActions.map((to) => (
            <DropdownMenuItem key={to} onClick={() => open(to)}>
              {actionLabel(product.status, to)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target ? actionLabel(product.status, target) : ""} — v{product.version}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`justification-${product.id}`}>Justification (required)</Label>
              <Textarea
                id={`justification-${product.id}`}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Business reason for this lifecycle change…"
              />
            </div>
            {target === "deprecated" && (
              <div className="space-y-1.5">
                <Label htmlFor={`window-${product.id}`}>Wind-down window (days)</Label>
                <Input
                  id={`window-${product.id}`}
                  type="number"
                  min={1}
                  value={windowDays}
                  onChange={(e) => setWindowDays(e.target.value)}
                />
              </div>
            )}
            {target === "inactive" && product.status === "active" && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-caption text-muted-foreground">
                  Deactivating an Active version with consumers is an emergency path (dual control
                  demo).
                </p>
                <label className="flex items-center gap-2 text-caption">
                  <Checkbox checked={emergency} onCheckedChange={(c) => setEmergency(!!c)} />
                  Emergency deactivation
                </label>
                {emergency && (
                  <label className="flex items-center gap-2 text-caption">
                    <Checkbox
                      checked={confirmEmergency}
                      onCheckedChange={(c) => setConfirmEmergency(!!c)}
                    />
                    Second authoriser confirms consumer impact acknowledged
                  </label>
                )}
              </div>
            )}
            {target === "active" && (
              <p className="text-caption text-muted-foreground">
                Existing Active versions for this product code remain Active unless separately
                deprecated.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
