import { AGENTS } from "@aman-tg/shared";

const BOT_URL = "https://t.me/aman_agent_platform_bot";

export function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%)" }}>
      {/* Hero */}
      <div className="px-6 pt-12 pb-8 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🤖</div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "#c9d1d9" }}>
          aman
        </h1>
        <p className="text-lg mb-1" style={{ color: "#58a6ff" }}>
          Your AI companion that remembers you
        </p>
        <p className="text-sm mb-8" style={{ color: "#8b949e" }}>
          13 specialized AI agents. Persistent memory. One Telegram Mini App.
        </p>
        <a
          href={BOT_URL}
          className="inline-block rounded-full px-8 py-3 text-sm font-semibold transition-transform active:scale-95"
          style={{ background: "#238636", color: "#fff", textDecoration: "none" }}
        >
          Open in Telegram
        </a>
        <p className="text-xs mt-3" style={{ color: "#8b949e" }}>
          Free to use — no sign up required
        </p>
      </div>

      {/* Features */}
      <div className="px-6 py-8 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: "🧠", title: "Remembers You", desc: "Cross-agent memory that persists across sessions" },
            { icon: "⚡", title: "13 Agents", desc: "Coding, education, business, lifestyle, and more" },
            { icon: "📎", title: "Attachments", desc: "Send images, PDFs, and files for AI analysis" },
            { icon: "🔒", title: "Private", desc: "Your data stays in your conversations" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#c9d1d9" }}>{f.title}</div>
              <p className="text-xs leading-relaxed" style={{ color: "#8b949e" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Showcase */}
      <div className="px-6 py-8 max-w-lg mx-auto">
        <h2 className="text-lg font-bold mb-4 text-center" style={{ color: "#c9d1d9" }}>
          Meet Your Agents
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {AGENTS.slice(0, 9).map((agent) => (
            <div key={agent.id} className="rounded-xl p-3 text-center" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <div className="text-2xl mb-1">{agent.icon}</div>
              <div className="text-xs font-semibold" style={{ color: "#c9d1d9" }}>
                {agent.name}
                {agent.premium && " ⭐"}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-3" style={{ color: "#8b949e" }}>
          +{AGENTS.length - 9} more agents available
        </p>
      </div>

      {/* Pricing */}
      <div className="px-6 py-8 max-w-lg mx-auto">
        <h2 className="text-lg font-bold mb-4 text-center" style={{ color: "#c9d1d9" }}>
          Simple Pricing
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="text-sm font-bold mb-1" style={{ color: "#c9d1d9" }}>Free</div>
            <div className="text-2xl font-bold mb-2" style={{ color: "#c9d1d9" }}>$0</div>
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ 10 free agents</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ 30 messages/day</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ Image attachments</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ Persistent memory</p>
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ background: "#161b22", border: "2px solid #f59e0b" }}>
            <div className="text-sm font-bold mb-1" style={{ color: "#f59e0b" }}>Pro ⭐</div>
            <div className="text-2xl font-bold mb-2" style={{ color: "#c9d1d9" }}>100 ⭐</div>
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ All 13 agents</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ Unlimited messages</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ Priority speed</p>
              <p className="text-xs" style={{ color: "#8b949e" }}>✓ Premium agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-12 text-center max-w-lg mx-auto">
        <a
          href={BOT_URL}
          className="inline-block rounded-full px-10 py-4 text-base font-semibold transition-transform active:scale-95"
          style={{ background: "#238636", color: "#fff", textDecoration: "none" }}
        >
          Start Chatting — It's Free
        </a>
        <p className="text-xs mt-4" style={{ color: "#8b949e" }}>
          Built by <a href="https://kooleklabs.com" style={{ color: "#58a6ff", textDecoration: "none" }}>Koolek Labs</a>
        </p>
      </div>
    </div>
  );
}
