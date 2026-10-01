import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VerificationStatusTracker from "../../../pages/provider/VerificationStatus";
import { providerApi } from "../../../api/providers";

vi.mock("../../../api/providers", () => ({
  providerApi: {
    getMyProfile: vi.fn(),
    uploadDocument: vi.fn(),
  },
}));

describe("VerificationStatus Component - Provider Verification Trail", () => {
  let queryClient: QueryClient;

  const baseProfile = {
    id: "provider-123",
    fullName: "Nimal Silva",
    verificationStatus: "Verified",
    certifications: [
      {
        id: "cert-1",
        type: "NIC",
        originalFileName: "nic.pdf",
        reviewStatus: "Approved",
        uploadedAt: new Date().toISOString(),
      },
    ],
  };

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
          <VerificationStatusTracker />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("shows only the admin note and hides '{Document Name} review status set to Approved' message", async () => {
    const profileWithLogs = {
      ...baseProfile,
      auditLogs: [
        {
          id: "log-1",
          adminUserId: "admin-1",
          previousStatus: "InReview",
          newStatus: "InReview",
          timestamp: new Date().toISOString(),
          note: "Document NIC (nic.pdf) review status set to Approved. Note: Government NIC verified successfully.",
        },
      ],
    };
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(profileWithLogs as any);

    renderComponent();

    // Verify status badge
    expect(await screen.findByText("Application Timeline")).toBeInTheDocument();

    // Should ONLY see the admin note
    expect(screen.getByText("Government NIC verified successfully.")).toBeInTheDocument();

    // Should NOT see the boilerplate text "review status set to Approved"
    expect(screen.queryByText(/review status set to Approved/i)).not.toBeInTheDocument();
  });

  it("hides the admin note box entirely when approval has no custom admin note", async () => {
    const profileWithLogs = {
      ...baseProfile,
      auditLogs: [
        {
          id: "log-2",
          adminUserId: "admin-1",
          previousStatus: "InReview",
          newStatus: "InReview",
          timestamp: new Date().toISOString(),
          note: "Document NIC (nic.pdf) review status set to Approved.",
        },
      ],
    };
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(profileWithLogs as any);

    renderComponent();

    expect(await screen.findByText("Application Timeline")).toBeInTheDocument();

    // Should NOT see the boilerplate text
    expect(screen.queryByText(/review status set to Approved/i)).not.toBeInTheDocument();

    // No Admin Note container should be shown
    expect(screen.queryByText(/Admin Note:/i)).not.toBeInTheDocument();
  });

  it("displays regular status change notes as normal", async () => {
    const profileWithLogs = {
      ...baseProfile,
      auditLogs: [
        {
          id: "log-3",
          adminUserId: "admin-1",
          previousStatus: "InReview",
          newStatus: "Verified",
          timestamp: new Date().toISOString(),
          note: "Congratulations, your provider account is now fully verified.",
        },
      ],
    };
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(profileWithLogs as any);

    renderComponent();

    expect(await screen.findByText("Application Timeline")).toBeInTheDocument();
    expect(
      screen.getByText("Congratulations, your provider account is now fully verified."),
    ).toBeInTheDocument();
  });
});
