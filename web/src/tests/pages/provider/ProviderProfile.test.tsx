import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderProfile from "../../../pages/provider/ProviderProfile";
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
  },
}));

describe("ProviderProfile Component", () => {
  let queryClient: QueryClient;

  const mockCategories = [
    { id: "cat-1", name: "Plumbing", iconUrl: "🔧", isActive: true },
    { id: "cat-2", name: "Electrical", iconUrl: "⚡", isActive: true },
    { id: "cat-3", name: "Carpentry", iconUrl: "🪚", isActive: true },
  ];

  const mockProfile = {
    id: "prof-1",
    fullName: "Johnathan Smith",
    headline: "Licensed Master Electrician",
    bio: "Experienced technician in Colombo.",
    description: "Detailed description here.",
    yearsOfExperience: 10,
    languages: ["English", "Sinhala"],
    servicesOffered: ["Wiring", "Lighting"],
    serviceCategories: [{ id: "cat-2", name: "Electrical", iconUrl: "⚡", isActive: true }],
    serviceAreaDisplayName: "Colombo, Western Province",
    serviceRadiusKm: 25,
    verificationStatus: "Verified",
    isAvailableForWork: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(mockProfile as any);
    vi.mocked(serviceCategoryApi.getServiceCategories).mockResolvedValue(mockCategories as any);
    vi.mocked(serviceListingsApi.getMyServiceListings).mockResolvedValue([]);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProviderProfile />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders service location under the headline in the top header", async () => {
    renderComponent();

    const headlineEl = await screen.findByText("Licensed Master Electrician");
    const locationEl = await screen.findByText("Colombo, Western Province");

    expect(headlineEl).toBeInTheDocument();
    expect(locationEl).toBeInTheDocument();

    // Verify location container is placed after headline in DOM hierarchy
    expect(
      headlineEl.compareDocumentPosition(locationEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows only selected service categories when viewing, and reveals all when editing", async () => {
    renderComponent();

    // In view mode, only "Electrical" is selected
    expect(await screen.findByText("Electrical")).toBeInTheDocument();
    expect(screen.queryByText("Plumbing")).not.toBeInTheDocument();
    expect(screen.queryByText("Carpentry")).not.toBeInTheDocument();

    // Click Edit Profile
    const editBtn = screen.getByRole("button", { name: /edit profile/i });
    fireEvent.click(editBtn);

    // In edit mode, all categories become visible
    expect(screen.getByText("Electrical")).toBeInTheDocument();
    expect(screen.getByText("Plumbing")).toBeInTheDocument();
    expect(screen.getByText("Carpentry")).toBeInTheDocument();
  });

  it("renders language pills in view mode and provides checkboxes plus custom input in edit mode", async () => {
    renderComponent();

    // In view mode: language pills are rendered
    expect(await screen.findByText("English")).toHaveClass("language-pill");
    expect(screen.getByText("Sinhala")).toHaveClass("language-pill");
    expect(screen.queryByRole("checkbox", { name: "Tamil" })).not.toBeInTheDocument();

    // Click Edit Profile
    const editBtn = screen.getByRole("button", { name: /edit profile/i });
    fireEvent.click(editBtn);

    // In edit mode: checkboxes for Sinhala, English, Tamil are visible
    const englishCb = screen.getByRole("checkbox", { name: "English" }) as HTMLInputElement;
    const sinhalaCb = screen.getByRole("checkbox", { name: "Sinhala" }) as HTMLInputElement;
    const tamilCb = screen.getByRole("checkbox", { name: "Tamil" }) as HTMLInputElement;

    expect(englishCb).toBeInTheDocument();
    expect(englishCb.checked).toBe(true);
    expect(sinhalaCb).toBeInTheDocument();
    expect(sinhalaCb.checked).toBe(true);
    expect(tamilCb).toBeInTheDocument();
    expect(tamilCb.checked).toBe(false);

    // Toggle Tamil checkbox
    fireEvent.click(tamilCb);
    expect(tamilCb.checked).toBe(true);
  });
});
