import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: { fullName: string; pan: string; mobile: string; dob: string; address: string }) => void;
}

export function BureauEnquiryModal({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    fullName: "",
    pan: "",
    mobile: "",
    dob: "",
    address: "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.pan.trim()) errs.pan = "PAN is required";
    else if (!panRegex.test(form.pan.toUpperCase())) errs.pan = "Invalid PAN format (e.g., ABCDE1234F)";
    if (!form.mobile.trim()) errs.mobile = "Mobile number is required";
    if (!form.dob.trim()) errs.dob = "Date of birth is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!consent) errs.consent = "Consent is mandatory for bureau access";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ ...form, pan: form.pan.toUpperCase() });
    setForm({ fullName: "", pan: "", mobile: "", dob: "", address: "" });
    setConsent(false);
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const scrollFocusedInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    requestAnimationFrame(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={[
          "flex w-full max-w-none flex-col gap-4 overflow-hidden overflow-x-hidden",
          "bottom-0 left-0 right-0 top-auto max-h-[92dvh] translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none border-b-0",
          "px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
          "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[90dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:rounded-t-2xl sm:border-b sm:p-6",
        ].join(" ")}
      >
        {/* Drag handle – mobile only */}
        <div className="sm:hidden shrink-0 flex justify-center pt-1 pb-2" aria-hidden>
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        <DialogHeader className="shrink-0 pt-0 sm:pt-0">
          <DialogTitle className="text-h4 font-semibold text-left">Run Bureau Enquiry</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain py-2 px-3">
          <div className="space-y-4 pb-4 min-w-0">
          <h3 className="text-body font-medium text-foreground">Personal Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                onFocus={scrollFocusedInputIntoView}
                placeholder="Enter full name"
                className="min-h-11 w-full min-w-0 text-base touch-manipulation sm:min-h-10 sm:text-sm box-border"
              />
              {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="pan">PAN *</Label>
              <Input
                id="pan"
                value={form.pan}
                onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                onFocus={scrollFocusedInputIntoView}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="min-h-11 w-full min-w-0 text-base touch-manipulation uppercase sm:min-h-10 sm:text-sm box-border"
              />
              {errors.pan && <p className="text-[10px] text-destructive">{errors.pan}</p>}
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                onFocus={scrollFocusedInputIntoView}
                placeholder="+91 98765 43210"
                className="min-h-11 w-full min-w-0 text-base touch-manipulation sm:min-h-10 sm:text-sm box-border"
              />
              {errors.mobile && <p className="text-[10px] text-destructive">{errors.mobile}</p>}
            </div>
            <div className="space-y-1.5 min-w-0 w-full">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                onFocus={scrollFocusedInputIntoView}
                className="min-h-11 w-full min-w-0 text-base touch-manipulation sm:min-h-10 sm:text-sm box-border"
              />
              {errors.dob && <p className="text-[10px] text-destructive">{errors.dob}</p>}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              onFocus={scrollFocusedInputIntoView}
              placeholder="Enter full address"
              className="min-h-11 w-full min-w-0 text-base touch-manipulation sm:min-h-10 sm:text-sm box-border"
            />
            {errors.address && <p className="text-[10px] text-destructive">{errors.address}</p>}
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl border border-warning/30 bg-warning/5 touch-manipulation">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(c) => setConsent(!!c)}
              className="mt-0.5 size-5 shrink-0"
            />
            <div className="min-w-0">
              <Label htmlFor="consent" className="text-xs cursor-pointer leading-tight block truncate">
                I confirm that explicit consent has been obtained from the customer for this bureau enquiry as per regulatory requirements.
              </Label>
              {errors.consent && (
                <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {errors.consent}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2 sm:pt-4">
            <Button variant="outline" onClick={handleClose} className="w-full min-h-11 touch-manipulation sm:min-h-10 sm:w-auto sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="w-full min-h-11 touch-manipulation sm:min-h-10 sm:w-auto sm:flex-initial">
              Submit
            </Button>
          </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
