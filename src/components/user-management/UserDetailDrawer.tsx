import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Key, Clock, Mail, Building2, Calendar, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { ManagedUser } from "@/data/user-management-mock";
import { mockActivity } from "@/data/user-management-mock";

const statusColor: Record<string, string> = {
  Active: "bg-success/20 text-success",
  Invited: "bg-primary/20 text-primary",
  Suspended: "bg-warning/20 text-warning",
  Deactivated: "bg-destructive/20 text-destructive",
};

interface Props {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDrawer({ user, open, onOpenChange }: Props) {
  if (!user) return null;

  const userActivity = mockActivity.filter((a) => a.userId === user.id).slice(0, 5);
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-lg">{user.name}</SheetTitle>
              <SheetDescription className="text-sm">{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="w-4 h-4" /> Role</div>
            <Badge variant="outline" className="w-fit">{user.role}</Badge>
            <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" /> Institution</div>
            <span className="text-foreground">{user.institution}</span>
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> Status</div>
            <Badge className={`w-fit border-0 ${statusColor[user.status]}`}>{user.status}</Badge>
            <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="w-4 h-4" /> MFA</div>
            <span className={user.mfaEnabled ? "text-success" : "text-muted-foreground"}>{user.mfaEnabled ? "Enabled" : "Disabled"}</span>
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /> Created</div>
            <span className="text-foreground">{user.createdAt}</span>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> Last Active</div>
            <span className="text-foreground">{user.lastActive}</span>
          </div>

          <Separator />

          {/* API Keys */}
          {user.apiKeys && user.apiKeys.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Key className="w-4 h-4" /> API Keys</h4>
                <div className="space-y-2">
                  {user.apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                      <span className="text-foreground">{k.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{k.lastUsed}</span>
                        <Badge variant={k.status === "Active" ? "default" : "destructive"} className="text-[10px]">{k.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Recent Activity */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Activity</h4>
            {userActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {userActivity.map((a) => (
                  <div key={a.id} className="flex items-start justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                    <div>
                      <span className="text-foreground font-medium">{a.action}</span>
                      <p className="text-muted-foreground text-xs mt-0.5">{a.details}</p>
                    </div>
                    <Badge variant={a.status === "Success" ? "secondary" : "destructive"} className="text-[10px] shrink-0">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info("Edit role — coming soon")}>Edit Role</Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Password reset sent")}>Reset Password</Button>
            {user.status === "Active" ? (
              <Button variant="outline" size="sm" className="text-warning border-warning/30" onClick={() => toast.warning(`${user.name} suspended`)}>
                <ShieldOff className="w-3.5 h-3.5 mr-1" /> Suspend
              </Button>
            ) : user.status === "Suspended" ? (
              <Button variant="outline" size="sm" className="text-success border-success/30" onClick={() => toast.success(`${user.name} reactivated`)}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Reactivate
              </Button>
            ) : null}
            {user.status !== "Deactivated" && (
              <Button variant="destructive" size="sm" onClick={() => toast.error(`${user.name} deactivated`)}>Deactivate</Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
