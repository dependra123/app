import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — C172 Weight & Balance" },
      { name: "description", content: "Choose a new password for your C172 weight and balance account." },
      { property: "og:title", content: "Set a new password — C172 Weight & Balance" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/plan", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open this page from the reset link in your email.
        </p>
        <div className="mt-5">
          <Label htmlFor="pw" className="label-caps mb-1 block">
            New password
          </Label>
          <Input
            id="pw"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}