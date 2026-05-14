# Register member: form metadata source of truth

## Confirmation (Entity, Regulatory, Contact)

When the SPA uses the **Spring Boot** API (`VITE_USE_MOCK_FALLBACK=false`, **`npm run spring:start`** on **8090** by default), **Step 1** fieldsets and every field are driven by **`GET /api/v1/institutions/form-metadata?geography=<id>`** (same path on **legacy Fastify** if you proxy to **8091**):

| Concern | Source |
|--------|--------|
| Section category (fieldset legend), e.g. “Entity Information” | `registerForm.sections[].legend` from API |
| Field label, placeholder, required, optional **`readOnly`** / **`description`** | `registerForm.sections[].fields[]` from API (Spring **`InstitutionRegisterFormService.normaliseField`** passes through **`readOnly`** and **`description`** when present in classpath JSON) |
| Control kind (text, email, tel, select, multiselect, checkbox) | `inputType` from API |
| Single vs multiple selection | `selectionMode` and/or `inputType` (`select` → single, `multiselect` → multiple); resolved on the server |
| Closed-list values | `options` on the response (enum literals in JSON config, or `institutionTypes` / active consortiums resolved server-side from in-memory state) |

The SPA renders `RegisterSection` / `RegisterField` from that payload; it does not hard-code those three blocks.

**Legal vs trading name:** Step 1 still collects both where the geography config includes them; **`legalName`** maps to API body **`name`** (legal entity), **`tradingName`** is optional. Elsewhere in the portal, **single-label** pickers and dashboard strings prefer **legal `name`** first — see [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) § *Institution display labels*.

**Dev implementation note:** the API builds `registerForm` from `src/data/institution-register-form.json` plus live `state.institutionTypes` and active consortiums (`server/src/institutionRegisterForm.ts`, route in `server/src/index.ts`). That JSON is configuration data on the server, not UI strings embedded in React.

## Mock / offline fallback

If the request fails and `VITE_USE_MOCK_FALLBACK=true`, the client resolves the **same** register-form shape from the bundled `institution-register-form.json` via `resolveRegisterFormClientSide` (`src/lib/institution-register-form.ts`), using mock institution types and consortiums.

**Compliance documents** in that fallback now use **`src/data/institutions.json`** `requiredComplianceDocuments` (via `normaliseRequiredComplianceDocuments`), matching what the Fastify server seeds into `state.requiredComplianceDocuments` — no duplicated inline list in `institutions.service.ts`.

## Registration number (system-assigned)

- **Step 1:** `registrationNumber` is configured **`readOnly: true`**, **`required: false`** in **`institution-register-form.json`** (SPA + Spring classpath). The operator does not enter it; the SPA omits it from **`POST /api/v1/institutions`** when empty.
- **Spring:** If `registrationNumber` is null, missing, or blank, **`InstitutionController.create`** assigns **`{TypePrefix}-{NameSlug3}-{UTC-year}-{id}`** (temporary **`AUTO-{uuid}`** insert, then update after `id` is known). Non-blank client values are still accepted (override).

## Review step labels

The review step uses `registerForm` for the main detail blocks (`section.legend` / field labels). Participation and consortium summary headings use legends and field labels from the **participation** and **consortium** sections in the same payload when present.

### Review step field values (typography)

Read-only values in the section grid use the **`text-body`** token (same compact scale as the participation/consortium summary lines). Do **not** combine **`text-body`** with conditional **`text-foreground`** / **`text-muted-foreground`** through **`cn()`** (which runs **`tailwind-merge`**): the default merge config can drop the custom **`text-body`** size in favour of the colour utility. Use a **single** **`className`** template string (or **`clsx`** without merge) for those value elements—see **`Step3Review`** in `RegisterInstitution.tsx`.

## Related tests

- `backend` `HcbPlatformApplicationTest` — `GET /api/v1/institutions/form-metadata` (default geography) — extend assertions for legends, `selectionMode`, etc., as needed.
- `server/src/institutionRegisterForm.test.ts` — payload legends, labels, `selectionMode` for select/multiselect.
- `src/services/institutions.form-metadata-source.test.ts` — compliance seed alignment with `institutions.json`.
- `src/lib/institution-register-form.test.ts` — client resolver and Zod mapping; read-only empty `registrationNumber` omitted from create body.
- `src/test/pages/RegisterInstitution.test.tsx` — Registration Number read-only + hint.
- `backend` **`InstitutionRegistrationNumberSqliteIntegrationTest`**, **`InstitutionRegistrationNumberGeneratorTest`** — POST without / with manual `registrationNumber`.

## Changes in this pass

1. Mock `fetchInstitutionFormMetadata` compliance list replaced with `institutions.json` import.
2. `RegisterInstitution.tsx` review step: participation / consortium subheading text derived from `registerForm` sections.
3. **Step 3 Review** grid values: **`text-body`** applied without **`cn`/`tailwind-merge`** stripping (template literal `className` for value + colour).
4. Tests and this document added/extended.
