import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedRoute from "../../../components/auth/ProtectedRoute";
import { usersApi } from "../../../api/users";
import * as tokenManager from "../../../lib/tokenManager";

vi.mock("../../../api/users", () => ({
  usersApi: {
    getProfile: vi.fn(),
  },
}));

vi.mock("../../../lib/tokenManager", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
}));

describe("ProtectedRoute Role Guard", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderWithRouter = (initialRoute: string, allowedRoles?: string[]) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/403" element={<div>Unauthorized 403 Page</div>} />
            <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
              <Route path="/admin/agent-workflow" element={<div>Admin Workflow Content</div>} />
              <Route path="/provider/payouts" element={<div>Provider Payouts Content</div>} />
              <Route path="/dashboard" element={<div>Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("redirects unauthenticated users to /login when no token exists", () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue(null);
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue(null);

    renderWithRouter("/admin/agent-workflow", ["Admin"]);

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Workflow Content")).not.toBeInTheDocument();
  });

  it("blocks non-admin users from accessing /admin/agent-workflow and redirects to /403", async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue("valid-token");
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue("valid-refresh-token");
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "cust-1",
      email: "customer@test.com",
      fullName: "Customer User",
      roles: ["Customer"],
    });

    renderWithRouter("/admin/agent-workflow", ["Admin"]);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized 403 Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Admin Workflow Content")).not.toBeInTheDocument();
  });

  it("allows admin users to access /admin/agent-workflow", async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue("valid-token");
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue("valid-refresh-token");
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      fullName: "Admin User",
      roles: ["Admin"],
    });

    renderWithRouter("/admin/agent-workflow", ["Admin"]);

    await waitFor(() => {
      expect(screen.getByText("Admin Workflow Content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Unauthorized 403 Page")).not.toBeInTheDocument();
  });

  it("blocks customers from accessing provider routes and redirects to /403", async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue("valid-token");
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue("valid-refresh-token");
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "cust-1",
      email: "customer@test.com",
      fullName: "Customer User",
      roles: ["Customer"],
    });

    renderWithRouter("/provider/payouts", ["Provider"]);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized 403 Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Provider Payouts Content")).not.toBeInTheDocument();
  });

  it("allows providers to access provider routes", async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue("valid-token");
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue("valid-refresh-token");
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "prov-1",
      email: "provider@test.com",
      fullName: "Provider User",
      roles: ["Provider"],
    });

    renderWithRouter("/provider/payouts", ["Provider"]);

    await waitFor(() => {
      expect(screen.getByText("Provider Payouts Content")).toBeInTheDocument();
    });
  });
});
