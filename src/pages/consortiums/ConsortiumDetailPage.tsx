import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses, detailPageTabTriggerBaseClasses } from "@/lib/typography";
import {
  consortiumListLabel,
  consortiumListLabelStyles,
  consortiumTypeBadgeClass,
  consortiumContributionSummaryById as mockContributionSummary,
} from "@/data/consortiums-mock";
import { useConsortium, useConsortiumMembers } from "@/hooks/api/useConsortiums";
import type { ConsortiumMember } from "@/services/consortiums.service";

const DETAIL_TABS = ["Overview", "Members", "Data Contribution"] as const;

export default function ConsortiumDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] =
    useState<(typeof DETAIL_TABS)[number]>("Overview");

  const { data: consortium, isLoading } = useConsortium(id ?? "");
  const { data: membersData } = useConsortiumMembers(id ?? "");

  const members: ConsortiumMember[] = useMemo(() => {
    if (!membersData) return [];
    return Array.isArray(membersData)
      ? (membersData as ConsortiumMember[])
      : ((membersData as { content?: ConsortiumMember[] }).content ?? []);
  }, [membersData]);

  const contributionSummary = useMemo(
    () => (id ? mockContributionSummary[id] : undefined),
    [id]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-caption text-muted-foreground">Loading consortium…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!consortium) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-[10px] text-muted-foreground">Consortium not found.</p>
          <button
            type="button"
            onClick={() => navigate("/consortiums")}
            className="text-[10px] text-primary hover:underline"
          >
            Back to Consortiums
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabel = consortiumListLabel(consortium.status);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageBreadcrumb
          segments={[
            { label: "Dashboard", href: "/" },
            { label: "Consortiums", href: "/consortiums" },
            { label: consortium.name },
          ]}
        />

        <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-h2 font-semibold text-foreground break-words">
                {consortium.name}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(badgeTextClasses, consortiumTypeBadgeClass[consortium.type])}
                >
                  {consortium.type}
                </Badge>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    badgeTextClasses,
                    consortiumListLabelStyles(statusLabel)
                  )}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 sm:self-auto"
            onClick={() => navigate(`/consortiums/${consortium.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Edit
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card px-1.5 py-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto overflow-y-hidden -mx-0.5 md:overflow-visible md:mx-0">
            <div className="flex items-center gap-0.5 min-w-0 w-max md:w-full md:flex-wrap md:min-w-0">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    detailPageTabTriggerBaseClasses,
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "Overview" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-[10px] text-muted-foreground">
                <p>
                  <span className="text-foreground font-medium">Purpose:</span>{" "}
                  {consortium.purpose}
                </p>
                <p>
                  <span className="text-foreground font-medium">Governance:</span>{" "}
                  {consortium.governanceModel}
                </p>
                <p>
                  <span className="text-foreground font-medium">Status:</span>{" "}
                  {statusLabel}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-[10px] font-medium text-muted-foreground">Scale</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                <p className="text-h3 font-bold tabular-nums text-foreground">
                  {consortium.membersCount}
                  <span className="text-[10px] font-normal text-muted-foreground ml-2">
                    members
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">{consortium.dataVolume}</p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">
                  {consortium.description ?? "No additional description for this consortium."}
                </p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Data policy</CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground space-y-1">
                <p className="text-caption text-muted-foreground">
                  Data policy configuration is managed separately by consortium administrators.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "Members" && (
          <div className="space-y-3">
            <div className="md:hidden space-y-3">
              {members.length === 0 ? (
                <p className="text-caption text-muted-foreground py-6 text-center">No members found.</p>
              ) : (
                members.map((m) => (
                  <Card key={m.id ?? `${m.institutionId}-${m.institutionName}`}>
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-[10px] font-medium text-foreground">{m.institutionName}</p>
                      <p className="text-caption text-muted-foreground">
                        Role: {m.role} · Joined {m.joinedAt ? m.joinedAt.split("T")[0] : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-muted/80">
                    <tr className="border-b border-border">
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Institution
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Role
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-caption text-muted-foreground">
                          No members found for this consortium.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr
                          key={m.id ?? `${m.institutionId}-${m.institutionName}`}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 text-[10px]">{m.institutionName}</td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground">{m.role}</td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground tabular-nums">
                            {m.joinedAt ? m.joinedAt.split("T")[0] : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Data Contribution" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-[10px] font-medium text-muted-foreground">Total records shared</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-h3 font-bold tabular-nums text-foreground">
                  {contributionSummary?.totalRecordsShared ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-[10px] font-medium text-muted-foreground">Last updated</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-[10px] text-muted-foreground">
                  {contributionSummary?.lastUpdated ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle>Data types</CardTitle>
              </CardHeader>
              <CardContent>
                {(contributionSummary?.dataTypes.length ?? 0) === 0 ? (
                  <p className="text-caption text-muted-foreground">No data types listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {contributionSummary!.dataTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
