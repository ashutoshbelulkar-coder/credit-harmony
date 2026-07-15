import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BRD_STATUS_LABEL,
  type BrdLifecycleStatus,
  type DemoProductVersion,
} from "@/data/product-management-types";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const ACTION_ORDER: BrdLifecycleStatus[] = [
  "active",
  "deprecated",
  "inactive",
  "archived",
];

function actionLabel(from: BrdLifecycleStatus, to: BrdLifecycleStatus): string {
  if (to === "active" && from === "deprecated") return "Reactivate";
  if (to === "active") return "Activate";
  if (to === "deprecated") return "Deprecate";
  if (to === "inactive") return "Deactivate";
  if (to === "archived") return "Archive";
  return BRD_STATUS_LABEL[to];
}

export function LifecycleActionsPanel({
  product,
  allowed,
}: {
  product: DemoProductVersion;
  allowed: BrdLifecycleStatus[];
}) {
  const [target, setTarget] = useState<BrdLifecycleStatus | null>(null);
  const [justification, setJustification] = useState("");
  const [windowDays, setWindowDays] = useState("90");
  const [emergency, setEmergency] = useState(false);
  const [confirmEmergency, setConfirmEmergency] = useState(false);

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
    toast.success(`${product.name} → ${BRD_STATUS_LABEL[target]}`);
    setTarget(null);
  };

  const allActions = ACTION_ORDER;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Lifecycle actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {allActions.map((to) => {
            const enabled = allowed.includes(to);
            const label = actionLabel(product.status, to);
            const btn = (
              <Button
                key={to}
                size="sm"
                variant={to === "inactive" || to === "archived" ? "outline" : "secondary"}
                disabled={!enabled}
                onClick={() => open(to)}
              >
                {label}
              </Button>
            );
            if (enabled) return btn;
            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">{btn}</span>
                </TooltipTrigger>
                <TooltipContent>
                  Not allowed from {BRD_STATUS_LABEL[product.status]} (BRD transition matrix)
                </TooltipContent>
              </Tooltip>
            );
          })}
          {allowed.length === 0 && (
            <p className="text-caption text-muted-foreground">
              No further transitions from {BRD_STATUS_LABEL[product.status]}.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target ? actionLabel(product.status, target) : ""} — v{product.version}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="justification">Justification (required)</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Business reason for this lifecycle change…"
              />
            </div>
            {target === "deprecated" && (
              <div className="space-y-1.5">
                <Label htmlFor="window">Wind-down window (days)</Label>
                <Input
                  id="window"
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
