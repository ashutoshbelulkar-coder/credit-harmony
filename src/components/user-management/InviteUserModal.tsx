import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useInviteUser } from "@/hooks/api/useUsers";
import { type UserRole } from "@/data/user-management-mock";

const roles: UserRole[] = ["Super Admin", "Bureau Admin", "Analyst", "Viewer", "API User"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(true);
  const { mutate: inviteUser, isPending } = useInviteUser();

  const handleSubmit = () => {
    if (!name || !email || !role) {
      // toast.error is handled by the hook on error; show local validation errors
      return;
    }
    inviteUser(
      { email, role, sendWelcomeEmail: sendEmail, displayName: name } as Parameters<typeof inviteUser>[0],
      {
        onSuccess: () => {
          onOpenChange(false);
          setName(""); setEmail(""); setRole("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation to join the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
            <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">Send welcome email</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Sending…" : "Send Invite"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
