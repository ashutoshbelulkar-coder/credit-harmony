/**
 * Seed `state.auditLog` from `user-management.json` activity rows plus governance / dev-user samples.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AuditSeedRow = {
  id?: number;
  occurredAt: string;
  auditOutcome: string;
  userEmail: string;
  actionType: string;
  entityType: string;
  entityId: string;
  description?: string;
  ipAddress?: string;
};

function mapMockActionToType(action: string): string {
  const a = (action ?? "").toLowerCase();
  if (a.includes("login")) return "LOGIN";
  if (a.includes("invite")) return "CREATE";
  if (a.includes("suspend")) return "SUSPEND";
  if (a.includes("role")) return "UPDATE";
  if (a.includes("report")) return "EXPORT";
  if (a.includes("api key")) return "UPDATE";
  if (a.includes("governance") || a.includes("schema")) return "APPROVE";
  if (a.includes("agent")) return "VIEW";
  if (a.includes("bureau") || a.includes("query")) return "VIEW";
  if (a.includes("mfa")) return "LOGIN";
  return "UNKNOWN";
}

export function buildAuditLogSeed(um: any, users: { id: number; email: string }[]): {
  auditLog: AuditSeedRow[];
  auditNextId: number;
} {
  const mockUsers = (um.users ?? []) as { id: string; email?: string; name?: string }[];
  const emailByMockUserId = new Map(mockUsers.map((u) => [String(u.id), u.email ?? ""]));

  const activitySeed = (um.activityLog ?? []) as any[];
  const fromJson: AuditSeedRow[] = activitySeed.map((a) => {
    const uid = String(a.userId ?? "");
    const email = emailByMockUserId.get(uid) || String(a.userName ?? "unknown@example.com");
    const success = String(a.status ?? "Success").toLowerCase() === "success";
    return {
      occurredAt: a.timestamp || new Date().toISOString(),
      auditOutcome: success ? "SUCCESS" : "FAILURE",
      userEmail: email,
      actionType: mapMockActionToType(String(a.action ?? "")),
      entityType: "SYSTEM",
      entityId: uid || "activity",
      description: a.details || String(a.action ?? ""),
      ipAddress: a.ipAddress,
    };
  });

  const governanceSeed: Omit<AuditSeedRow, "id">[] = [
    {
      occurredAt: "2026-03-07T16:00:00.000Z",
      auditOutcome: "SUCCESS",
      userEmail: "admin@hcb.com",
      actionType: "MAPPING_APPROVED",
      entityType: "GOVERNANCE",
      entityId: "map-seed-1",
      description: "Approved schema mapping for member institution (seed)",
      ipAddress: "10.0.0.2",
    },
    {
      occurredAt: "2026-03-07T15:30:00.000Z",
      auditOutcome: "SUCCESS",
      userEmail: "admin@hcb.com",
      actionType: "RULE_CREATED",
      entityType: "GOVERNANCE",
      entityId: "rule-seed-1",
      description: "Created validation rule CreditScoreRange (seed)",
      ipAddress: "10.0.0.2",
    },
    {
      occurredAt: "2026-03-06T11:00:00.000Z",
      auditOutcome: "SUCCESS",
      userEmail: "viewer@hcb.com",
      actionType: "CONFIG_CHANGED",
      entityType: "GOVERNANCE",
      entityId: "cfg-seed-1",
      description: "Updated governance dashboard filter defaults (seed)",
      ipAddress: "10.0.0.3",
    },
  ];

  const devUserSeed: Omit<AuditSeedRow, "id">[] = [];
  for (const u of users.slice(0, 3)) {
    devUserSeed.push({
      occurredAt: "2026-03-08T08:00:00.000Z",
      auditOutcome: "SUCCESS",
      userEmail: u.email,
      actionType: "LOGIN",
      entityType: "AUTH",
      entityId: String(u.id),
      description: "Successful login (seed)",
      ipAddress: "10.0.0.1",
    });
    devUserSeed.push({
      occurredAt: "2026-03-07T09:15:00.000Z",
      auditOutcome: "SUCCESS",
      userEmail: u.email,
      actionType: "USER_UPDATE",
      entityType: "USER",
      entityId: String(u.id),
      description: `User record activity (seed) for ${u.email}`,
      ipAddress: "10.0.0.1",
    });
  }

  const merged: AuditSeedRow[] = [...fromJson, ...governanceSeed, ...devUserSeed];
  merged.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const auditLog = merged.map((row, i) => ({ ...row, id: i + 1 }));
  const auditNextId = auditLog.length + 1;
  return { auditLog, auditNextId };
}
