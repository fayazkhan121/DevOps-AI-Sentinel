import * as React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DashboardManager from "./pages/DashboardManager";
import DashboardView from "./pages/DashboardView";
import AdminUsers from "./pages/AdminUsers";
import UserProfilePage from "./pages/UserProfile";
import DatabaseSettings from "./pages/DatabaseSettings";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import "./App.css";

const App: React.FC = () => {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <TooltipProvider>
            <ErrorBoundary>
              <div className="min-h-screen bg-background">
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/setup" element={<Login />} />
                  
                  {/* Protected routes - redirect to login if not authenticated */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Index />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboards" element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardManager />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardView />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <AdminUsers />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Layout>
                        <UserProfilePage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/database-settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <DatabaseSettings />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all - redirect to login */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </ErrorBoundary>
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;