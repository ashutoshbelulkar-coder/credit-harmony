import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Building2,
  Brain,
  ShieldCheck,
  Activity,
  FileBarChart,
  ScrollText,
  Users,
  Package,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { useConsortiums } from "@/hooks/api/useConsortiums";

const navigationItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, group: "Navigation" },
  { label: "Member Institutions", path: "/institutions", icon: Building2, group: "Navigation" },
  { label: "Register Institution", path: "/institutions/register", icon: Building2, group: "Navigation" },
  { label: "Consortiums", path: "/consortiums", icon: Building2, group: "Navigation" },
  { label: "Create consortium", path: "/consortiums/create", icon: Building2, group: "Navigation" },
  { label: "Agents", path: "/agents", icon: Brain, group: "Navigation" },
  { label: "Agent Configuration", path: "/agents/configuration", icon: Brain, group: "Navigation" },
  { label: "Products", path: "/data-products/products", icon: Package, group: "Data Products" },
  { label: "Enquiry simulation", path: "/data-products/enquiry-simulation", icon: Package, group: "Data Products" },
  { label: "Create product", path: "/data-products/products/create", icon: Package, group: "Data Products" },
  { label: "Data Governance Dashboard", path: "/data-governance/dashboard", icon: ShieldCheck, group: "Data Governance" },
  { label: "Schema Mapper Agent", path: "/data-governance/auto-mapping-review", icon: ShieldCheck, group: "Data Governance" },
  { label: "Validation Rules", path: "/data-governance/validation-rules", icon: ShieldCheck, group: "Data Governance" },
  { label: "Identity Resolution Agent", path: "/data-governance/match-review", icon: ShieldCheck, group: "Data Governance" },
  { label: "Data Quality Monitoring", path: "/data-governance/data-quality-monitoring", icon: ShieldCheck, group: "Data Governance" },
  { label: "Governance Audit Logs", path: "/data-governance/governance-audit-logs", icon: ShieldCheck, group: "Data Governance" },
  { label: "Data Submission API Monitoring", path: "/monitoring/data-submission-api", icon: Activity, group: "Monitoring" },
  { label: "Data Submission Batch", path: "/monitoring/data-submission-batch", icon: Activity, group: "Monitoring" },
  { label: "Inquiry API Monitoring", path: "/monitoring/inquiry-api", icon: Activity, group: "Monitoring" },
  { label: "SLA Configuration", path: "/monitoring/sla-configuration", icon: Activity, group: "Monitoring" },
  { label: "Alert Engine", path: "/monitoring/alert-engine", icon: Activity, group: "Monitoring" },
  { label: "Reports", path: "/reporting", icon: FileBarChart, group: "Navigation" },
  { label: "New Report Request", path: "/reporting/new", icon: FileBarChart, group: "Navigation" },
  { label: "Audit Logs", path: "/audit-logs", icon: ScrollText, group: "Navigation" },
  { label: "User Management", path: "/user-management/users", icon: Users, group: "Navigation" },
  { label: "Roles & Permissions", path: "/user-management/roles", icon: Users, group: "Navigation" },
  { label: "Activity Log", path: "/user-management/activity", icon: Users, group: "Navigation" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: institutionsPage } = useInstitutions({ size: 200 }, { enabled: !!user });
  const { data: consortiumsPage } = useConsortiums({ size: 200 }, { enabled: !!user });
  const consortiums = consortiumsPage?.content ?? [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const apiInstitutions = institutionsPage?.content ?? [];

  const institutionItems = useMemo(
    () =>
      apiInstitutions.map((inst) => ({
        label: inst.name,
        path: `/institutions/${inst.id}`,
        subtitle: `${inst.institutionType} · ${inst.institutionLifecycleStatus}`,
      })),
    [apiInstitutions]
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, institutions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {navigationItems
            .filter((item) => item.group === "Navigation")
            .map((item) => (
              <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Data Products">
          {navigationItems
            .filter((item) => item.group === "Data Products")
            .map((item) => (
              <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Data Governance">
          {navigationItems
            .filter((item) => item.group === "Data Governance")
            .map((item) => (
              <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Monitoring">
          {navigationItems
            .filter((item) => item.group === "Monitoring")
            .map((item) => (
              <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Institutions">
          {institutionItems.map((item) => (
            <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.subtitle}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Consortiums">
          {consortiums.map((c) => (
            <CommandItem key={c.id} onSelect={() => handleSelect(`/consortiums/${c.id}`)}>
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.type} · {c.membersCount} members
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  return {
    open: () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    },
  };
}
