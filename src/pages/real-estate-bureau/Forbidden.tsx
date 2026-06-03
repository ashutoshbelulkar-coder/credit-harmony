import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Home, ArrowLeft, ShieldX } from "lucide-react";

export default function RealEstateBureauForbidden() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          403
        </p>
        <h1 className="text-h2 font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-body text-muted-foreground max-w-md">
          You do not have permission to access the Real Estate Bureau module. Contact your
          administrator if you believe this is an error.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
