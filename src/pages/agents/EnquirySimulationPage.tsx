import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import {
  configuredProducts,
  getMockPayloadForPacket,
  getPacketsByIds,
  enquirySectionKeyForPacket,
  resolvePayloadPacketName,
} from "@/data/data-products-mock";
import { useCatalogMock } from "@/contexts/CatalogMockContext";
import { cn } from "@/lib/utils";

const sectionOrder = ["bureau", "banking", "consortium"] as const;
const sectionTitles: Record<(typeof sectionOrder)[number], string> = {
  bureau: "Bureau",
  banking: "Banking",
  consortium: "Consortium",
};

export default function EnquirySimulationPage() {
  const navigate = useNavigate();
  const { products } = useCatalogMock();
  const productOptions = useMemo(() => {
    const map = new Map(configuredProducts.map((p) => [p.id, p]));
    products.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [products]);
  const [productId, setProductId] = useState(productOptions[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("Jane Wanjiku");
  const [consumerId, setConsumerId] = useState("CB-00192884");
  const [customerId, setCustomerId] = useState("ID-884921");
  const [dob, setDob] = useState("1990-08-14");
  const [governmentId, setGovernmentId] = useState("PAN-AYZPK9123D");
  const [mobile, setMobile] = useState("+254 712 000 000");
  const [address, setAddress] = useState("MG Road, Bengaluru");
  const [enquiryPurpose, setEnquiryPurpose] = useState<
    "loan_application" | "credit_card" | "kyc_verification" | "account_review" | "collection" | "soft_pull"
  >("loan_application");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ReturnType<typeof buildResponse> | null>(null);

  useEffect(() => {
    if (productOptions.length === 0) return;
    if (!productOptions.some((p) => p.id === productId)) {
      setProductId(productOptions[0]!.id);
    }
  }, [productOptions, productId]);

  function buildResponse() {
    const product = productOptions.find((p) => p.id === productId);
    const packetNames =
      product != null
        ? getPacketsByIds(product.packetIds).map((p) => p.name)
        : [];

    const packets: Record<string, Record<string, unknown>> = {};
    packetNames.forEach((name) => {
      const resolved = resolvePayloadPacketName(name);
      packets[name] = getMockPayloadForPacket(resolved);
    });

    return {
      enquiryId: `ENQ-${Date.now()}`,
      productId: product?.id,
      productName: product?.name,
      customer: {
        consumerId,
        fullName: customerName,
        ref: customerId,
        dob,
        governmentId,
        mobile,
        address,
      },
      enquiryPurpose,
      generatedAt: new Date().toISOString(),
      packets,
    };
  }

  const handleRun = useCallback(() => {
    setRunning(true);
    setResponse(null);
    setTimeout(() => {
      setResponse(buildResponse());
      setRunning(false);
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, customerName, consumerId, customerId, dob, governmentId, mobile, address, enquiryPurpose, productOptions]);

  const requestPreview = useMemo(() => {
    const product = productOptions.find((p) => p.id === productId);
    return {
      productId,
      productName: product?.name ?? null,
      customer: {
        consumerId,
        fullName: customerName,
        ref: customerId,
        dob,
        governmentId,
        mobile,
        address,
      },
      enquiryPurpose,
    };
  }, [productId, customerName, consumerId, customerId, dob, governmentId, mobile, address, enquiryPurpose, productOptions]);

  const groupedSections = useMemo(() => {
    if (!response) return [];
    const product = productOptions.find((p) => p.id === productId);
    const map: Record<
      (typeof sectionOrder)[number],
      { name: string; payload: Record<string, unknown> }[]
    > = { bureau: [], banking: [], consortium: [] };

    const meta = product != null ? getPacketsByIds(product.packetIds) : [];
    Object.entries(response.packets).forEach(([name, payload]) => {
      const pkt = meta.find((p) => p.name === name);
      const key = pkt ? enquirySectionKeyForPacket(pkt) : "banking";
      map[key].push({ name, payload: payload as Record<string, unknown> });
    });
    return sectionOrder.map((key) => ({
      key,
      title: sectionTitles[key],
      items: map[key],
    }));
  }, [response, productOptions, productId]);

  return (
    <div className="space-y-6 w-full max-w-2xl lg:max-w-5xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Enquiry simulation" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => navigate("/data-products/products")}
          aria-label="Back to products"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 tabIndex={-1} className="text-h2 font-semibold text-foreground">
          Enquiry simulation
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
      {/* Request inputs */}
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px]">Product</Label>
            <Select
              value={productId}
              onValueChange={(val) => { setProductId(val); setResponse(null); }}
              disabled={productOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eq-name" className="text-[10px]">
              Customer name
            </Label>
            <Input
              id="eq-name"
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setResponse(null); }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-consumer-id" className="text-[10px]">
                Consumer ID
              </Label>
              <Input
                id="eq-consumer-id"
                value={consumerId}
                onChange={(e) => { setConsumerId(e.target.value); setResponse(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-dob" className="text-[10px]">
                DOB
              </Label>
              <Input
                id="eq-dob"
                type="date"
                value={dob}
                onChange={(e) => { setDob(e.target.value); setResponse(null); }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-id" className="text-[10px]">
                Customer reference
              </Label>
              <Input
                id="eq-id"
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); setResponse(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-gov-id" className="text-[10px]">
                Government ID
              </Label>
              <Input
                id="eq-gov-id"
                value={governmentId}
                onChange={(e) => { setGovernmentId(e.target.value); setResponse(null); }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-mobile" className="text-[10px]">
                Mobile
              </Label>
              <Input
                id="eq-mobile"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); setResponse(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-purpose" className="text-[10px]">
                Enquiry purpose
              </Label>
              <Select
                value={enquiryPurpose}
                onValueChange={(val) => {
                  setEnquiryPurpose(
                    val as "loan_application" | "credit_card" | "kyc_verification" | "account_review" | "collection" | "soft_pull"
                  );
                  setResponse(null);
                }}
              >
                <SelectTrigger id="eq-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan_application">Loan Application</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="kyc_verification">KYC / Verification</SelectItem>
                  <SelectItem value="account_review">Account Review</SelectItem>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="soft_pull">Pre-approved / Soft Pull</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eq-address" className="text-[10px]">
              Address
            </Label>
            <Input
              id="eq-address"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setResponse(null); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Request JSON preview */}
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Request JSON</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
          <ScrollArea className="h-36 min-h-0 rounded-md border border-border bg-muted/30 lg:h-full lg:min-h-[280px] lg:flex-1">
            <pre className="p-3 text-[10px] font-mono text-foreground whitespace-pre-wrap break-all">
              {JSON.stringify(requestPreview, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
      </div>

      {/* Run button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleRun}
          disabled={running || productOptions.length === 0}
          className="gap-2 min-w-[96px]"
        >
          {running ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {running ? "Running…" : "Run"}
        </Button>
      </div>

      {/* Response — only shown after Run is clicked */}
      {response && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Response JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-56 rounded-md border border-border bg-muted/30">
                <pre className="p-3 text-[10px] font-mono text-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {groupedSections.map(
              ({ key, title, items }) =>
                items.length > 0 && (
                  <div key={key} className="space-y-3">
                    <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
                    <div className="space-y-3">
                      {items.map(({ name, payload }) => (
                        <Card key={name}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-[10px] font-medium text-foreground">
                              {name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ScrollArea className="max-h-32 rounded-md border border-border bg-muted/20">
                              <pre
                                className={cn(
                                  "p-2 text-[10px] font-mono whitespace-pre-wrap break-all",
                                  (payload as { omitted?: boolean }).omitted
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                )}
                              >
                                {JSON.stringify(payload, null, 2)}
                              </pre>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
