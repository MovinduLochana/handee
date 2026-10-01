import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderAvailability from "../../../pages/provider/ProviderAvailability";
import { providerApi } from "../../../api/providers";
import { providerAvailabilityApi } from "../../../api/providerAvailability";
import type { ProviderOperatingScheduleDto } from "../../../api/types";

vi.mock("../../../api/providers", () => ({
  providerApi: {
    getMyProfile: vi.fn(),
  },
}));

vi.mock("../../../api/providerAvailability", () => ({
  providerAvailabilityApi: {
    getOperatingSchedule: vi.fn(),
    updateOperatingSchedule: vi.fn(),
  },
}));

const mockProfile = {
  id: "prov-123",
  userId: "user-123",
  businessName: "Clean Pro",
  bio: "Professional cleaner",
  serviceRadiusKm: 25,
  hourlyRate: 2000,
  yearsOfExperience: 5,
  verificationStatus: "Verified",
  isAvailable: true,
  rating: 4.8,
  reviewCount: 15,
  skills: [],
  categories: [],
  operatingAreas: [],
  certifications: [],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: null,
};

const mockScheduleData: ProviderOperatingScheduleDto = {
  providerId: "prov-123",
  weeklySchedule: [
    { dayOfWeek: 1, startTime: "09:00:00", endTime: "17:00:00", isActive: true },
    { dayOfWeek: 2, startTime: "09:00:00", endTime: "17:00:00", isActive: true },
    { dayOfWeek: 3, startTime: "09:00:00", endTime: "17:00:00", isActive: true },
    { dayOfWeek: 4, startTime: "09:00:00", endTime: "17:00:00", isActive: true },
    { dayOfWeek: 5, startTime: "09:00:00", endTime: "17:00:00", isActive: true },
    { dayOfWeek: 6, startTime: "10:00:00", endTime: "14:00:00", isActive: true },
    { dayOfWeek: 0, startTime: "09:00:00", endTime: "17:00:00", isActive: false },
  ],
};

describe("ProviderAvailability Page (Declarative Operating Schedule)", () => {
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
    vi.mocked(providerApi.getMyProfile).mockResolvedValue(mockProfile as any);
    vi.mocked(providerAvailabilityApi.getOperatingSchedule).mockResolvedValue(mockScheduleData);
  });

  it("renders weekly operating schedule header, info banner, and all 7 days of the week", async () => {
    renderComponent();

    expect(screen.getByText("Weekly Operating Schedule")).toBeInTheDocument();
    expect(screen.getByText(/Handee Mobile App/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Monday")).toBeInTheDocument();
      expect(screen.getByText("Tuesday")).toBeInTheDocument();
      expect(screen.getByText("Wednesday")).toBeInTheDocument();
      expect(screen.getByText("Thursday")).toBeInTheDocument();
      expect(screen.getByText("Friday")).toBeInTheDocument();
      expect(screen.getByText("Saturday")).toBeInTheDocument();
      expect(screen.getByText("Sunday")).toBeInTheDocument();
    });

    // Saturday is active with 10:00 - 14:00 (4 slots)
    expect(screen.getByText("4 bookable slots (1 hr each)")).toBeInTheDocument();

    // Sunday is inactive
    expect(screen.getByText("No bookings accepted on this day.")).toBeInTheDocument();
  });

  it("allows toggling a day between Working and Day Off", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Sunday")).toBeInTheDocument();
    });

    const sundayToggle = screen.getByLabelText("Toggle Sunday");
    expect(sundayToggle).not.toBeChecked();

    fireEvent.click(sundayToggle);

    expect(sundayToggle).toBeChecked();
    expect(screen.getByLabelText("Toggle Sunday")).toBeChecked();
    // Start time and end time pickers for Sunday should now appear
    expect(screen.getByLabelText("Start Time", { selector: "#start-time-0" })).toBeInTheDocument();
  });

  it("allows changing operating hours and updates the 1-hour slots count badge", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByLabelText("Start Time", { selector: "#start-time-1" }),
      ).toBeInTheDocument();
    });

    const mondayStartInput = screen.getByLabelText("Start Time", { selector: "#start-time-1" });
    const mondayEndInput = screen.getByLabelText("End Time", { selector: "#end-time-1" });

    // Change hours from 09:00-17:00 (8 slots) to 08:00-18:00 (10 slots)
    fireEvent.change(mondayStartInput, { target: { value: "08:00" } });
    fireEvent.change(mondayEndInput, { target: { value: "18:00" } });

    expect(screen.getByText("10 bookable slots (1 hr each)")).toBeInTheDocument();
  });

  it("applies the Mon–Fri standard preset", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Saturday")).toBeInTheDocument();
    });

    const saturdayToggle = screen.getByLabelText("Toggle Saturday");
    expect(saturdayToggle).toBeChecked();

    const presetBtn = screen.getByRole("button", { name: /Mon–Fri \(9 AM – 5 PM\)/i });
    fireEvent.click(presetBtn);

    // Saturday should now be inactive
    expect(saturdayToggle).not.toBeChecked();

    // Monday should be active
    const mondayToggle = screen.getByLabelText("Toggle Monday");
    expect(mondayToggle).toBeChecked();
  });

  it("validates that end time must be after start time before saving", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByLabelText("Start Time", { selector: "#start-time-1" }),
      ).toBeInTheDocument();
    });

    const mondayStartInput = screen.getByLabelText("Start Time", { selector: "#start-time-1" });
    const mondayEndInput = screen.getByLabelText("End Time", { selector: "#end-time-1" });

    // Invalid: start 18:00, end 09:00
    fireEvent.change(mondayStartInput, { target: { value: "18:00" } });
    fireEvent.change(mondayEndInput, { target: { value: "09:00" } });

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Operating Schedule|Save Schedule/i,
    });
    fireEvent.click(saveButtons[0]);

    expect(
      screen.getByText(/Monday: Daily end time \(09:00\) must be later than start time \(18:00\)/i),
    ).toBeInTheDocument();
    expect(providerAvailabilityApi.updateOperatingSchedule).not.toHaveBeenCalled();
  });

  it("submits the updated weekly schedule via updateOperatingSchedule", async () => {
    vi.mocked(providerAvailabilityApi.updateOperatingSchedule).mockResolvedValue(mockScheduleData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Monday")).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Operating Schedule|Save Schedule/i,
    });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(providerAvailabilityApi.updateOperatingSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          weeklySchedule: expect.arrayContaining([
            expect.objectContaining({
              dayOfWeek: 1,
              startTime: "09:00:00",
              endTime: "17:00:00",
              isActive: true,
            }),
            expect.objectContaining({
              dayOfWeek: 0,
              isActive: false,
            }),
          ]),
        }),
      );
    });

    expect(
      await screen.findByText(/Operating schedule successfully updated!/i),
    ).toBeInTheDocument();
  });
});
