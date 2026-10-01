import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingModal from "../../../components/public/BookingModal";
import type { ServiceListingDto } from "../../../api/types";

const sampleListing: ServiceListingDto = {
  id: "list-12345",
  providerId: "prov-9999",
  serviceCategoryId: "cat-1111",
  title: "AC Deep Cleaning & Gas Refill",
  description: "Complete overhaul of indoor and outdoor units.",
  scope: "Standard chemical wash and gas top up",
  availability: "Mon-Sat 9AM-5PM",
  fixedPrice: 6500,
  durationHours: 2,
  estimatedDuration: "02:00:00",
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: null,
  serviceCategoryName: "HVAC & AC",
  providerFullName: "Ruwan Perera",
};

describe("BookingModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders service details without booking form inputs", () => {
    render(<BookingModal listing={sampleListing} onClose={onClose} />);

    // Service details
    expect(screen.getByText("AC Deep Cleaning & Gas Refill")).toBeInTheDocument();
    expect(screen.getByText("HVAC & AC")).toBeInTheDocument();
    expect(screen.getByText("Complete overhaul of indoor and outdoor units.")).toBeInTheDocument();
    expect(screen.getByText("Standard chemical wash and gas top up")).toBeInTheDocument();
    expect(screen.getByText(/LKR 6500.00/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Hours/i)).toBeInTheDocument();

    // Verify booking inputs are NOT present on web
    expect(screen.queryByLabelText(/(schedule|selected) date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/special notes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm booking/i })).not.toBeInTheDocument();
  });

  it("renders the Book on Mobile App section with app guidance", () => {
    render(<BookingModal listing={sampleListing} onClose={onClose} />);

    expect(screen.getByText("Book on Handee Mobile App")).toBeInTheDocument();
    expect(screen.getByText(/predefined 1-hour slot picker/i)).toBeInTheDocument();
    expect(screen.getByText(/14-day dynamic date strip/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in handee app/i })).toHaveAttribute(
      "href",
      "handee://listings/list-12345",
    );
  });

  it("calls onClose when Close button is clicked", () => {
    render(<BookingModal listing={sampleListing} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
