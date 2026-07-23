import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import Layout from "@/components/Layout";
import Privacy from "@/pages/Privacy";
import DeleteAccount from "@/pages/DeleteAccount";
import Terms from "@/pages/Terms";

function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground">
        <a href="/privacy" className="underline hover:text-foreground">
          Go to Privacy Policy
        </a>
      </p>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/privacy" />} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/delete-account" component={DeleteAccount} />
        <Route path="/terms" component={Terms} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
