/**
 * Master Schema Management – Mock data
 * Seeded from master-schemas.json; runtime overlays are kept in service layer.
 */
import data from "./master-schemas.json";
import type { MasterSchema } from "@/types/master-schema";

export const masterSchemasSeed = (data as { masterSchemas: MasterSchema[] }).masterSchemas ?? [];

