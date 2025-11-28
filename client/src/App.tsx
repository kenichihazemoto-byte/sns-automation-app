import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import SnsAccounts from "./pages/SnsAccounts";
import CloudStorage from "./pages/CloudStorage";
import PostCalendar from "./pages/PostCalendar";
import Analytics from "./pages/Analytics";
import Demo from "./pages/Demo";
import PostHistory from "./pages/PostHistory";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Templates from "./pages/Templates";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/history"} component={PostHistory} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/help"} component={Help} />
      <Route path={"/templates"} component={Templates} />
      <Route path={"/sns-accounts"} component={SnsAccounts} />
      <Route path={"/cloud-storage"} component={CloudStorage} />
      <Route path={"/calendar"} component={PostCalendar} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
