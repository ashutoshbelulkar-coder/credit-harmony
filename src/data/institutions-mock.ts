export type InstitutionStatus = "active" | "pending" | "suspended" | "draft";
export type BillingModel = "prepaid" | "postpaid" | "hybrid";

export interface Institution {
  id: string;
  name: string;
  tradingName?: string;
  type: string;
  status: InstitutionStatus;
  apisEnabled: number;
  slaHealth: number;
  lastUpdated: string;
  registrationNumber?: string;
  jurisdiction?: string;
  licenseType?: string;
  licenseNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  onboardedDate?: string;
  dataQuality?: number;
  matchAccuracy?: number;
  complianceDocs?: { name: string; status: "verified" | "pending" }[];
  isDataSubmitter: boolean;
  isSubscriber: boolean;
  billingModel?: BillingModel;
  creditBalance?: number;
}

export const institutions: Institution[] = [
  {
    id: "1",
    name: "First National Bank",
    tradingName: "FNB",
    type: "Commercial Bank",
    status: "active",
    apisEnabled: 3,
    slaHealth: 99.9,
    lastUpdated: "2026-02-18",
    registrationNumber: "BK-2024-00142",
    jurisdiction: "Kenya",
    licenseType: "Commercial Banking",
    licenseNumber: "CBK-LIC-0042",
    contactEmail: "compliance@fnb.co.ke",
    contactPhone: "+254 700 123 456",
    onboardedDate: "Jan 15, 2026",
    dataQuality: 98,
    matchAccuracy: 96.4,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "CBK License", status: "verified" },
      { name: "Data Protection Certificate", status: "pending" },
    ],
    isDataSubmitter: true,
    isSubscriber: true,
    billingModel: "postpaid",
    creditBalance: undefined,
  },
  {
    id: "2",
    name: "Metro Credit Union",
    tradingName: "Metro CU",
    type: "Credit Union",
    status: "active",
    apisEnabled: 2,
    slaHealth: 99.5,
    lastUpdated: "2026-02-17",
    registrationNumber: "CU-2024-00087",
    jurisdiction: "Kenya",
    licenseType: "Credit Union",
    licenseNumber: "SASRA-LIC-0087",
    contactEmail: "compliance@metrocu.co.ke",
    contactPhone: "+254 711 234 567",
    onboardedDate: "Jan 22, 2026",
    dataQuality: 95,
    matchAccuracy: 94.1,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "SASRA License", status: "verified" },
      { name: "Data Protection Certificate", status: "verified" },
    ],
    isDataSubmitter: true,
    isSubscriber: false,
  },
  {
    id: "3",
    name: "Pacific Finance Corp",
    tradingName: "PFC",
    type: "NBFI",
    status: "pending",
    apisEnabled: 0,
    slaHealth: 0,
    lastUpdated: "2026-02-16",
    registrationNumber: "NB-2025-00201",
    jurisdiction: "Tanzania",
    licenseType: "Non-Bank Financial",
    licenseNumber: "BOT-NB-0201",
    contactEmail: "regulatory@pacificfin.co.tz",
    contactPhone: "+255 222 345 678",
    onboardedDate: undefined,
    dataQuality: 0,
    matchAccuracy: 0,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "BOT License", status: "pending" },
      { name: "Data Protection Certificate", status: "pending" },
    ],
    isDataSubmitter: false,
    isSubscriber: true,
    billingModel: "prepaid",
    creditBalance: 25000,
  },
  {
    id: "4",
    name: "Southern Trust Bank",
    tradingName: "STB",
    type: "Commercial Bank",
    status: "active",
    apisEnabled: 3,
    slaHealth: 99.7,
    lastUpdated: "2026-02-15",
    registrationNumber: "BK-2024-00098",
    jurisdiction: "Uganda",
    licenseType: "Commercial Banking",
    licenseNumber: "BOU-LIC-0098",
    contactEmail: "compliance@stb.co.ug",
    contactPhone: "+256 414 567 890",
    onboardedDate: "Dec 10, 2025",
    dataQuality: 97,
    matchAccuracy: 95.8,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "BOU License", status: "verified" },
      { name: "Data Protection Certificate", status: "verified" },
    ],
    isDataSubmitter: true,
    isSubscriber: true,
    billingModel: "hybrid",
    creditBalance: 50000,
  },
  {
    id: "5",
    name: "Digital Lending Co",
    tradingName: "DigiLend",
    type: "Fintech",
    status: "draft",
    apisEnabled: 0,
    slaHealth: 0,
    lastUpdated: "2026-02-14",
    registrationNumber: "FT-2025-00312",
    jurisdiction: "Kenya",
    licenseType: "Digital Credit Provider",
    licenseNumber: "CBK-DCP-0312",
    contactEmail: "ops@digilend.co.ke",
    contactPhone: "+254 733 456 789",
    onboardedDate: undefined,
    dataQuality: 0,
    matchAccuracy: 0,
    complianceDocs: [],
    isDataSubmitter: false,
    isSubscriber: true,
    billingModel: "prepaid",
    creditBalance: 10000,
  },
  {
    id: "6",
    name: "Heritage Savings Bank",
    tradingName: "Heritage",
    type: "Savings Bank",
    status: "suspended",
    apisEnabled: 1,
    slaHealth: 87.2,
    lastUpdated: "2026-02-10",
    registrationNumber: "SB-2023-00055",
    jurisdiction: "Rwanda",
    licenseType: "Savings Bank",
    licenseNumber: "BNR-SB-0055",
    contactEmail: "compliance@heritage.rw",
    contactPhone: "+250 788 567 890",
    onboardedDate: "Sep 5, 2025",
    dataQuality: 82,
    matchAccuracy: 79.5,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "BNR License", status: "pending" },
      { name: "Data Protection Certificate", status: "pending" },
    ],
    isDataSubmitter: true,
    isSubscriber: false,
  },
  {
    id: "7",
    name: "Alpine Microfinance",
    tradingName: "Alpine MFI",
    type: "MFI",
    status: "active",
    apisEnabled: 2,
    slaHealth: 98.1,
    lastUpdated: "2026-02-13",
    registrationNumber: "MF-2024-00176",
    jurisdiction: "Kenya",
    licenseType: "Microfinance",
    licenseNumber: "CBK-MF-0176",
    contactEmail: "compliance@alpinemfi.co.ke",
    contactPhone: "+254 722 678 901",
    onboardedDate: "Feb 1, 2026",
    dataQuality: 91,
    matchAccuracy: 90.2,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "CBK MFI License", status: "verified" },
      { name: "Data Protection Certificate", status: "verified" },
    ],
    isDataSubmitter: true,
    isSubscriber: true,
    billingModel: "postpaid",
  },
  {
    id: "8",
    name: "Urban Commercial Bank",
    tradingName: "UCB",
    type: "Commercial Bank",
    status: "active",
    apisEnabled: 3,
    slaHealth: 99.8,
    lastUpdated: "2026-02-12",
    registrationNumber: "BK-2024-00114",
    jurisdiction: "Kenya",
    licenseType: "Commercial Banking",
    licenseNumber: "CBK-LIC-0114",
    contactEmail: "compliance@ucb.co.ke",
    contactPhone: "+254 700 789 012",
    onboardedDate: "Jan 8, 2026",
    dataQuality: 96,
    matchAccuracy: 95.1,
    complianceDocs: [
      { name: "Certificate of Incorporation", status: "verified" },
      { name: "CBK License", status: "verified" },
      { name: "Data Protection Certificate", status: "verified" },
    ],
    isDataSubmitter: true,
    isSubscriber: false,
  },
];

export const institutionTypes = [
  "Commercial Bank",
  "Credit Union",
  "NBFI",
  "Fintech",
  "Savings Bank",
  "MFI",
] as const;

export const statusStyles: Record<InstitutionStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  suspended: "bg-danger-subtle text-danger",
  draft: "bg-muted text-muted-foreground",
};

export function getInstitutionById(id: string): Institution | undefined {
  return institutions.find((inst) => inst.id === id);
}
