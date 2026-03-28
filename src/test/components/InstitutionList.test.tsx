import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import InstitutionList from "@/pages/InstitutionList";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderList(roleFilter?: "dataSubmitter" | "subscriber") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InstitutionList roleFilter={roleFilter} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("InstitutionList — heading", () => {
  it("renders 'Member Institutions' heading by default", async () => {
    renderList();
    await waitFor(() => expect(screen.getByText("Member Institutions")).toBeInTheDocument(), { timeout: 5000 });
  });

  it("renders roleFilter heading 'Data Submission Institutions'", async () => {
    renderList("dataSubmitter");
    await waitFor(() => expect(screen.getByText("Data Submission Institutions")).toBeInTheDocument(), { timeout: 5000 });
  });
});

describe("InstitutionList — controls", () => {
  it("renders the Register member button", async () => {
    renderList();
    await waitFor(() => expect(screen.getByRole("button", { name: /register member/i })).toBeInTheDocument(), { timeout: 5000 });
  });

  it("renders search input with correct placeholder", async () => {
    renderList();
    await waitFor(() => expect(screen.getByPlaceholderText("Search institutions...")).toBeInTheDocument(), { timeout: 5000 });
  });

  it("renders Export CSV button", async () => {
    renderList();
    await waitFor(() => expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument(), { timeout: 5000 });
  });
});

describe("InstitutionList — data rendering", () => {
  it("renders column header 'Institution Name'", async () => {
    renderList();
    await waitFor(() => expect(screen.getByText("Institution Name")).toBeInTheDocument(), { timeout: 5000 });
  });

  it("renders at least one institution row from mock data", async () => {
    renderList();
    // Wait for the Institution Name column header — means table rendered
    await waitFor(() => screen.getByText("Institution Name"), { timeout: 5000 });
    // There should be more than 0 table rows (not just skeleton)
    const rows = screen.queryAllByRole("row");
    expect(rows.length).toBeGreaterThan(1); // at least header + 1 data row
  });
});

describe("InstitutionList — search filter", () => {
  it("search input is interactive", async () => {
    renderList();
    await waitFor(() => screen.getByPlaceholderText("Search institutions..."), { timeout: 5000 });
    const input = screen.getByPlaceholderText("Search institutions...");
    fireEvent.change(input, { target: { value: "test" } });
    expect(input).toHaveValue("test");
  });

  it("entering an unmatchable search shows empty state", async () => {
    renderList();
    // Wait for data to load
    await waitFor(() => screen.getByText("Institution Name"), { timeout: 5000 });
    const input = screen.getByPlaceholderText("Search institutions...");
    fireEvent.change(input, { target: { value: "zzznotexist123456" } });
    await waitFor(
      () => expect(screen.getByText("No institutions found")).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });
});
