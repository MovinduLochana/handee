import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderBookings from "../../../pages/provider/ProviderBookings";
import { bookingApi } from "../../../api/bookings";
import type { BookingResponseDto } from "../../../api/types";
import { booking } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/bookings")>();
  return {
    ...actual,
    bookingApi: {
      ...actual.bookingApi,
      getProviderScheduledRequests: vi.fn(),
      getProviderBookings: vi.fn(),
      confirmBooking: vi.fn(),
      declineBooking: vi.fn(),
    },
  };
});

const signalrHandlers: Record<string, () => void> = {};

// Mock SignalR
vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn(function () {
    return {
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      build: vi.fn(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        on: vi.fn((event: string, handler: () => void) => {
          signalrHandlers[event] = handler;
        }),
        off: vi.fn((event: string) => {
          delete signalrHandlers[event];
        }),
      })),
    };
  }),
}));

const mockScheduledRequest: BookingResponseDto = {
  ...booking,
  id: "b1111111-2222-3333-4444-555555555555",
  status: "Requested",
  bookingType: "Scheduled",
  customerName: "Jane Doe",
  customerPhone: "+94771234567",
  serviceLocation: "123 Main St, Colombo",
  notes: "Check bathroom pipe leak",
  price: 4500,
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  expiresAt: new Date(Date.now() + 23 * 3600000).toISOString(), // ~23 hours from now
};

const mockConfirmedBooking: BookingResponseDto = {
  ...booking,
  id: "b2222222-2222-3333-4444-555555555555",
  status: "Accepted",
  bookingType: "Scheduled",
  customerName: "Bob Smith",
  price: 6000,
  scheduledAt: new Date(Date.now() + 172800000).toISOString(),
};

describe("ProviderBookings Page", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    for (const key of Object.keys(signalrHandlers)) {
      delete signalrHandlers[key];
    }
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/provider/bookings"]}>
          <ProviderBookings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("renders pending scheduled inquiries with customer details and expiration badge", async () => {
    vi.mocked(bookingApi.getProviderScheduledRequests).mockResolvedValueOnce([
      mockScheduledRequest,
    ]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Check bathroom pipe leak")).toBeInTheDocument();
    expect(screen.getByText(/123 Main St, Colombo/i)).toBeInTheDocument();
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  it("accepts a pending scheduled booking request", async () => {
    vi.mocked(bookingApi.getProviderScheduledRequests)
      .mockResolvedValueOnce([mockScheduledRequest])
      .mockResolvedValueOnce([]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValue([mockConfirmedBooking]);
    vi.mocked(bookingApi.confirmBooking).mockResolvedValueOnce({
      ...mockScheduledRequest,
      status: "Accepted",
    });

    renderPage();

    const acceptBtn = await screen.findByRole("button", { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(bookingApi.confirmBooking).toHaveBeenCalledWith(mockScheduledRequest.id);
    });
  });

  it("opens decline dialog and submits decline with optional reason", async () => {
    vi.mocked(bookingApi.getProviderScheduledRequests)
      .mockResolvedValueOnce([mockScheduledRequest])
      .mockResolvedValueOnce([]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValue([]);
    vi.mocked(bookingApi.declineBooking).mockResolvedValueOnce({
      ...mockScheduledRequest,
      status: "Declined",
    });

    renderPage();

    const declineBtn = await screen.findByRole("button", { name: /decline/i });
    fireEvent.click(declineBtn);

    // Dialog should be visible
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Decline Booking Request/i)).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: "Fully booked that morning" } });

    const confirmDeclineBtn = screen.getByRole("button", { name: /confirm decline/i });
    fireEvent.click(confirmDeclineBtn);

    await waitFor(() => {
      expect(bookingApi.declineBooking).toHaveBeenCalledWith(
        mockScheduledRequest.id,
        "Fully booked that morning",
      );
    });
  });

  it("switches to Confirmed Bookings tab and displays accepted bookings", async () => {
    vi.mocked(bookingApi.getProviderScheduledRequests).mockResolvedValueOnce([]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValueOnce([mockConfirmedBooking]);

    renderPage();

    const confirmedTab = await screen.findByRole("tab", { name: /confirmed bookings/i });
    fireEvent.click(confirmedTab);

    expect(await screen.findByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("shows empty state when no pending inquiries exist", async () => {
    vi.mocked(bookingApi.getProviderScheduledRequests).mockResolvedValueOnce([]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText(/No Pending Inquiries/i)).toBeInTheDocument();
  });

  it("refetches scheduled requests when ReceiveScheduledBookingRequest is received over SignalR", async () => {
    localStorage.setItem("accessToken", "mock-jwt-token");
    vi.mocked(bookingApi.getProviderScheduledRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockScheduledRequest]);
    vi.mocked(bookingApi.getProviderBookings).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/No Pending Inquiries/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(signalrHandlers["ReceiveScheduledBookingRequest"]).toBeDefined();
    });

    signalrHandlers["ReceiveScheduledBookingRequest"]();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(bookingApi.getProviderScheduledRequests).toHaveBeenCalledTimes(2);
  });
});
