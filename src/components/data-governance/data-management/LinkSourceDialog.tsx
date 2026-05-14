import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { badgeTextClasses } from "@/lib/typography";
import { useAvailableSources } from "@/hooks/api/useDataManagement";

interface LinkSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  busy?: boolean;
  onConfirm: (sourceIds: string[], comment: string) => void;
}

export function LinkSourceDialog({
  open,
  onOpenChange,
  subjectId,
  busy,
  onConfirm,
}: LinkSourceDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ comment?: string; selection?: string }>({});

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(new Set());
      setComment("");
      setErrors({});
    }
  }, [open]);

  const { data: sources = [], isLoading } = useAvailableSources(subjectId, query);

  function toggle(sourceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  const orderedSources = useMemo(
    () => [...sources].sort((a, b) => a.name.localeCompare(b.name)),
    [sources]
  );

  function handleConfirm() {
    const nextErrors: typeof errors = {};
    if (selected.size === 0) nextErrors.selection = "Pick at least one source to link";
    if (!comment.trim()) nextErrors.comment = "Comment is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onConfirm(Array.from(selected), comment.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link data sources</DialogTitle>
          <DialogDescription>
            Pick one or more available data sources and link them to this subject.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, provider, type or ID"
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <ScrollArea className="h-[260px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-caption text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sources…
                </div>
              ) : orderedSources.length === 0 ? (
                <div className="px-4 py-8 text-center text-caption text-muted-foreground">
                  No matching sources available to link
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {orderedSources.map((source) => {
                    const checked = selected.has(source.sourceId);
                    return (
                      <li key={source.sourceId} className="px-3 py-2">
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(source.sourceId)}
                            aria-label={`Select ${source.name}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-body font-medium text-foreground">{source.name}</span>
                              <Badge variant="outline" className={badgeTextClasses}>
                                {source.type}
                              </Badge>
                            </div>
                            <p className="text-caption text-muted-foreground">
                              {source.sourceId} · {source.provider} · updated {new Date(source.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
          {errors.selection && (
            <p className="text-caption text-destructive" role="alert">{errors.selection}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="link-comment" className="text-caption text-muted-foreground">
              Change comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="link-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Reason for linking these sources"
              rows={2}
              aria-invalid={errors.comment ? true : undefined}
            />
            {errors.comment && (
              <p className="text-caption text-destructive" role="alert">{errors.comment}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || selected.size === 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
