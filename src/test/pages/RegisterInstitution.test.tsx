import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegisterInstitution from "@/pages/RegisterInstitution";
import { resolveRegisterFormClientSide } from "@/lib/institution-register-form";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockForm = resolveRegisterFormClientSide(
  "default",
  ["Commercial Bank", "MFI"],
  []
);

vi.mock("@/hooks/api/useInstitutions", () => ({
  useInstitutionFormMetadata: () => ({
    data: {
      geographyId: mockForm.geographyId,
      registerForm: mockForm,
      institutionTypes: ["Commercial Bank", "MFI"],
      activeConsortiums: [],
      requiredComplianceDocuments: null,
    },
    isPending: false,
    isError: false,
  }),
  useCreateInstitution: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderRegister() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RegisterInstitution />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("RegisterInstitution — registration number", () => {
  it("renders Registration Number as read-only without required asterisk", async () => {
    renderRegister();
    await waitFor(() => {
      expect(screen.getByText("Registration Number")).toBeInTheDocument();
    });
    const label = screen.getByText("Registration Number");
    expect(label.textContent).not.toContain("*");
    const input = document.querySelector('input[name="registrationNumber"]');
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute("readOnly");
    expect(screen.getByText(/assigned automatically when you submit/i)).toBeInTheDocument();
  });
});
