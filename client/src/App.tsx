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
import ScheduledPosts from "./pages/ScheduledPosts";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Templates from "./pages/Templates";
import PostTemplates from "./pages/PostTemplates";
import SimplePost from "./pages/SimplePost";
import ApprovalQueue from "./pages/ApprovalQueue";
import ActivityLog from "./pages/ActivityLog";
import MyProgress from "./pages/MyProgress";
import ErrorStats from "./pages/ErrorStats";
import PostDrafts from "./pages/PostDrafts";
import DataSources from "./pages/DataSources";
import Performance from "./pages/Performance";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/simple-post"} component={SimplePost} />
      <Route path={"/approval-queue"} component={ApprovalQueue} />
      <Route path={"/activity-log"} component={ActivityLog} />
      <Route path={"/my-progress"} component={MyProgress} />
      <Route path={"/history"} component={PostHistory} />
      <Route path={"/scheduled"} component={ScheduledPosts} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/help"} component={Help} />
      <Route path={"/templates"} component={Templates} />
      <Route path={"/post-templates"} component={PostTemplates} />
      <Route path={"/sns-accounts"} component={SnsAccounts} />
      <Route path={"/cloud-storage"} component={CloudStorage} />
      <Route path={"/calendar"} component={PostCalendar} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/error-stats"} component={ErrorStats} />
      <Route path="/post-drafts" component={PostDrafts} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/performance" component={Performance} />
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
