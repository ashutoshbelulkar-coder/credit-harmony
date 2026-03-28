import { useState, useMemo } from "react";
import { ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, MessageSquare, Building2, ScrollText, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { SkeletonKpiCards } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import type { ApprovalItem, ApprovalStatus } from "@/types/approval-queue";
import { calcPendingCount, calcApprovedThisMonth, calcChangesRequestedCount } from "@/lib/calc/kpiCalc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useApprovals, useApproveItem, useRejectItem, useRequestChanges } from "@/hooks/api/useApprovals";

const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-warning/15 text-warning border-warning/20", icon: Clock },
  approved: { label: "Approved", color: "bg-success/15 text-success border-success/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive border-destructive/20", icon: XCircle },
  changes_requested: { label: "Changes Requested", color: "bg-info/15 text-info border-info/20", icon: AlertTriangle },
};

export function ApprovalQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState("all");
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; item: ApprovalItem | null; mode: "reject" | "changes" }>({ open: false, item: null, mode: "reject" });
  const [reason, setReason] = useState("");

  const { data: approvalsData, isLoading, isError, error, refetch } = useApprovals();
  const approveItem = useApproveItem();
  const rejectItemMutation = useRejectItem();
  const requestChangesMutation = useRequestChanges();

  const items: ApprovalItem[] = useMemo(() => {
    if (!approvalsData) return [];
    if (Array.isArray(approvalsData)) return approvalsData as ApprovalItem[];
    if (Array.isArray((approvalsData as { content?: ApprovalItem[] }).content)) return (approvalsData as { content: ApprovalItem[] }).content;
    return [];
  }, [approvalsData]);

  const tabTypeMap: Record<string, string> = {
    institutions: "institution",
    mappings: "schema_mapping",
    consortiums: "consortium",
    products: "product",
  };

  const filtered = items.filter((item) => {
    if (tab !== "all" && item.type !== tabTypeMap[tab]) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = calcPendingCount(items);
  const approvedToday = calcApprovedThisMonth(items);
  const changesCount = calcChangesRequestedCount(items);

  const handleApprove = (item: ApprovalItem) => {
    approveItem.mutate({ id: item.id, comment: "Approved via portal" });
    setDetailItem(null);
  };

  const handleRejectOrChanges = () => {
    if (!rejectDialog.item || !reason.trim()) return;
    if (rejectDialog.mode === "reject") {
      rejectItemMutation.mutate({ id: rejectDialog.item.id, reason });
    } else {
      requestChangesMutation.mutate({ id: rejectDialog.item.id, comment: reason });
    }
    setRejectDialog({ open: false, item: null, mode: "reject" });
    setReason("");
    setDetailItem(null);
  };

  const kpis = [
    { label: "Pending Approval", value: pendingCount, icon: Clock, accent: "text-warning" },
    { label: "Approved This Month", value: approvedToday, icon: CheckCircle2, accent: "text-success" },
    { label: "Changes Requested", value: changesCount, icon: AlertTriangle, accent: "text-info" },
    { label: "Total Items", value: items.length, icon: ClipboardCheck, accent: "text-primary" },
  ];

  return (
    <>
      <PageBreadcrumb segments={[{ label: "Approval Queue" }]} />

      <div className="space-y-5">
        <div>
          <h1 className="text-h2 font-bold text-foreground">Approval Queue</h1>
          <p className="text-caption text-muted-foreground mt-1">Review and approve institution registrations and schema mappings</p>
        </div>

        {/* KPIs */}
        {isLoading && <SkeletonKpiCards count={4} />}
        {isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}
        {!isLoading && !isError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-muted", kpi.accent)}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-h3 font-bold tabular-nums text-foreground">{kpi.value}</p>
                  <p className="text-caption text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {/* Filters + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="institutions">Institutions</TabsTrigger>
              <TabsTrigger value="mappings">Schema Mappings</TabsTrigger>
              <TabsTrigger value="consortiums">Consortiums</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="changes_requested">Changes Requested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-caption">Type</TableHead>
                  <TableHead className="text-caption">Name</TableHead>
                  <TableHead className="text-caption hidden md:table-cell">Submitted By</TableHead>
                  <TableHead className="text-caption hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-caption">Status</TableHead>
                  <TableHead className="text-caption text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-body">
                      No items match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((item) => {
                  const sc = statusConfig[item.status];
                  const StatusIcon = sc.icon;
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.type === "institution" && <Building2 className="w-3.5 h-3.5 text-muted-foreground" />}
                          {item.type === "schema_mapping" && <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />}
                          {item.type === "consortium" && <Users className="w-3.5 h-3.5 text-muted-foreground" />}
                          {item.type === "product" && <Package className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-caption font-medium text-muted-foreground">
                            {item.type === "institution" ? "Institution" : item.type === "schema_mapping" ? "Mapping" : item.type === "consortium" ? "Consortium" : "Product"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-body font-medium text-foreground">{item.name}</p>
                        <p className="text-caption text-muted-foreground hidden sm:block">{item.description}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-body text-muted-foreground">{item.submittedBy}</TableCell>
                      <TableCell className="hidden lg:table-cell text-caption text-muted-foreground tabular-nums">{format(new Date(item.submittedAt), "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-[10px] font-medium border", sc.color)}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setDetailItem(item)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-h4">{detailItem?.name}</SheetTitle>
            <SheetDescription>{detailItem?.description}</SheetDescription>
          </SheetHeader>
          {detailItem && (
            <div className="mt-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("gap-1 text-[10px] font-medium border", statusConfig[detailItem.status].color)}>
                  {(() => { const I = statusConfig[detailItem.status].icon; return <I className="w-3 h-3" />; })()}
                  {statusConfig[detailItem.status].label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {detailItem.type === "institution" ? "Institution"
                    : detailItem.type === "schema_mapping" ? "Schema Mapping"
                    : detailItem.type === "consortium" ? "Consortium"
                    : "Product"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
                {Object.entries(detailItem.metadata).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-caption text-muted-foreground">{key}</span>
                    <span className="text-body font-medium text-foreground text-right">{val}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">Submission</h4>
                <div className="flex justify-between">
                  <span className="text-caption text-muted-foreground">Submitted by</span>
                  <span className="text-body font-medium text-foreground">{detailItem.submittedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption text-muted-foreground">Date</span>
                  <span className="text-body text-foreground tabular-nums">{format(new Date(detailItem.submittedAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                {detailItem.reviewedBy && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-caption text-muted-foreground">Reviewed by</span>
                      <span className="text-body font-medium text-foreground">{detailItem.reviewedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-muted-foreground">Reviewed on</span>
                      <span className="text-body text-foreground tabular-nums">{format(new Date(detailItem.reviewedAt!), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                  </>
                )}
              </div>

              {detailItem.rejectionReason && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-caption font-semibold text-destructive mb-1">
                      {detailItem.status === "changes_requested" ? "Requested Changes" : "Rejection Reason"}
                    </p>
                    <p className="text-body text-foreground">{detailItem.rejectionReason}</p>
                  </div>
                </>
              )}

              {detailItem.status === "pending" && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(detailItem)}>
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setRejectDialog({ open: true, item: detailItem, mode: "reject" })}>
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRejectDialog({ open: true, item: detailItem, mode: "changes" })}>
                      <MessageSquare className="w-3.5 h-3.5" /> Request Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject / Request Changes Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, item: null, mode: "reject" }); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectDialog.mode === "reject" ? "Reject Item" : "Request Changes"}</DialogTitle>
            <DialogDescription>
              {rejectDialog.mode === "reject"
                ? `Provide a reason for rejecting "${rejectDialog.item?.name}".`
                : `Describe the changes needed for "${rejectDialog.item?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={rejectDialog.mode === "reject" ? "Reason for rejection…" : "Describe changes needed…"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog({ open: false, item: null, mode: "reject" }); setReason(""); }}>Cancel</Button>
            <Button variant={rejectDialog.mode === "reject" ? "destructive" : "default"} disabled={!reason.trim()} onClick={handleRejectOrChanges}>
              {rejectDialog.mode === "reject" ? "Reject" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
