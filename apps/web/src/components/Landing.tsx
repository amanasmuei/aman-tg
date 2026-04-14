import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTS } from "@aman-tg/shared";

const BOT_URL = "https://t.me/aman_agent_platform_bot";

/* ---------- Small hooks ---------- */

function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function useCursorHalo<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);
  return ref;
}

/* ---------- Demo chat: shows "memory" across agents ---------- */

type Demo = { icon: string; name: string; you: string; reply: string };

const DEMOS: Demo[] = [
  {
    icon: "💻",
    name: "Code Buddy",
    you: "my promise chain is leaking again",
    reply:
      "Same shape as Monday's — missing `.finally()` on the fetch in api.ts:42. I kept the stack you pasted.",
  },
  {
    icon: "🇲🇾",
    name: "Cikgu Bahasa",
    you: "semak karangan saya",
    reply:
      "Ayat pembuka lebih tajam dari draf lepas. Cuma \"pada masa yang sama\" — awak cuba elak minggu lepas.",
  },
  {
    icon: "📋",
    name: "Daily Planner",
    you: "what's left for today?",
    reply:
      "Tiga daripada lima selesai. Sesi gym Rabu yang awak skip — nak saya pindahkan ke pagi esok?",
  },
];

function useTypingCycle(demos: Demo[]) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding">("typing");

  useEffect(() => {
    const target = demos[i].reply;
    if (phase === "typing") {
      if (typed.length < target.length) {
        const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 22);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("holding"), 2600);
      return () => clearTimeout(t);
    }
    // holding → next
    const t = setTimeout(() => {
      setI((prev) => (prev + 1) % demos.length);
      setTyped("");
      setPhase("typing");
    }, 1400);
    return () => clearTimeout(t);
  }, [i, typed, phase, demos]);

  return { demo: demos[i], typed, isTyping: phase === "typing" && typed.length < demos[i].reply.length };
}

/* ---------- Component ---------- */

export function Landing() {
  const heroRef = useCursorHalo<HTMLDivElement>();
  const { demo, typed, isTyping } = useTypingCycle(DEMOS);

  const rememberRef = useReveal<HTMLDivElement>();
  const agentsRef = useReveal<HTMLDivElement>();
  const pricingRef = useReveal<HTMLDivElement>();
  const footerRef = useReveal<HTMLDivElement>();
  const threadRef = useReveal<SVGSVGElement>();

  const featured = useMemo(() => AGENTS.slice(0, 12), []);

  return (
    <div className="landing">
      {/* ======== NAV ======== */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 pt-6 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <span className="display text-2xl" style={{ fontVariationSettings: '"opsz" 144, "wght" 460' }}>
            aman
          </span>
          <span className="text-[10px] mono uppercase tracking-[0.28em]" style={{ color: "var(--ink-hint)" }}>
            by koolek labs
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="#memory" className="sweep" style={{ color: "var(--ink-soft)" }}>
            Memory
          </a>
          <a href="#agents" className="sweep" style={{ color: "var(--ink-soft)" }}>
            Agents
          </a>
          <a href="#pricing" className="sweep" style={{ color: "var(--ink-soft)" }}>
            Pricing
          </a>
          <a href={BOT_URL} className="btn-ink text-sm" style={{ padding: "0.6rem 1.1rem" }}>
            Open in Telegram
            <span aria-hidden>→</span>
          </a>
        </div>
      </nav>

      {/* ======== HERO ======== */}
      <section
        ref={heroRef}
        id="top"
        className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-12 md:pt-20 pb-20 md:pb-28"
      >
        <div className="halo" />
        <div className="relative z-10 grid md:grid-cols-12 gap-10 md:gap-14 items-center">
          {/* Left: editorial headline */}
          <div className="md:col-span-7">
            <div className="kicker mb-5">◊ &nbsp; Telegram &middot; Mini App &middot; 2026</div>
            <h1
              className="display leading-[0.95] text-[3.2rem] sm:text-[4.2rem] md:text-[5.4rem]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 380' }}
            >
              An AI that
              <br />
              <em
                className="not-italic"
                style={{
                  fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 340',
                  fontStyle: "italic",
                  color: "var(--forest)",
                }}
              >
                remembers
              </em>{" "}
              you.
            </h1>
            <p
              className="mt-7 max-w-lg text-lg leading-relaxed"
              style={{ color: "var(--ink-soft)" }}
            >
              Thirteen specialists — a coding partner, a <span className="italic">cikgu</span>, a
              planner, a chef — sharing one quiet memory of who you are and what you're working on.
              All inside Telegram. <em>Aman</em> means peace; we'd like your tools to feel that way.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href={BOT_URL} className="btn-ink">
                Start chatting — free
                <span aria-hidden>↗</span>
              </a>
              <a href="#memory" className="btn-ghost">How the memory works</a>
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs" style={{ color: "var(--ink-hint)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--forest)" }} />
              <span>Live for Malaysian users · BM &amp; EN · No sign-up</span>
            </div>
          </div>

          {/* Right: live-typing chat mock */}
          <div className="md:col-span-5">
            <div
              className="relative rounded-[22px] p-5 md:p-6"
              style={{
                background: "var(--card)",
                border: "1px solid var(--rule)",
                boxShadow:
                  "0 30px 80px -40px rgba(27,26,23,0.35), 0 2px 0 rgba(255,255,255,0.6) inset",
              }}
            >
              {/* window chrome */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-hint)" }}>
                  <span
                    className="inline-flex w-8 h-8 rounded-full items-center justify-center text-base"
                    style={{ background: "var(--paper-deep)" }}
                  >
                    {demo.icon}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                      {demo.name}
                    </div>
                    <div className="mono text-[10px] uppercase tracking-[0.2em]">Remembering · online</div>
                  </div>
                </div>
                <div className="flex gap-1.5" aria-hidden>
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--forest)" }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--sun)" }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--terracotta)" }} />
                </div>
              </div>

              {/* conversation */}
              <div className="space-y-3 min-h-[220px]">
                <div
                  key={`you-${demo.name}`}
                  className="bubble-rise self-end ml-auto max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                  style={{ background: "var(--forest)", color: "var(--paper)" }}
                >
                  {demo.you}
                </div>
                <div
                  key={`reply-${demo.name}`}
                  className="bubble-rise max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: "var(--paper-deep)",
                    color: "var(--ink)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {typed}
                  {isTyping && <span className="caret" aria-hidden />}
                </div>
              </div>

              {/* memory recall tag */}
              <div
                className="mt-5 pt-4 flex items-center gap-2 text-[11px]"
                style={{ borderTop: "1px dashed var(--rule)", color: "var(--ink-hint)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 2a9 9 0 1 0 9 9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span>
                  Recalled from <span className="mono" style={{ color: "var(--forest)" }}>{demo.name.toLowerCase()}</span>{" "}
                  earlier this week
                </span>
              </div>
            </div>

            {/* floating agent marks around the card */}
            <div
              aria-hidden
              className="absolute -top-3 -left-3 rounded-full w-10 h-10 flex items-center justify-center text-lg"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--rule)",
                boxShadow: "0 8px 20px -10px rgba(27,26,23,0.25)",
              }}
            >
              ✦
            </div>
            <div
              aria-hidden
              className="absolute -bottom-4 -right-2 rounded-full px-3 py-1.5 text-[11px] mono uppercase tracking-[0.18em]"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                boxShadow: "0 8px 20px -10px rgba(27,26,23,0.45)",
              }}
            >
              13 agents · 1 memory
            </div>
          </div>
        </div>
      </section>

      {/* ======== MEMORY SECTION ======== */}
      <section
        id="memory"
        ref={rememberRef}
        className="reveal relative max-w-6xl mx-auto px-6 lg:px-10 py-20 md:py-28"
      >
        <div
          aria-hidden
          className="absolute inset-x-6 top-0 h-px"
          style={{ background: "var(--rule)" }}
        />

        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="kicker mb-4">✦ &nbsp; What makes it different</div>
            <h2
              className="display leading-[1.02] text-[2.4rem] md:text-[3.2rem]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400' }}
            >
              One memory,
              <br />
              <em className="not-italic italic" style={{ color: "var(--terracotta)" }}>
                thirteen voices.
              </em>
            </h2>
            <p className="mt-5 text-base leading-relaxed max-w-sm" style={{ color: "var(--ink-soft)" }}>
              Most AI apps forget you by Friday. aman threads a single private memory through every
              agent — so your chef knows you're cutting sugar, your planner knows your Monday is
              always heavy, your <em>cikgu</em> knows the word you kept getting wrong last week.
            </p>
          </div>

          <div className="md:col-span-8 relative">
            {/* three-column narrative connected by an SVG thread */}
            <svg
              ref={threadRef}
              className="thread absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 800 260"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M 80 60 C 220 40, 260 220, 400 130 S 620 40, 720 190"
                fill="none"
                stroke="var(--forest)"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
              {[
                {
                  day: "Monday",
                  icon: "💻",
                  label: "Code Buddy",
                  body: "You paste a stack trace from the checkout flow. It logs the fix to memory.",
                },
                {
                  day: "Wednesday",
                  icon: "📋",
                  label: "Daily Planner",
                  body: "Planner reminds you: the checkout test you marked shaky on Monday is still open.",
                },
                {
                  day: "Friday",
                  icon: "🧠",
                  label: "Any agent",
                  body: "You ask any agent for a status. They already know what shipped and what didn't.",
                },
              ].map((s, idx) => (
                <div
                  key={s.day}
                  className="reveal rounded-2xl p-5"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--rule)",
                    // @ts-expect-error — CSS variable
                    "--reveal-delay": `${idx * 150}ms`,
                  }}
                >
                  <div className="mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--forest)" }}>
                    {s.day}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======== AGENT INDEX ======== */}
      <section
        id="agents"
        ref={agentsRef}
        className="reveal relative py-20 md:py-28"
        style={{ background: "var(--paper-deep)" }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
            <div>
              <div className="kicker mb-3">◈ &nbsp; The cast</div>
              <h2
                className="display text-[2.4rem] md:text-[3.2rem] leading-[1.02]"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400' }}
              >
                Thirteen specialists.
                <br />
                <em className="not-italic italic" style={{ color: "var(--forest)" }}>
                  Pick whoever fits the moment.
                </em>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Each agent is a single-minded personality — direct, opinionated, shaped for one
              thing — not another generic assistant with a different colour.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {featured.map((agent, idx) => (
              <a
                key={agent.id}
                href={BOT_URL}
                className="agent-card group relative rounded-2xl p-5 flex flex-col"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--rule)",
                  minHeight: "170px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: "var(--paper-deep)" }}
                  >
                    {agent.icon}
                  </div>
                  {agent.premium && (
                    <span
                      className="mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                      style={{
                        background: "var(--ink)",
                        color: "var(--paper)",
                      }}
                    >
                      Pro
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div
                    className="display text-xl"
                    style={{ fontVariationSettings: '"opsz" 36, "wght" 500' }}
                  >
                    {agent.name}
                  </div>
                  <p
                    className="mt-1.5 text-[13px] leading-snug line-clamp-2"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {agent.description}
                  </p>
                </div>
                <div
                  className="mt-auto pt-4 flex items-center justify-between text-[11px]"
                  style={{ color: "var(--ink-hint)" }}
                >
                  <span className="mono uppercase tracking-[0.2em]">{agent.category}</span>
                  <span
                    className="transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--forest)" }}
                  >
                    Chat →
                  </span>
                </div>

                {/* decorative corner */}
                <span
                  aria-hidden
                  className="absolute top-0 right-0 w-10 h-10 overflow-hidden rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--forest)" }}
                >
                  <span className="absolute top-2 right-2 text-xs mono">✦</span>
                </span>
              </a>
            ))}
          </div>

          {AGENTS.length > featured.length && (
            <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-hint)" }}>
              and {AGENTS.length - featured.length} more waiting inside the app.
            </p>
          )}
        </div>
      </section>

      {/* ======== PRICING ======== */}
      <section
        id="pricing"
        ref={pricingRef}
        className="reveal max-w-6xl mx-auto px-6 lg:px-10 py-20 md:py-28"
      >
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="kicker mb-3">※ &nbsp; Pricing</div>
            <h2
              className="display text-[2.4rem] md:text-[3rem] leading-[1.02]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400' }}
            >
              Free by default.
              <br />
              <em className="not-italic italic" style={{ color: "var(--terracotta)" }}>
                Pro when you need more.
              </em>
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              No trials, no credit cards, no dark patterns. Pay with Telegram Stars — ten seconds,
              one tap.
            </p>
          </div>

          <div className="md:col-span-8 grid sm:grid-cols-2 gap-5">
            <PricingCard
              label="Free"
              price="0"
              priceUnit="always"
              accent="var(--forest)"
              features={[
                "10 core agents",
                "30 messages a day",
                "Image & file attachments",
                "Persistent memory across agents",
              ]}
              cta="Start free"
              href={BOT_URL}
            />
            <PricingCard
              label="Pro"
              price="100"
              priceUnit="Telegram Stars / month"
              highlighted
              accent="var(--terracotta)"
              features={[
                "Every agent, including premium",
                "Unlimited messages",
                "Priority model routing",
                "Longer memory context",
              ]}
              cta="Go Pro"
              href={BOT_URL}
            />
          </div>
        </div>
      </section>

      {/* ======== CULTURE / CTA ======== */}
      <section
        ref={footerRef}
        className="reveal relative py-24 md:py-32"
        style={{
          background:
            "radial-gradient(800px 400px at 50% 20%, rgba(47,74,58,0.08), transparent 70%), var(--paper)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <div className="ornament justify-center mb-6">
            <span>◊</span>
            <span className="mono text-[11px] uppercase tracking-[0.3em]">Dibuat di Kuala Lumpur</span>
            <span>◊</span>
          </div>
          <h2
            className="display text-[2.8rem] md:text-[4rem] leading-[1]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 380' }}
          >
            Bring your
            <br />
            <em
              className="not-italic italic"
              style={{ color: "var(--forest)" }}
            >
              quiet work
            </em>{" "}
            here.
          </h2>
          <p
            className="mt-6 max-w-lg mx-auto text-base leading-relaxed"
            style={{ color: "var(--ink-soft)" }}
          >
            Open Telegram, find aman, and start. Your first conversation is free. Your thirteenth
            one will know you better than a blank prompt ever could.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <a href={BOT_URL} className="btn-ink">
              Open in Telegram
              <span aria-hidden>↗</span>
            </a>
            <a href="#top" className="btn-ghost">Back to top</a>
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer
        className="relative border-t text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-hint)" }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="display text-lg" style={{ fontVariationSettings: '"opsz" 144, "wght" 460' }}>
              aman
            </span>
            <span className="mono text-[11px] uppercase tracking-[0.25em]">v2 · 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://kooleklabs.com"
              className="sweep"
              style={{ color: "var(--ink-soft)" }}
            >
              Koolek Labs
            </a>
            <a href={BOT_URL} className="sweep" style={{ color: "var(--ink-soft)" }}>
              Telegram
            </a>
            <span className="mono text-[11px]" style={{ color: "var(--ink-hint)" }}>
              Peace, built quietly.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Pricing card ---------- */

interface PricingCardProps {
  label: string;
  price: string;
  priceUnit: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  accent: string;
}

function PricingCard({
  label,
  price,
  priceUnit,
  features,
  cta,
  href,
  highlighted,
  accent,
}: PricingCardProps) {
  return (
    <div
      className="relative rounded-2xl p-6 md:p-7 flex flex-col"
      style={{
        background: highlighted ? "var(--ink)" : "var(--card)",
        color: highlighted ? "var(--paper)" : "var(--ink)",
        border: `1px solid ${highlighted ? "transparent" : "var(--rule)"}`,
        boxShadow: highlighted
          ? "0 30px 80px -40px rgba(27,26,23,0.6)"
          : "0 1px 0 rgba(255,255,255,0.6) inset",
      }}
    >
      {highlighted && (
        <span
          className="absolute -top-3 left-6 mono text-[10px] uppercase tracking-[0.25em] px-2.5 py-1 rounded-full"
          style={{ background: accent, color: "var(--paper)" }}
        >
          Recommended
        </span>
      )}
      <div className="flex items-baseline justify-between">
        <div
          className="display text-2xl"
          style={{
            fontVariationSettings: '"opsz" 36, "wght" 500',
            color: highlighted ? "var(--paper)" : accent,
          }}
        >
          {label}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="display text-5xl"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400' }}
        >
          {price}
        </span>
        <span
          className="mono text-[11px] uppercase tracking-[0.2em]"
          style={{ opacity: 0.7 }}
        >
          {priceUnit}
        </span>
      </div>

      <ul className="mt-6 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span
              className="mt-1 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: highlighted ? accent : "var(--forest)" }}
            />
            <span style={{ opacity: 0.92 }}>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className="mt-8 rounded-full text-sm font-medium text-center py-3 transition-transform active:scale-[0.98]"
        style={{
          background: highlighted ? "var(--paper)" : "var(--ink)",
          color: highlighted ? "var(--ink)" : "var(--paper)",
          textDecoration: "none",
          letterSpacing: "0.01em",
        }}
      >
        {cta} ↗
      </a>
    </div>
  );
}
