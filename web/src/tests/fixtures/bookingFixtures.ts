import type { BookingResponseDto, JobRequestResponseDto, PagedResult } from "../../api/types";

// Raw bodies written the way the API emits them: System.Text.Json web
// defaults (camelCase), enums as strings, DateTimeOffset with an offset,
// decimals as bare numbers, and nulls present rather than omitted.

/** GET /job-requests — staff list (ServiceCategory is included, so categoryName is set). */
export const RAW_JOB_REQUEST_PAGE = `{"items":[{"id":"8b0f5e2a-1c3d-4e5f-9a7b-2c4d6e8f0a1b","serviceCategoryId":"c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b","categoryName":"Plumbing","description":"Kitchen sink leaking under the cabinet.","photoUrls":["/uploads/jobs/sink-1.jpg"],"location":"Colombo 05","urgency":"High","budgetMin":2500.00,"budgetMax":6000.50,"status":"Open","customerId":"a7e1d2c3-b4f5-4617-8293-a4b5c6d7e8f9","createdAt":"2026-09-20T10:15:30.1234567+00:00","updatedAt":null}],"totalCount":1,"page":1,"pageSize":20}`;

/** GET /bookings — staff list. That query has no includes, so the joined
 * fields are null and price falls back to BookingService's 3500. */
export const RAW_BOOKING_PAGE = `{"items":[{"id":"3f2c9d1e-7a6b-4c5d-8e9f-0a1b2c3d4e5f","jobRequestId":"8b0f5e2a-1c3d-4e5f-9a7b-2c4d6e8f0a1b","serviceListingId":null,"providerId":"5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a","customerId":"a7e1d2c3-b4f5-4617-8293-a4b5c6d7e8f9","status":"Requested","scheduledAt":"2026-09-25T09:00:00+00:00","createdAt":"2026-09-24T08:12:45.123456+00:00","updatedAt":null,"customerName":null,"customerPhone":null,"providerName":null,"serviceLocation":null,"price":3500,"category":null,"description":null,"notes":null,"durationHours":1,"bookingType":"Scheduled","expiresAt":null,"remainingSeconds":null,"latitude":null,"longitude":null}],"totalCount":1,"page":1,"pageSize":20}`;

export const jobRequest: JobRequestResponseDto = {
  id: "8b0f5e2a-1c3d-4e5f-9a7b-2c4d6e8f0a1b",
  serviceCategoryId: "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  categoryName: "Plumbing",
  description: "Kitchen sink leaking under the cabinet.",
  photoUrls: ["/uploads/jobs/sink-1.jpg"],
  location: "Colombo 05",
  urgency: "High",
  budgetMin: 2500,
  budgetMax: 6000.5,
  status: "Open",
  customerId: "a7e1d2c3-b4f5-4617-8293-a4b5c6d7e8f9",
  createdAt: "2026-09-20T10:15:30.1234567+00:00",
  updatedAt: null,
};

export const booking: BookingResponseDto = {
  id: "3f2c9d1e-7a6b-4c5d-8e9f-0a1b2c3d4e5f",
  jobRequestId: "8b0f5e2a-1c3d-4e5f-9a7b-2c4d6e8f0a1b",
  serviceListingId: null,
  providerId: "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
  customerId: "a7e1d2c3-b4f5-4617-8293-a4b5c6d7e8f9",
  status: "Requested",
  scheduledAt: "2026-09-25T09:00:00+00:00",
  createdAt: "2026-09-24T08:12:45.123456+00:00",
  updatedAt: null,
  customerName: null,
  customerPhone: null,
  providerName: null,
  serviceLocation: null,
  price: 3500,
  category: null,
  description: null,
  notes: null,
  durationHours: 1,
  bookingType: "Scheduled",
  expiresAt: null,
  remainingSeconds: null,
  latitude: null,
  longitude: null,
};

export function page<T>(items: T[], totalCount = items.length, pageNo = 1): PagedResult<T> {
  return { items, totalCount, page: pageNo, pageSize: 20 };
}

/** An axios-shaped error, as the api client rejects with. */
export function httpError(status: number, data: unknown = "") {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });
}
