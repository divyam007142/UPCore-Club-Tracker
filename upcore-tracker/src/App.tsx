import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import PageWrapper from "@/components/PageWrapper";
import GifTransitionOverlay from "@/components/GifTransitionOverlay";
import { TransitionProvider } from "@/context/TransitionContext";
import SplashScreen from "@/components/SplashScreen";
import Home from "@/pages/home";
import Logs from "@/pages/logs";
import Overview from "@/pages/overview";
import Settings from "@/pages/settings";
import About from "@/pages/about";
import Stats from "@/pages/stats";
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

function Router() {
  const [location] = useLocation();
  return (
    <>
    <GifTransitionOverlay />
    <Layout>
      <ErrorBoundary>
        <Switch>
          <Route path="/"         component={() => <PageRoute component={Home}     routeKey={location} />} />
          <Route path="/logs"     component={() => <PageRoute component={Logs}     routeKey={location} />} />
          <Route path="/overview" component={() => <PageRoute component={Overview} routeKey={location} />} />
          <Route path="/settings" component={() => <PageRoute component={Settings} routeKey={location} />} />
          <Route path="/stats"    component={() => <PageRoute component={Stats}    routeKey={location} />} />
          <Route path="/about"    component={() => <PageRoute component={About}    routeKey={location} />} />
          <Route                  component={() => <PageRoute component={NotFound} routeKey={location} />} />
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
