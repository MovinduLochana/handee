import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegisterCustomer from "../../../pages/auth/RegisterCustomer";
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

describe("RegisterCustomer Component", () => {
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
          <RegisterCustomer />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("renders the registration form for customers", () => {
    renderRegister();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("successfully registers and redirects to login", async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      id: "1",
      role: "Customer",
      fullName: "John",
      email: "x",
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "j@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        {
          fullName: "John Doe",
          email: "j@example.com",
          password: "password",
          role: "Customer",
        },
        expect.anything(),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("displays error banner if registration fails", async () => {
    vi.mocked(authApi.register).mockRejectedValueOnce(new Error("Email taken"));

    renderRegister();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "j@t.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "p" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email taken/i)).toBeInTheDocument();
    });
  });
});
