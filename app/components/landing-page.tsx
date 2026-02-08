"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bandage, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-app-bg/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/landing" className="font-alliance text-xl font-medium tracking-tight">
          Better Watch
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/chat"
            className="text-sm text-subtitle transition-colors hover:text-foreground"
          >
            Open App
          </Link>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/chat">Get Started</Link>
          </Button>
        </nav>
      </div>
      <div className="px-6 pb-2 text-faded/30 overflow-hidden whitespace-nowrap select-none pointer-events-none">
        {"-".repeat(300)}
      </div>
    </header>
  );
}

function InteractiveHoverWord({
  word,
  icon: Icon,
  className
}: {
  word: string;
  icon: any;
  className?: string;
}) {
  return (
    <motion.span
      className={`relative inline-flex items-center gap-1 font-bold cursor-default group ${className}`}
      whileHover="hover"
    >
      <span>{word}</span>
      <div className="relative w-0 group-hover:w-5 overflow-hidden transition-all duration-300 ease-out">
        <motion.div
          variants={{
            initial: { opacity: 0, scale: 0, x: -5 },
            hover: { opacity: 1, scale: 1, x: 0 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center"
        >
          <Icon className="h-4 w-4 text-chart-1 shrink-0" />
        </motion.div>
      </div>
    </motion.span>
  );
}

function HeroSection() {
  const asciiArt = `
    010101010101010101010101010101010101010101010101010101010101
    101010101010101010101010101010101010101010101010101010101010
    010101010101010101010101010101010101010101010101010101010101
    101010101010101010101010101010101010101010101010101010101010
    DETECT ANOMALY DETECT ANOMALY DETECT ANOMALY DETECT ANOMALY 
    DIAGNOSE ROOT CAUSE DIAGNOSE ROOT CAUSE DIAGNOSE ROOT CAUSE
    APPLY RUNTIME PATCH APPLY RUNTIME PATCH APPLY RUNTIME PATCH
    010101010101010101010101010101010101010101010101010101010101
    101010101010101010101010101010101010101010101010101010101010
    010101010101010101010101010101010101010101010101010101010101
    101010101010101010101010101010101010101010101010101010101010
  `;

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-40 md:pt-48">
      {/* ASCII Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none overflow-hidden h-[120%] -top-[10%]">
        <pre className="font-mono text-[10px] sm:text-sm leading-tight text-center whitespace-pre transform -rotate-12 scale-150">
          {asciiArt.repeat(10)}
        </pre>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h1 className="font-alliance text-4xl font-medium tracking-tight text-heading sm:text-5xl md:text-6xl text-balance">
          <InteractiveHoverWord word="Detect" icon={Search} />,{" "}
          <InteractiveHoverWord word="patch" icon={Bandage} />, and{" "}
          <InteractiveHoverWord word="fix" icon={Check} />
          <br />
          <span className="text-chart-1">production issues in runtime</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-subtitle">
          An intelligent observability and analytics agent that automatically
          detects, diagnoses, and patches production issues at runtime. No
          waiting for PR approval or the next deploy.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/chat">Try Better Watch</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-chart-1/20 blur-3xl" />
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-y border-border-color/60 bg-warm-cream/50 px-6 py-24 dark:bg-warm-cream/20">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-wider text-faded">
          The problem
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-heading sm:text-4xl">
          Every engineer knows this loop
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-subtitle">
          You get the alert — &quot;something&apos;s broken in prod.&quot; You dig through
          logs, traces, maybe replay the session. You find the bug. You write a
          fix. You open a PR. You wait for review and deploy.{" "}
          <span className="font-medium text-foreground">
            And the whole time, the issue is still live.
          </span>
        </p>
        <p className="mt-6 text-lg leading-relaxed text-subtitle">
          Observability tells you <em>that</em> something is wrong. It
          doesn&apos;t fix it. You&apos;re still on the hook for every diagnosis and
          every deploy. Mean time to resolution stays high. Again and again.
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-wider text-faded">
          How it works
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-heading sm:text-4xl">
          Fast mitigation first, permanent fix when ready
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <Card className="border-chart-1/30 dark:border-chart-1/20">
            <CardHeader>
              <span className="text-xs font-medium uppercase tracking-wider text-faded">
                Step 1
              </span>
              <CardTitle className="text-xl">Detect</CardTitle>
              <CardDescription>
                The agent continuously monitors your application, learns its
                behavior, and identifies issues as they occur in production.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-chart-2/30 dark:border-chart-2/20">
            <CardHeader>
              <span className="text-xs font-medium uppercase tracking-wider text-faded">
                Step 2
              </span>
              <CardTitle className="text-xl">Patch</CardTitle>
              <CardDescription>
                Patches deploy as toggleable fixes — like feature flags. Turn
                them on or off in real-time. Validate in production before
                committing.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-chart-3/30 dark:border-chart-3/20">
            <CardHeader>
              <span className="text-xs font-medium uppercase tracking-wider text-faded">
                Step 3
              </span>
              <CardTitle className="text-xl">Fix</CardTitle>
              <CardDescription>
                Once validated, Better Watch creates a PR with the permanent
                fix. When merged, the runtime patch is automatically
                decommissioned.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}

function KeyInsightSection() {
  return (
    <section className="border-y border-border-color/60 bg-warm-cream/50 px-6 py-24 dark:bg-warm-cream/20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-faded">
          The key insight
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-heading sm:text-4xl">
          The agent decides{" "}
          <span className="text-chart-1">what to observe and what to fix</span>
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-subtitle">
          It learns your application, identifies issues, and applies patches
          automatically. It&apos;s not static — it gets smarter over time and
          dramatically reduces MTTR.
        </p>
      </div>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-medium tracking-tight text-heading sm:text-4xl">
          Before vs after
        </h2>
        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-lg text-faded line-through">
                Before
              </CardTitle>
              <CardContent className="space-y-3 pt-4">
                <p className="text-subtitle line-through">
                  Long triage cycles
                </p>
                <p className="text-subtitle line-through">
                  &quot;Fix in the next release&quot;
                </p>
                <p className="text-subtitle line-through">
                  Wait for review and deploy
                </p>
              </CardContent>
            </CardHeader>
          </Card>
          <Card className="border-chart-1/40 bg-chart-1/5 dark:bg-chart-1/10">
            <CardHeader>
              <CardTitle className="text-lg text-chart-1">After</CardTitle>
              <CardContent className="space-y-3 pt-4">
                <p className="font-medium text-foreground">
                  Runtime patches now
                </p>
                <p className="font-medium text-foreground">
                  PR for the real fix when you&apos;re ready
                </p>
                <p className="font-medium text-foreground">
                  Human oversight every step of the way
                </p>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-border-color/60 bg-warm-cream/50 px-6 py-24 dark:bg-warm-cream/20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-medium tracking-tight text-heading">
          Ready to fix production faster?
        </h2>
        <p className="mt-4 text-subtitle">
          Better Watch. Detect, patch, and fix production issues in real-time.
        </p>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link href="/chat">Get Started</Link>
          </Button>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-faded">
          <Link href="/chat" className="transition-colors hover:text-foreground">
            Open App
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-color/60 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-faded">Better Watch</p>
        <p className="text-sm text-faded">
          agent · sdk · app
        </p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app-bg">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <KeyInsightSection />
        <BeforeAfterSection />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}
