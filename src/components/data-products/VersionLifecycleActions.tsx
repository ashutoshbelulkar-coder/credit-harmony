import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
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
  BRD_STATUS_LABEL,
  type BrdLifecycleStatus,
  type DemoProductVersion,
} from "@/data/product-management-types";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildLifecycleMenu,
  lifecycleActionConfirmLabel,
  type LifecycleMenuAction,
} from "@/components/data-products/lifecycle-menu";

function useLifecycleDialog(product: DemoProductVersion) {
  const [pending, setPending] = useState<LifecycleMenuAction | null>(null);
  const [justification, setJustification] = useState("");
  const [windowDays, setWindowDays] = useState("90");
  const [windowError, setWindowError] = useState<string | null>(null);
  const [confirmEmergency, setConfirmEmergency] = useState(false);

  const isEmergencyInactive = !!pending?.emergency;

  const open = (action: LifecycleMenuAction) => {
    if (!action.enabled) return;
    setPending(action);
    setJustification("");
    setWindowDays("90");
    setWindowError(null);
    setConfirmEmergency(false);
  };

  const close = () => setPending(null);

  const submit = () => {
    if (!pending) return;
    const target = pending.target;
    if (target === "deprecated") {
      const n = Number(windowDays);
      if (!Number.isInteger(n) || n < 1) {
        setWindowError("Enter an integer of at least 1 day");
        return;
      }
      setWindowError(null);
    }
    if (isEmergencyInactive && !confirmEmergency) {
      toast.error("Confirm emergency dual-control checkbox");
      return;
    }
    const res = productMgmtStore.transitionLifecycle(product.id, target, {
      justification,
      deprecationWindowDays: target === "deprecated" ? Number(windowDays) : undefined,
      emergency: isEmergencyInactive ? true : undefined,
    });
    if (!res.ok) {
      if (res.error === "justification_required") toast.error("Justification is required");
      else if (res.error === "concurrent_ceiling")
        toast.error("Concurrent Active ceiling (3) reached for this product");
      else if (res.error === "invalid_transition") toast.error("Invalid lifecycle transition");
      else if (res.error === "emergency_required")
        toast.error("Active → Inactive requires emergency dual-control");
      else if (res.error === "invalid_window") toast.error("Wind-down window must be an integer ≥ 1");
      else toast.error("Transition failed");
      return;
    }
    toast.success(`v${product.version} → ${BRD_STATUS_LABEL[target]}`);
    setPending(null);
  };

  const confirmDisabled =
    !justification.trim() ||
    (isEmergencyInactive && !confirmEmergency) ||
    (pending?.target === "deprecated" &&
      (!Number.isInteger(Number(windowDays)) || Number(windowDays) < 1));

  return {
    pending,
    open,
    close,
    submit,
    justification,
    setJustification,
    windowDays,
    setWindowDays,
    windowError,
    setWindowError,
    confirmEmergency,
    setConfirmEmergency,
    isEmergencyInactive,
    confirmDisabled,
  };
}

function LifecycleConfirmDialog({
  product,
  dialog,
}: {
  product: DemoProductVersion;
  dialog: ReturnType<typeof useLifecycleDialog>;
}) {
  const { pending } = dialog;
  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && dialog.close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h4">
            {pending ? lifecycleActionConfirmLabel(product, pending) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
              <Label htmlFor={`justification-${product.id}`} className="text-caption">
                Justification (required)
              </Label>
            <Textarea
              id={`justification-${product.id}`}
              value={dialog.justification}
              onChange={(e) => dialog.setJustification(e.target.value)}
              rows={3}
              placeholder="Business reason for this lifecycle change…"
            />
          </div>
          {pending?.target === "deprecated" && (
            <div className="space-y-1.5">
                <Label htmlFor={`window-${product.id}`} className="text-caption">
                  Wind-down window (days)
                </Label>
              <Input
                id={`window-${product.id}`}
                type="number"
                min={1}
                step={1}
                value={dialog.windowDays}
                onChange={(e) => {
                  dialog.setWindowDays(e.target.value);
                  dialog.setWindowError(null);
                }}
              />
              {dialog.windowError && (
                <p className="text-caption text-destructive">{dialog.windowError}</p>
              )}
            </div>
          )}
          {dialog.isEmergencyInactive && (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3">
              <p className="text-caption text-muted-foreground">
                Serves no consumers until reactivated. Reversible under authorisation. Emergency
                dual-control is required for Active → Inactive.
              </p>
              <label className="flex items-center gap-2 text-caption">
                <Checkbox
                  checked={dialog.confirmEmergency}
                  onCheckedChange={(c) => dialog.setConfirmEmergency(!!c)}
                />
                Second authoriser confirms consumer impact acknowledged
              </label>
            </div>
          )}
          {pending?.target === "inactive" && !pending.emergency && (
            <p className="text-caption text-muted-foreground">
              Serves no consumers until reactivated. Reversible under authorisation.
            </p>
          )}
          {pending?.target === "active" && (
            <p className="text-caption text-muted-foreground">
              Existing Active versions for this product code remain Active unless separately
              deprecated.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={dialog.close}>
            Cancel
          </Button>
          <Button onClick={dialog.submit} disabled={dialog.confirmDisabled}>
            {pending ? lifecycleActionConfirmLabel(product, pending) : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleMenuItems({
  product,
  onOpen,
}: {
  product: DemoProductVersion;
  onOpen: (action: LifecycleMenuAction) => void;
}) {
  const navigate = useNavigate();
  const menu = buildLifecycleMenu(product);

  const renderAction = (action: LifecycleMenuAction) => {
    if (!action.enabled) {
      return (
        <DropdownMenuItem
          key={action.kind}
          disabled
          className={cn(
            "opacity-100 focus:bg-transparent",
            action.destructive && "text-destructive/50"
          )}
        >
          <span className="text-muted-foreground">
            {action.shortLabel} — {action.disabledReason}
          </span>
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuItem
        key={action.kind}
        className={cn(action.destructive && "text-destructive focus:text-destructive")}
        onClick={() => onOpen(action)}
      >
        {action.label}
      </DropdownMenuItem>
    );
  };

  return (
    <>
      {menu.draftActions.map((a) => (
        <DropdownMenuItem
          key={a.kind}
          onClick={() =>
            navigate(
              a.kind === "edit_draft"
                ? `/data-products/products/${product.id}/edit`
                : `/data-products/products/${product.id}/submit`
            )
          }
        >
          {a.label}
        </DropdownMenuItem>
      ))}
      {menu.draftActions.length > 0 && <DropdownMenuSeparator />}
      {menu.primaryLifecycle.map(renderAction)}
      <DropdownMenuSeparator />
      {menu.destructiveLifecycle.map(renderAction)}
    </>
  );
}

/** Versions-tab / list row overflow — same items as Manage. */
export function VersionLifecycleActions({
  product,
}: {
  product: DemoProductVersion;
  /** @deprecated Ignored; menu is identical to Manage per Addendum F. */
  viewingId?: string;
}) {
  const dialog = useLifecycleDialog(product);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Version actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <LifecycleMenuItems product={product} onOpen={dialog.open} />
        </DropdownMenuContent>
      </DropdownMenu>
      <LifecycleConfirmDialog product={product} dialog={dialog} />
    </>
  );
}

/** Header Manage button — canonical home for lifecycle actions. */
export function ManageLifecycleMenu({ product }: { product: DemoProductVersion }) {
  const dialog = useLifecycleDialog(product);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Manage
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <LifecycleMenuItems product={product} onOpen={dialog.open} />
        </DropdownMenuContent>
      </DropdownMenu>
      <LifecycleConfirmDialog product={product} dialog={dialog} />
    </>
  );
}

/** @deprecated Prefer shortLabel from LifecycleMenuAction */
export function actionLabel(from: BrdLifecycleStatus, to: BrdLifecycleStatus): string {
  if (to === "active" && from === "deprecated") return "Reactivate";
  if (to === "active") return "Activate";
  if (to === "deprecated") return "Deprecate";
  if (to === "inactive") return "Deactivate";
  if (to === "archived") return "Archive";
  return BRD_STATUS_LABEL[to];
}
