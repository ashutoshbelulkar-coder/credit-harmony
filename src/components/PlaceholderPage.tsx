import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <div className="w-6 h-6 rounded bg-muted-foreground/20" />
          </div>
          <p className="text-sm text-muted-foreground">
            This section is under development and will be available soon.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
