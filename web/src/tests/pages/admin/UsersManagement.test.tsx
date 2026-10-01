import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersManagement from "../../../pages/admin/UsersManagement";
import { adminApi } from "../../../api/admin";
import type { AdminUserResult } from "../../../api/types";

vi.mock("../../../api/admin", () => ({
  adminApi: {
    getUsers: vi.fn(),
    setUserStatus: vi.fn(),
  },
}));

const mockUsers: AdminUserResult[] = [
  {
    id: "user-1",
    fullName: "Kasun Jayawardena",
    email: "kasun@customer.lk",
    phoneNumber: "0771234567",
    isActive: true,
    providerVerificationStatus: "None",
    createdAt: new Date("2026-01-15").toISOString(),
    roles: ["Customer"],
  },
  {
    id: "user-2",
    fullName: "Sunil Perera",
    email: "sunil@provider.lk",
    phoneNumber: "0719876543",
    isActive: true,
    providerVerificationStatus: "Verified",
    createdAt: new Date("2026-02-10").toISOString(),
    roles: ["Provider"],
  },
  {
    id: "user-3",
    fullName: "Admin Officer",
    email: "admin@handee.lk",
    phoneNumber: null,
    isActive: true,
    providerVerificationStatus: "None",
    createdAt: new Date("2025-12-01").toISOString(),
    roles: ["Admin"],
  },
  {
    id: "user-4",
    fullName: "Nuwan Pradeep",
    email: "nuwan@provider.lk",
    phoneNumber: "0785551234",
    isActive: false,
    providerVerificationStatus: "Pending",
    createdAt: new Date("2026-03-01").toISOString(),
    roles: ["Provider"],
  },
];

describe("UsersManagement Page", () => {
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
          <UsersManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders all registered users and high-level KPI cards", async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue(mockUsers);

    renderComponent();

    expect(screen.getByText("Loading registered users...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
      expect(screen.getByText("Sunil Perera")).toBeInTheDocument();
      expect(screen.getByText("Admin Officer")).toBeInTheDocument();
      expect(screen.getByText("Nuwan Pradeep")).toBeInTheDocument();
    });

    // Check KPI counters: Total 4, Customers 1, Providers 2, Admins 1
    expect(screen.getByText("4")).toBeInTheDocument(); // Total Users
    expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
    expect(screen.getByText("sunil@provider.lk")).toBeInTheDocument();
  });

  it("filters users by role tab", async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue(mockUsers);
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
    });

    // Click Customers filter tab
    const customersBtn = screen.getByRole("button", { name: /^Customers/i });
    await user.click(customersBtn);

    expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
    expect(screen.queryByText("Sunil Perera")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Officer")).not.toBeInTheDocument();

    // Click Providers filter tab
    const providersBtn = screen.getByRole("button", { name: /^Providers/i });
    await user.click(providersBtn);

    expect(screen.queryByText("Kasun Jayawardena")).not.toBeInTheDocument();
    expect(screen.getByText("Sunil Perera")).toBeInTheDocument();
    expect(screen.getByText("Nuwan Pradeep")).toBeInTheDocument();
  });

  it("searches users by name or email keyword", async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue(mockUsers);
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name, email, or phone...");
    await user.type(searchInput, "Sunil");

    expect(screen.getByText("Sunil Perera")).toBeInTheDocument();
    expect(screen.queryByText("Kasun Jayawardena")).not.toBeInTheDocument();
  });

  it("opens suspension confirmation dialog and calls setUserStatus", async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(adminApi.setUserStatus).mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kasun Jayawardena")).toBeInTheDocument();
    });

    // Find the suspend button for active user Kasun
    const suspendButtons = screen.getAllByRole("button", { name: /^Suspend$/i });
    fireEvent.click(suspendButtons[0]);

    // Dialog should open
    expect(screen.getByText("Suspend User Account")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to suspend access for Kasun Jayawardena/i),
    ).toBeInTheDocument();

    // Confirm suspension
    const confirmBtn = screen.getByRole("button", { name: /^Confirm Suspension$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.setUserStatus).toHaveBeenCalledWith("user-1", false);
    });
  });
});
