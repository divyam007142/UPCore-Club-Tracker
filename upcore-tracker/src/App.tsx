import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import PageWrapper from "@/components/PageWrapper";
import GifTransitionOverlay from "@/components/GifTransitionOverlay";
import { TransitionProvider } from "@/context/TransitionContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Home from "@/pages/home";
import Logs from "@/pages/logs";
import Overview from "@/pages/overview";
import Settings from "@/pages/settings";
import About from "@/pages/about";
import Stats from "@/pages/stats";
import Leaderboard from "@/pages/leaderboard";
import Login from "@/pages/login";
import LookupPage from "@/pages/lookup";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import ClubMembersPage from "@/pages/admin/ClubMembersPage";
import ProfilePage from "@/pages/admin/ProfilePage";
import SystemStatusPage from "@/pages/admin/SystemStatusPage";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ErrorBoundaryState { hasError: boolean }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-4">
          <p className="font-mono text-sm">Something went wrong rendering this page.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-mono px-3 py-1.5 border border-border rounded hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageRoute({ component: Component, routeKey }: { component: React.ComponentType; routeKey: string }) {
  return (
    <PageWrapper key={routeKey}>
      <Component />
    </PageWrapper>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground font-mono text-sm">Loading…</div>;
  }
  if (!admin) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children, routeKey }: { children: React.ReactNode; routeKey: string }) {
  return (
    <PageWrapper key={routeKey}>
      <RequireAuth>
        <AdminLayout>{children}</AdminLayout>
      </RequireAuth>
    </PageWrapper>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <>
    <GifTransitionOverlay />
    <Layout>
      <ErrorBoundary>
        <Switch>
          <Route path="/"            component={() => <PageRoute component={Home}        routeKey={location} />} />
          <Route path="/logs"        component={() => <PageRoute component={Logs}        routeKey={location} />} />
          <Route path="/overview"    component={() => <PageRoute component={Overview}    routeKey={location} />} />
          <Route path="/stats"       component={() => <PageRoute component={Stats}       routeKey={location} />} />
          <Route path="/leaderboard" component={() => <PageRoute component={Leaderboard} routeKey={location} />} />
          <Route path="/lookup"      component={() => <PageRoute component={LookupPage}  routeKey="/lookup" />} />
          <Route path="/about"       component={() => <PageRoute component={About}       routeKey={location} />} />
          <Route path="/contact"     component={() => <PageRoute component={Contact}     routeKey={location} />} />
          <Route path="/login"       component={() => <PageRoute component={Login}       routeKey={location} />} />

          {/* Admin (protected) */}
          <Route path="/admin"          component={() => <AdminRoute routeKey={location}><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/settings" component={() => <AdminRoute routeKey={location}><Settings /></AdminRoute>} />
          <Route path="/admin/members"  component={() => <AdminRoute routeKey={location}><ClubMembersPage /></AdminRoute>} />
          <Route path="/admin/audit"    component={() => <AdminRoute routeKey={location}><AuditLogsPage /></AdminRoute>} />
          <Route path="/admin/status"   component={() => <AdminRoute routeKey={location}><SystemStatusPage /></AdminRoute>} />
          <Route path="/admin/profile"  component={() => <AdminRoute routeKey={location}><ProfilePage /></AdminRoute>} />

          {/* Legacy public settings → redirect */}
          <Route path="/settings" component={() => <Redirect to="/admin/settings" />} />

          <Route component={() => <PageRoute component={NotFound} routeKey={location} />} />
        </Switch>
      </ErrorBoundary>
    </Layout>
    </>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <TransitionProvider>
              {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
              {splashDone && (
                <div className="app-reveal min-h-screen">
                  <Router />
                </div>
              )}
            </TransitionProvider>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
