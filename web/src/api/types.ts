// ─── Enums ─────────────────────────────────────────────────────────────────
export type VerificationStatus = "Pending" | "InReview" | "Verified" | "Rejected";
export type CertificationType = "NIC" | "TradeCertification" | "BusinessRegistration" | "Other";
export type DocumentReviewStatus = "Pending" | "Approved" | "Rejected";

// ─── Shared Sub-Objects ────────────────────────────────────────────────────
export interface SkillCategoryDto {
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
  skillCategories: SkillCategoryDto[];
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
  skillCategories: SkillCategoryDto[];
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
  skillCategoryIds?: string[];
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
  skillCategoryId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
}

// ─── Certification Review ──────────────────────────────────────────────────
export interface ReviewCertificationDto {
  status: DocumentReviewStatus;
}
