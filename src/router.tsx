import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterSuccessPage from "./pages/RegisterSuccessPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import ServicesPage from "./pages/ServicesPage";
import UsersPage from "./pages/UsersPage";
import JobsPage from "./pages/JobsPage";
import InvoicesPage from "./pages/InvoicesPage";
import DocumentsPage from "./pages/DocumentsPage";
import GeneralPage from "./pages/settings/GeneralPage";
import RolesPermissionsPage from "./pages/settings/RolesPermissionsPage";
import MessagesPage from "./pages/MessagesPage";
import UserDetailPage from "./pages/UserDetailPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";

const router = createBrowserRouter([
  // Public routes
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/register-success", element: <RegisterSuccessPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  // Protected routes
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/users", element: <UsersPage /> },
          { path: "/users/:id", element: <UserDetailPage /> },
          { path: "/customers", element: <CustomersPage /> },
          { path: "/customers/:id", element: <CustomerDetailPage /> },
          { path: "/jobs", element: <JobsPage /> },
          { path: "/invoices", element: <InvoicesPage /> },
          { path: "/documents", element: <DocumentsPage /> },
          { path: "/services", element: <ServicesPage /> },
          { path: "/messages", element: <MessagesPage /> },
          {
            path: "/settings",
            element: <Navigate to="/settings/general" replace />,
          },
          { path: "/settings/general", element: <GeneralPage /> },
          { path: "/settings/roles", element: <RolesPermissionsPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default router;
