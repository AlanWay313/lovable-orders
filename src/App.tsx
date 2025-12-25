import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageTitle } from "@/components/PageTitle";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PublicMenu from "./pages/PublicMenu";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminPlans from "./pages/admin/AdminPlans";
import StoreSettings from "./pages/store/StoreSettings";
import MenuManagement from "./pages/store/MenuManagement";
import OrdersManagement from "./pages/store/OrdersManagement";
import DriversManagement from "./pages/store/DriversManagement";
import CouponsManagement from "./pages/store/CouponsManagement";
import PromotionsManagement from "./pages/store/PromotionsManagement";
import UserSettings from "./pages/store/UserSettings";
import PlansPage from "./pages/store/PlansPage";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import DriverLogin from "./pages/DriverLogin";
import DriverDashboard from "./pages/DriverDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTitle>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/menu/:slug" element={<PublicMenu />} />
            <Route path="/track/:orderId" element={<OrderTracking />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/store"
              element={
                <ProtectedRoute>
                  <StoreSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu"
              element={
                <ProtectedRoute>
                  <MenuManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <ProtectedRoute>
                  <OrdersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/drivers"
              element={
                <ProtectedRoute>
                  <DriversManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/coupons"
              element={
                <ProtectedRoute>
                  <CouponsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/promotions"
              element={
                <ProtectedRoute>
                  <PromotionsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/plans"
              element={
                <ProtectedRoute>
                  <PlansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/companies"
              element={
                <ProtectedRoute requiredRoles={['super_admin']}>
                  <AdminCompanies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/plans"
              element={
                <ProtectedRoute requiredRoles={['super_admin']}>
                  <AdminPlans />
                </ProtectedRoute>
              }
            />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PageTitle>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;