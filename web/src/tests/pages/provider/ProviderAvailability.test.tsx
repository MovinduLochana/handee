import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderAvailability from "../../../pages/provider/ProviderAvailability";
import { providerAvailabilityApi } from "../../../api/providerAvailability";
import type { ProviderAvailabilitySlotDto } from "../../../api/types";

vi.mock("../../../api/providerAvailability", () => ({
  providerAvailabilityApi: {
    getMine: vi.fn(),
    create: vi.fn(),
    createBatch: vi.fn(),
    createRecurring: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockSlots: ProviderAvailabilitySlotDto[] = [
  {
    id: "slot-1",
    providerId: "prov-1",
    startTime: "2026-10-15T09:00:00.000Z",
    endTime: "2026-10-15T10:00:00.000Z",
    isBooked: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "slot-2",
    providerId: "prov-1",
    startTime: "2026-10-15T10:00:00.000Z",
    endTime: "2026-10-15T11:00:00.000Z",
    isBooked: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: null,
  },
];

describe("ProviderAvailability Page", () => {
  let queryClient: QueryClient;

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProviderAvailability />
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
    vi.mocked(providerAvailabilityApi.getMine).mockResolvedValue(mockSlots);
  });

  it("renders header, filter counts, and grouped slots", async () => {
    renderComponent();

    expect(screen.getByText("Availability & Working Hours")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("All Slots (2)")).toBeInTheDocument();
      expect(screen.getByText("Available (1)")).toBeInTheDocument();
      expect(screen.getByText("Booked (1)")).toBeInTheDocument();
    });

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("opens single slot modal and submits slot creation", async () => {
    vi.mocked(providerAvailabilityApi.create).mockResolvedValue({
      id: "slot-3",
      providerId: "prov-1",
      startTime: "2026-10-16T14:00:00.000Z",
      endTime: "2026-10-16T15:00:00.000Z",
      isBooked: false,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: null,
    });

    renderComponent();

    const addBtn = screen.getByRole("button", { name: /add slot/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Add Single Time Slot")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save slot/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(providerAvailabilityApi.create).toHaveBeenCalled();
    });
  });

  it("opens recurring schedule modal and submits recurring parameters", async () => {
    vi.mocked(providerAvailabilityApi.createRecurring).mockResolvedValue([]);

    renderComponent();

    const recurringBtn = screen.getByRole("button", { name: /recurring schedule/i });
    fireEvent.click(recurringBtn);

    expect(screen.getByText("Generate Recurring Schedule")).toBeInTheDocument();

    const generateBtn = screen.getByRole("button", { name: /generate slots/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(providerAvailabilityApi.createRecurring).toHaveBeenCalled();
    });
  });

  it("triggers deletion of an unbooked slot upon confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(providerAvailabilityApi.delete).mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTitle("Delete slot")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle("Delete slot");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(providerAvailabilityApi.delete).toHaveBeenCalledWith("slot-1");
    });
  });
});
