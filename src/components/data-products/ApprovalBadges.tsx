import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApprovalPolicyDemo } from "@/data/product-management-types";

export function ApprovalTypeBadge({ isAccessRequest }: { isAccessRequest: boolean }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full whitespace-nowrap",
        badgeTextClasses,
        isAccessRequest ? "bg-secondary/15 text-secondary-foreground" : "bg-primary/15 text-primary"
      )}
    >
      {isAccessRequest ? "Access request" : "Version approval"}
    </span>
  );
}

export function PolicyChip({
  policy,
  policyId,
}: {
  policy?: ApprovalPolicyDemo;
  policyId: string;
}) {
  if (!policy) {
    return (
      <Badge variant="outline">
        {policyId}
      </Badge>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="capitalize cursor-default">
          {policy.pattern}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {policy.name} · {policy.roles.join(" → ")}
      </TooltipContent>
    </Tooltip>
  );
}
