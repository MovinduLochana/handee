import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingOverview from "../../../pages/admin/BookingOverview";
import { bookingApi } from "../../../api/bookings";
import { jobRequestApi } from "../../../api/jobRequests";
import type { BookingStatus, JobRequestStatus } from "../../../api/types";
import { httpError, page } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/bookings")>();
  return { ...actual, bookingApi: { getForStaff: vi.fn() } };
});

vi.mock("../../../api/jobRequests", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/jobRequests")>();
  return { ...actual, jobRequestApi: { getForStaff: vi.fn() } };
});

const jobTotals: Record<JobRequestStatus, number> = { PendingAiReview: 4, Open: 7, Cancelled: 1 };
const bookingTotals: Record<BookingStatus, number> = {
  Requested: 3,
  Accepted: 2,
  InProgress: 5,
  Completed: 9,
  Disputed: 1,
};

describe("BookingOverview", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BookingOverview />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("shows one count per status from each filtered list's totalCount", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockImplementation(async (p) =>
      page([], jobTotals[p.status!]),
    );
    vi.mocked(bookingApi.getForStaff).mockImplementation(async (p) =>
      page([], bookingTotals[p.status!]),
    );
    renderPage();

    const openCard = await screen.findByRole("link", { name: /^open/i });
    expect(openCard).toHaveTextContent("7");
    expect(openCard).toHaveAttribute("href", "/admin/job-requests?status=Open");
    expect(screen.getByRole("link", { name: /in progress/i })).toHaveTextContent("5");
    expect(screen.getByRole("link", { name: /in progress/i })).toHaveAttribute(
      "href",
      "/admin/bookings?status=InProgress",
    );
    expect(screen.getByText("12 total")).toBeInTheDocument();
    expect(screen.getByText("20 total")).toBeInTheDocument();

    // One tiny page per status, never the full list.
    expect(jobRequestApi.getForStaff).toHaveBeenCalledTimes(3);
    expect(bookingApi.getForStaff).toHaveBeenCalledTimes(7);
    expect(bookingApi.getForStaff).toHaveBeenCalledWith({
      status: "Disputed",
      page: 1,
      pageSize: 1,
    });
  });

  it("shows the empty state when there is nothing at all", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([], 0));
    vi.mocked(bookingApi.getForStaff).mockResolvedValue(page([], 0));
    renderPage();

    expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the error state if any count fails", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([], 1));
    vi.mocked(bookingApi.getForStaff).mockRejectedValue(httpError(403));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load booking counts");
    expect(alert).toHaveTextContent("You need an Admin account to view this.");
    expect(within(alert).getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
