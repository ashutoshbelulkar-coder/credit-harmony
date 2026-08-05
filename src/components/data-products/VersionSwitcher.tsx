import { useNavigate } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import type { DemoProductVersion } from "@/data/product-management-types";
import { cn } from "@/lib/utils";

export function VersionSwitcher({
  current,
  siblings,
}: {
  current: DemoProductVersion;
  siblings: DemoProductVersion[];
}) {
  const navigate = useNavigate();
  const versions = [...siblings].sort((a, b) => b.version - a.version);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 font-normal"
          aria-label="Switch version"
        >
          <span className="tabular-nums font-medium">v{current.version}</span>
          <ProductStatusBadge status={current.status} />
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {versions.map((v) => {
          const selected = v.id === current.id;
          return (
            <DropdownMenuItem
              key={v.id}
              className="flex items-center gap-2"
              onClick={() => {
                if (!selected) navigate(`/data-products/products/${v.id}`);
              }}
            >
              <Check
                className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
              />
              <span className="tabular-nums font-medium">v{v.version}</span>
              <ProductStatusBadge status={v.status} />
              <span className="ml-auto text-caption text-muted-foreground tabular-nums">
                {v.consumerCount} consumer{v.consumerCount !== 1 ? "s" : ""}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
