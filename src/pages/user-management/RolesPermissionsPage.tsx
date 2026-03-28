import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Minus, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  roleDefinitions as initialRoles,
  createEmptySectionMatrix,
  countEnabledSectionPermissions,
  sectionPermissionSlotCount,
  type RoleDefinition,
  type SectionPermissionMatrix,
} from "@/data/user-management-mock";
import { permissionSections, permissionActions, type PermissionAction } from "@/lib/nav-config";
import { useRoles } from "@/hooks/api/useRoles";
import type { RoleResponse } from "@/services/roles.service";

interface RoleFormState {
  role: string;
  description: string;
  sectionPermissions: SectionPermissionMatrix;
}

const emptyForm: RoleFormState = {
  role: "",
  description: "",
  sectionPermissions: createEmptySectionMatrix(),
};

function apiRoleToDefinition(r: RoleResponse): RoleDefinition {
  return {
    role: r.roleName,
    description: r.description ?? "",
    userCount: 0,
    color: "hsl(220, 9%, 46%)",
    permissions: {},
    sectionPermissions: (r.permissions as SectionPermissionMatrix) ?? createEmptySectionMatrix(),
  };
}

export function RolesPermissionsPage() {
  const { data: apiRoles } = useRoles();
  const [roles, setRoles] = useState<RoleDefinition[]>([...initialRoles]);

  // Seed from API data when available; fall back to static mock if API unreachable
  useEffect(() => {
    if (apiRoles && apiRoles.length > 0) {
      setRoles(apiRoles.map(apiRoleToDefinition));
    }
  }, [apiRoles]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<RoleFormState>({ ...emptyForm });
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const openCreate = () => {
    setEditingIndex(null);
    setForm({ ...emptyForm, sectionPermissions: createEmptySectionMatrix() });
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    const r = roles[index];
    setEditingIndex(index);
    setForm({
      role: r.role,
      description: r.description,
      sectionPermissions: JSON.parse(JSON.stringify(r.sectionPermissions)) as SectionPermissionMatrix,
    });
    setDialogOpen(true);
  };

  const toggleSectionAction = (sectionId: string, action: PermissionAction) => {
    setForm((prev) => ({
      ...prev,
      sectionPermissions: {
        ...prev.sectionPermissions,
        [sectionId]: {
          ...prev.sectionPermissions[sectionId],
          [action]: !prev.sectionPermissions[sectionId]?.[action],
        },
      },
    }));
  };

  const toggleAllMatrix = (on: boolean) => {
    setForm((prev) => {
      const next = createEmptySectionMatrix();
      for (const s of permissionSections) {
        for (const a of permissionActions) {
          next[s.id][a] = on;
        }
      }
      return { ...prev, sectionPermissions: next };
    });
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
            ? {
                ...r,
                role: form.role.trim(),
                description: form.description,
                sectionPermissions: JSON.parse(JSON.stringify(form.sectionPermissions)) as SectionPermissionMatrix,
              }
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
          role: form.role.trim(),
          description: form.description.trim(),
          userCount: 0,
          color: "hsl(220, 9%, 46%)",
          permissions: {},
          sectionPermissions: JSON.parse(JSON.stringify(form.sectionPermissions)) as SectionPermissionMatrix,
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

  const enabledCount = countEnabledSectionPermissions(form.sectionPermissions);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Roles & Permissions</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Section-based access aligned with the main navigation (View, Create, Edit, Delete, Export).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Role
        </Button>
      </div>

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
                {countEnabledSectionPermissions(r.sectionPermissions)} of {sectionPermissionSlotCount} permissions
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {r.userCount === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteConfirmIndex(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
          <CardDescription>Enabled actions per navigation section and role</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Section</TableHead>
                {roles.map((r, i) => (
                  <TableHead key={`${r.role}-${i}`} className="text-center min-w-[100px] text-xs">
                    {r.role}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionSections.map((sec) => (
                <TableRow key={sec.id}>
                  <TableCell className="text-sm font-medium text-foreground">{sec.title}</TableCell>
                  {roles.map((r, ri) => {
                    const n = permissionActions.filter((a) => r.sectionPermissions[sec.id]?.[a]).length;
                    return (
                      <TableCell key={`${r.role}-${ri}`} className="text-center">
                        {n === permissionActions.length ? (
                          <Check className="w-4 h-4 text-success mx-auto" />
                        ) : n === 0 ? (
                          <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-caption text-muted-foreground tabular-nums">
                            {n}/{permissionActions.length}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              Assign permissions by main app section. Each section supports View, Create, Edit, Delete, and Export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Role name *</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Compliance Officer"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role's purpose"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Section permissions ({enabledCount}/{sectionPermissionSlotCount})
                </Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllMatrix(true)}>
                    Enable all
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAllMatrix(false)}>
                    Disable all
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border p-3">
                {permissionSections.map((sec) => (
                  <div key={sec.id} className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-foreground">{sec.title}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {permissionActions.map((action) => (
                        <div
                          key={`${sec.id}-${action}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/20 px-2 py-1.5"
                        >
                          <span className="text-caption text-foreground">{action}</span>
                          <Switch
                            checked={!!form.sectionPermissions[sec.id]?.[action]}
                            onCheckedChange={() => toggleSectionAction(sec.id, action)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingIndex !== null ? "Save changes" : "Create role"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;
              {deleteConfirmIndex !== null ? roles[deleteConfirmIndex]?.role : ""}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmIndex !== null && handleDelete(deleteConfirmIndex)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
