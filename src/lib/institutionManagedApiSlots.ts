/**
 * Number of API access toggles the portal exposes for a member (Data Submission + Enquiry).
 * Aligns with Fastify `effectiveApisEnabledCount` / `sanitizeInstitutionForResponse`.
 */
export function institutionManagedApiSlotCount(inst: {
  isDataSubmitter?: boolean;
  isSubscriber?: boolean;
}): number {
  return (inst.isDataSubmitter ? 1 : 0) + (inst.isSubscriber ? 1 : 0);
}
