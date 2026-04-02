import { useState } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Plus, ArrowUpDown, MoreHorizontal, Shield } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import tabsData from "@/data/institution-tabs.json";
import { useUsers, useInviteUser, useSuspendUser } from "@/hooks/api/useUsers";
import type { UserResponse } from "@/services/users.service";
import { userAccountStatusBadgeClass, userAccountStatusLabel } from "@/lib/status-badges";

const roles = tabsData.users.roles as readonly string[];
type UserRole = (typeof tabsData.users.roles)[number];

export default function UsersTab({ institutionId }: { institutionId?: string | number }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: usersPage, isLoading } = useUsers(institutionId ? { institutionId } : undefined);
  const { mutate: inviteUser, isPending: inviting } = useInviteUser();
  const { mutate: suspendUser } = useSuspendUser();

  const users: UserResponse[] = usersPage?.content ?? [];
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "" as string,
    mfaEnabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!newUser.firstName.trim()) errs.firstName = "First name is required";
    if (!newUser.lastName.trim()) errs.lastName = "Last name is required";
    if (!newUser.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) errs.email = "Invalid email address";
    if (!newUser.phone.trim()) errs.phone = "Phone is required";
    if (!newUser.role) errs.role = "Role is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    inviteUser(
      {
        email: newUser.email,
        role: newUser.role,
        institutionId: institutionId ? Number(institutionId) : undefined,
      },
      {
        onSuccess: () => {
          setDrawerOpen(false);
          setNewUser({ firstName: "", lastName: "", email: "", phone: "", role: "", mfaEnabled: false });
          setErrors({});
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-h4 font-semibold text-foreground">Users</h3>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-body font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                {["Name", "Email", "Role", "Status", "Last Login", ""].map((h) => (
                  <th key={h} className={cn("px-5 py-3 text-left", tableHeaderClasses)}>
                    {h && (
                      <span className="flex items-center gap-1">
                        {h}
                        {h !== "" && <ArrowUpDown className="w-3 h-3" />}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">Loading users…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-foreground">{u.displayName}</span>
                      {u.mfaEnabled && <Shield className="w-3 h-3 text-primary" />}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-body text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-4 text-body text-foreground">{u.roles?.[0] ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, userAccountStatusBadgeClass(u.userAccountStatus))}>
                      {userAccountStatusLabel(u.userAccountStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-body text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-5 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Reset Password</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => suspendUser(u.id)}
                        >
                          Suspend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add User</SheetTitle>
            <SheetDescription>Add a new user to this institution.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">First Name</label>
                <Input
                  value={newUser.firstName}
                  onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First name"
                />
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Last Name</label>
                <Input
                  value={newUser.lastName}
                  onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Last name"
                />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@institution.com"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Enable MFA</p>
                <p className="text-xs text-muted-foreground">Require multi-factor authentication</p>
              </div>
              <Switch
                checked={newUser.mfaEnabled}
                onCheckedChange={(v) => setNewUser((p) => ({ ...p, mfaEnabled: v }))}
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={inviting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviting ? "Adding…" : "Add User"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
