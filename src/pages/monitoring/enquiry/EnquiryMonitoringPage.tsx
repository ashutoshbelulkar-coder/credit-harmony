import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { EnquiryChrome, type EnquiryChromeState } from "./EnquiryChrome";
import { EnquiryOverview } from "./EnquiryOverview";
import { EnquiryMembers } from "./EnquiryMembers";
import { EnquiryProducts } from "./EnquiryProducts";
import { EnquiryTrace } from "./EnquiryTrace";
import {
  applyBucketJitter,
  buildEnquirySnapshot,
  type EnquiryAnchorFilter,
  type EnquiryEntityFilter,
  type EnquiryTab,
  type EnquiryTypeFilter,
  type EnquiryWindow,
} from "./enquiryScaleMock";

function parseWindow(v: string | null): EnquiryWindow {
  return v === "1h" || v === "7d" || v === "30d" || v === "90d" || v === "24h" ? v : "24h";
}
function parseType(v: string | null): EnquiryTypeFilter {
  return v === "HARD" || v === "SOFT" || v === "all" ? v : "all";
}
function parseAnchor(v: string | null): EnquiryAnchorFilter {
  return v === "CURRENT" || v === "AS_OF" || v === "all" ? v : "all";
}
function parseEntity(v: string | null): EnquiryEntityFilter {
  return v === "INDIVIDUAL" || v === "ORGANIZATION" || v === "JOINT" || v === "all" ? v : "all";
}
function parseTab(v: string | null): EnquiryTab {
  return v === "members" || v === "products" || v === "trace" || v === "overview" ? v : "overview";
}

export function EnquiryMonitoringPage() {
  const [params, setParams] = useSearchParams();
  const chrome: EnquiryChromeState = {
    window: parseWindow(params.get("window")),
    type: parseType(params.get("type")),
    anchor: parseAnchor(params.get("anchor")),
    entity: parseEntity(params.get("entity")),
    productId: params.get("product") || "all",
    memberId: params.get("member") || "all",
  };
  const tab = parseTab(params.get("tab"));
  const filterCode = params.get("code");
  const simulate = params.get("simulate");
  const refParam = params.get("ref") ?? "";

  const [traceJump, setTraceJump] = useState(refParam);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setRefreshing(true);
      window.setTimeout(() => {
        setTick((n) => n + 1);
        setRefreshing(false);
      }, 80);
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const patchParams = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (!v || v === "all" || (k === "tab" && v === "overview") || (k === "window" && v === "24h")) {
              if (k === "tab" && v === "overview") p.delete("tab");
              else if (k === "window" && v === "24h") p.delete("window");
              else if (v === "all" || !v) p.delete(k);
              else p.set(k, v);
            } else {
              p.set(k, v);
            }
          }
          return p;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const onChromeChange = (partial: Partial<EnquiryChromeState>) => {
    patchParams({
      window: partial.window ?? chrome.window,
      type: partial.type ?? chrome.type,
      anchor: partial.anchor ?? chrome.anchor,
      entity: partial.entity ?? chrome.entity,
      product: partial.productId ?? chrome.productId,
      member: partial.memberId ?? chrome.memberId,
    });
  };

  const baseSnapshot = useMemo(
    () =>
      buildEnquirySnapshot({
        window: chrome.window,
        type: chrome.type,
        anchor: chrome.anchor,
        entity: chrome.entity,
        productId: chrome.productId,
        memberId: chrome.memberId,
      }, nowMs),
    [chrome.window, chrome.type, chrome.anchor, chrome.entity, chrome.productId, chrome.memberId, nowMs]
  );

  const snapshot = useMemo(() => applyBucketJitter(baseSnapshot, tick), [baseSnapshot, tick]);

  const goTrace = (ref: string) => {
    setTraceJump(ref);
    patchParams({ tab: "trace", ref });
  };

  const retry = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setTick((n) => n + 1);
      setRefreshing(false);
    }, 80);
  };

  if (!ready) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (simulate === "accessDenied") {
    return (
      <div className="space-y-6 animate-fade-in">
        <EnquiryChrome title="Enquiry API" />
        <ApiErrorCard error={new ApiError(403, "FORBIDDEN", "Access denied")} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="space-y-6 laptop:space-y-5 animate-fade-in min-w-0">
      {simulate === "stale" && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-caption text-foreground">
          Monitoring data is delayed (last update 12 min ago)
        </div>
      )}
      {simulate === "panelError" && (
        <ApiErrorCard error={new ApiError(503, "UNAVAILABLE", "Panel failed to load")} onRetry={retry} />
      )}

      <EnquiryChrome title="Enquiry API" />

      <Tabs
        value={tab}
        onValueChange={(v) => patchParams({ tab: v })}
      >
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-md bg-muted/60 p-1">
          <TabsTrigger
            value="overview"
            className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium"
          >
            Products
          </TabsTrigger>
          <TabsTrigger
            value="trace"
            className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium"
          >
            Trace
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <EnquiryOverview
            snapshot={snapshot}
            chrome={chrome}
            onChromeChange={onChromeChange}
            filterCode={filterCode}
            onFilterCode={(code) => patchParams({ code })}
            onTrace={goTrace}
            onRefresh={retry}
            refreshing={refreshing}
          />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <EnquiryMembers
            rows={snapshot.members}
            filterCode={filterCode}
            onClearCode={() => patchParams({ code: null })}
            onLockMember={(id) => {
              patchParams({ member: id, tab: "overview" });
            }}
            largeSet={chrome.window === "90d" && chrome.memberId === "all"}
          />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <EnquiryProducts
            rows={snapshot.products}
            catalog={snapshot.catalog}
            chrome={chrome}
            onChromeChange={onChromeChange}
            onSelectProduct={(productId) => patchParams({ product: productId, tab: "overview" })}
          />
        </TabsContent>
        <TabsContent value="trace" className="mt-4 min-w-0">
          <EnquiryTrace
            traces={snapshot.traces}
            initialQuery={traceJump || refParam}
            onQueryConsumed={() => setTraceJump("")}
            onLockMember={(id) => patchParams({ member: id, tab: "overview" })}
            filterCode={filterCode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
