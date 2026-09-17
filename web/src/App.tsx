import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

const queryClient = new QueryClient();

import AppShell from './components/layout/AppShell';
import NotFound from './pages/error/NotFound';
import Unauthorized from './pages/error/Unauthorized';
import ServerError from './pages/error/ServerError';
import Login from './pages/auth/Login';
import RegisterCustomer from './pages/auth/RegisterCustomer';
import RegisterProvider from './pages/auth/RegisterProvider';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Landing from './pages/Landing';

import DashboardHome from './pages/dashboard/DashboardHome';
import AccountSettings from './pages/dashboard/AccountSettings';
import Notifications from './pages/dashboard/Notifications';
import AgentWorkflow from './pages/dashboard/AgentWorkflow';
import ThemeToggle from './components/ThemeToggle';

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

          {/* ERROR ROUTES */}
          <Route path="/403" element={<Unauthorized />} />
          <Route path="/500" element={<ServerError />} />

          {/* PROTECTED ROUTES (wrapped in AppShell) */}
          <Route element={<AppShell />}>
            {/* Dashboard acting as the post-login shell home */}
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/notifications" element={<Notifications />} />

            {/* Admin specific */}
            <Route path="/admin/agent-workflow" element={<AgentWorkflow />} />
          </Route>

          {/* CATCH ALL (404) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
