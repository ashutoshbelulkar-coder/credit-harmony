import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export function UserManagementLayout() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in min-w-0">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
