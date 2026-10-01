import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PublicNavbar from "../../../components/layout/PublicNavbar";
import { usersApi } from "../../../api/users";
import * as tokenManager from "../../../lib/tokenManager";

vi.mock("../../../api/users", () => ({
  usersApi: {
    getProfile: vi.fn(),
  },
}));

vi.mock("../../../lib/tokenManager", () => ({
  getRefreshToken: vi.fn(),
}));

describe("PublicNavbar", () => {
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
          <PublicNavbar />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders user avatar and calls getFullMediaUrl without throwing ReferenceError when logged in with profile picture", async () => {
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue("valid-token");
    vi.mocked(usersApi.getProfile).mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      fullName: "Nimal Silva",
      roles: ["Customer"],
      profilePictureUrl: "/uploads/avatar-123.jpg",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Nimal Silva")).toBeInTheDocument();
    });

    // Avatar fallback displays first letter
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
  });

  it("renders login and register links when not logged in", () => {
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue(null);

    renderComponent();

    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Join as a Pro")).toBeInTheDocument();
  });
});
