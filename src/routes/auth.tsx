import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import momArt from "@/assets/mom-b-happy.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Tiger Mom" },
      { name: "description", content: "Sign in to check in with your adopted digital tiger mom." },
      { property: "og:title", content: "Sign in — Tiger Mom" },
      { property: "og:description", content: "Your tiger mom is waiting. She has been waiting." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function resend() {
    if (!email) {
      toast.error("Type your email first.");
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(error.message);
    else toast.success("New confirmation email sent. Use the newest one — older links stop working.");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/home", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.code === "email_not_confirmed") {
            setUnconfirmed(true);
            throw new Error("Your email isn't confirmed yet. Tap 'Resend confirmation email' below.");
          }
          if (error.code === "invalid_credentials") throw new Error("Wrong email or password. Mom is disappointed, but try again.");
          throw error;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link to="/" className="font-display text-lg font-extrabold text-primary">
        Tiger Mom
      </Link>
      <img
        src={momArt}
        alt="Your tiger mom waiting for you"
        width={768}
        height={1024}
        className="mx-auto mt-4 h-40 w-auto"
      />
      <div className="paper-card mt-4 p-6">
        <h1 className="font-display text-2xl font-bold">
          {mode === "signup" ? "Adopt your tiger mom" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sent
            ? "Confirm your email, then come back. She's counting the minutes."
            : "Your goals and streaks follow you on every device."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">What should she call you?</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        {(sent || unconfirmed) && (
          <Button variant="secondary" className="mt-3 w-full" onClick={resend}>
            Resend confirmation email
          </Button>
        )}

        <Button variant="outline" className="mt-3 w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "I already have an account" : "I need an account"}
        </button>
      </div>
    </main>
  );
}
