import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Check, Minus, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { roleDefinitions as initialRoles, permissions, type RoleDefinition } from "@/data/user-management-mock";

interface RoleFormState {
  role: string;
  description: string;
  permissions: Record<string, boolean>;
}

const emptyForm: RoleFormState = {
  role: "",
  description: "",
  permissions: Object.fromEntries(permissions.map((p) => [p, false])),
};

export function RolesPermissionsPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>([...initialRoles]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<RoleFormState>({ ...emptyForm });
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const openCreate = () => {
    setEditingIndex(null);
    setForm({ ...emptyForm, permissions: Object.fromEntries(permissions.map((p) => [p, false])) });
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    const r = roles[index];
    setEditingIndex(index);
    setForm({ role: r.role, description: r.description, permissions: { ...r.permissions } });
    setDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] },
    }));
  };

  const toggleAll = (on: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: Object.fromEntries(permissions.map((p) => [p, on])),
    }));
  };

  const handleSave = () => {
    if (!form.role.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (editingIndex !== null) {
      setRoles((prev) =>
        prev.map((r, i) =>
          i === editingIndex
            ? { ...r, role: form.role as any, description: form.description, permissions: { ...form.permissions } }
            : r
        )
      );
      toast.success(`Role "${form.role}" updated`);
    } else {
      const duplicate = roles.some((r) => r.role.toLowerCase() === form.role.trim().toLowerCase());
      if (duplicate) {
        toast.error("A role with this name already exists");
        return;
      }
      setRoles((prev) => [
        ...prev,
        {
          role: form.role.trim() as any,
          description: form.description.trim(),
          userCount: 0,
          color: "hsl(220, 9%, 46%)",
          permissions: { ...form.permissions },
        },
      ]);
      toast.success(`Role "${form.role}" created`);
    }
    setDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const name = roles[index].role;
    setRoles((prev) => prev.filter((_, i) => i !== index));
    setDeleteConfirmIndex(null);
    toast.success(`Role "${name}" deleted`);
  };

  const enabledCount = Object.values(form.permissions).filter(Boolean).length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Roles & Permissions</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Define access levels and permission boundaries for each platform role.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Role
        </Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">
        {roles.map((r, i) => (
          <Card key={`${r.role}-${i}`} className="border group relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{r.role}</CardTitle>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Users className="w-3 h-3" /> {r.userCount}
                </Badge>
              </div>
              <CardDescription className="text-xs leading-relaxed">{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {Object.values(r.permissions).filter(Boolean).length} of {permissions.length} permissions
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {r.userCount === 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmIndex(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Permission Matrix</CardTitle>
          <CardDescription>Granular access control across all platform roles</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Permission</TableHead>
                {roles.map((r, i) => (
                  <TableHead key={`${r.role}-${i}`} className="text-center min-w-[100px] text-xs">{r.role}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm}>
                  <TableCell className="text-sm font-medium text-foreground">{perm}</TableCell>
                  {roles.map((r, i) => (
                    <TableCell key={`${r.role}-${i}`} className="text-center">
                      {r.permissions[perm] ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editingIndex !== null
                ? "Modify role details and toggle permissions."
                : "Define a new role and assign permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Role Name *</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Compliance Officer"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role's purpose"
                rows={2}
              />
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissions ({enabledCount}/{permissions.length})</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>
                    Enable All
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>
                    Disable All
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {permissions.map((perm) => (
                  <div key={perm} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-foreground">{perm}</span>
                    <Switch
                      checked={!!form.permissions[perm]}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmIndex !== null ? roles[deleteConfirmIndex]?.role : ""}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmIndex(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmIndex !== null && handleDelete(deleteConfirmIndex)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
