import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import JobRequestsManagement from "../../../pages/admin/JobRequestsManagement";
import { jobRequestApi } from "../../../api/jobRequests";
import type { JobRequestResponseDto } from "../../../api/types";
import { httpError, jobRequest, page } from "../../fixtures/bookingFixtures";

vi.mock("../../../api/jobRequests", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/jobRequests")>();
  return { ...actual, jobRequestApi: { getForStaff: vi.fn(), getById: vi.fn() } };
});

const emergency: JobRequestResponseDto = {
  ...jobRequest,
  id: "11111111-2222-4333-8444-555555555555",
  categoryName: "Electrical",
  location: "Kandy",
  urgency: "Emergency",
  status: "PendingAiReview",
};

const low: JobRequestResponseDto = {
  ...jobRequest,
  id: "99999999-8888-4777-8666-555555555555",
  categoryName: "Painting",
  location: "Galle",
  urgency: "Low",
  status: "Cancelled",
};

describe("JobRequestsManagement", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderPage = (url = "/admin/job-requests") =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <JobRequestsManagement />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

  it("renders the populated state with every requested column", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValueOnce(page([jobRequest]));
    renderPage();

    const row = (await screen.findByText("Plumbing")).closest("tr")!;
    expect(within(row).getByText("Colombo 05")).toBeInTheDocument();
    expect(within(row).getByText("High")).toBeInTheDocument();
    expect(within(row).getByText("Open")).toBeInTheDocument();
    expect(within(row).getByText("a7e1d2c3")).toHaveAttribute("title", jobRequest.customerId);
    expect(
      within(row).getByText(new Date(jobRequest.createdAt).toLocaleDateString()),
    ).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /view/i })).toHaveAttribute(
      "href",
      `/admin/job-requests/${jobRequest.id}`,
    );
    expect(jobRequestApi.getForStaff).toHaveBeenCalledWith({
      status: undefined,
      urgency: undefined,
      sortDescending: true,
      page: 1,
      pageSize: 20,
    });
  });

  it("renders the empty state when the API returns no job requests", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValueOnce(page([]));
    renderPage();

    expect(await screen.findByText("No job requests found")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the error state with the backend message and retries", async () => {
    vi.mocked(jobRequestApi.getForStaff)
      .mockRejectedValueOnce(httpError(500, "Database unavailable"))
      .mockResolvedValueOnce(page([jobRequest]));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load job requests");
    expect(alert).toHaveTextContent("Database unavailable");

    fireEvent.click(within(alert).getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Plumbing")).toBeInTheDocument();
  });

  it("explains a 403 instead of showing a bare status code", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockRejectedValueOnce(httpError(403));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You need an Admin account to view this.",
    );
  });

  it("sends status and urgency filters to the server and resets to page 1", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([jobRequest]));
    renderPage();
    await screen.findByText("Plumbing");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Open" } });
    fireEvent.change(screen.getByLabelText("Urgency"), { target: { value: "High" } });

    await waitFor(() => {
      expect(jobRequestApi.getForStaff).toHaveBeenLastCalledWith({
        status: "Open",
        urgency: "High",
        sortDescending: true,
        page: 1,
        pageSize: 20,
      });
    });
  });

  it("takes an initial status filter from ?status=", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([]));
    renderPage("/admin/job-requests?status=PendingAiReview");

    await waitFor(() => {
      expect(jobRequestApi.getForStaff).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PendingAiReview" }),
      );
    });
    expect(screen.getByLabelText("Status")).toHaveValue("PendingAiReview");
  });

  it("searches only within the loaded page", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValueOnce(page([jobRequest, emergency]));
    renderPage();
    await screen.findByText("Plumbing");

    fireEvent.change(screen.getByLabelText("Search this page"), { target: { value: "kandy" } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Electrical")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search this page"), { target: { value: "nowhere" } });
    expect(screen.getByText(/no job requests on this page match/i)).toBeInTheDocument();
    expect(jobRequestApi.getForStaff).toHaveBeenCalledTimes(1);
  });

  it("sorts urgency by severity on the page, and Submitted on the server", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([emergency, jobRequest, low]));
    renderPage();
    await screen.findByText("Plumbing");

    fireEvent.click(screen.getByRole("button", { name: /urgency/i }));
    expect(bodyRows().map((r) => within(r).getAllByRole("cell")[2].textContent)).toEqual([
      "Low",
      "High",
      "Emergency",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /submitted/i }));
    await waitFor(() => {
      expect(jobRequestApi.getForStaff).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortDescending: true, page: 1 }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: /submitted/i }));
    await waitFor(() => {
      expect(jobRequestApi.getForStaff).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortDescending: false, page: 1 }),
      );
    });
  });

  it("paginates against the server's totalCount", async () => {
    vi.mocked(jobRequestApi.getForStaff).mockResolvedValue(page([jobRequest], 45));
    renderPage();

    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(jobRequestApi.getForStaff).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });
});
