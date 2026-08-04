import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — C172 Weight & Balance" },
      { name: "description", content: "Sign in to sync your Cessna 172 aircraft profiles and saved flights." },
      { property: "og:title", content: "Sign in — C172 Weight & Balance" },
      { property: "og:description", content: "Sign in to sync your aircraft profiles and saved flights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/plan", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/plan", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/plan", replace: true });
        } else {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your email.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <Plane className="size-5 text-accent" />
          <span className="font-display text-lg font-semibold">C172 W&amp;B</span>
        </div>
        <h1 className="text-xl font-semibold">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a link to set a new password."
            : "Your aircraft profiles and flights sync across devices."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="label-caps mb-1 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== "forgot" ? (
            <div>
              <Label htmlFor="password" className="label-caps mb-1 block">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-sm">
          {mode !== "signin" ? (
            <button className="text-primary underline-offset-4 hover:underline" onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          ) : (
            <>
              <button className="block text-primary underline-offset-4 hover:underline" onClick={() => setMode("signup")}>
                Create an account
              </button>
              <button className="block text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}