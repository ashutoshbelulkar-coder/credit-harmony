import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Clock, Mail, Building2, Calendar, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { UserResponse } from "@/services/users.service";
import { fetchAuditLogs } from "@/services/auditLogs.service";
import {
  useSuspendUser,
  useActivateUser,
  useUpdateUser,
  useDeactivateUser,
} from "@/hooks/api/useUsers";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showDemoAccountRecoveryUi } from "@/lib/feature-flags";

const ROLE_OPTIONS = ["Super Admin", "Bureau Admin", "Analyst", "Viewer", "API User"] as const;

const statusColor: Record<string, string> = {
  Active: "bg-success/20 text-success",
  Invited: "bg-primary/20 text-primary",
  Suspended: "bg-warning/20 text-warning",
  Deactivated: "bg-destructive/20 text-destructive",
};

interface Props {
  user: UserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDrawer({ user, open, onOpenChange }: Props) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const { data: auditPage, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-logs", "USER", user?.id],
    queryFn: () =>
      fetchAuditLogs({
        entityType: "USER",
        entityId: String(user!.id),
        page: 0,
        size: 8,
      }),
    enabled: open && !!user,
  });

  if (!user) return null;

  const name = user.displayName || user.email;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const primaryRole = (user.roles ?? [])[0] ?? "";
  const status = user.userAccountStatus;
  const activity = auditPage?.content ?? [];

  const openRoleEditor = () => {
    setSelectedRole(ROLE_OPTIONS.includes(primaryRole as (typeof ROLE_OPTIONS)[number]) ? primaryRole : ROLE_OPTIONS[0]);
    setRoleDialogOpen(true);
  };

  const saveRole = () => {
    if (!selectedRole) return;
    updateUser.mutate(
      { id: user.id, data: { roles: [selectedRole] } },
      { onSuccess: () => setRoleDialogOpen(false) }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg">{name}</SheetTitle>
                <SheetDescription className="text-sm">{user.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Shield className="w-4 h-4" /> Role</div>
              <Badge variant="outline" className="w-fit">{primaryRole || "—"}</Badge>
              <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" /> Institution</div>
              <span className="text-foreground">{user.institutionName ?? "—"}</span>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> Status</div>
              <Badge className={`w-fit border-0 ${statusColor[status] ?? "bg-muted"}`}>{status}</Badge>
              <div className="flex items-center gap-2 text-muted-foreground"><Shield className="w-4 h-4" /> MFA</div>
              <span className={user.mfaEnabled ? "text-success" : "text-muted-foreground"}>{user.mfaEnabled ? "Enabled" : "Disabled"}</span>
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /> Created</div>
              <span className="text-foreground">{user.createdAt?.split("T")[0] ?? "—"}</span>
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> Last active</div>
              <span className="text-foreground">{user.lastLoginAt ?? "—"}</span>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Recent activity</h4>
              {auditLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries for this user yet.</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                      <div>
                        <span className="text-foreground font-medium">{a.actionType}</span>
                        <p className="text-muted-foreground text-xs mt-0.5">{a.description}</p>
                        <p className="text-muted-foreground text-[10px] mt-1">{a.occurredAt}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{a.auditOutcome}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openRoleEditor}>Edit role</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showDemoAccountRecoveryUi()) {
                    toast.info("Password reset is not wired in this environment (demo only).");
                  } else {
                    toast.info("Contact your administrator to reset passwords.");
                  }
                }}
              >
                Reset password
              </Button>
              {status === "Active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-warning border-warning/30"
                  onClick={() => suspendUser.mutate(user.id)}
                >
                  <ShieldOff className="w-3.5 h-3.5 mr-1" /> Suspend
                </Button>
              ) : status === "Suspended" || status === "Invited" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-success border-success/30"
                  onClick={() => activateUser.mutate(user.id)}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Activate
                </Button>
              ) : null}
              {status !== "Deactivated" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    deactivateUser.mutate(user.id, {
                      onSuccess: () => onOpenChange(false),
                    })
                  }
                >
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveRole} disabled={updateUser.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
