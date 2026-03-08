import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
          <span className="text-3xl font-bold text-muted-foreground">404</span>
        </div>
        <h1 className="text-h2 font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-body text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
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
};

export default NotFound;
