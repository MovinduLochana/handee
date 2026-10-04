import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/error/NotFound";
import Unauthorized from "./pages/error/Unauthorized";
import ServerError from "./pages/error/ServerError";
import Login from "./pages/auth/Login";
import RegisterCustomer from "./pages/auth/RegisterCustomer";
import RegisterProvider from "./pages/auth/RegisterProvider";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Landing from "./pages/Landing";

import DashboardHome from "./pages/dashboard/DashboardHome";
import AccountSettings from "./pages/dashboard/AccountSettings";
import Notifications from "./pages/dashboard/Notifications";
import AgentWorkflow from "./pages/dashboard/AgentWorkflow";
import ThemeToggle from "./components/ThemeToggle";

// Provider Pages
import ProviderOnboarding from "./pages/provider/ProviderOnboarding";
import SubmitVerification from "./pages/provider/SubmitVerification";
import VerificationStatusTracker from "./pages/provider/VerificationStatus";
import ProviderProfile from "./pages/provider/ProviderProfile";
import ProviderServiceListings from "./pages/provider/ProviderServiceListings";
import ProviderReviews from "./pages/provider/ProviderReviews";
import ProviderBookings from "./pages/provider/ProviderBookings";
import PublicProviderProfile from "./pages/public/PublicProviderProfile";
import ProviderSearch from "./pages/public/ProviderSearch";

// Admin Pages
import VerificationQueue from "./pages/admin/VerificationQueue";
import VerificationDetail from "./pages/admin/VerificationDetail";
import ProviderDirectory from "./pages/admin/ProviderDirectory";
import BookingOverview from "./pages/admin/BookingOverview";
import JobRequestsManagement from "./pages/admin/JobRequestsManagement";
import JobRequestDetail from "./pages/admin/JobRequestDetail";
import BookingsManagement from "./pages/admin/BookingsManagement";
import BookingDetail from "./pages/admin/BookingDetail";
import UsersManagement from "./pages/admin/UsersManagement";

// Payments & Invoicing Pages
import QuoteReview from "./pages/payments/QuoteReview";
import InvoicesList from "./pages/payments/InvoicesList";
import InvoiceDetail from "./pages/payments/InvoiceDetail";
import CheckoutPayment from "./pages/payments/CheckoutPayment";
import PaymentMethods from "./pages/payments/PaymentMethods";
import ProviderPayoutDashboard from "./pages/provider/ProviderPayoutDashboard";
import ProviderPayoutHistory from "./pages/provider/ProviderPayoutHistory";
import AdminPaymentsOverview from "./pages/admin/AdminPaymentsOverview";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeToggle />
        <Routes>
          {/* PUBLIC ROUTES (No Auth Required) */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/customer" element={<RegisterCustomer />} />
          <Route path="/register/provider" element={<RegisterProvider />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/providers" element={<ProviderSearch />} />
          <Route path="/providers/:providerId" element={<PublicProviderProfile />} />

          {/* ERROR ROUTES */}
          <Route path="/403" element={<Unauthorized />} />
          <Route path="/500" element={<ServerError />} />

          {/* AUTHENTICATED ROUTES */}
          <Route element={<ProtectedRoute />}>
            {/* Provider Onboarding */}
            <Route element={<ProtectedRoute allowedRoles={["Provider"]} />}>
              <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
            </Route>

            {/* Application Shell */}
            <Route element={<AppShell />}>
              {/* Common Authenticated Routes */}
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/account" element={<AccountSettings />} />
              <Route path="/notifications" element={<Notifications />} />

              {/* Payments & Invoicing */}
              <Route path="/bookings/:id/quote" element={<QuoteReview />} />
              <Route path="/invoices" element={<InvoicesList />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/pay" element={<CheckoutPayment />} />
              <Route path="/account/payment-methods" element={<PaymentMethods />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />

              {/* Provider Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={["Provider"]} />}>
                <Route path="/provider/submit-verification" element={<SubmitVerification />} />
                <Route path="/provider/status" element={<VerificationStatusTracker />} />
                <Route path="/provider/profile" element={<ProviderProfile />} />
                <Route path="/provider/service-listings" element={<ProviderServiceListings />} />
                <Route path="/provider/bookings" element={<ProviderBookings />} />
                <Route path="/provider/reviews" element={<ProviderReviews />} />
                <Route path="/provider/payouts" element={<ProviderPayoutDashboard />} />
                <Route path="/provider/payouts/history" element={<ProviderPayoutHistory />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                <Route path="/admin/agent-workflow" element={<AgentWorkflow />} />
                <Route path="/admin/verifications" element={<VerificationQueue />} />
                <Route path="/admin/verifications/:id" element={<VerificationDetail />} />
                <Route path="/admin/providers" element={<ProviderDirectory />} />
                <Route path="/admin/users" element={<UsersManagement />} />
                <Route path="/admin/booking-overview" element={<BookingOverview />} />
                <Route path="/admin/job-requests" element={<JobRequestsManagement />} />
                <Route path="/admin/job-requests/:id" element={<JobRequestDetail />} />
                <Route path="/admin/bookings" element={<BookingsManagement />} />
                <Route path="/admin/bookings/:id" element={<BookingDetail />} />
                <Route path="/admin/payments" element={<AdminPaymentsOverview />} />
              </Route>
            </Route>
          </Route>

          {/* CATCH ALL (404) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
