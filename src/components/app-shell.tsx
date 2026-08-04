import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plane, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const NAV = [
  { to: "/plan", label: "Flight Planner" },
  { to: "/aircraft", label: "Aircraft" },
  { to: "/flights", label: "History" },
  { to: "/airports", label: "Airports" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/plan" className="flex items-center gap-2 font-display text-base font-semibold tracking-wide">
            <Plane className="size-5 text-accent" />
            C172 W&amp;B
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-t-md px-3 py-2 font-display uppercase tracking-wider text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              activeProps={{ className: "bg-background text-foreground hover:text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}