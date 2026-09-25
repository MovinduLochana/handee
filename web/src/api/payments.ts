import { api } from "../lib/api";

export type InvoiceStatus = "Issued" | "Paid" | "Cancelled" | "Refunded";
export type PaymentStatus = "Pending" | "Succeeded" | "Failed" | "Refunded";
export type PayoutStatus = "Pending" | "Processing" | "Completed" | "Failed";

export interface InvoiceDto {
  id: string;
  bookingId: string;
  customerId: string;
  customerName?: string;
  providerId: string;
  providerName?: string;
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  lineItemsJson?: string;
  issuedAt: string;
  paidAt?: string;
}

export interface CreateInvoiceDto {
  bookingId: string;
  baseAmount: number;
  lineItemsJson?: string;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  transactionReference: string;
  gatewayProvider: string;
  paidAt: string;
}

export interface ProcessPaymentRequestDto {
  invoiceId: string;
  paymentMethod?: string;
  paymentToken?: string;
  last4?: string;
  gatewayProvider?: string;
}

export interface PayoutDto {
  id: string;
  providerId: string;
  providerName?: string;
  bookingId: string;
  grossAmount: number;
  platformFeeDeducted: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  createdAt: string;
  processedAt?: string;
  payoutReference?: string;
}

export interface ProviderEarningsSummaryDto {
  totalEarnings: number;
  availableBalance: number;
  pendingPayouts: number;
  completedJobsCount: number;
}

export interface AdminPayoutsOverviewDto {
  totalGrossVolume: number;
  totalPlatformFees: number;
  totalPaidOut: number;
  pendingPayoutCount: number;
  recentPayouts: PayoutDto[];
}

export interface PaymentMethodItem {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  name?: string;
  holderName?: string;
  token?: string;
}

export const paymentsApi = {
  createInvoice: async (dto: CreateInvoiceDto): Promise<InvoiceDto> => {
    const res = await api.post<InvoiceDto>("/api/invoices", dto);
    return res.data;
  },

  getInvoiceById: async (id: string): Promise<InvoiceDto> => {
    const res = await api.get<InvoiceDto>(`/api/invoices/${id}`);
    return res.data;
  },

  getCustomerInvoices: async (customerId: string): Promise<InvoiceDto[]> => {
    const res = await api.get<InvoiceDto[]>(`/api/invoices/customer/${customerId}`);
    return res.data;
  },

  getProviderInvoices: async (providerId: string): Promise<InvoiceDto[]> => {
    const res = await api.get<InvoiceDto[]>(`/api/invoices/provider/${providerId}`);
    return res.data;
  },

  getInvoiceByBookingId: async (bookingId: string): Promise<InvoiceDto> => {
    const res = await api.get<InvoiceDto>(`/api/invoices/booking/${bookingId}`);
    return res.data;
  },

  updateInvoiceStatus: async (id: string, status: InvoiceStatus): Promise<InvoiceDto> => {
    const res = await api.patch<InvoiceDto>(`/api/invoices/${id}/status`, { status });
    return res.data;
  },

  processPayment: async (dto: ProcessPaymentRequestDto): Promise<PaymentDto> => {
    const res = await api.post<PaymentDto>("/api/payments", dto);
    return res.data;
  },

  getPaymentById: async (id: string): Promise<PaymentDto> => {
    const res = await api.get<PaymentDto>(`/api/payments/${id}`);
    return res.data;
  },

  getPaymentByInvoiceId: async (invoiceId: string): Promise<PaymentDto> => {
    const res = await api.get<PaymentDto>(`/api/payments/invoice/${invoiceId}`);
    return res.data;
  },

  getProviderPayouts: async (providerId: string): Promise<PayoutDto[]> => {
    const res = await api.get<PayoutDto[]>(`/api/payouts/provider/${providerId}`);
    return res.data;
  },

  getProviderEarningsSummary: async (providerId: string): Promise<ProviderEarningsSummaryDto> => {
    const res = await api.get<ProviderEarningsSummaryDto>(
      `/api/payouts/provider/${providerId}/summary`,
    );
    return res.data;
  },

  processPayout: async (payoutId: string): Promise<PayoutDto> => {
    const res = await api.post<PayoutDto>(`/api/payouts/${payoutId}/process`);
    return res.data;
  },

  getAdminPayoutsOverview: async (): Promise<AdminPayoutsOverviewDto> => {
    const res = await api.get<AdminPayoutsOverviewDto>("/api/payouts/admin/overview");
    return res.data;
  },
};
