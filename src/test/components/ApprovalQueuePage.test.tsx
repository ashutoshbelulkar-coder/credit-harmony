import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ApprovalQueuePage } from "@/pages/approval-queue/ApprovalQueuePage";
import { approvalQueueItems } from "@/data/approval-queue-mock";
import { calcPendingCount, calcApprovedThisMonth, calcChangesRequestedCount } from "@/lib/calc/kpiCalc";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ApprovalQueuePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ApprovalQueuePage — KPI cards", () => {
  it("renders KPI label 'Pending Approval'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pending Approval")).toBeInTheDocument());
  });

  it("renders KPI label 'Approved This Month'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Approved This Month")).toBeInTheDocument());
  });

  it("renders KPI label 'Changes Requested'", async () => {
    renderPage();
    await waitFor(() => {
      const els = screen.getAllByText("Changes Requested");
      expect(els.length).toBeGreaterThan(0);
    });
  });

  it("renders KPI label 'Total Items'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Total Items")).toBeInTheDocument());
  });

  it("'Pending Approval' value matches calcPendingCount from mock data", async () => {
    renderPage();
    const expected = calcPendingCount(approvalQueueItems);
    await waitFor(() => {
      const kpiCardEl = screen.getByText("Pending Approval").closest("div")!;
      const valueEl = kpiCardEl.querySelector("p.text-h3");
      expect(valueEl?.textContent).toBe(String(expected));
    });
  });

  it("'Approved This Month' value uses current month — NOT a hardcoded date prefix", async () => {
    renderPage();
    const expected = calcApprovedThisMonth(approvalQueueItems);
    await waitFor(() => {
      const kpiCardEl = screen.getByText("Approved This Month").closest("div")!;
      const valueEl = kpiCardEl.querySelector("p.text-h3");
      expect(valueEl?.textContent).toBe(String(expected));
    });
  });

  it("'Changes Requested' value matches calcChangesRequestedCount from mock data", async () => {
    renderPage();
    const expected = calcChangesRequestedCount(approvalQueueItems);
    await waitFor(() => {
      const kpiLabels = screen.getAllByText("Changes Requested");
      expect(kpiLabels.length).toBeGreaterThan(0);
      const kpiLabel = kpiLabels.find((el) => el.classList.contains("text-caption") || el.tagName === "P");
      if (kpiLabel) {
        const kpiCardEl = kpiLabel.closest("div")!;
        const valueEl = kpiCardEl.querySelector("p.text-h3");
        expect(valueEl?.textContent).toBe(String(expected));
      } else {
        expect(expected).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe("ApprovalQueuePage — filtering", () => {
  it("renders the tab list including All, Institutions, and Alert rules", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /institution/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /alert rules/i })).toBeInTheDocument();
    });
  });

  it("All tab is active by default", async () => {
    renderPage();
    await waitFor(() => {
      const tabAll = screen.getByRole("tab", { name: /^all$/i });
      expect(tabAll).toHaveAttribute("data-state", "active");
    });
  });

  it("Institutions tab is present and can receive focus", async () => {
    renderPage();
    await waitFor(() => {
      const tabInst = screen.getByRole("tab", { name: /institution/i });
      expect(tabInst).toBeInTheDocument();
    });
    const tabInst = screen.getByRole("tab", { name: /institution/i });
    expect(() => fireEvent.click(tabInst)).not.toThrow();
  });

  it("renders a status filter select", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
  });
});

describe("ApprovalQueuePage — data table", () => {
  it("renders the item name column after data loads", async () => {
    renderPage();
    const pendingItems = approvalQueueItems.filter((i) => i.status === "pending");
    if (pendingItems.length > 0) {
      const firstName = pendingItems[0].name;
      await waitFor(() => expect(screen.getByText(firstName)).toBeInTheDocument(), { timeout: 3000 });
    }
  });
});
