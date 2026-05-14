import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { validateSubjectFields, type SubjectInputFields } from "@/services/dataManagement.service";
import type { Subject, SubjectIdType, SubjectStatus } from "@/types/data-management";

const ID_TYPES: { value: SubjectIdType; label: string }[] = [
  { value: "PAN", label: "PAN" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "SSN", label: "SSN" },
  { value: "PASSPORT", label: "Passport" },
  { value: "UUID", label: "UUID" },
  { value: "CUSTOM", label: "Custom" },
];

const STATUS_OPTIONS: { value: SubjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PENDING", label: "Pending" },
];

export type SubjectFormValues = SubjectInputFields;

function fromSubject(subject?: Subject | null): SubjectFormValues {
  return {
    firstName: subject?.firstName ?? "",
    lastName: subject?.lastName ?? "",
    dateOfBirth: subject?.dateOfBirth ?? "",
    govIdType: subject?.govIdType ?? "PAN",
    govIdNumber: subject?.govIdNumber ?? "",
    email: subject?.email ?? "",
    phone: subject?.phone ?? "",
    address: subject?.address ?? "",
    status: subject?.status ?? "ACTIVE",
  };
}

interface SubjectFormProps {
  mode: "create" | "edit";
  subject?: Subject | null;
  /**
   * Controls disabling/enabling the form. Submit is also blocked when no
   * fields differ from the original subject in edit mode.
   */
  readOnly?: boolean;
  busy?: boolean;
  /** External errors keyed by field name. */
  externalErrors?: Record<string, string>;
  onCancel?: () => void;
  onSubmit: (values: SubjectFormValues) => void;
}

export function SubjectForm({
  mode,
  subject,
  readOnly,
  busy,
  externalErrors,
  onCancel,
  onSubmit,
}: SubjectFormProps) {
  const initialValues = useMemo(() => fromSubject(subject), [subject]);
  const [values, setValues] = useState<SubjectFormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setValues(initialValues);
    setTouched({});
  }, [initialValues]);

  const localErrors = useMemo(() => validateSubjectFields(values), [values]);
  const errors = { ...localErrors, ...externalErrors };

  function update<K extends keyof SubjectFormValues>(key: K, value: SubjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function fieldError(key: keyof SubjectFormValues): string | undefined {
    if (!touched[key] && !externalErrors?.[key]) return undefined;
    return errors[key];
  }

  const hasChanges = useMemo(() => {
    const keys = Object.keys(initialValues) as (keyof SubjectFormValues)[];
    return keys.some((k) => initialValues[k] !== values[k]);
  }, [initialValues, values]);

  const submitDisabled =
    readOnly ||
    busy ||
    Object.keys(localErrors).length > 0 ||
    (mode === "edit" && !hasChanges);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      govIdType: true,
      govIdNumber: true,
      email: true,
      phone: true,
      status: true,
      address: true,
    });
    if (Object.keys(localErrors).length > 0) return;
    onSubmit(values);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-label="Subject form">
      {subject && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-caption uppercase tracking-wider text-muted-foreground">Subject ID</p>
          <p className="mt-1 font-mono text-body text-foreground" data-testid="subject-id">
            {subject.subjectId}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="First Name"
          required
          error={fieldError("firstName")}
        >
          <Input
            value={values.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            disabled={readOnly}
            aria-invalid={fieldError("firstName") ? true : undefined}
          />
        </FormField>
        <FormField label="Last Name" required error={fieldError("lastName")}>
          <Input
            value={values.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            disabled={readOnly}
            aria-invalid={fieldError("lastName") ? true : undefined}
          />
        </FormField>
        <FormField label="Date of Birth" required error={fieldError("dateOfBirth")}>
          <Input
            type="date"
            value={values.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            disabled={readOnly}
            aria-invalid={fieldError("dateOfBirth") ? true : undefined}
          />
        </FormField>
        <FormField label="Status" required error={fieldError("status")}>
          <Select
            value={values.status}
            onValueChange={(v) => update("status", v as SubjectStatus)}
            disabled={readOnly}
          >
            <SelectTrigger aria-invalid={fieldError("status") ? true : undefined}>
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Government ID type" required error={fieldError("govIdType")}>
          <Select
            value={values.govIdType}
            onValueChange={(v) => update("govIdType", v as SubjectIdType)}
            disabled={readOnly}
          >
            <SelectTrigger aria-invalid={fieldError("govIdType") ? true : undefined}>
              <SelectValue placeholder="Choose ID type" />
            </SelectTrigger>
            <SelectContent>
              {ID_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Government ID number" required error={fieldError("govIdNumber")}>
          <Input
            value={values.govIdNumber}
            onChange={(e) => update("govIdNumber", e.target.value)}
            disabled={readOnly}
            aria-invalid={fieldError("govIdNumber") ? true : undefined}
            placeholder="ABCDE1234X"
          />
        </FormField>
        <FormField label="Email" required error={fieldError("email")}>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={readOnly}
            aria-invalid={fieldError("email") ? true : undefined}
          />
        </FormField>
        <FormField label="Phone" error={fieldError("phone")}>
          <Input
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            disabled={readOnly}
            placeholder="+91-9876543210"
            aria-invalid={fieldError("phone") ? true : undefined}
          />
        </FormField>
      </div>

      <FormField label="Address" error={fieldError("address")} className="md:col-span-2">
        <Textarea
          value={values.address}
          onChange={(e) => update("address", e.target.value)}
          disabled={readOnly}
          rows={2}
        />
      </FormField>

      {externalErrors?._ && (
        <p className="text-caption text-destructive" role="alert">{externalErrors._}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create subject" : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-caption text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}
