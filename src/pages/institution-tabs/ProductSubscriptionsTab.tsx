import { useState, useMemo, useEffect } from "react";
import { Plus, PowerOff, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  useProductSubscriptions,
  useAddProductSubscriptions,
  usePatchProductSubscription,
} from "@/hooks/api/useInstitutions";
import { useProducts } from "@/hooks/api/useProducts";
import type { ProductSubscriptionRow as ApiSubscriptionRow } from "@/services/institutions.service";

type ProductSubscriptionRow = {
  subscriptionId: number;
  productId: string;
  productName: string;
  plan: string;
  usage: string;
  status: "active" | "trial" | "suspended";
};
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  institutionId: string;
}

const statusClass: Record<string, string> = {
  active: "bg-success/15 text-success",
  trial: "bg-primary/15 text-primary",
  suspended: "bg-muted text-muted-foreground",
};

export default function ProductSubscriptionsTab({ institutionId }: Props) {
  const { data: apiSubscriptions } = useProductSubscriptions(institutionId);
  const { mutateAsync: addSubscriptionsAsync, isPending: addingSubscriptions } =
    useAddProductSubscriptions(institutionId);
  const { mutateAsync: patchSubscriptionAsync, isPending: patchingSubscription } =
    usePatchProductSubscription(institutionId);
  const { data: productsPage } = useProducts({ size: 100 });
  const catalogProducts = productsPage?.content ?? [];

  const [rows, setRows] = useState<ProductSubscriptionRow[]>([]);

  useEffect(() => {
    if (!apiSubscriptions) return;
    setRows(
      (apiSubscriptions as ApiSubscriptionRow[]).map((s) => ({
        subscriptionId: s.subscriptionId,
        productId: String(s.productId),
        productName: s.productName,
        plan: "Standard",
        usage: "—",
        status: (s.subscriptionStatus as ProductSubscriptionRow["status"]) ?? "active",
      }))
    );
  }, [apiSubscriptions]);

  // ── Add dialog ──────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // All catalog products not already subscribed (any lifecycle status)
  const availableProducts = useMemo(
    () => catalogProducts.filter((p) => !rows.some((r) => r.productId === String(p.id))),
    [catalogProducts, rows]
  );

  const handleAddOpen = () => {
    setSelectedProductIds([]);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (selectedProductIds.length === 0) {
      toast.error("Select at least one product.");
      return;
    }
    const selectedProducts = catalogProducts.filter((p) => selectedProductIds.includes(String(p.id)));
    if (selectedProducts.length === 0) {
      toast.error("Selected products are not in the catalogue. Refresh or check the dev API.");
      return;
    }
    try {
      await addSubscriptionsAsync({ productIds: selectedProductIds });
      toast.success(
        selectedProducts.length === 1
          ? `Subscribed to ${selectedProducts[0].name}`
          : `Subscribed to ${selectedProducts.length} products`
      );
      setAddOpen(false);
      setSelectedProductIds([]);
    } catch {
      /* toast from hook */
    }
  };

  const toggleSelectedProduct = (pId: string, checked: boolean | "indeterminate") => {
    setSelectedProductIds((prev) => {
      if (checked === true) {
        return prev.includes(pId) ? prev : [...prev, pId];
      }
      return prev.filter((id) => id !== pId);
    });
  };

  // ── Toggle active / suspended ───────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<ProductSubscriptionRow | null>(null);

  const pendingAction = toggleTarget
    ? toggleTarget.status === "active" || toggleTarget.status === "trial"
      ? "suspend"
      : "activate"
    : null;

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const next: ProductSubscriptionRow["status"] =
      toggleTarget.status === "active" || toggleTarget.status === "trial"
        ? "suspended"
        : "active";
    const name = toggleTarget.productName;
    try {
      await patchSubscriptionAsync({
        subscriptionId: toggleTarget.subscriptionId,
        subscriptionStatus: next,
      });
      toast.success(
        next === "active" ? `${name} subscription activated` : `${name} subscription suspended`
      );
      setToggleTarget(null);
    } catch {
      /* toast from hook */
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">
          {rows.length} subscription{rows.length !== 1 ? "s" : ""}
        </p>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={handleAddOpen}
          disabled={availableProducts.length === 0}
        >
          <Plus className="w-3.5 h-3.5" />
          Add subscription
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <p className="text-caption text-muted-foreground py-6 text-center">
            No product subscriptions for this institution.
          </p>
        ) : (
          rows.map((r) => {
            const isActive = r.status === "active" || r.status === "trial";
            return (
              <Card key={r.productId}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-body font-medium text-foreground">{r.productName}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 gap-1 shrink-0 text-caption",
                        isActive
                          ? "text-muted-foreground hover:text-destructive"
                          : "text-muted-foreground hover:text-success"
                      )}
                      onClick={() => setToggleTarget(r)}
                    >
                      {isActive ? (
                        <PowerOff className="w-3.5 h-3.5" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                      {isActive ? "Suspend" : "Activate"}
                    </Button>
                  </div>
                  <p className="text-caption text-muted-foreground">Product ID: {r.productId}</p>
                  <p className="text-caption text-muted-foreground">
                    Plan: {r.plan} · Usage: {r.usage}
                  </p>
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full capitalize",
                      badgeTextClasses,
                      statusClass[r.status] ?? statusClass.active
                    )}
                  >
                    {r.status}
                  </span>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>Product ID</th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>Product name</th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>Status</th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 w-28")} />
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
                rows.map((r) => {
                  const isActive = r.status === "active" || r.status === "trial";
                  return (
                    <tr
                      key={r.subscriptionId}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-caption text-muted-foreground tabular-nums">{r.productId}</td>
                      <td className="px-4 py-3 text-body text-foreground">{r.productName}</td>
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
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 gap-1 px-2 text-caption",
                            isActive
                              ? "text-muted-foreground hover:text-destructive"
                              : "text-muted-foreground hover:text-success"
                          )}
                          onClick={() => setToggleTarget(r)}
                        >
                          {isActive ? (
                            <PowerOff className="w-3.5 h-3.5" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                          {isActive ? "Suspend" : "Activate"}
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

      {/* Add subscription dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add subscription</DialogTitle>
            <p className="text-caption text-muted-foreground mt-0.5">
              Pick products from the catalogue, then use <span className="font-medium text-foreground">Add subscription</span>{" "}
              below — that saves to the dev API.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-caption">Product</Label>
              {availableProducts.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  This institution is already subscribed to all available products.
                </p>
              ) : (
                <ScrollArea className="h-56 rounded-md border border-border">
                  <div className="space-y-1.5 p-2">
                    {availableProducts.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 rounded-md border border-border/70 px-2.5 py-2 hover:bg-muted/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedProductIds.includes(String(p.id))}
                          onCheckedChange={(v) => toggleSelectedProduct(String(p.id), v)}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-body text-foreground">
                            {p.name}
                            {p.status === "draft" && (
                              <span className="ml-1.5 text-[10px] text-warning font-medium">draft</span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {p.id} · {p.type}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleAdd()}
              disabled={selectedProductIds.length === 0 || addingSubscriptions}
            >
              {addingSubscriptions
                ? "Saving…"
                : `Add subscription${selectedProductIds.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / Suspend confirmation */}
      <AlertDialog
        open={toggleTarget !== null}
        onOpenChange={(v) => !v && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "suspend" ? "Suspend subscription?" : "Activate subscription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "suspend" ? (
                <>
                  This will suspend the{" "}
                  <span className="font-medium text-foreground">
                    {toggleTarget?.productName}
                  </span>{" "}
                  subscription. The institution will lose access until it is reactivated.
                </>
              ) : (
                <>
                  This will reactivate the{" "}
                  <span className="font-medium text-foreground">
                    {toggleTarget?.productName}
                  </span>{" "}
                  subscription and restore access.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={patchingSubscription}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant={pendingAction === "suspend" ? "destructive" : "default"}
              disabled={patchingSubscription}
              onClick={() => void handleToggleConfirm()}
            >
              {patchingSubscription ? "Saving…" : pendingAction === "suspend" ? "Suspend" : "Activate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
