/**
 * Canonical attribute dictionary for the Product Configurator contract UI.
 *
 * Demo seed — not the dictionary-maintenance surface (that is the Master
 * Schema Management module). This file is a *projection* of the canonical
 * HBase dictionary (master-dictionary.seed.v2.json, dictionaryVersion v14,
 * 846 attributes) restricted to what a product owner actually needs when
 * composing a product's field contract:
 *
 *  - Only `Business`, `Identifier` and `Feature` class attributes are
 *    included. `Reserved` (platform/system columns), `Edge` (relationship
 *    graph attributes) and `Observation` (free-form event escape hatch)
 *    classes are governance/graph concerns, not product-packageable fields,
 *    and are intentionally left out.
 *  - Only the `person` and `company` subject types are represented under
 *    the `subject` packet. `household`, `government`, `device` and
 *    `browser_instance` are canonical subject types too, but are out of
 *    scope for lending-product packaging today; a `Digital Identity`
 *    packet (device/browser_instance) is a natural follow-up once fraud
 *    products need it.
 *  - Feed provenance (`sources` / `populatedBy`) is intentionally NOT
 *    modelled here — it is Excel/maintenance-only metadata on the
 *    canonical dictionary and must never surface in a product-facing UI.
 *
 * The underlying data lives in ./attribute-dictionary.data.json so this
 * file can be regenerated from a new canonical dictionary export without
 * hand-editing ~700 literal objects. See build_dictionary.py (Data
 * Governance repo) for the projection rules above, encoded as code.
 */

import dictionaryData from "./attribute-dictionary.data.json";

export const DICTIONARY_VERSION = dictionaryData.dictionaryVersion; // "v14"
export const SUBJECT_PACKET_ID = "subject";
export const CROSS_ASSET_PACKET_ID = "cross_asset_analytics";

export type SubjectScope = "INDIVIDUAL" | "COMPANY" | "BOTH";
export type AttributeSensitivity = "Standard" | "PII" | "Sensitive-PII";
export type AttributeStatus = "active" | "pending" | "deprecated";
export type AttributeDataType =
  | "string"
  | "long"
  | "decimal"
  | "boolean"
  | "date"
  | "timestamp"
  | "json"
  | "enum";
export type AttributeClass = "Business" | "Identifier" | "Edge" | "Feature" | "Observation";
export type PacketLane = "Subject" | "Assets" | "Analytics";

export interface DictionaryEventStream {
  id: string;
  label: string;
  description: string;
}

export interface DictionaryPacket {
  id: string;
  label: string;
  description: string;
  subjectScopes: SubjectScope[];
  lane: PacketLane;
  eventStreams: DictionaryEventStream[];
  responseKey: string;
  /** Convenience count — number of attributes projected onto this packet. */
  attributeCount: number;
}

export interface DictionaryAttribute {
  id: string;
  packetId: string;
  eventStreamId?: string;
  qualifier: string;
  label: string;
  group: string;
  dataType: AttributeDataType;
  sensitivity: AttributeSensitivity;
  specialCategory: boolean;
  status: AttributeStatus;
  mode: "SNAPSHOT" | "TRENDED";
  class: AttributeClass;
  system?: boolean;
  derived?: boolean;
  basedOn?: string[];
  supersededBy?: string;
  definition: string;
}

export const DICTIONARY_PACKETS: DictionaryPacket[] = dictionaryData.packets as DictionaryPacket[];
export const DICTIONARY_ATTRIBUTES: DictionaryAttribute[] =
  dictionaryData.attributes as DictionaryAttribute[];

const PACKET_BY_ID = new Map(DICTIONARY_PACKETS.map((p) => [p.id, p]));
const ATTR_BY_ID = new Map(DICTIONARY_ATTRIBUTES.map((a) => [a.id, a]));

export function getDictionaryPacket(id: string): DictionaryPacket | undefined {
  return PACKET_BY_ID.get(id);
}

export function getDictionaryAttribute(id: string): DictionaryAttribute | undefined {
  return ATTR_BY_ID.get(id);
}

export function attributesForPacket(packetId: string): DictionaryAttribute[] {
  return DICTIONARY_ATTRIBUTES.filter((a) => a.packetId === packetId);
}

export function dictionaryPacketLabel(packetId: string): string | undefined {
  return PACKET_BY_ID.get(packetId)?.label;
}

export function packetAppliesToScope(packet: DictionaryPacket, scope: SubjectScope): boolean {
  if (scope === "BOTH") return true;
  return packet.subjectScopes.includes(scope) || packet.subjectScopes.includes("BOTH");
}

export function packetScopeTag(packet: DictionaryPacket): "Ind" | "Co" | null {
  const hasInd = packet.subjectScopes.includes("INDIVIDUAL") || packet.subjectScopes.includes("BOTH");
  const hasCo = packet.subjectScopes.includes("COMPANY") || packet.subjectScopes.includes("BOTH");
  if (hasInd && hasCo) return null;
  if (hasInd) return "Ind";
  if (hasCo) return "Co";
  return null;
}

export function toCamelResponseKey(qualifier: string): string {
  return qualifier.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Attributes carrying a `supersededBy` link — surfaces as a lifecycle badge in the UI. */
export function deprecatedAttributes(): DictionaryAttribute[] {
  return DICTIONARY_ATTRIBUTES.filter((a) => a.status === "deprecated");
}
