import { Building2, Users, Wallet, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PropertyMatch } from "@/lib/real-estate-bureau/types";

interface PropertyMatchCardProps {
  match: PropertyMatch;
  onViewReport: () => void;
}

export function PropertyMatchCard({ match, onViewReport }: PropertyMatchCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-36 bg-muted flex items-center justify-center border-b border-border">
        <Building2 className="h-12 w-12 text-muted-foreground/40" />
        <span className="sr-only">Property image placeholder</span>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-body font-semibold text-foreground leading-snug">
            {match.propertyAddress}
          </p>
          <p className="text-caption text-muted-foreground mt-1">{match.propertyType}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-0 gap-1">
            <Percent className="h-3 w-3" />
            {match.confidenceScore}% confidence
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Mortgages</p>
            <p className="text-body font-bold text-foreground">{match.activeMortgageCount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <Wallet className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
            <p className="text-[10px] text-muted-foreground uppercase">Valuation</p>
            <p className="text-caption font-bold text-foreground">{match.latestValuation}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <Users className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
            <p className="text-[10px] text-muted-foreground uppercase">Owners</p>
            <p className="text-body font-bold text-foreground">{match.ownershipCount}</p>
          </div>
        </div>
        <Button className="w-full" size="sm" onClick={onViewReport}>
          View Report
        </Button>
      </div>
    </div>
  );
}
