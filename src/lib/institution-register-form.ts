import { z } from "zod";
import rawConfig from "@/data/institution-register-form.json";

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
  /** When true, value is display-only (e.g. server-assigned registration number). */
  readOnly?: boolean;
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

export type RegisterDetailsValues = Record<string, string | boolean | string[]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseClientField(field: any, institutionTypes: string[], activeConsortiums: { id: string; name: string }[]): RegisterFormFieldResolved {
  const options: RegisterFormOption[] = [];
  if (Array.isArray(field.options) && field.options.length > 0) {
    for (const o of field.options) {
      options.push({ value: String(o.value), label: String(o.label ?? o.value) });
    }
  } else if (field.optionSource === "institutionTypes") {
    for (const t of institutionTypes) options.push({ value: t, label: t });
  } else if (field.optionSource === "activeConsortiums") {
    for (const c of activeConsortiums) {
      options.push({
        value: c.id,
        label: c.name,
      });
    }
  }
  const inputType = field.inputType as RegisterFormFieldResolved["inputType"];
  const selectionMode =
    field.selectionMode === "multiple" || field.selectionMode === "single"
      ? field.selectionMode
      : inputType === "multiselect"
        ? "multiple"
        : inputType === "select"
          ? "single"
          : undefined;
  return {
    name: field.name,
    apiKey: field.apiKey,
    label: field.label,
    description: field.description,
    placeholder: field.placeholder,
    inputType,
    selectionMode,
    required: !!field.required,
    readOnly: !!field.readOnly,
    maxLength: field.maxLength,
    minLength: field.minLength,
    pattern: field.pattern,
    options,
  };
}

/** Mock/offline: resolve the same register-form shape as the API from static JSON + mock option sources. */
export function resolveRegisterFormClientSide(
  geography: string,
  institutionTypes: string[],
  activeConsortiums: { id: string; name: string }[]
): RegisterFormPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = rawConfig as any;
  const defaultGeography = String(cfg.defaultGeography ?? "default");
  const geos = cfg.geographies as Record<string, { label?: string; description?: string; sections: unknown[] }>;
  const gid = geos[geography] ? geography : defaultGeography;
  const geo = geos[gid];
  const sections: RegisterFormSectionResolved[] = (geo.sections ?? []).map((s: any) => ({
    id: s.id,
    legend: s.legend,
    layout: s.layout === "grid2" || s.layout === "checkboxCards" || s.layout === "full" ? s.layout : "grid2",
    visibleWhen: s.visibleWhen,
    refineAtLeastOne: s.refineAtLeastOne,
    fields: (s.fields ?? []).map((f: any) => normaliseClientField(f, institutionTypes, activeConsortiums)),
  }));
  return {
    geographyId: gid,
    geographyLabel: geo.label,
    geographyDescription: geo.description,
    sections,
  };
}

function fieldZod(f: RegisterFormFieldResolved): z.ZodTypeAny {
  if (f.inputType === "checkbox") {
    return z.boolean();
  }
  if (f.inputType === "multiselect") {
    const base = z.array(z.string());
    return f.required ? base.min(1, `${f.label} is required`) : base;
  }
  const allowed = f.options.map((o) => o.value);
  if (f.inputType === "text" || f.inputType === "tel") {
    if (f.readOnly && !f.required) {
      let s = z.string();
      if (f.maxLength != null) s = s.max(f.maxLength);
      return s;
    }
    let s = z.string().trim();
    if (f.required) s = s.min(1, `${f.label} is required`);
    if (f.maxLength != null) s = s.max(f.maxLength);
    if (f.minLength != null) s = s.min(f.minLength);
    if (f.pattern) {
      try {
        const re = new RegExp(f.pattern);
        s = s.regex(re, `${f.label} has invalid format`);
      } catch {
        /* ignore */
      }
    }
    return s;
  }
  if (f.inputType === "email") {
    if (f.required) {
      return z
        .string()
        .trim()
        .min(1, `${f.label} is required`)
        .email("Enter a valid email address")
        .max(f.maxLength ?? 255);
    }
    return z.union([
      z.literal(""),
      z.string().trim().email("Enter a valid email address").max(f.maxLength ?? 255),
    ]);
  }
  let sel = z.string().trim();
  if (f.required) sel = sel.min(1, `${f.label} is required`);
  if (f.maxLength != null) sel = sel.max(f.maxLength);
  if (allowed.length > 0) {
    return sel.refine((v) => !v || allowed.includes(v), { message: `Invalid ${f.label}` });
  }
  return sel;
}

/** Zod schema for Step 1 from resolved `registerForm` API payload. */
export function buildRegisterDetailsSchema(registerForm: RegisterFormPayload | undefined): z.ZodTypeAny {
  if (!registerForm?.sections?.length) {
    return z.object({}).strict();
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  const atLeastOne = new Set<string>();
  for (const sec of registerForm.sections) {
    for (const n of sec.refineAtLeastOne ?? []) atLeastOne.add(n);
    for (const f of sec.fields) {
      shape[f.name] = fieldZod(f);
    }
  }
  let obj = z.object(shape);
  if (atLeastOne.size > 0) {
    const names = [...atLeastOne];
    obj = obj.refine((data) => names.some((n) => !!(data as Record<string, unknown>)[n]), {
      message: "At least one participation type must be selected",
      path: [names[0] ?? "isDataSubmitter"],
    });
  }
  return obj;
}

export function defaultValuesFromRegisterForm(registerForm: RegisterFormPayload | undefined): RegisterDetailsValues {
  const out: RegisterDetailsValues = {};
  if (!registerForm?.sections) return out;
  for (const sec of registerForm.sections) {
    for (const f of sec.fields) {
      if (f.inputType === "checkbox") out[f.name] = false;
      else if (f.inputType === "multiselect") out[f.name] = [];
      else out[f.name] = "";
    }
  }
  return out;
}

export function sectionIsVisible(sec: RegisterFormSectionResolved, values: RegisterDetailsValues): boolean {
  if (!sec.visibleWhen) return true;
  const v = values[sec.visibleWhen.field];
  return !!v === sec.visibleWhen.equals;
}

/** Map wizard values to `POST /institutions` body (apiKey for legal name → `name`). */
export function mapRegisterDetailsToCreateBody(
  values: RegisterDetailsValues,
  registerForm: RegisterFormPayload
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    institutionLifecycleStatus: "pending",
  };
  for (const sec of registerForm.sections) {
    for (const f of sec.fields) {
      if (f.name === "consortiumIds") continue;
      const v = values[f.name];
      const key = f.apiKey ?? f.name;
      if (
        f.readOnly &&
        (v === "" ||
          v === undefined ||
          (typeof v === "string" && !v.trim()))
      ) {
        continue;
      }
      body[key] = v;
    }
  }
  const isSub = !!values.isSubscriber;
  const ids = values.consortiumIds;
  if (isSub && Array.isArray(ids) && ids.length > 0) {
    body.consortiumIds = ids;
  }
  return body;
}
