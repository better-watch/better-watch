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

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionDivider() {
  return (
    <div className="px-6 py-4 text-faded/20 overflow-hidden whitespace-nowrap select-none pointer-events-none">
      {"-".repeat(300)}
    </div>
  );
}

function ProblemSection() {
  return (
    <section className="border-y border-border-color/60 bg-warm-cream/50 px-6 py-24 dark:bg-warm-cream/20 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.02] select-none pointer-events-none">
        <pre className="font-mono text-[8px] leading-tight whitespace-pre">
          {`LOGS: ERROR 500
TRACES: SPAN_ID_7721
METRICS: LATENCY_BUCKET_P99
`.repeat(100)}
        </pre>
      </div>
      <ScrollReveal>
        <div className="mx-auto max-w-4xl relative z-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-chart-1">
            The problem
          </p>
          <h2 className="mt-4 font-alliance text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            Every engineer knows this loop
          </h2>
          <p className="mt-8 text-xl leading-relaxed text-foreground font-medium">
            You get the alert — &quot;something&apos;s broken in prod.&quot; You dig through
            logs, traces, maybe replay the session. You find the bug. You write a
            fix. You open a PR. You wait for review and deploy.{" "}
            <span className="text-chart-1 underline decoration-chart-1/30 underline-offset-4">
              And the whole time, the issue is still live.
            </span>
          </p>
          <p className="mt-6 text-lg leading-relaxed text-subtitle">
            Observability tells you <em>that</em> something is wrong. It
            doesn&apos;t fix it. You&apos;re still on the hook for every diagnosis and
            every deploy. Mean time to resolution stays high. Again and again.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "Step 1",
      title: "Detect",
      description: "The agent continuously monitors your application, learns its behavior, and identifies issues as they occur in production.",
      borderColor: "border-chart-1"
    },
    {
      step: "Step 2",
      title: "Patch",
      description: "Patches deploy as toggleable fixes — like feature flags. Turn them on or off in real-time. Validate in production before committing.",
      borderColor: "border-chart-2"
    },
    {
      step: "Step 3",
      title: "Fix",
      description: "Once validated, Better Watch creates a PR with the permanent fix. When merged, the runtime patch is automatically decommissioned.",
      borderColor: "border-chart-3"
    }
  ];

  return (
    <section id="how-it-works" className="px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-chart-2">
            How it works
          </p>
          <h2 className="mt-4 font-alliance text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            Fast mitigation first, permanent fix when ready
          </h2>
        </ScrollReveal>
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {steps.map((item, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <Card className={`${item.borderColor}/30 dark:${item.borderColor}/20 h-full transition-transform hover:-translate-y-1`}>
                <CardHeader>
                  <span className="text-xs font-bold uppercase tracking-wider text-faded">
                    {item.step}
                  </span>
                  <CardTitle className="text-2xl font-alliance">{item.title}</CardTitle>
                  <CardDescription className="text-base text-subtitle leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function KeyInsightSection() {
  return (
    <section className="border-y border-border-color/60 bg-warm-cream/50 px-6 py-24 dark:bg-warm-cream/20 relative">
      <ScrollReveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-chart-3">
            The key insight
          </p>
          <h2 className="mt-4 font-alliance text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            The agent decides{" "}
            <span className="text-chart-1">what to observe and what to fix</span>
          </h2>
          <p className="mt-8 text-xl leading-relaxed text-foreground font-medium">
            It learns your application, identifies issues, and applies patches
            automatically. It&apos;s not static — it gets smarter over time and
            dramatically reduces MTTR.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <ScrollReveal>
          <h2 className="text-center font-alliance text-3xl font-bold tracking-tight text-heading sm:text-4xl underline decoration-faded/20 underline-offset-8">
            Before vs after
          </h2>
        </ScrollReveal>
        <div className="mt-20 grid gap-12 md:grid-cols-2">
          <ScrollReveal delay={0.1}>
            <Card className="border-muted grayscale opacity-70">
              <CardHeader>
                <CardTitle className="text-xl font-alliance text-faded line-through">
                  Before
                </CardTitle>
                <CardContent className="space-y-4 pt-4 px-0">
                  <p className="text-subtitle line-through text-lg">
                    Long triage cycles
                  </p>
                  <p className="text-subtitle line-through text-lg">
                    &quot;Fix in the next release&quot;
                  </p>
                  <p className="text-subtitle line-through text-lg">
                    Wait for review and deploy
                  </p>
                </CardContent>
              </CardHeader>
            </Card>
          </ScrollReveal>
          <ScrollReveal delay={0.25}>
            <Card className="border-chart-1/40 bg-chart-1/5 dark:bg-chart-1/10 shadow-2xl shadow-chart-1/10">
              <CardHeader>
                <CardTitle className="text-xl font-alliance text-chart-1 font-bold italic">After</CardTitle>
                <CardContent className="space-y-4 pt-4 px-0">
                  <p className="text-lg font-bold text-foreground">
                    Runtime patches now
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    PR for the real fix when you&apos;re ready
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    Human oversight every step of the way
                  </p>
                </CardContent>
              </CardHeader>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-border-color/60 bg-warm-cream/50 px-6 py-32 dark:bg-warm-cream/20">
      <ScrollReveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-alliance text-4xl font-bold tracking-tight text-heading">
            Ready to fix production faster?
          </h2>
          <p className="mt-6 text-xl text-subtitle">
            Better Watch. Detect, patch, and fix production issues in real-time.
          </p>
          <div className="mt-12">
            <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-xl shadow-chart-1/20 transition-transform hover:scale-105 active:scale-95">
              <Link href="/chat">Get Started</Link>
            </Button>
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm font-bold uppercase tracking-widest text-faded">
            <Link href="/chat" className="transition-colors hover:text-foreground">
              Open App
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-color/60 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="font-alliance text-lg font-bold text-heading">Better Watch</p>
        <p className="text-sm font-mono text-faded tracking-tighter">
          AGENT_v0.6.0 · SDK_LATEST · APP_PRODUCTION
        </p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app-bg text-foreground selection:bg-chart-1/30">
      <LandingHeader />
      <main>
        <HeroSection />
        <SectionDivider />
        <ProblemSection />
        <SectionDivider />
        <HowItWorksSection />
        <SectionDivider />
        <KeyInsightSection />
        <SectionDivider />
        <BeforeAfterSection />
        <SectionDivider />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}
