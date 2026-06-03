import { useMemo, useState } from "react";
import { Building2, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PropertyDetails, PropertySearchSuggestion } from "@/lib/real-estate-bureau/types";
import {
  applySuggestionToProperty,
  filterPropertySuggestions,
  isPropertyDetailsComplete,
} from "@/lib/real-estate-bureau/inquiry-intelligence";
import { PROPERTY_SEARCH_SUGGESTIONS } from "@/lib/real-estate-bureau/mock-data";

const INDIAN_STATES = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Gujarat",
  "Tamil Nadu",
  "Telangana",
  "Haryana",
  "Uttar Pradesh",
  "West Bengal",
  "Rajasthan",
];

export interface PropertySmartSearchProps {
  propertyQuery: string;
  onPropertyQueryChange: (value: string) => void;
  selectedSuggestion: PropertySearchSuggestion | null;
  onSelectSuggestion: (suggestion: PropertySearchSuggestion | null) => void;
  property: Partial<PropertyDetails>;
  onPropertyChange: (patch: Partial<PropertyDetails>) => void;
}

export function PropertySmartSearch({
  propertyQuery,
  onPropertyQueryChange,
  selectedSuggestion,
  onSelectSuggestion,
  property,
  onPropertyChange,
}: PropertySmartSearchProps) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => filterPropertySuggestions(propertyQuery, PROPERTY_SEARCH_SUGGESTIONS),
    [propertyQuery]
  );

  const showSuggestions = focused && suggestions.length > 0;

  const hasResolved = Boolean(selectedSuggestion || isPropertyDetailsComplete(property));

  const clearMatch = () => {
    onSelectSuggestion(null);
    onPropertyQueryChange("");
    onPropertyChange({});
  };

  const pickSuggestion = (suggestion: PropertySearchSuggestion) => {
    onSelectSuggestion(suggestion);
    onPropertyQueryChange(suggestion.label);
    onPropertyChange({ ...property, ...applySuggestionToProperty(suggestion) });
    setFocused(false);
  };

  const updateField = (key: keyof PropertyDetails, value: string) => {
    onPropertyChange({ ...property, [key]: value });
    if (selectedSuggestion) onSelectSuggestion(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/25 overflow-visible">
        <div className="px-3 pt-3 pb-1">
          <Label className="text-caption font-medium text-foreground">
            Find property <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] leading-[14px] text-muted-foreground mt-0.5">
            Type to search mock properties, or pick a suggestion to auto-fill details
          </p>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-card px-3 transition-shadow",
                focused ? "border-primary ring-2 ring-primary/15" : "border-border"
              )}
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="text"
                value={propertyQuery}
                onChange={(e) => {
                  onPropertyQueryChange(e.target.value);
                  onSelectSuggestion(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 180)}
                placeholder="Try Panchshil, Riverdale, Godrej…"
                autoComplete="off"
                className="flex-1 min-w-0 h-10 border-0 bg-transparent px-0 py-0 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {propertyQuery && (
                <button
                  type="button"
                  onClick={clearMatch}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {showSuggestions && (
              <ul
                className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
                role="listbox"
              >
                {!propertyQuery.trim() && (
                  <li className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground border-b border-border bg-muted/30">
                    Suggested properties
                  </li>
                )}
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id} role="option">
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(suggestion)}
                    >
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-caption font-medium text-foreground truncate">
                          {suggestion.label}
                        </span>
                        <span className="block text-[10px] leading-[14px] text-muted-foreground truncate">
                          {suggestion.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border bg-card overflow-hidden transition-colors",
          hasResolved ? "border-primary/25 shadow-sm" : "border-border border-dashed"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b",
            hasResolved ? "bg-primary/5 border-primary/15" : "bg-muted/20 border-border"
          )}
        >
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-caption font-semibold text-foreground">Property details</span>
        </div>

        <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-3">
          <StaticField label="Flat / Unit" required>
            <Input
              value={property.flatNumber ?? ""}
              onChange={(e) => updateField("flatNumber", e.target.value)}
              placeholder="e.g. 1204"
              className="h-9 text-caption"
              required
            />
          </StaticField>
          <StaticField label="Tower / Wing" required>
            <Input
              value={property.towerName ?? ""}
              onChange={(e) => updateField("towerName", e.target.value)}
              placeholder="e.g. Tower B"
              className="h-9 text-caption"
              required
            />
          </StaticField>
          <StaticField label="Project / Building" required className="sm:col-span-2">
            <Input
              value={property.projectName ?? ""}
              onChange={(e) => updateField("projectName", e.target.value)}
              placeholder="e.g. Panchshil Towers"
              className="h-9 text-caption"
              required
            />
          </StaticField>
          <StaticField label="Locality" required>
            <Input
              value={property.locality ?? ""}
              onChange={(e) => updateField("locality", e.target.value)}
              placeholder="e.g. Kharadi"
              className="h-9 text-caption"
              required
            />
          </StaticField>
          <StaticField label="City" required>
            <Input
              value={property.city ?? ""}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="e.g. Pune"
              className="h-9 text-caption"
              required
            />
          </StaticField>
          <StaticField label="State" required>
            <Select
              value={property.state || "Maharashtra"}
              onValueChange={(v) => updateField("state", v)}
            >
              <SelectTrigger className="h-9 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((st) => (
                  <SelectItem key={st} value={st} className="text-caption">
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </StaticField>
          <StaticField label="Pincode" required>
            <Input
              value={property.pincode ?? ""}
              onChange={(e) => updateField("pincode", e.target.value)}
              placeholder="6-digit PIN"
              className="h-9 text-caption"
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              required
            />
          </StaticField>
        </div>
      </div>
    </div>
  );
}

function StaticField({
  label,
  children,
  required = true,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] leading-[13px] text-muted-foreground font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
