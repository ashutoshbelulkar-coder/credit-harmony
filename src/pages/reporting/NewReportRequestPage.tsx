import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateReport } from "@/hooks/api/useReports";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { useProducts } from "@/hooks/api/useProducts";

const reportRequestSchema = z.object({
  reportType: z.string().min(1, "Report type is required"),
  institution: z.string().optional(),
  productType: z.string().optional(),
  dateFrom: z.string().min(1, "Date from is required"),
  dateTo: z.string().min(1, "Date to is required"),
  outputFormat: z.string().optional(),
}).refine((data) => {
  if (!data.dateFrom || !data.dateTo) return true;
  return new Date(data.dateTo) >= new Date(data.dateFrom);
}, { message: "Date to must be on or after date from", path: ["dateTo"] });

type ReportRequestFormData = z.infer<typeof reportRequestSchema>;

const OUTPUT_FORMAT_OPTIONS = [
  { value: "Excel", label: "Excel" },
  { value: "CSV", label: "CSV" },
  { value: "PDF", label: "PDF" },
];

export function NewReportRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mutate: createReport, isPending } = useCreateReport();
  const { data: institutionsPage } = useInstitutions({ size: 50 });
  const { data: productsPage } = useProducts({ size: 50 });

  const institutionList = institutionsPage?.content ?? [];
  const productOptions = (productsPage?.content ?? []).map((p) => ({ value: p.id, label: p.name }));

  const form = useForm<ReportRequestFormData>({
    resolver: zodResolver(reportRequestSchema),
    defaultValues: {
      reportType: "",
      institution: "all",
      productType: "all",
      dateFrom: "",
      dateTo: "",
      outputFormat: "Excel",
    },
    mode: "onTouched",
  });

  const onSubmit = (data: ReportRequestFormData) => {
    const institutionLabel = data.institution && data.institution !== "all"
      ? institutionList.find((i) => String(i.id) === data.institution)?.name ?? data.institution
      : undefined;
    const productLabel = data.productType && data.productType !== "all"
      ? productOptions.find((o) => o.value === data.productType)?.label ?? data.productType
      : undefined;

    createReport(
      {
        type: data.reportType,
        name: `${data.reportType} — ${data.dateFrom} to ${data.dateTo}`,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        parameters: {
          ...(institutionLabel ? { institution: institutionLabel } : {}),
          ...(productLabel ? { productType: productLabel } : {}),
          outputFormat: data.outputFormat ?? "Excel",
          requestedBy: user?.email ?? "",
        },
      },
      {
        onSuccess: () => navigate("/reporting"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">New Report Request</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Request a new credit bureau report. Select report type, date range, and options.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="reportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption">Report Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-caption">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Operational Reports</SelectLabel>
                        <SelectItem value="Submission Volume Report" className="text-caption">Submission Volume Report</SelectItem>
                        <SelectItem value="Enquiry Volume Report" className="text-caption">Enquiry Volume Report</SelectItem>
                        <SelectItem value="SLA Performance Report" className="text-caption">SLA Performance Report</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Risk Reports</SelectLabel>
                        <SelectItem value="Utilization Analysis" className="text-caption">Utilization Analysis</SelectItem>
                        <SelectItem value="Portfolio Risk Snapshot" className="text-caption">Portfolio Risk Snapshot</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Compliance Reports</SelectLabel>
                        <SelectItem value="Consent Audit Report" className="text-caption">Consent Audit Report</SelectItem>
                        <SelectItem value="Data Access Log Report" className="text-caption">Data Access Log Report</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Commercial Reports</SelectLabel>
                        <SelectItem value="Institution Billing Report" className="text-caption">Institution Billing Report</SelectItem>
                        <SelectItem value="Alternate Data Usage Report" className="text-caption">Alternate Data Usage Report</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption">Member institution (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "all"}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-caption">
                        <SelectValue placeholder="All institutions" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all" className="text-caption">All institutions</SelectItem>
                      {institutionList.map((inst) => (
                        <SelectItem key={inst.id} value={String(inst.id)} className="text-caption">
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption">Data Product (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "all"}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-caption">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all" className="text-caption">
                        All
                      </SelectItem>
                      {productOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-caption">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption">Date From *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} className="h-8 text-caption" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption">Date To *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} className="h-8 text-caption" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="outputFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption">Output Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "Excel"}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-caption">
                        <SelectValue placeholder="Excel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OUTPUT_FORMAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-caption">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="default" size="sm" disabled={isPending}>
                {isPending ? "Submitting…" : "Submit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/reporting")}
              >
                Close
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
