import { readFileSync } from "node:fs";
import { dataPath } from "./paths.js";
import type { AppState } from "./state.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RegisterFormOption = { value: string; label: string };

export type RegisterFormFieldResolved = {
  name: string;
  apiKey?: string;
  label: string;
  description?: string;
  placeholder?: string;
  inputType: "text" | "email" | "tel" | "select" | "multiselect" | "checkbox";
  selectionMode?: "single" | "multiple";
  required: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  options: RegisterFormOption[];
};

export type RegisterFormSectionResolved = {
  id: string;
  legend: string;
  layout?: "grid2" | "checkboxCards" | "full";
  visibleWhen?: { field: string; equals: boolean };
  refineAtLeastOne?: string[];
  fields: RegisterFormFieldResolved[];
};

export type RegisterFormPayload = {
  geographyId: string;
  geographyLabel?: string;
  geographyDescription?: string;
  sections: RegisterFormSectionResolved[];
};

type RawField = {
  name: string;
  apiKey?: string;
  label: string;
  description?: string;
  placeholder?: string;
  inputType: string;
  selectionMode?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  optionSource?: string;
  options?: RegisterFormOption[];
};

type RawSection = {
  id: string;
  legend: string;
  layout?: string;
  visibleWhen?: { field: string; equals: boolean };
  refineAtLeastOne?: string[];
  fields: RawField[];
};

type RawConfig = {
  defaultGeography: string;
  geographies: Record<
    string,
    { label?: string; description?: string; sections: RawSection[] }
  >;
};

let cachedRaw: RawConfig | null = null;

function loadRawConfig(): RawConfig {
  if (!cachedRaw) {
    cachedRaw = JSON.parse(
      readFileSync(dataPath("institution-register-form.json"), "utf8")
    ) as RawConfig;
  }
  return cachedRaw;
}

export function resolveRegisterGeographyId(requested: string | undefined): string {
  const raw = loadRawConfig();
  const key = (requested ?? "").trim() || raw.defaultGeography;
  if (raw.geographies[key]) return key;
  return raw.defaultGeography;
}

function resolveFieldOptions(
  field: RawField,
  state: AppState
): RegisterFormOption[] {
  if (field.options?.length) {
    return field.options.map((o) => ({ value: String(o.value), label: String(o.label ?? o.value) }));
  }
  if (field.optionSource === "institutionTypes") {
    return state.institutionTypes.map((t) => ({ value: t, label: t }));
  }
  if (field.optionSource === "activeConsortiums") {
    return state.consortiums
      .filter((c: any) => String(c.status ?? "").toLowerCase() === "active")
      .map((c: any) => ({
        value: String(c.id),
        label: String(c.name ?? c.id),
      }));
  }
  return [];
}

function normaliseField(f: RawField, state: AppState): RegisterFormFieldResolved {
  const options = resolveFieldOptions(f, state);
  const inputType = f.inputType as RegisterFormFieldResolved["inputType"];
  const selectionMode =
    f.selectionMode === "multiple" || f.selectionMode === "single"
      ? f.selectionMode
      : inputType === "multiselect"
        ? "multiple"
        : inputType === "select"
          ? "single"
          : undefined;
  return {
    name: f.name,
    apiKey: f.apiKey,
    label: f.label,
    description: f.description,
    placeholder: f.placeholder,
    inputType,
    selectionMode,
    required: !!f.required,
    maxLength: f.maxLength,
    minLength: f.minLength,
    pattern: f.pattern,
    options,
  };
}

export function buildRegisterFormPayload(state: AppState, geographyId: string): RegisterFormPayload {
  const raw = loadRawConfig();
  const gid = raw.geographies[geographyId] ? geographyId : raw.defaultGeography;
  const geo = raw.geographies[gid];
  const sections: RegisterFormSectionResolved[] = (geo.sections ?? []).map((s) => ({
    id: s.id,
    legend: s.legend,
    layout:
      s.layout === "grid2" || s.layout === "checkboxCards" || s.layout === "full" ? s.layout : "grid2",
    visibleWhen: s.visibleWhen,
    refineAtLeastOne: s.refineAtLeastOne,
    fields: (s.fields ?? []).map((f) => normaliseField(f, state)),
  }));
  return {
    geographyId: gid,
    geographyLabel: geo.label,
    geographyDescription: geo.description,
    sections,
  };
}

function flattenFields(sections: RegisterFormSectionResolved[]): RegisterFormFieldResolved[] {
  return sections.flatMap((s) => s.fields);
}

/** Validate POST /institutions body against geography register-form rules. */
export function validateRegisterInstitutionBody(
  body: Record<string, unknown>,
  state: AppState,
  geographyId: string
): string | null {
  const form = buildRegisterFormPayload(state, geographyId);
  const isSubscriber = !!body.isSubscriber;
  const fields = flattenFields(form.sections);

  for (const f of fields) {
    if (f.name === "consortiumIds" && !isSubscriber) continue;

    const bodyKey = f.apiKey ?? f.name;
    const rawVal = body[bodyKey];
    if (f.inputType === "checkbox") {
      if (typeof rawVal !== "boolean" && rawVal != null) return `${f.name} must be a boolean`;
      continue;
    }
    if (f.inputType === "multiselect") {
      if (rawVal == null) continue;
      if (!Array.isArray(rawVal)) return `${f.name} must be an array`;
      const allowed = new Set(f.options.map((o) => o.value));
      for (const x of rawVal) {
        const v = String(x ?? "").trim();
        if (!v) continue;
        if (!allowed.has(v)) return `Invalid ${f.label}: ${v}`;
      }
      continue;
    }
    const str = rawVal != null ? String(rawVal).trim() : "";
    if (f.required && !str) return `${f.label} is required`;
    if (!str) continue;
    if (f.maxLength != null && str.length > f.maxLength) {
      return `${f.label} must be at most ${f.maxLength} characters`;
    }
    if (f.minLength != null && str.length < f.minLength) {
      return `${f.label} must be at least ${f.minLength} characters`;
    }
    if (f.pattern) {
      try {
        const re = new RegExp(f.pattern);
        if (!re.test(str)) return `${f.label} has invalid format`;
      } catch {
        /* ignore bad pattern in config */
      }
    }
    if (f.inputType === "email") {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
      if (!ok) return `Enter a valid email for ${f.label}`;
    }
    if (f.inputType === "select" && f.options.length > 0) {
      const allowed = new Set(f.options.map((o) => o.value));
      if (!allowed.has(str)) return `Invalid ${f.label}`;
    }
  }

  const atLeastOnes = new Set<string>();
  for (const s of form.sections) {
    for (const n of s.refineAtLeastOne ?? []) atLeastOnes.add(n);
  }
  if (atLeastOnes.size > 0) {
    const ok = [...atLeastOnes].some((name) => !!body[name]);
    if (!ok) return "At least one participation type must be selected";
  }

  return null;
}
