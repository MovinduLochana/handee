import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderOnboarding from "../../../pages/provider/ProviderOnboarding";
import { providerApi } from "../../../api/providers";
import { serviceCategoryApi } from "../../../api/serviceCategories";
import { serviceListingsApi } from "../../../api/serviceListings";

vi.mock("../../../api/providers", () => ({
  providerApi: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock("../../../api/serviceCategories", () => ({
  serviceCategoryApi: {
    getServiceCategories: vi.fn(),
  },
}));

vi.mock("../../../api/serviceListings", () => ({
  serviceListingsApi: {
    getMyServiceListings: vi.fn(),
    createServiceListing: vi.fn(),
    updateServiceListing: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ProviderOnboarding Component", () => {
  let queryClient: QueryClient;

  const mockCategories = [
    { id: "cat-1", name: "Plumbing", iconUrl: "🔧", isActive: true },
    { id: "cat-2", name: "Electrical", iconUrl: "⚡", isActive: true },
  ];

  const mockProfile = {
    id: "prof-1",
    fullName: "Johnathan Smith",
    headline: "Licensed Master Electrician",
    bio: "Experienced technician in Colombo.",
    description: "Detailed description here.",
    yearsOfExperience: 10,
    languages: ["English", "Sinhala"],
    serviceCategories: [{ id: "cat-2", name: "Electrical", iconUrl: "⚡", isActive: true }],
    serviceAreaDisplayName: "Colombo, Western Province",
    serviceRadiusKm: 25,
    serviceAreaLatitude: 6.9271,
    serviceAreaLongitude: 79.8612,
    verificationStatus: "Pending",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(mockProfile as any);
    vi.mocked(serviceCategoryApi.getServiceCategories).mockResolvedValue(mockCategories as any);
    vi.mocked(serviceListingsApi.getMyServiceListings).mockResolvedValue([]);
    vi.mocked(serviceListingsApi.createServiceListing).mockResolvedValue({ id: "list-1" } as any);
    vi.mocked(providerApi.updateProfile).mockResolvedValue({} as any);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProviderOnboarding />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders step 0 (Personal & Business Information) with prefilled values", async () => {
    renderComponent();

    expect(await screen.findByText("Personal & Business Information")).toBeInTheDocument();
    expect(screen.getByLabelText(/headline/i)).toHaveValue("Licensed Master Electrician");
    expect(screen.getByLabelText(/years of experience/i)).toHaveValue(10);
    expect(screen.getByLabelText(/short bio/i)).toHaveValue("Experienced technician in Colombo.");
  });

  it("advances to step 1 and validates service listing fields", async () => {
    renderComponent();

    expect(await screen.findByText("Personal & Business Information")).toBeInTheDocument();

    // Click Next Step to move to step 1
    const nextBtn = screen.getByRole("button", { name: /next step/i });
    fireEvent.click(nextBtn);

    expect(await screen.findByRole("heading", { name: "Skills & Services" })).toBeInTheDocument();
    expect(screen.getByText("Create Your First Service Listing")).toBeInTheDocument();

    // Clicking Next without filling listing details shows error
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    expect(
      await screen.findByText(/Please provide a title for your first service listing/i),
    ).toBeInTheDocument();
  });

  it("allows filling listing details and advancing through step 2 to finish step", async () => {
    renderComponent();

    // Step 0 -> Step 1
    expect(
      await screen.findByRole("heading", { name: "Personal & Business Information" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));

    // Step 1: Fill listing form
    expect(await screen.findByRole("heading", { name: "Skills & Services" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/service title/i), {
      target: { value: "Full Wiring Inspection" },
    });
    fireEvent.change(screen.getByLabelText(/fixed price in lkr/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/description \(required\)/i), {
      target: { value: "Complete electrical safety check" },
    });
    fireEvent.change(screen.getByLabelText(/scope of work/i), {
      target: { value: "Includes breaker box inspection" },
    });

    fireEvent.click(screen.getByRole("button", { name: /next step/i }));

    // Step 2: Service Area
    expect(await screen.findByRole("heading", { name: "Service Area" })).toBeInTheDocument();

    // Step 2 -> Step 3 (Finish)
    fireEvent.click(screen.getByRole("button", { name: /next step/i }));

    await waitFor(() => {
      expect(providerApi.updateProfile).toHaveBeenCalled();
    });

    expect(await screen.findByText("Profile Saved Successfully!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify identity now/i })).toBeInTheDocument();
  });
});
