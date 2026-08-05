import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { ProductStatusBadge } from "@/components/data-products/ProductStatusBadge";
import type { DemoProductVersion } from "@/data/product-management-types";
import {
  catalogLabelForPacketId,
  getMockPayloadForPacket,
  getPacketsByIds,
  resolvePayloadPacketName,
} from "@/data/data-products-mock";
import simulationDefaults from "@/data/simulation-defaults.json";

const DEFAULTS = simulationDefaults.enquirySimulation;

const ID_TYPES = [
  { value: "PAN", label: "PAN" },
  { value: "NIN", label: "National ID" },
  { value: "PASSPORT", label: "Passport" },
  { value: "AADHAAR", label: "Aadhaar" },
] as const;

type IdType = (typeof ID_TYPES)[number]["value"];

type SimulationResponse = {
  enquiryId: string;
  productId: string;
  productCode: string;
  productName: string;
  productVersion: number;
  customer: {
    fullName: string;
    phone: string;
    idType: IdType;
    idValue: string;
    address: string;
  };
  generatedAt: string;
  packets: Record<string, Record<string, unknown>>;
};

type Step = "input" | "result";

interface ProductRunTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DemoProductVersion | null;
}

function inferIdType(govId: string): IdType {
  const upper = govId.toUpperCase();
  if (upper.includes("PAN") || /^[A-Z]{5}\d{4}[A-Z]/.test(upper.replace(/^PAN-/, ""))) return "PAN";
  if (upper.includes("AADHAAR")) return "AADHAAR";
  if (upper.includes("PASSPORT")) return "PASSPORT";
  return "PAN";
}

export function ProductRunTestModal({ open, onOpenChange, product }: ProductRunTestModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [customerName, setCustomerName] = useState(DEFAULTS.customerName);
  const [phone, setPhone] = useState(DEFAULTS.mobile);
  const [idType, setIdType] = useState<IdType>(inferIdType(DEFAULTS.governmentId));
  const [idValue, setIdValue] = useState(DEFAULTS.governmentId);
  const [address, setAddress] = useState(DEFAULTS.address);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SimulationResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("input");
    setCustomerName(DEFAULTS.customerName);
    setPhone(DEFAULTS.mobile);
    setIdType(inferIdType(DEFAULTS.governmentId));
    setIdValue(DEFAULTS.governmentId);
    setAddress(DEFAULTS.address);
    setRunning(false);
    setResponse(null);
  }, [open, product?.id]);

  const buildResponse = useCallback((): SimulationResponse | null => {
    if (!product) return null;
    const packetsMeta = getPacketsByIds(product.packetIds);
    const packets: Record<string, Record<string, unknown>> = {};
    for (const pkt of packetsMeta) {
      const label = catalogLabelForPacketId(pkt.id) ?? pkt.name;
      const resolved = resolvePayloadPacketName(label);
      packets[label] = getMockPayloadForPacket(resolved);
    }
    for (const pid of product.packetIds) {
      const label = catalogLabelForPacketId(pid) ?? pid;
      if (!packets[label]) {
        packets[label] = getMockPayloadForPacket(label);
      }
    }
    return {
      enquiryId: `ENQ-${Date.now()}`,
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      productVersion: product.version,
      customer: {
        fullName: customerName.trim(),
        phone: phone.trim(),
        idType,
        idValue: idValue.trim(),
        address: address.trim(),
      },
      generatedAt: new Date().toISOString(),
      packets,
    };
  }, [product, customerName, phone, idType, idValue, address]);

  const handleRun = () => {
    if (!product) return;
    setRunning(true);
    window.setTimeout(() => {
      setResponse(buildResponse());
      setRunning(false);
      setStep("result");
    }, 600);
  };

  const handleBack = () => {
    setStep("input");
    setResponse(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 p-5 sm:rounded-xl">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>{step === "input" ? "Run test" : "Test result"}</DialogTitle>
          <DialogDescription className="sr-only">
            {step === "input"
              ? "Enter customer details to simulate an enquiry"
              : "Simulated enquiry response"}
          </DialogDescription>
          {product && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-foreground">{product.name}</span>
              <span className="text-caption font-mono text-muted-foreground">
                {product.productCode}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-caption tabular-nums text-muted-foreground">
                  v{product.version}
                </span>
                <ProductStatusBadge status={product.status} />
              </span>
            </div>
          )}
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-name" className="text-caption">
                Name
              </Label>
              <Input
                id="rt-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rt-phone" className="text-caption">
                Phone number
              </Label>
              <Input
                id="rt-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 …"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rt-id-type" className="text-caption">
                  ID type
                </Label>
                <Select value={idType} onValueChange={(v) => setIdType(v as IdType)}>
                  <SelectTrigger id="rt-id-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rt-id-value" className="text-caption">
                  ID value
                </Label>
                <Input
                  id="rt-id-value"
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  placeholder="Identifier"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rt-address" className="text-caption">
                Address
              </Label>
              <Input
                id="rt-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-[min(50vh,320px)] overflow-y-auto">
            <pre className="text-[10px] leading-[14px] text-muted-foreground whitespace-pre-wrap break-words font-mono">
              {response ? JSON.stringify(response, null, 2) : "—"}
            </pre>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === "result" ? (
            <>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleBack}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
              <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!product || running}
                onClick={handleRun}
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {running ? "Running…" : "Run test"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
