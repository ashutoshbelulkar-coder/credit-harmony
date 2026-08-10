/** Demo fixtures for product-form live enquiry request/response preview. */

export const PREVIEW_SAMPLE_APPLICATION = {
  applicationRef: "LN-APP-2026-00123",
  role: "BORROWER",
  contractType: "PERSONAL_LOAN",
  contractCategory: "INSTALLMENT",
  contractPhase: "REQUESTED",
  currency: "KES",
  requestedDate: "2026-03-31",
  requestedAmount: 500000.0,
  installmentsNumber: 36,
  paymentPeriodicity: "M",
  dueDate: "2029-03-31",
  branchId: "BR-NBI-001",
  unitId: "UNIT-WEST-04",
  sourceSystem: {
    name: "FinnOne",
    vendor: "Nucleus Software",
    version: "11.2",
  },
} as const;

export const PREVIEW_SAMPLE_SUBJECT = {
  entityType: "INDIVIDUAL",
  individual: {
    name: {
      fullName: "Nabila Sara Valmor",
      firstName: "Nabila",
      middleName: "Sara",
      lastName: "Valmor",
      prevLastName: "Mwangi",
      motherMaidenName: "Grace Achieng",
      nameAsId: "NABILA S VALMOR",
      aliases: ["Nabi Valmor", "N.S. Valmor"],
    },
    gender: "F",
    birth: {
      dateOfBirth: "1989-12-31",
      placeOfBirth: "Nairobi",
      countryOfBirth: "KE",
    },
    generalData: {
      nationality: "KE",
      maritalStatus: "MARRIED",
      numberOfDependents: 2,
      educationLevel: "GRADUATE",
      residentialStatus: "RENTED",
      customerSince: "2022-05-01",
      addInfo: [
        { sourceType: "DEVICE", sourceID: "d3f1-9a7c-22b8-7e10" },
        { sourceType: "TELCO", sourceID: "+254700000001" },
        { sourceType: "UTILITY", sourceID: "UTIL-AC-558823" },
      ],
    },
    identifiers: [
      {
        idType: "NATIONAL_ID",
        idValue: "12345678",
        issueDate: "2010-05-12",
        issuingCountry: "KE",
        issuingAuthority: "National Registration Bureau",
      },
      {
        idType: "PASSPORT",
        idValue: "AK0234567",
        issueDate: "2021-02-15",
        expiryDate: "2031-02-14",
        issuingCountry: "KE",
        issuingAuthority: "Directorate of Immigration",
      },
    ],
    addresses: [
      {
        addressType: "CURRENT",
        line1: "12 Riverside Drive, Apt 4B",
        district: "Westlands",
        city: "Nairobi",
        state: "Nairobi County",
        postalCode: "00100",
        country: "KE",
        livedSinceDate: "2021-06-01",
      },
    ],
    contacts: [
      { contactType: "MOBILE", contactValue: "+254700000001" },
      { contactType: "EMAIL", contactValue: "nabila.valmor@example.com" },
    ],
    relations: [
      { relationType: "SPOUSE", relationRole: "RELATION", name: "David Valmor" },
      { relationType: "GUARANTOR", relationRole: "GUARANTOR", name: "Grace Achieng" },
    ],
    employment: {
      occupationStatus: "SALARIED",
      employerName: "Acme Technologies Ltd",
      grossIncome: 180000,
      netIncome: 142000,
      incomePeriodicity: "M",
      industryCode: "J6201",
    },
  },
} as const;

export const PREVIEW_SAMPLE_META = {
  enquiryPurpose: "LOAN_ORIGINATION",
  enquiryStage: "UNDERWRITING",
  creditRequestType: "INDIVIDUAL",
  consentReference: "AA-CONSENT-2026-0098765",
  memberId: "CBS-MEM-1001",
} as const;
