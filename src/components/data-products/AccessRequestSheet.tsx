import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRD_STATUS_LABEL } from "@/data/product-management-types";
import {
  ACCESS_APPLICATIONS,
  ACCESS_BUSINESS_DOMAINS,
  ACCESS_INSTITUTIONS,
  ACCESS_PURPOSE_LABELS,
  ACCESS_PURPOSES,
} from "@/data/product-access-request-options";
import { productMgmtStore } from "@/lib/product-management-demo-store";
import { toast } from "sonner";

interface AccessRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCode: string;
  defaultVersionId?: string;
}

export function AccessRequestSheet({
  open,
  onOpenChange,
  productCode,
  defaultVersionId,
}: AccessRequestSheetProps) {
  const versions = productMgmtStore.getVersionsByCode(productCode);
  const activeVersions = versions.filter((v) => v.status === "active");
  const pinOptions = activeVersions.length > 0 ? activeVersions : versions;
  const fallbackVersionId =
    defaultVersionId ??
    pinOptions.find((v) => v.status === "active")?.id ??
    pinOptions[0]?.id ??
    "";

  const [institutionId, setInstitutionId] = useState("");
  const [pinnedVersionId, setPinnedVersionId] = useState(fallbackVersionId);
  const [businessDomain, setBusinessDomain] = useState("");
  const [application, setApplication] = useState("");
  const [billingRef, setBillingRef] = useState("");
  const [usagePeriodMonths, setUsagePeriodMonths] = useState("12");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setPinnedVersionId(fallbackVersionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultVersionId]);

  const reset = () => {
    setInstitutionId("");
    setBusinessDomain("");
    setApplication("");
    setBillingRef("");
    setUsagePeriodMonths("12");
    setPurpose("");
    setNotes("");
  };

  const canSubmit =
    !!institutionId &&
    !!businessDomain &&
    !!application &&
    billingRef.trim().length > 0 &&
    !!purpose &&
    !!pinnedVersionId;

  const submit = () => {
    if (!canSubmit) return;
    const institution = ACCESS_INSTITUTIONS.find((i) => i.id === institutionId);
    if (!institution) return;
    const res = productMgmtStore.requestAccess({
      institutionId: institution.id,
      institutionName: institution.name,
      productCode,
      pinnedVersionId,
      businessDomain,
      application,
      billingRef: billingRef.trim(),
      usagePeriodMonths: Number(usagePeriodMonths) || 12,
      purpose,
      notes: notes.trim() || undefined,
    });
    if (!res.ok) {
      toast.error("Could not submit access request");
      return;
    }
    toast.success("Access request submitted for approval.");
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Access control — Request access</SheetTitle>
          <SheetDescription className="text-caption">
            Submit a subscription request for {productCode}. Routed through the standard
            approval workflow before activation.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="ars-institution" className="text-caption">
              Requesting institution
            </Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger id="ars-institution">
                <SelectValue placeholder="Select institution" />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_INSTITUTIONS.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-domain" className="text-caption">
              Requester business domain
            </Label>
            <Select value={businessDomain} onValueChange={setBusinessDomain}>
              <SelectTrigger id="ars-domain">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_BUSINESS_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-application" className="text-caption">
              Consuming application
            </Label>
            <Select value={application} onValueChange={setApplication}>
              <SelectTrigger id="ars-application">
                <SelectValue placeholder="Select application" />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_APPLICATIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-foreground">
              If none is available, a new application must be created
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-billing" className="text-caption">
              Billing reference
            </Label>
            <Input
              id="ars-billing"
              value={billingRef}
              onChange={(e) => setBillingRef(e.target.value)}
              placeholder="e.g. BILL-2026-0042"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-usage" className="text-caption">
              Usage period
            </Label>
            <Select value={usagePeriodMonths} onValueChange={setUsagePeriodMonths}>
              <SelectTrigger id="ars-usage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-purpose" className="text-caption">
              Request purpose
            </Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger id="ars-purpose">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ACCESS_PURPOSE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-version" className="text-caption">
              Pin to version
            </Label>
            <Select value={pinnedVersionId} onValueChange={setPinnedVersionId}>
              <SelectTrigger id="ars-version">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {pinOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} · {BRD_STATUS_LABEL[v.status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars-notes" className="text-caption">
              Notes (optional)
            </Label>
            <Textarea
              id="ars-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Submit request
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
