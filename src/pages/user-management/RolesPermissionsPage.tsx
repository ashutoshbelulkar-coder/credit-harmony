import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Minus, Users } from "lucide-react";
import { roleDefinitions, permissions } from "@/data/user-management-mock";

export function RolesPermissionsPage() {
  return (
    <>
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Roles & Permissions</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Define access levels and permission boundaries for each platform role.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">
        {roleDefinitions.map((r) => (
          <Card key={r.role} className="border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{r.role}</CardTitle>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Users className="w-3 h-3" /> {r.userCount}
                </Badge>
              </div>
              <CardDescription className="text-xs leading-relaxed">{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">
                {Object.values(r.permissions).filter(Boolean).length} of {permissions.length} permissions
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
                {roleDefinitions.map((r) => (
                  <TableHead key={r.role} className="text-center min-w-[100px] text-xs">{r.role}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm}>
                  <TableCell className="text-sm font-medium text-foreground">{perm}</TableCell>
                  {roleDefinitions.map((r) => (
                    <TableCell key={r.role} className="text-center">
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
    </>
  );
}
