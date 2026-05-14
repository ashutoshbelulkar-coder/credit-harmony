import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChangeCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  initialComment?: string;
  busy?: boolean;
  /**
   * Visual emphasis – use "destructive" for delete/unlink and the default
   * primary style for non-destructive flows.
   */
  variant?: "default" | "destructive";
  onConfirm: (comment: string) => void;
}

export function ChangeCommentDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  initialComment = "",
  busy,
  variant = "default",
  onConfirm,
}: ChangeCommentDialogProps) {
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setComment(initialComment);
      setError(null);
    }
  }, [open, initialComment]);

  function handleConfirm() {
    const trimmed = comment.trim();
    if (!trimmed) {
      setError("Please add a comment describing the reason for this change.");
      return;
    }
    setError(null);
    onConfirm(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="change-comment" className="text-caption text-muted-foreground">
            Change comment <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="change-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Reason or note for this change (required)"
            rows={3}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "change-comment-error" : undefined}
          />
          {error && (
            <p id="change-comment-error" className="text-caption text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
