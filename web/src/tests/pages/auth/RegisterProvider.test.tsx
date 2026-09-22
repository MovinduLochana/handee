import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegisterProvider from "../../../pages/auth/RegisterProvider";
import { authApi } from "../../../api/auth";

vi.mock("../../../api/auth", () => ({
  authApi: { register: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("RegisterProvider Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderRegister = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RegisterProvider />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("renders the registration form for providers", () => {
    renderRegister();
    expect(screen.getByRole("button", { name: /register & verify/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });

  it("successfully registers as provider and redirects", async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      id: "2",
      role: "Provider",
      fullName: "Corp",
      email: "x",
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: "Acme Corp" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /register & verify/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        {
          fullName: "Acme Corp",
          email: "a@example.com",
          password: "password",
          role: "Provider",
        },
        expect.anything(),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
