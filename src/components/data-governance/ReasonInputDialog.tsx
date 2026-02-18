import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export interface ReasonInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  reasonCodes?: { code: string; label: string }[];
  requireReasonCode?: boolean;
  onConfirm: (payload: { reason: string; reasonCode?: string; comment?: string }) => void;
  confirmLabel?: string;
}

export function ReasonInputDialog({
  open,
  onOpenChange,
  title,
  reasonCodes = [],
  requireReasonCode = false,
  onConfirm,
  confirmLabel = "Confirm",
}: ReasonInputDialogProps) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [comment, setComment] = useState("");


  const handleSubmit = () => {
    if (requireReasonCode && reasonCodes.length && !reasonCode) return;
    if (!reason.trim()) return;
    onConfirm({ reason: reason.trim(), reasonCode: reasonCode || undefined, comment: comment.trim() || undefined });
    setReason("");
    setReasonCode("");
    setComment("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setReasonCode("");
      setComment("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {reasonCodes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-body">Reason code {requireReasonCode && "*"}</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select reason code" />
                </SelectTrigger>
                <SelectContent>
                  {reasonCodes.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-body">Reason *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required reason for this action"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-body">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || (requireReasonCode && reasonCodes.length > 0 && !reasonCode)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
