import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VerificationDetail from "../../../pages/admin/VerificationDetail";
import { providerApi } from "../../../api/providers";

vi.mock("../../../api/providers", () => ({
  providerApi: {
    getProfile: vi.fn(),
    updateVerification: vi.fn(),
    reviewCertification: vi.fn(),
  },
}));

describe("VerificationDetail Component - Document Review with Note", () => {
  let queryClient: QueryClient;

  const mockProfile = {
    id: "provider-123",
    fullName: "Kamal Perera",
    headline: "Plumber",
    yearsOfExperience: 5,
    createdAt: new Date().toISOString(),
    verificationStatus: "InReview",
    serviceAreaDisplayName: "Kandy",
    certifications: [
      {
        id: "cert-abc",
        providerProfileId: "provider-123",
        type: "NIC",
        originalFileName: "nic_scan.pdf",
        fileUrl: "/uploads/nic_scan.pdf",
        uploadedAt: new Date().toISOString(),
        reviewStatus: "Pending",
      },
    ],
    auditLogs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(providerApi.getProfile).mockResolvedValue(mockProfile as any);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/verifications/provider-123"]}>
          <Routes>
            <Route path="/admin/verifications/:id" element={<VerificationDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("opens approval modal with note input and calls reviewCertification with note upon approval", async () => {
    vi.mocked(providerApi.reviewCertification).mockResolvedValueOnce();

    renderComponent();

    // Verify document card rendered
    expect(await screen.findByText("National ID Card")).toBeInTheDocument();
    expect(screen.getByText("nic_scan.pdf")).toBeInTheDocument();

    // Click approve button (checkmark) on document card
    const approveBtn = screen.getByRole("button", { name: "✓" });
    fireEvent.click(approveBtn);

    // Modal opens
    expect(await screen.findByText(/Approve Submitted Document/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e\.g\. Verified with national registry/i),
    ).toBeInTheDocument();

    // Type an approval note
    const noteInput = screen.getByPlaceholderText(/e\.g\. Verified with national registry/i);
    fireEvent.change(noteInput, {
      target: { value: "NIC details verified and matches profile." },
    });

    // Confirm approval
    const confirmBtn = screen.getByRole("button", { name: /Confirm Approval/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(providerApi.reviewCertification).toHaveBeenCalledWith(
        "cert-abc",
        "Approved",
        "NIC details verified and matches profile.",
      );
    });
  });

  it("renders compact audit table with nowrap note field and opens details modal upon clicking Details", async () => {
    const profileWithLogs = {
      ...mockProfile,
      auditLogs: [
        {
          id: "log-1",
          adminUserId: "admin-456-789",
          previousStatus: "InReview",
          newStatus: "Verified",
          timestamp: new Date().toISOString(),
          note: "Document NIC (nic_scan.pdf) review status set to Approved. Note: Perfect identification copy.",
        },
      ],
    };
    vi.mocked(providerApi.getProfile).mockResolvedValue(profileWithLogs as any);

    renderComponent();

    // Audit trail section exists
    expect(await screen.findByText("Audit Trail")).toBeInTheDocument();

    // Check Note cell has nowrap style
    const noteCell = screen.getByText(/Perfect identification copy/i);
    expect(noteCell).toBeInTheDocument();
    expect(noteCell).toHaveClass("audit-note-cell");
    expect(noteCell).toHaveStyle({ whiteSpace: "nowrap" });

    // Click Details button
    const detailsBtn = screen.getByRole("button", { name: /Details/i });
    fireEvent.click(detailsBtn);

    // Modal appears with full details
    expect(await screen.findByText("Audit Log Entry")).toBeInTheDocument();
    expect(screen.getByText("admin-456-789")).toBeInTheDocument();
    const noteInstances = screen.getAllByText(
      "Document NIC (nic_scan.pdf) review status set to Approved. Note: Perfect identification copy.",
    );
    expect(noteInstances.length).toBeGreaterThanOrEqual(2);

    // Close button dismisses modal
    const closeBtns = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByText("Audit Log Entry")).not.toBeInTheDocument();
  });
});
