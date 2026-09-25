import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingsManagement from "../../../pages/admin/BookingsManagement";
import { bookingApi } from "../../../api/bookings";
import type { BookingResponseDto } from "../../../api/types";
import { booking, httpError, page } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/bookings")>();
  return {
    ...actual,
    bookingApi: {
      getForStaff: vi.fn(),
      getById: vi.fn(),
      updateStatus: vi.fn(),
      updateSchedule: vi.fn(),
    },
  };
});

const completed: BookingResponseDto = {
  ...booking,
  id: "c0000000-1111-4222-8333-444444444444",
  status: "Completed",
  scheduledAt: null,
};

const disputed: BookingResponseDto = {
  ...booking,
  id: "d0000000-1111-4222-8333-444444444444",
  status: "Disputed",
};

describe("BookingsManagement", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderPage = (url = "/admin/bookings") =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <BookingsManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  const optionsFor = (shortBookingId: string) =>
    within(screen.getByRole("combobox", { name: `Change status of booking ${shortBookingId}` }))
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);

  it("renders the populated state with every requested column", async () => {
    vi.mocked(bookingApi.getForStaff).mockResolvedValueOnce(page([booking, completed]));
    renderPage();

    const row = (await screen.findByText("3f2c9d1e")).closest("tr")!;
    expect(within(row).getByText("5d4c3b2a")).toHaveAttribute("title", booking.providerId);
    expect(within(row).getByText("a7e1d2c3")).toHaveAttribute("title", booking.customerId);
    expect(within(row).getByText("Requested")).toBeInTheDocument();
    expect(
      within(row).getByText(new Date(booking.scheduledAt!).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      within(row).getByText(new Date(booking.createdAt).toLocaleDateString()),
    ).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /view/i })).toHaveAttribute(
      "href",
      `/admin/bookings/${booking.id}`,
    );

    const unscheduledRow = screen.getByText("c0000000").closest("tr")!;
    expect(within(unscheduledRow).getByText("Not scheduled")).toBeInTheDocument();
  });

  it("offers each row only the transitions legal from its own status", async () => {
    vi.mocked(bookingApi.getForStaff).mockResolvedValueOnce(page([booking, completed, disputed]));
    renderPage();
    await screen.findByText("3f2c9d1e");

    expect(optionsFor("3f2c9d1e")).toEqual(["Accepted", "Disputed"]);
    expect(optionsFor("c0000000")).toEqual(["Disputed"]);
    expect(optionsFor("d0000000")).toEqual(["Requested", "Accepted", "InProgress", "Completed"]);
  });

  it("applies a quick status change and refetches the list", async () => {
    vi.mocked(bookingApi.getForStaff)
      .mockResolvedValueOnce(page([booking]))
      .mockResolvedValueOnce(page([{ ...booking, status: "Accepted" }]));
    vi.mocked(bookingApi.updateStatus).mockResolvedValueOnce({ ...booking, status: "Accepted" });
    renderPage();
    await screen.findByText("3f2c9d1e");

    fireEvent.change(screen.getByRole("combobox", { name: /booking 3f2c9d1e/ }), {
      target: { value: "Accepted" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(bookingApi.updateStatus).toHaveBeenCalledWith(booking.id, { status: "Accepted" });
    });
    await waitFor(() => expect(bookingApi.getForStaff).toHaveBeenCalledTimes(2));
    expect(optionsFor("3f2c9d1e")).toEqual(["InProgress", "Disputed"]);
  });

  it("renders the empty state, naming the active status filter", async () => {
    vi.mocked(bookingApi.getForStaff).mockResolvedValueOnce(page([]));
    renderPage("/admin/bookings?status=InProgress");

    expect(await screen.findByText("No bookings found")).toBeInTheDocument();
    expect(screen.getByText("No bookings are currently In Progress.")).toBeInTheDocument();
    expect(bookingApi.getForStaff).toHaveBeenCalledWith(
      expect.objectContaining({ status: "InProgress", page: 1, pageSize: 20 }),
    );
  });

  it("renders the error state with the backend message", async () => {
    vi.mocked(bookingApi.getForStaff).mockRejectedValueOnce(httpError(500, "Database unavailable"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load bookings");
    expect(alert).toHaveTextContent("Database unavailable");
  });

  it("sends the status filter to the server", async () => {
    vi.mocked(bookingApi.getForStaff).mockResolvedValue(page([booking]));
    renderPage();
    await screen.findByText("3f2c9d1e");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Disputed" } });

    await waitFor(() => {
      expect(bookingApi.getForStaff).toHaveBeenLastCalledWith({
        status: "Disputed",
        sortDescending: true,
        page: 1,
        pageSize: 20,
      });
    });
  });

  it("sorts unscheduled bookings last when sorting by Scheduled", async () => {
    const later = { ...disputed, scheduledAt: "2026-10-01T09:00:00+00:00" };
    vi.mocked(bookingApi.getForStaff).mockResolvedValueOnce(page([completed, later, booking]));
    renderPage();
    await screen.findByText("3f2c9d1e");

    fireEvent.click(screen.getByRole("button", { name: /scheduled/i }));
    const ids = within(screen.getByRole("table"))
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(ids).toEqual(["3f2c9d1e", "d0000000", "c0000000"]);
  });
});
