import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DocumentCard from "../../../components/provider/DocumentCard";
import type { CertificationDto } from "../../../api/types";
import { getFullMediaUrl } from "../../../lib/api";

describe("DocumentCard Component", () => {
  const mockCert: CertificationDto = {
    id: "cert-1",
    providerProfileId: "prof-1",
    type: "NIC",
    fileUrl: "/uploads/nic.pdf",
    originalFileName: "my-id-card.pdf",
    uploadedAt: new Date().toISOString(),
    reviewStatus: "Pending",
  };

  it("renders document details and view document button with Eye icon", () => {
    render(<DocumentCard certification={mockCert} showActions={true} />);

    expect(screen.getByText("National ID Card")).toBeInTheDocument();
    expect(screen.getByText("my-id-card.pdf")).toBeInTheDocument();

    const viewBtn = screen.getByTitle(/view document/i);
    expect(viewBtn).toBeInTheDocument();
    expect(viewBtn).toHaveAttribute("href", getFullMediaUrl("/uploads/nic.pdf"));

    // Contains svg element from Eye icon
    const svgIcon = viewBtn.querySelector("svg");
    expect(svgIcon).toBeInTheDocument();
  });
});
