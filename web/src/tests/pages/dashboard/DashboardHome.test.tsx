import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardHome from "../../../pages/dashboard/DashboardHome";
import { usersApi } from "../../../api/users";

vi.mock("../../../api/users", () => ({
  usersApi: {
    getProfile: vi.fn(),
  },
}));

describe("DashboardHome Role Content", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardHome />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders pending approval card linking to /admin/agent-workflow ONLY for Admin users", async () => {
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      fullName: "Admin User",
      roles: ["Admin"],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
    });

    const pendingApprovalsLink = screen.getByText("Review Workflow").closest("a");
    expect(pendingApprovalsLink).toHaveAttribute("href", "/admin/agent-workflow");

    const manageBookingsLink = screen.getByText("Manage Bookings").closest("a");
    expect(manageBookingsLink).toHaveAttribute("href", "/admin/bookings");

    const financeLink = screen.getByText("Manage Finances").closest("a");
    expect(financeLink).toHaveAttribute("href", "/admin/payments");
  });

  it("does NOT render pending approval link for Customer users and gives customer-specific actions", async () => {
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "cust-1",
      email: "customer@test.com",
      fullName: "Customer User",
      roles: ["Customer"],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Find Professionals")).toBeInTheDocument();
    });

    // Verify Pending Approvals and admin-workflow link are completely absent
    expect(screen.queryByText("Pending Approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Workflow")).not.toBeInTheDocument();

    const findProsLink = screen.getByText("Browse Providers").closest("a");
    expect(findProsLink).toHaveAttribute("href", "/providers");

    const invoicesLink = screen.getByText("View Invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("href", "/invoices");
  });

  it("does NOT render pending approval link for Provider users and gives provider-specific actions", async () => {
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "prov-1",
      email: "provider@test.com",
      fullName: "Provider User",
      roles: ["Provider"],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Verification Status")).toBeInTheDocument();
    });

    // Verify Pending Approvals and admin-workflow link are completely absent
    expect(screen.queryByText("Pending Approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Workflow")).not.toBeInTheDocument();

    const checkStatusLink = screen.getByText("Check Status").closest("a");
    expect(checkStatusLink).toHaveAttribute("href", "/provider/status");

    const payoutsLink = screen.getByText("View Payouts").closest("a");
    expect(payoutsLink).toHaveAttribute("href", "/provider/payouts");
  });
});
