export type UserRole = "Super Admin" | "Bureau Admin" | "Analyst" | "Viewer" | "API User";
export type UserStatus = "Active" | "Invited" | "Suspended" | "Deactivated";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastActive: string;
  createdAt: string;
  avatar?: string;
  apiKeys?: { id: string; name: string; lastUsed: string; status: "Active" | "Revoked" }[];
}

export interface RoleDefinition {
  role: UserRole;
  description: string;
  userCount: number;
  color: string;
  permissions: Record<string, boolean>;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  status: "Success" | "Failed";
  timestamp: string;
}

export const permissions = [
  "Manage Institutions",
  "View Dashboard",
  "Use Agents",
  "Manage Data Governance",
  "View Monitoring",
  "Generate Reports",
  "Manage Users",
  "Access API",
  "View Audit Logs",
];

export const roleDefinitions: RoleDefinition[] = [
  {
    role: "Super Admin",
    description: "Full platform access with user and system management capabilities",
    userCount: 2,
    color: "hsl(0, 72%, 51%)",
    permissions: Object.fromEntries(permissions.map((p) => [p, true])),
  },
  {
    role: "Bureau Admin",
    description: "Institution and data governance management with monitoring access",
    userCount: 3,
    color: "hsl(214, 78%, 20%)",
    permissions: Object.fromEntries(
      permissions.map((p) => [p, !["Manage Users", "Access API"].includes(p)])
    ),
  },
  {
    role: "Analyst",
    description: "Read-only analytics, agent usage, and report generation",
    userCount: 4,
    color: "hsl(175, 60%, 40%)",
    permissions: Object.fromEntries(
      permissions.map((p) => [p, ["View Dashboard", "Use Agents", "Generate Reports", "View Monitoring", "View Audit Logs"].includes(p)])
    ),
  },
  {
    role: "Viewer",
    description: "Dashboard-only read access with limited visibility",
    userCount: 2,
    color: "hsl(220, 9%, 46%)",
    permissions: Object.fromEntries(
      permissions.map((p) => [p, ["View Dashboard"].includes(p)])
    ),
  },
  {
    role: "API User",
    description: "Programmatic access only for system integrations",
    userCount: 1,
    color: "hsl(38, 92%, 50%)",
    permissions: Object.fromEntries(
      permissions.map((p) => [p, ["Access API", "View Audit Logs"].includes(p)])
    ),
  },
];

export const mockUsers: ManagedUser[] = [
  {
    id: "u1", name: "Sarah Chen", email: "sarah.chen@fnb.co.za", role: "Super Admin",
    institution: "FNB", status: "Active", mfaEnabled: true,
    lastActive: "2 minutes ago", createdAt: "2024-01-15",
    apiKeys: [{ id: "k1", name: "Production Key", lastUsed: "Today", status: "Active" }],
  },
  {
    id: "u2", name: "James Mthembu", email: "j.mthembu@fnb.co.za", role: "Bureau Admin",
    institution: "FNB", status: "Active", mfaEnabled: true,
    lastActive: "1 hour ago", createdAt: "2024-02-10",
  },
  {
    id: "u3", name: "Priya Naidoo", email: "priya.n@metrocu.com", role: "Analyst",
    institution: "Metro Credit Union", status: "Active", mfaEnabled: true,
    lastActive: "3 hours ago", createdAt: "2024-03-01",
  },
  {
    id: "u4", name: "David Kim", email: "d.kim@pacificfin.com", role: "Analyst",
    institution: "Pacific Finance Corp", status: "Active", mfaEnabled: false,
    lastActive: "Yesterday", createdAt: "2024-03-20",
  },
  {
    id: "u5", name: "Fatima Al-Rashid", email: "f.alrashid@gulfbank.ae", role: "Bureau Admin",
    institution: "Gulf National Bank", status: "Active", mfaEnabled: true,
    lastActive: "5 hours ago", createdAt: "2024-04-05",
  },
  {
    id: "u6", name: "Michael O'Brien", email: "m.obrien@atlasins.com", role: "Viewer",
    institution: "Atlas Insurance", status: "Active", mfaEnabled: false,
    lastActive: "2 days ago", createdAt: "2024-05-12",
  },
  {
    id: "u7", name: "Aisha Bello", email: "a.bello@firstbank.ng", role: "Analyst",
    institution: "First Bank Nigeria", status: "Invited", mfaEnabled: false,
    lastActive: "Never", createdAt: "2026-03-01",
  },
  {
    id: "u8", name: "Carlos Rivera", email: "c.rivera@latamcred.mx", role: "Bureau Admin",
    institution: "LATAM Credit Services", status: "Suspended", mfaEnabled: true,
    lastActive: "2 weeks ago", createdAt: "2024-06-18",
  },
  {
    id: "u9", name: "Lin Wei", email: "l.wei@asiapac.sg", role: "Analyst",
    institution: "AsiaPac Holdings", status: "Active", mfaEnabled: true,
    lastActive: "30 minutes ago", createdAt: "2024-07-22",
  },
  {
    id: "u10", name: "Olga Petrov", email: "o.petrov@eurobank.de", role: "Super Admin",
    institution: "EuroBank AG", status: "Active", mfaEnabled: true,
    lastActive: "10 minutes ago", createdAt: "2024-01-10",
  },
  {
    id: "u11", name: "System Integration", email: "api@pacificfin.com", role: "API User",
    institution: "Pacific Finance Corp", status: "Active", mfaEnabled: false,
    lastActive: "1 minute ago", createdAt: "2024-08-01",
    apiKeys: [
      { id: "k2", name: "Data Sync Key", lastUsed: "1 minute ago", status: "Active" },
      { id: "k3", name: "Legacy Key", lastUsed: "3 months ago", status: "Revoked" },
    ],
  },
  {
    id: "u12", name: "Rachel Foster", email: "r.foster@atlasins.com", role: "Viewer",
    institution: "Atlas Insurance", status: "Deactivated", mfaEnabled: false,
    lastActive: "1 month ago", createdAt: "2024-04-30",
  },
];

export const mockActivity: ActivityEntry[] = [
  { id: "a1", userId: "u1", userName: "Sarah Chen", action: "Login", details: "Successful login via SSO", ipAddress: "102.134.22.41", status: "Success", timestamp: "2026-03-08T14:32:00Z" },
  { id: "a2", userId: "u10", userName: "Olga Petrov", action: "Role Change", details: "Changed David Kim from Viewer to Analyst", ipAddress: "85.214.132.10", status: "Success", timestamp: "2026-03-08T13:15:00Z" },
  { id: "a3", userId: "u2", userName: "James Mthembu", action: "Bureau Query", details: "Ran credit bureau enquiry for PAN ABCDE1234F", ipAddress: "102.134.22.55", status: "Success", timestamp: "2026-03-08T12:45:00Z" },
  { id: "a4", userId: "u8", userName: "Carlos Rivera", action: "Login", details: "Login attempt blocked — account suspended", ipAddress: "189.203.44.12", status: "Failed", timestamp: "2026-03-08T11:30:00Z" },
  { id: "a5", userId: "u11", userName: "System Integration", action: "API Key Rotation", details: "Generated new production API key", ipAddress: "52.77.100.23", status: "Success", timestamp: "2026-03-08T10:00:00Z" },
  { id: "a6", userId: "u3", userName: "Priya Naidoo", action: "Report Generated", details: "Monthly credit risk summary exported as PDF", ipAddress: "203.45.67.89", status: "Success", timestamp: "2026-03-08T09:20:00Z" },
  { id: "a7", userId: "u1", userName: "Sarah Chen", action: "User Invited", details: "Invited Aisha Bello (a.bello@firstbank.ng)", ipAddress: "102.134.22.41", status: "Success", timestamp: "2026-03-01T16:00:00Z" },
  { id: "a8", userId: "u10", userName: "Olga Petrov", action: "User Suspended", details: "Suspended Carlos Rivera — policy violation", ipAddress: "85.214.132.10", status: "Success", timestamp: "2026-02-20T14:30:00Z" },
  { id: "a9", userId: "u5", userName: "Fatima Al-Rashid", action: "Data Governance", details: "Approved schema mapping for Gulf National Bank", ipAddress: "94.56.78.200", status: "Success", timestamp: "2026-02-18T11:10:00Z" },
  { id: "a10", userId: "u9", userName: "Lin Wei", action: "Login", details: "Failed MFA verification", ipAddress: "103.12.45.67", status: "Failed", timestamp: "2026-02-15T08:45:00Z" },
  { id: "a11", userId: "u4", userName: "David Kim", action: "Agent Usage", details: "Started Banking & Financial Services agent session", ipAddress: "72.14.200.33", status: "Success", timestamp: "2026-03-07T15:20:00Z" },
  { id: "a12", userId: "u6", userName: "Michael O'Brien", action: "Login", details: "Successful login via password", ipAddress: "82.12.44.99", status: "Success", timestamp: "2026-03-06T09:00:00Z" },
];

export const institutionOptions = [
  "FNB", "Metro Credit Union", "Pacific Finance Corp", "Gulf National Bank",
  "Atlas Insurance", "First Bank Nigeria", "LATAM Credit Services",
  "AsiaPac Holdings", "EuroBank AG",
];
