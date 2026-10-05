import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InvoicesList from "../../../pages/payments/InvoicesList";
import InvoiceDetail from "../../../pages/payments/InvoiceDetail";
import CheckoutPayment from "../../../pages/payments/CheckoutPayment";
import QuoteReview from "../../../pages/payments/QuoteReview";
import ProviderPayoutDashboard from "../../../pages/provider/ProviderPayoutDashboard";
import AdminPaymentsOverview from "../../../pages/admin/AdminPaymentsOverview";
import PaymentMethods from "../../../pages/payments/PaymentMethods";
import { paymentsApi, type InvoiceDto } from "../../../api/payments";
import { usersApi } from "../../../api/users";
import { savePaymentMethod } from "../../../lib/paymentMethodsStore";

vi.mock("../../../api/payments", () => ({
  paymentsApi: {
    createInvoice: vi.fn(),
    getInvoiceById: vi.fn(),
    getCustomerInvoices: vi.fn(),
    getInvoiceByBookingId: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    processPayment: vi.fn(),
    getPaymentById: vi.fn(),
    getPaymentByInvoiceId: vi.fn(),
    getProviderPayouts: vi.fn(),
    getProviderEarningsSummary: vi.fn(),
    processPayout: vi.fn(),
    getAdminPayoutsOverview: vi.fn(),
  },
}));

vi.mock("../../../api/users", () => ({
  usersApi: {
    getProfile: vi.fn(),
  },
}));

describe("Payments & Invoicing Pages", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderWithProviders = (ui: React.ReactElement, initialRoute: string = "/") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("renders InvoicesList and displays customer invoices with status badge", async () => {
    const mockUser = {
      id: "cust-123",
      fullName: "Jane Doe",
      email: "jane@test.com",
      roles: ["Customer"],
    };
    const mockInvoices: InvoiceDto[] = [
      {
        id: "inv-001",
        bookingId: "book-100",
        customerId: "cust-123",
        providerId: "prov-456",
        baseAmount: 5000,
        platformFee: 750,
        totalAmount: 5750,
        currency: "LKR",
        status: "Issued",
        issuedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(usersApi.getProfile).mockResolvedValueOnce(mockUser as any);
    vi.mocked(paymentsApi.getCustomerInvoices).mockResolvedValueOnce(mockInvoices);

    renderWithProviders(<InvoicesList />);

    expect(screen.getByText("My Invoices")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/INV-001/i)).toBeInTheDocument();
      expect(screen.getByText("LKR 5,750")).toBeInTheDocument();
      expect(screen.getAllByText("Issued").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders InvoiceDetail with calculated line items and platform fee", async () => {
    const mockInvoice: InvoiceDto = {
      id: "inv-detail-1",
      bookingId: "book-200",
      customerId: "cust-1",
      customerName: "Jane Customer",
      providerId: "prov-1",
      providerName: "Pro AC Services",
      baseAmount: 6000,
      platformFee: 900,
      totalAmount: 6900,
      currency: "LKR",
      status: "Issued",
      issuedAt: new Date().toISOString(),
    };

    vi.mocked(paymentsApi.getInvoiceById).mockResolvedValueOnce(mockInvoice);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/invoices/inv-detail-1"]}>
          <Routes>
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Invoice INV-INV-DETA/i)).toBeInTheDocument();
      expect(screen.getByText("Pro AC Services")).toBeInTheDocument();
      expect(screen.getByText("LKR 6,900")).toBeInTheDocument();
      expect(screen.getByText("ISSUED")).toBeInTheDocument();
    });
  });

  it("renders CheckoutPayment and submits sandbox card payment", async () => {
    const mockUser = {
      id: "cust-1",
      fullName: "Test Customer",
      email: "test@handee.com",
      roles: ["Customer"],
    };
    vi.mocked(usersApi.getProfile).mockResolvedValue(mockUser as any);

    savePaymentMethod(
      {
        type: "card",
        brand: "Visa",
        name: "Visa •••• 4242",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2028,
        isDefault: true,
        holderName: "Test Customer",
      },
      "cust-1",
    );

    const mockInvoice: InvoiceDto = {
      id: "inv-checkout-1",
      bookingId: "book-300",
      customerId: "cust-1",
      providerId: "prov-1",
      baseAmount: 4000,
      platformFee: 600,
      totalAmount: 4600,
      currency: "LKR",
      status: "Issued",
      issuedAt: new Date().toISOString(),
    };

    vi.mocked(paymentsApi.getInvoiceById).mockResolvedValue(mockInvoice);
    vi.mocked(paymentsApi.processPayment).mockResolvedValueOnce({
      id: "pay-1",
      invoiceId: "inv-checkout-1",
      amount: 4600,
      currency: "LKR",
      status: "Succeeded",
      paymentMethod: "card",
      transactionReference: "ch_sbx_test123",
      gatewayProvider: "Stripe-Sandbox",
      paidAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/invoices/inv-checkout-1/pay"]}>
          <Routes>
            <Route path="/invoices/:id/pay" element={<CheckoutPayment />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Secure Checkout")).toBeInTheDocument();
      expect(screen.getByText("Authorize & Pay LKR 4,600")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Authorize & Pay LKR 4,600"));

    await waitFor(() => {
      expect(paymentsApi.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: "inv-checkout-1",
          paymentMethod: "card",
          last4: "4242",
        }),
      );
      expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
      expect(screen.getByText("ch_sbx_test123")).toBeInTheDocument();
    });
  });

  it("renders QuoteReview page with lock badge and AI breakdown", async () => {
    const mockInvoice: InvoiceDto = {
      id: "inv-quote-1",
      bookingId: "book-quote-1",
      customerId: "cust-1",
      providerId: "prov-1",
      baseAmount: 8000,
      platformFee: 1200,
      totalAmount: 9200,
      currency: "LKR",
      status: "Issued",
      issuedAt: new Date().toISOString(),
    };

    vi.mocked(paymentsApi.getInvoiceByBookingId).mockResolvedValueOnce(mockInvoice);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/bookings/book-quote-1/quote"]}>
          <Routes>
            <Route path="/bookings/:id/quote" element={<QuoteReview />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Quote Review")).toBeInTheDocument();
      expect(screen.getByText("LKR 9,200")).toBeInTheDocument();
      expect(screen.getByText("15% Included")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /accept quote/i })).toBeInTheDocument();
    });
  });

  it("renders ProviderPayoutDashboard with 85% net earnings and metrics", async () => {
    const mockUser = {
      id: "prov-1",
      fullName: "Sam Provider",
      email: "sam@pro.com",
      roles: ["Provider"],
    };
    const mockSummary = {
      totalEarnings: 85000,
      availableBalance: 25000,
      pendingPayouts: 12000,
      completedJobsCount: 15,
    };

    vi.mocked(usersApi.getProfile).mockResolvedValueOnce(mockUser as any);
    vi.mocked(paymentsApi.getProviderEarningsSummary).mockResolvedValueOnce(mockSummary);
    vi.mocked(paymentsApi.getProviderPayouts).mockResolvedValueOnce([
      {
        id: "payout-1",
        providerId: "prov-1",
        bookingId: "book-1",
        invoiceId: "inv-test-123",
        grossAmount: 10000,
        platformFeeDeducted: 1500,
        netAmount: 8500,
        currency: "LKR",
        status: "Completed",
        createdAt: new Date().toISOString(),
        payoutReference: "PAY-001",
      },
    ]);

    renderWithProviders(<ProviderPayoutDashboard />);

    expect(screen.getByText("Earnings & Payouts")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("LKR 85,000")).toBeInTheDocument();
      expect(screen.getByText("LKR 25,000")).toBeInTheDocument();
      expect(screen.getByText("85% Net Provider Revenue Share")).toBeInTheDocument();
      const invoiceLink = screen.getByText("View Invoice").closest("a");
      expect(invoiceLink).toHaveAttribute("href", "/invoices/inv-test-123");
    });
  });

  it("renders AdminPaymentsOverview and triggers disbursement approval", async () => {
    const mockOverview = {
      totalGrossVolume: 250000,
      totalPlatformFees: 37500,
      totalPaidOut: 212500,
      pendingPayoutCount: 1,
      recentPayouts: [
        {
          id: "payout-999",
          providerId: "prov-9",
          providerName: "Acme Electrical",
          bookingId: "book-9",
          grossAmount: 10000,
          platformFeeDeducted: 1500,
          netAmount: 8500,
          currency: "LKR",
          status: "Pending" as const,
          createdAt: new Date().toISOString(),
          payoutReference: "PAY-999",
        },
      ],
    };

    vi.mocked(paymentsApi.getAdminPayoutsOverview).mockResolvedValue(mockOverview);
    vi.mocked(paymentsApi.processPayout).mockResolvedValueOnce({
      ...mockOverview.recentPayouts[0],
      status: "Completed",
    });

    renderWithProviders(<AdminPaymentsOverview />);

    expect(screen.getByText("Platform Payments & Disbursements")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("LKR 250,000")).toBeInTheDocument();
      expect(screen.getByText("LKR 37,500")).toBeInTheDocument();
      expect(screen.getByText("Approve & Settle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Approve & Settle"));

    await waitFor(() => {
      expect(paymentsApi.processPayout).toHaveBeenCalledWith("payout-999");
    });
  });

  it("renders PaymentMethods and synchronizes with checkout card vault", async () => {
    const mockUser = {
      id: "cust-sync-test",
      fullName: "Sync Test User",
      email: "sync@test.com",
      roles: ["Customer"],
    };
    vi.mocked(usersApi.getProfile).mockResolvedValue(mockUser as any);

    savePaymentMethod(
      {
        type: "card",
        brand: "Visa",
        name: "Sync Test Visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2028,
        isDefault: true,
        holderName: "Sync Test User",
      },
      "cust-sync-test",
    );

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/account/payment-methods"]}>
          <Routes>
            <Route path="/account/payment-methods" element={<PaymentMethods />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Saved Payment Methods")).toBeInTheDocument();
    expect(screen.getAllByText("Secure Vault:").length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(screen.getByText(/4242/)).toBeInTheDocument();
    });

    unmount();
  });

  it("updates checkout when a new card is added to the vault and selected", async () => {
    const mockInvoice: InvoiceDto = {
      id: "inv-sync-1",
      bookingId: "book-sync-1",
      customerId: "cust-sync-2",
      providerId: "prov-1",
      baseAmount: 5000,
      platformFee: 750,
      totalAmount: 5750,
      currency: "LKR",
      status: "Issued",
      issuedAt: new Date().toISOString(),
    };

    savePaymentMethod(
      {
        type: "card",
        brand: "Amex",
        name: "Saviru Corporate Amex",
        last4: "1001",
        expiryMonth: 5,
        expiryYear: 2030,
        isDefault: true,
        holderName: "Saviru Atapattu",
      },
      "cust-sync-2",
    );

    const mockUser = {
      id: "cust-sync-2",
      fullName: "Saviru Atapattu",
      email: "saviru@test.com",
      roles: ["Customer"],
    };
    vi.mocked(usersApi.getProfile).mockResolvedValue(mockUser as any);
    vi.mocked(paymentsApi.getInvoiceById).mockResolvedValue(mockInvoice);
    vi.mocked(paymentsApi.processPayment).mockResolvedValueOnce({
      id: "pay-sync",
      invoiceId: "inv-sync-1",
      amount: 5750,
      currency: "LKR",
      status: "Succeeded",
      paymentMethod: "card",
      transactionReference: "ch_amex_test1001",
      gatewayProvider: "Stripe-Sandbox",
      paidAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/invoices/inv-sync-1/pay"]}>
          <Routes>
            <Route path="/invoices/:id/pay" element={<CheckoutPayment />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Saviru Corporate Amex")).toBeInTheDocument();
      expect(screen.getAllByText(/1001/).length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("Saviru Corporate Amex"));
    fireEvent.click(screen.getByText("Authorize & Pay LKR 5,750"));

    await waitFor(() => {
      expect(paymentsApi.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: "inv-sync-1",
          paymentMethod: "card",
          last4: "1001",
        }),
      );
    });
  });
});
