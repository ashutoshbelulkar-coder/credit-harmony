import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DemoProductVersion } from "@/data/product-management-types";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import { toast } from "sonner";

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DemoProductVersion;
}) {
  const [owner, setOwner] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!owner.trim() || !reason.trim()) {
      toast.error("Incoming owner and reason are required");
      return;
    }
    const res = productMgmtStore.transferOwnership(product.id, owner.trim(), reason.trim());
    if (!res.ok) {
      toast.error("Transfer failed");
      return;
    }
    toast.success(`Ownership transferred to ${owner.trim()} (acceptance recorded)`);
    onOpenChange(false);
    setOwner("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-caption text-muted-foreground">
            Current owner: <span className="text-foreground">{product.metadata.owner}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="new-owner">Incoming owner</Label>
            <Input
              id="new-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Name of accepting owner"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Transfer & accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
