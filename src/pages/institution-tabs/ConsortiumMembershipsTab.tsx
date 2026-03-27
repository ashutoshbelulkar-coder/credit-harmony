import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  getConsortiumMemberships,
  CONSORTIUM_ROLE_OPTIONS,
  type ConsortiumMembershipRow,
  type ConsortiumMembershipRole,
} from "@/data/institution-extensions-mock";
import { consortiums } from "@/data/consortiums-mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
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
  pending: "bg-warning/15 text-warning",
  suspended: "bg-muted text-muted-foreground",
};

export default function ConsortiumMembershipsTab({ institutionId }: Props) {
  const [rows, setRows] = useState<ConsortiumMembershipRow[]>(() =>
    getConsortiumMemberships(institutionId)
  );

  // ── Add dialog ──────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [selectedConsortiumId, setSelectedConsortiumId] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<ConsortiumMembershipRole[]>(["Consumer"]);

  // Available consortiums = active ones not already joined
  const availableConsortiums = useMemo(
    () =>
      consortiums.filter(
        (c) => c.status === "active" && !rows.some((r) => r.consortiumId === c.id)
      ),
    [rows]
  );

  const handleAddOpen = () => {
    setSelectedConsortiumId(availableConsortiums[0]?.id ?? "");
    setSelectedRoles(["Consumer"]);
    setAddOpen(true);
  };

  const toggleRole = (r: ConsortiumMembershipRole, checked: boolean) => {
    setSelectedRoles((prev) => {
      if (checked) return prev.includes(r) ? prev : [...prev, r];
      const next = prev.filter((x) => x !== r);
      return next.length ? next : ["Consumer"];
    });
  };

  const handleAdd = () => {
    const consortium = consortiums.find((c) => c.id === selectedConsortiumId);
    if (!consortium || selectedRoles.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const roleStr = [...selectedRoles].sort().join(", ");
    setRows((prev) => [
      ...prev,
      {
        consortiumId: consortium.id,
        consortiumName: consortium.name,
        role: roleStr,
        status: "pending",
        joinedDate: today,
      },
    ]);
    toast.success(`Added to ${consortium.name} — roles: ${roleStr}`);
    setAddOpen(false);
  };

  // ── Remove dialog ───────────────────────────────────────────
  const [removeTarget, setRemoveTarget] = useState<ConsortiumMembershipRow | null>(null);

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    setRows((prev) =>
      prev.filter((r) => r.consortiumId !== removeTarget.consortiumId)
    );
    toast.success(`Removed from ${removeTarget.consortiumName}`);
    setRemoveTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">
          {rows.length} membership{rows.length !== 1 ? "s" : ""}
        </p>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={handleAddOpen}
          disabled={availableConsortiums.length === 0}
        >
          <Plus className="w-3.5 h-3.5" />
          Add to Consortium
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <p className="text-caption text-muted-foreground py-6 text-center">
            No consortium memberships for this institution.
          </p>
        ) : (
          rows.map((r) => (
            <Card key={r.consortiumId}>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-body font-medium text-foreground">{r.consortiumName}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setRemoveTarget(r)}
                    aria-label={`Remove from ${r.consortiumName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-caption text-muted-foreground">
                  Role: {r.role} · Joined {r.joinedDate}
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

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Consortium name
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Role
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Status
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                  Joined date
                </th>
                <th className={cn(tableHeaderClasses, "px-4 py-3 w-14")} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-caption text-muted-foreground"
                  >
                    No consortium memberships for this institution.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.consortiumId}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-body text-foreground">{r.consortiumName}</td>
                    <td className="px-4 py-3 text-body text-muted-foreground">{r.role}</td>
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
                    <td className="px-4 py-3 text-body text-muted-foreground tabular-nums">
                      {r.joinedDate}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setRemoveTarget(r)}
                        aria-label={`Remove from ${r.consortiumName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add consortium dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to consortium</DialogTitle>
            <p className="text-caption text-muted-foreground mt-0.5">
              Select a consortium and membership role for this institution.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-caption">Consortium</Label>
              {availableConsortiums.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  This institution is already a member of all available consortiums.
                </p>
              ) : (
                <Select
                  value={selectedConsortiumId}
                  onValueChange={setSelectedConsortiumId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select consortium" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConsortiums.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-caption">Roles (multi-select)</Label>
              <div className="rounded-lg border border-border p-3 space-y-2 max-h-48 overflow-y-auto">
                {CONSORTIUM_ROLE_OPTIONS.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <Checkbox
                      id={`consortium-role-${r}`}
                      checked={selectedRoles.includes(r)}
                      onCheckedChange={(v) => toggleRole(r, v === true)}
                    />
                    <Label htmlFor={`consortium-role-${r}`} className="text-caption font-normal cursor-pointer">
                      {r}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-caption text-muted-foreground">
                Contributors submit data; Consumers read pooled data.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!selectedConsortiumId || selectedRoles.length === 0}
            >
              Add membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove consortium membership?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                {removeTarget?.consortiumName}
              </span>{" "}
              from this institution's memberships. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
