/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../../lib/api";
import { bookingApi, BOOKING_STATUSES, LEGAL_BOOKING_TRANSITIONS } from "../../api/bookings";
import { jobRequestApi, JOB_REQUEST_STATUSES, JOB_URGENCIES } from "../../api/jobRequests";
import type {
  BookingResponseDto,
  CreateListingBookingDto,
  JobRequestResponseDto,
  PagedResult,
  ServiceCategoryResponseDto,
  UpdateBookingScheduleDto,
  UpdateBookingStatusDto,
} from "../../api/types";
import {
  RAW_BOOKING_PAGE,
  RAW_JOB_REQUEST_PAGE,
  booking,
  jobRequest,
} from "../fixtures/bookingFixtures";

vi.mock("../../lib/api", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

// ─── Compile-time: each field list must be exactly the interface's keys ─────
// (checked by `tsc -p tsconfig.app.json`; vitest itself doesn't type-check).
// Unknown keys fail the `keyof T` constraint; a missing key fails the
// intersection with a `missing` property that names it.
function exactKeys<T>() {
  return <const L extends readonly (keyof T)[]>(
    keys: L &
      (Exclude<keyof T, L[number]> extends never
        ? unknown
        : { missing: Exclude<keyof T, L[number]> }),
  ): L => keys;
}

const BOOKING_KEYS = exactKeys<BookingResponseDto>()([
  "id",
  "jobRequestId",
  "serviceListingId",
  "providerId",
  "customerId",
  "status",
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "customerName",
  "customerPhone",
  "providerName",
  "serviceLocation",
  "price",
  "category",
  "description",
  "notes",
  "durationHours",
  "bookingType",
  "expiresAt",
  "remainingSeconds",
  "latitude",
  "longitude",
]);

const JOB_REQUEST_KEYS = exactKeys<JobRequestResponseDto>()([
  "id",
  "serviceCategoryId",
  "categoryName",
  "description",
  "photoUrls",
  "location",
  "urgency",
  "budgetMin",
  "budgetMax",
  "status",
  "customerId",
  "createdAt",
  "updatedAt",
]);

const SERVICE_CATEGORY_KEYS = exactKeys<ServiceCategoryResponseDto>()([
  "id",
  "name",
  "iconUrl",
  "priceBandMin",
  "priceBandMax",
]);

const PAGED_KEYS = exactKeys<PagedResult<unknown>>()(["items", "totalCount", "page", "pageSize"]);

const STATUS_DTO_KEYS = exactKeys<UpdateBookingStatusDto>()(["status"]);

const SCHEDULE_DTO_KEYS = exactKeys<UpdateBookingScheduleDto>()(["scheduledAt"]);

const CREATE_LISTING_BOOKING_DTO_KEYS = exactKeys<CreateListingBookingDto>()([
  "serviceListingId",
  "scheduledAt",
  "notes",
  "serviceLocation",
  "latitude",
  "longitude",
]);

// ─── Runtime: compare against the real C# source ────────────────────────────
// Git tracks these under handee.API/ (the casing that resolves on Linux too).
// Vitest runs from web/ (under jsdom, import.meta.url isn't a file: URL).
const BACKEND = resolve(process.cwd(), "../src/backend/handee.API") + "/";
const hasBackend = existsSync(BACKEND);

function source(relativePath: string): string {
  return readFileSync(BACKEND + relativePath, "utf8");
}

/** Positional-record parameters, camel-cased the way the API serializes them. */
function recordFields(csharp: string): string[] {
  const params = csharp.slice(csharp.indexOf("(") + 1, csharp.lastIndexOf(")"));
  return params
    .split(",")
    .map((p) => p.split("=")[0].trim().split(/\s+/).pop()!)
    .map((name) => name[0].toLowerCase() + name.slice(1));
}

function enumMembers(csharp: string, enumName: string): string[] {
  const body = csharp.match(new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`))![1];
  return body
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

describe.skipIf(!hasBackend)("TypeScript contracts match the C# backend source", () => {
  it.each([
    ["DTO/BookingResponseDto.cs", BOOKING_KEYS],
    ["DTO/JobRequestResponseDto.cs", JOB_REQUEST_KEYS],
    ["DTO/ServiceCategoryResponseDto.cs", SERVICE_CATEGORY_KEYS],
    ["DTO/PagedResult.cs", PAGED_KEYS],
    ["DTO/UpdateBookingStatusDto.cs", STATUS_DTO_KEYS],
    ["DTO/UpdateBookingScheduleDto.cs", SCHEDULE_DTO_KEYS],
    ["DTO/CreateListingBookingDto.cs", CREATE_LISTING_BOOKING_DTO_KEYS],
  ])("%s has exactly the interface's fields", (file, keys) => {
    expect(recordFields(source(file))).toEqual([...keys]);
  });

  it("enums match their C# members, in order", () => {
    expect(BOOKING_STATUSES).toEqual(enumMembers(source("Entities/Booking.cs"), "BookingStatus"));
    const jobSource = source("Entities/JobRequest.cs");
    expect(JOB_REQUEST_STATUSES).toEqual(enumMembers(jobSource, "JobRequestStatus"));
    expect(JOB_URGENCIES).toEqual(enumMembers(jobSource, "JobUrgency"));
  });

  it("LEGAL_BOOKING_TRANSITIONS mirrors BookingService.LegalTransitions exactly", () => {
    const service = source("Services/BookingService.cs");
    const block = service.slice(
      service.indexOf("LegalTransitions = new()"),
      service.indexOf("};", service.indexOf("LegalTransitions = new()")),
    );
    const backendTable: Record<string, string[]> = {};
    for (const [, from, targets] of block.matchAll(
      /\[BookingStatus\.(\w+)\]\s*=\s*\[([^\]]*)\]/g,
    )) {
      backendTable[from] = [...targets.matchAll(/BookingStatus\.(\w+)/g)].map((m) => m[1]);
    }

    expect(Object.keys(backendTable)).toHaveLength(BOOKING_STATUSES.length);
    expect(LEGAL_BOOKING_TRANSITIONS).toEqual(backendTable);
  });
});

describe("parsing real-shaped API responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /bookings body parses into PagedResult<BookingResponseDto>", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: JSON.parse(RAW_BOOKING_PAGE) });

    const result = await bookingApi.getForStaff({ status: "Requested", page: 1, pageSize: 20 });

    expect(api.get).toHaveBeenCalledWith("/bookings", {
      params: { status: "Requested", page: 1, pageSize: 20 },
    });
    expect(Object.keys(result)).toEqual([...PAGED_KEYS]);
    expect(Object.keys(result.items[0])).toEqual([...BOOKING_KEYS]);
    expect(result.items[0]).toEqual(booking);

    const item = result.items[0];
    expect(BOOKING_STATUSES).toContain(item.status);
    expect(typeof item.price).toBe("number");
    expect(Number.isNaN(Date.parse(item.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(item.scheduledAt!))).toBe(false);
  });

  it("GET /job-requests body parses into PagedResult<JobRequestResponseDto>", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: JSON.parse(RAW_JOB_REQUEST_PAGE) });

    const result = await jobRequestApi.getForStaff({ urgency: "High", sortDescending: false });

    expect(api.get).toHaveBeenCalledWith("/job-requests", {
      params: { urgency: "High", sortDescending: false },
    });
    expect(Object.keys(result.items[0])).toEqual([...JOB_REQUEST_KEYS]);
    expect(result.items[0]).toEqual(jobRequest);
    expect(result.items[0].budgetMin).toBe(2500);
    expect(result.items[0].budgetMax).toBe(6000.5);
  });

  it("GET by id hits the real routes", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: booking });
    await bookingApi.getById(booking.id);
    await jobRequestApi.getById(jobRequest.id);

    expect(api.get).toHaveBeenNthCalledWith(1, `/bookings/${booking.id}`);
    expect(api.get).toHaveBeenNthCalledWith(2, `/job-requests/${jobRequest.id}`);
  });

  it("status and schedule updates PUT the exact DTO bodies", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: booking });

    await bookingApi.updateStatus(booking.id, { status: "Accepted" });
    await bookingApi.updateSchedule(booking.id, { scheduledAt: "2026-09-26T04:30:00.000Z" });
    await bookingApi.updateSchedule(booking.id, { scheduledAt: null });

    expect(api.put).toHaveBeenNthCalledWith(1, `/bookings/${booking.id}/status`, {
      status: "Accepted",
    });
    expect(api.put).toHaveBeenNthCalledWith(2, `/bookings/${booking.id}/schedule`, {
      scheduledAt: "2026-09-26T04:30:00.000Z",
    });
    expect(api.put).toHaveBeenNthCalledWith(3, `/bookings/${booking.id}/schedule`, {
      scheduledAt: null,
    });
  });

  it("createFromListing POSTs the payload to /bookings", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: booking });
    const payload = {
      serviceListingId: "11111111-1111-1111-1111-111111111111",
      scheduledAt: "2026-10-01T10:00:00.000Z",
      notes: "Please arrive on time",
    };

    const res = await bookingApi.createFromListing(payload);

    expect(api.post).toHaveBeenCalledWith("/bookings", payload);
    expect(res).toEqual(booking);
  });

  it("provider methods call correct endpoints for scheduled requests, mine, confirm, and decline", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [booking] });
    vi.mocked(api.post).mockResolvedValue({ data: booking });

    const requests = await bookingApi.getProviderScheduledRequests();
    expect(api.get).toHaveBeenCalledWith("/api/provider/booking-requests");
    expect(requests).toEqual([booking]);

    const mine = await bookingApi.getProviderBookings();
    expect(api.get).toHaveBeenCalledWith("/api/provider/bookings");
    expect(mine).toEqual([booking]);

    const confirmed = await bookingApi.confirmBooking(booking.id);
    expect(api.post).toHaveBeenCalledWith(`/api/provider/bookings/${booking.id}/confirm`);
    expect(confirmed).toEqual(booking);

    const declined = await bookingApi.declineBooking(booking.id, "Fully booked");
    expect(api.post).toHaveBeenCalledWith(`/api/provider/bookings/${booking.id}/decline`, {
      reason: "Fully booked",
    });
    expect(declined).toEqual(booking);
  });
});
