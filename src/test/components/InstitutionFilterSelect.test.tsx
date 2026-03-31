import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "admin@hcb.com" } }),
}));

const mockUseInstitutions = vi.fn();
vi.mock("@/hooks/api/useInstitutions", () => ({
  useInstitutions: (...args: unknown[]) => mockUseInstitutions(...args),
}));

const stubInstitution = {
  id: 1,
  name: "Test Bank",
  tradingName: "TB",
  institutionType: "bank",
  institutionLifecycleStatus: "active",
  registrationNumber: "r1",
  jurisdiction: "KE",
  apisEnabledCount: 1,
  isDataSubmitter: true,
  isSubscriber: false,
  createdAt: "",
  updatedAt: "",
};

function renderWithClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseInstitutions.mockReturnValue({
    data: { content: [stubInstitution], totalElements: 1, totalPages: 1, page: 0, size: 300 },
    isPending: false,
    isError: false,
    error: null,
  });
});

describe("InstitutionFilterSelect", () => {
  it("renders Member institution label and All submitters for submitters mode", () => {
    renderWithClient(
      <InstitutionFilterSelect mode="submitters" value="all" onValueChange={vi.fn()} />
    );
    expect(screen.getByText("Member institution")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("All submitters");
  });

  it("renders All subscribers for subscribers mode", () => {
    mockUseInstitutions.mockReturnValue({
      data: {
        content: [{ ...stubInstitution, isSubscriber: true, isDataSubmitter: false }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 300,
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderWithClient(
      <InstitutionFilterSelect mode="subscribers" value="all" onValueChange={vi.fn()} />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("All subscribers");
  });

  it("renders All institutions for all mode", () => {
    renderWithClient(<InstitutionFilterSelect mode="all" value="all" onValueChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("All institutions");
  });

  it("shows legal name as selected label when an institution is chosen (not trading name)", () => {
    renderWithClient(
      <InstitutionFilterSelect mode="all" value="1" onValueChange={vi.fn()} />
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("Test Bank");
    expect(trigger).not.toHaveTextContent("TB");
  });

  it("shows error alert when institutions query fails", () => {
    mockUseInstitutions.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network down"),
    });
    renderWithClient(
      <InstitutionFilterSelect mode="submitters" value="all" onValueChange={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
  });
});
