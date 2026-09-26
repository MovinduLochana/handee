import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingModal from "../../../components/public/BookingModal";
import { bookingApi } from "../../../api/bookings";
import { providerAvailabilityApi } from "../../../api/providerAvailability";
import type { ServiceListingDto, ProviderAvailabilitySlotDto } from "../../../api/types";
import { booking, httpError } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/bookings")>();
  return {
    ...actual,
    bookingApi: {
      ...actual.bookingApi,
      createFromListing: vi.fn(),
    },
  };
});

vi.mock("../../../api/providerAvailability", () => ({
  providerAvailabilityApi: {
    getForProvider: vi.fn(),
    getMine: vi.fn(),
    create: vi.fn(),
    createBatch: vi.fn(),
    createRecurring: vi.fn(),
    delete: vi.fn(),
  },
}));

const sampleListing: ServiceListingDto = {
  id: "list-12345",
  providerId: "prov-9999",
  serviceCategoryId: "cat-1111",
  title: "AC Deep Cleaning & Gas Refill",
  description: "Complete overhaul of indoor and outdoor units.",
  scope: "Standard chemical wash and gas top up",
  availability: "Mon-Sat 9AM-5PM",
  fixedPrice: 6500,
  estimatedDuration: "2 hours",
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: null,
  serviceCategoryName: "HVAC & AC",
  providerFullName: "Ruwan Perera",
};

const sampleSlots: ProviderAvailabilitySlotDto[] = [
  {
    id: "slot-1",
    providerId: "prov-9999",
    startTime: "2026-10-15T09:00:00.000Z",
    endTime: "2026-10-15T10:00:00.000Z",
    isBooked: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
  },
];

describe("BookingModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  let queryClient: QueryClient;

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BookingModal listing={sampleListing} onClose={onClose} onSuccess={onSuccess} />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(providerAvailabilityApi.getForProvider).mockResolvedValue(sampleSlots);
  });

  it("renders service details, available slots, and form inputs for scheduling", async () => {
    renderComponent();

    expect(screen.getByText("AC Deep Cleaning & Gas Refill")).toBeInTheDocument();
    expect(screen.getByText(/LKR 6500.00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/(schedule|selected) date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/special notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Provider Available Slots/i)).toBeInTheDocument();
    });
  });

  it("allows selecting a provider availability slot chip to set scheduledAt", async () => {
    vi.mocked(bookingApi.createFromListing).mockResolvedValue(booking);
    renderComponent();

    // Wait for slot chip to appear
    const slotChip = await screen.findByRole("button", { name: /oct/i });
    expect(slotChip).toBeInTheDocument();

    fireEvent.click(slotChip);

    const submitBtn = screen.getByRole("button", { name: /confirm booking/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bookingApi.createFromListing).toHaveBeenCalledWith({
        serviceListingId: "list-12345",
        scheduledAt: expect.stringMatching(/^2026-10-15T/),
        notes: undefined,
      });
    });
  });

  it("submits booking with custom scheduledAt and notes via bookingApi.createFromListing", async () => {
    vi.mocked(bookingApi.createFromListing).mockResolvedValue(booking);
    renderComponent();

    // Future date: 2026-10-15T10:00
    const dateInput = screen.getByLabelText(/(schedule|selected) date/i);
    fireEvent.change(dateInput, { target: { value: "2026-10-15T10:00" } });

    const notesInput = screen.getByLabelText(/special notes/i);
    fireEvent.change(notesInput, { target: { value: "Please call on arrival" } });

    const submitBtn = screen.getByRole("button", { name: /confirm booking/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bookingApi.createFromListing).toHaveBeenCalledWith({
        serviceListingId: "list-12345",
        scheduledAt: expect.stringMatching(/^2026-10-15T/),
        notes: "Please call on arrival",
      });
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(booking);
    });
  });

  it("displays server error message when bookingApi.createFromListing fails", async () => {
    vi.mocked(bookingApi.createFromListing).mockRejectedValue(
      httpError(400, "Provider is not available at the requested time slot."),
    );

    renderComponent();

    const dateInput = screen.getByLabelText(/(schedule|selected) date/i);
    fireEvent.change(dateInput, { target: { value: "2026-10-15T10:00" } });

    const submitBtn = screen.getByRole("button", { name: /confirm booking/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Provider is not available at the requested time slot."),
      ).toBeInTheDocument();
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
