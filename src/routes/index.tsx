import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { MOM_VARIANTS } from "@/lib/mom";
import { supabase } from "@/integrations/supabase/client";
import heroMom from "@/assets/mom-a-upset.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tiger Mom — your adopted digital nag" },
      {
        name: "description",
        content:
          "Adopt an anime tiger mom who teases, nags and celebrates you until your goal actually happens.",
      },
      { property: "og:title", content: "Tiger Mom — your adopted digital nag" },
      {
        property: "og:description",
        content: "Pick your tiger mom, name your goal, and get lovingly harassed into progress.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-extrabold text-primary">Tiger Mom</span>
        {signedIn ? (
          <Button asChild>
            <Link to="/home">Open my app</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      <section className="mt-8 grid items-center gap-8 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl leading-tight font-extrabold text-foreground sm:text-5xl">
            Adopt a tiger mom.
            <span className="block text-primary">Regret it immediately.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tell her what you're working on. She'll check in with silly, slightly sarcastic jibes,
            hand you small ideas, and deliver a verdict on your day. Kind underneath. Mostly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/home" : "/auth"}>
                {signedIn ? "Back to Mom" : "Adopt my tiger mom"}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            She never gives diet, weight or medical advice — just small, safe, sustainable nudges.
          </p>
        </div>
        <img
          src={heroMom}
          alt="An anime tiger mom pointing sternly at you"
          width={768}
          height={1024}
          className="mx-auto h-80 w-auto drop-shadow-2xl sm:h-96"
        />
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">Three moms. Zero mercy.</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {MOM_VARIANTS.map((v) => (
            <div key={v.id} className="paper-card p-4 text-center">
              <img
                src={v.art.proud}
                alt={v.name}
                loading="lazy"
                width={768}
                height={1024}
                className="mx-auto h-40 w-auto"
              />
              <p className="mt-2 font-display text-lg font-bold">{v.name}</p>
              <p className="text-sm text-muted-foreground">{v.tagline}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
