import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingStatusControl from "../../../components/booking/BookingStatusControl";
import { bookingApi } from "../../../api/bookings";
import type { BookingStatus } from "../../../api/types";
import { booking, httpError } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/bookings")>();
  return { ...actual, bookingApi: { ...actual.bookingApi, updateStatus: vi.fn() } };
});

// Written out independently of LEGAL_BOOKING_TRANSITIONS, as the user-visible
// labels, from BookingService.LegalTransitions.
const EXPECTED_OPTIONS: Record<BookingStatus, string[]> = {
  Requested: ["Accepted", "Disputed"],
  Accepted: ["In Progress", "Disputed"],
  InProgress: ["Completed", "Disputed"],
  Completed: ["Disputed"],
  Disputed: ["Requested", "Accepted", "In Progress", "Completed"],
};

describe("BookingStatusControl", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderControl = (status: BookingStatus) =>
    render(
      <QueryClientProvider client={queryClient}>
        <BookingStatusControl bookingId={booking.id} status={status} />
      </QueryClientProvider>,
    );

  it.each(Object.entries(EXPECTED_OPTIONS) as [BookingStatus, string[]][])(
    "from %s offers only the legal targets",
    (status, expected) => {
      renderControl(status);
      const select = screen.getByRole("combobox", { name: /change status/i });
      const offered = within(select)
        .getAllByRole("option")
        .filter((o) => (o as HTMLOptionElement).value !== "")
        .map((o) => o.textContent);

      expect(offered).toEqual(expected);
      expect(
        within(select)
          .getAllByRole("option")
          .map((o) => (o as HTMLOptionElement).value),
      ).not.toContain(status);
    },
  );

  it("keeps Apply disabled until a target is chosen", () => {
    renderControl("Requested");
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Accepted" } });
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled();
  });

  it("sends the chosen status to the update-status endpoint", async () => {
    vi.mocked(bookingApi.updateStatus).mockResolvedValueOnce({ ...booking, status: "Accepted" });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderControl("Requested");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Accepted" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(bookingApi.updateStatus).toHaveBeenCalledWith(booking.id, { status: "Accepted" });
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["bookings"] });
    });
  });

  it("shows the backend's message when the update is rejected", async () => {
    vi.mocked(bookingApi.updateStatus).mockRejectedValueOnce(
      httpError(400, "Cannot transition booking from 'Requested' to 'Accepted'."),
    );
    renderControl("Requested");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Accepted" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot transition booking from 'Requested' to 'Accepted'.",
    );
  });
});
