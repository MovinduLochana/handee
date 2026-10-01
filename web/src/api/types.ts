// ─── Enums ─────────────────────────────────────────────────────────────────
export type VerificationStatus = "Pending" | "InReview" | "Verified" | "Rejected";
export type CertificationType = "NIC" | "TradeCertification" | "BusinessRegistration" | "Other";
export type DocumentReviewStatus = "Pending" | "Approved" | "Rejected";

// ─── Shared Sub-Objects ────────────────────────────────────────────────────
export interface ServiceCategoryDto {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface CertificationDto {
  id: string;
  type: CertificationType;
  fileUrl: string;
  originalFileName: string | null;
  uploadedAt: string;
  reviewStatus: DocumentReviewStatus;
}

export interface AuditLogDto {
  id: string;
  adminUserId: string;
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  timestamp: string;
  note: string | null;
}

// ─── Role-Scoped Profile Reads ─────────────────────────────────────────────
export interface ProviderProfileProviderDto {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  headline: string | null;
  bio: string | null;
  description: string | null;
  yearsOfExperience: number;
  profilePictureUrl: string | null;
  languages: string[];
  servicesOffered: string[];
  isAvailableForWork: boolean;
  availabilityNote: string | null;
  serviceCategories: ServiceCategoryDto[];
  serviceAreaLatitude: number | null;
  serviceAreaLongitude: number | null;
  serviceAreaDisplayName: string | null;
  serviceRadiusKm: number;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  verificationStatus: VerificationStatus;
  ratingAggregate: number;
  totalReviewCount: number;
  createdAt: string;
  certifications: CertificationDto[];
  auditLogs: AuditLogDto[];
}

export interface ProviderProfileAdminDto extends ProviderProfileProviderDto {}

export interface ProviderProfileCustomerDto {
  id: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  description: string | null;
  yearsOfExperience: number;
  profilePictureUrl: string | null;
  languages: string[];
  servicesOffered: string[];
  isAvailableForWork: boolean;
  availabilityNote: string | null;
  serviceCategories: ServiceCategoryDto[];
  serviceAreaDisplayName: string | null;
  serviceRadiusKm: number;
  verificationStatus: VerificationStatus;
  ratingAggregate: number;
  totalReviewCount: number;
  createdAt: string;
}

// ─── Write DTOs ────────────────────────────────────────────────────────────
export interface UpdateProviderProfileDto {
  headline?: string;
  bio?: string;
  description?: string;
  yearsOfExperience?: number;
  languages?: string[];
  servicesOffered?: string[];
  isAvailableForWork?: boolean;
  availabilityNote?: string;
  serviceCategoryIds?: string[];
  serviceAreaLatitude?: number;
  serviceAreaLongitude?: number;
  serviceRadiusKm?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface VerificationActionDto {
  newStatus: VerificationStatus;
  note?: string;
}

// ─── Review DTOs ───────────────────────────────────────────────────────────
export interface ReviewDto {
  id: string;
  providerProfileId: string;
  customerId: string;
  customerName: string;
  customerProfilePictureUrl: string | null;
  rating: number;
  comment: string | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
}

// ─── Generic Pagination ────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Search Params ─────────────────────────────────────────────────────────
export interface ProviderSearchParams {
  searchTerm?: string;
  status?: VerificationStatus;
  serviceCategoryId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
}

// ─── Certification Review ──────────────────────────────────────────────────
export interface ReviewCertificationDto {
  status: DocumentReviewStatus;
  note?: string;
}

// ─── Service Listings ───────────────────────────────────────────────────────
export interface ServiceListingDto {
  id: string;
  providerId: string;
  serviceCategoryId: string;
  title: string;
  description: string;
  scope: string;
  availability: string;
  fixedPrice: number;
  durationHours?: number;
  estimatedDuration: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  serviceCategoryName: string | null;
  providerFullName: string | null;
}

export interface CreateServiceListingDto {
  serviceCategoryId: string;
  title: string;
  description: string;
  scope: string;
  availability: string;
  fixedPrice: number;
  durationHours: number;
  estimatedDuration: string;
  isActive: boolean;
}

export interface UpdateServiceListingDto {
  serviceCategoryId: string;
  title: string;
  description: string;
  scope: string;
  availability: string;
  fixedPrice: number;
  durationHours: number;
  estimatedDuration: string;
  isActive: boolean;
}

// ─── Declarative Operating Schedule ─────────────────────────────────────────
export type DayOfWeekName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface DayOperatingScheduleDto {
  dayOfWeek: DayOfWeekName | number;
  startTime: string; // "09:00:00"
  endTime: string; // "17:00:00"
  isActive: boolean;
}

export interface ProviderOperatingScheduleDto {
  providerId: string;
  weeklySchedule: DayOperatingScheduleDto[];
}

export interface UpdateOperatingScheduleDto {
  weeklySchedule: DayOperatingScheduleDto[];
}

// ─── Booking & Scheduling ──────────────────────────────────────────────────
// Mirrors handee.API DTOs/enums. The API serializes camelCase with
// JsonStringEnumConverter, and the response DTOs carry enums as
// `.ToString()` strings, so every enum below is its C# member name.
// Guid → string, DateTimeOffset → ISO-8601 string, decimal → number.

/** Entities/JobRequest.cs — JobUrgency */
export type JobUrgency = "Low" | "Medium" | "High" | "Emergency";

/** Entities/JobRequest.cs — JobRequestStatus */
export type JobRequestStatus = "PendingAiReview" | "Open" | "Cancelled";

/** Entities/Booking.cs — BookingStatus */
export type BookingStatus = "Requested" | "Accepted" | "InProgress" | "Completed" | "Disputed";

/** DTO/JobRequestResponseDto.cs */
export interface JobRequestResponseDto {
  id: string;
  serviceCategoryId: string;
  categoryName: string;
  description: string;
  photoUrls: string[];
  location: string;
  urgency: JobUrgency;
  budgetMin: number | null;
  budgetMax: number | null;
  status: JobRequestStatus;
  customerId: string;
  createdAt: string;
  updatedAt: string | null;
}

/** DTO/BookingResponseDto.cs — the trailing optional fields are only
 * populated by the GET-by-id/"mine" queries that include Customer, Provider
 * and JobRequest; the staff list and the PUT responses leave them null. */
export interface BookingResponseDto {
  id: string;
  jobRequestId: string | null;
  serviceListingId: string | null;
  providerId: string;
  customerId: string;
  status: BookingStatus;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  providerName: string | null;
  serviceLocation: string | null;
  price: number | null;
  category: string | null;
  description: string | null;
  notes: string | null;
  durationHours: number;
}

/** DTO/ServiceCategoryResponseDto.cs */
export interface ServiceCategoryResponseDto {
  id: string;
  name: string;
  iconUrl: string | null;
  priceBandMin: number | null;
  priceBandMax: number | null;
}

/** DTO/UpdateBookingStatusDto.cs */
export interface UpdateBookingStatusDto {
  status: BookingStatus;
}

/** DTO/UpdateBookingScheduleDto.cs — null clears the schedule. */
export interface UpdateBookingScheduleDto {
  scheduledAt: string | null;
}

/** DTO/CreateListingBookingDto.cs */
export interface CreateListingBookingDto {
  serviceListingId: string;
  scheduledAt: string;
  notes?: string | null;
}

/** Query params of GET /job-requests (JobRequestController.GetForStaff). */
export interface JobRequestStaffParams {
  status?: JobRequestStatus;
  urgency?: JobUrgency;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
}

/** Query params of GET /bookings (BookingController.GetForStaff). */
export interface BookingStaffParams {
  status?: BookingStatus;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
}

/** DTO/PredefinedSlotDto.cs */
export interface PredefinedSlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

/** DTO for GET /admin/users */
export interface AdminUserResult {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  providerVerificationStatus: string;
  createdAt: string;
  roles: string[];
  providerProfileId?: string | null;
}
