# Better Brain -- Stage Script

> Read this naturally. Pause where you see [pause].
> Advance slides where you see [NEXT].
> Total time: ~90 seconds before demo.

---

[SLIDE 1 -- title: "Better Brain"]

Hey everyone, I'm [name]. I built Better Brain.

[NEXT → SLIDE 2 -- slack messages]

Every engineer has gotten that message -- "hey, is this customer
experiencing issues?" or "how are users actually using this
feature?" [pause]

You go check your logs... and the answer just isn't there.
Because you never thought to log it.

[NEXT → SLIDE 3 -- the loop]

So you do what every engineer does. You add more logging, you
redeploy, you wait, and you hope the problem happens again. [pause]

[NEXT → SLIDE 4 -- "observability is write-first"]

This is broken. Observability today forces you to predict what
data you'll need before you need it. And you're almost always
wrong.

[NEXT → SLIDE 5 -- introducing Better Brain]

[pause]

So we built Better Brain. It's an agent that continuously learns
your running application and always has the data to answer your
questions.

Here's how. [pause]

[NEXT → SLIDE 6 -- dynamic instrumentation]

Better Brain uses dynamic instrumentation -- it attaches probes
to your live code, captures variable values and execution paths
in real time. No code changes. No redeploys. Near-zero overhead.

[NEXT → SLIDE 7 -- architecture diagram]

It deploys next to your services, in any cloud. The data comes
out as rich, wide events, exported to tools you already use --
like Sentry. And you talk to it through MCP, from your IDE, your
terminal, whatever you want.

[NEXT → SLIDE 8 -- "agent decides what to observe"]

But the key insight is this -- the agent decides what to observe.
It learns your application, identifies gaps in coverage, and
adjusts its instrumentation automatically. It's not static. It
gets smarter over time.

[NEXT → SLIDE 9 -- before / after]

[pause]

No more log lines. No more trace configs. You just ask.

[NEXT → SLIDE 10 -- "let me show you"]

Let me show you what this looks like.

[START DEMO]

---

> After demo, advance to slide 11 (closing).

[NEXT → SLIDE 11 -- closing]

Better Brain. Stop writing logs. Start getting answers.

Thank you.
