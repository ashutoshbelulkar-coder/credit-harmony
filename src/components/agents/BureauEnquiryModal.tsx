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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-h4 font-semibold">Run Bureau Enquiry</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          <h3 className="text-body font-medium text-foreground">Personal Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Enter full name"
                className="text-base sm:text-sm"
              />
              {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pan">PAN *</Label>
              <Input
                id="pan"
                value={form.pan}
                onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="text-base sm:text-sm uppercase"
              />
              {errors.pan && <p className="text-[10px] text-destructive">{errors.pan}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
                className="text-base sm:text-sm"
              />
              {errors.mobile && <p className="text-[10px] text-destructive">{errors.mobile}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="text-base sm:text-sm"
              />
              {errors.dob && <p className="text-[10px] text-destructive">{errors.dob}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Enter full address"
              className="text-base sm:text-sm"
            />
            {errors.address && <p className="text-[10px] text-destructive">{errors.address}</p>}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(c) => setConsent(!!c)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="consent" className="text-caption cursor-pointer">
                I confirm that explicit consent has been obtained from the customer for this bureau enquiry as per regulatory requirements.
              </Label>
              {errors.consent && (
                <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.consent}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={handleClose} className="min-w-0 flex-1 sm:flex-initial">Cancel</Button>
          <Button onClick={handleSubmit} className="min-w-0 flex-1 sm:flex-initial">Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
