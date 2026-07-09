import { motion } from "motion/react";
import { Sparkles, Shield, Compass, Sword, Star, Zap } from "lucide-react";

const CARDS = [
  {
    id: "forge",
    icon: Sword,
    title: "The Forge",
    desc: "Forge dynamic panels and epic storylines using our powerful AI tools.",
    bg: "#f47c20",
    accent: "#f5c518",
  },
  {
    id: "realm",
    icon: Compass,
    title: "The Realm",
    desc: "Explore vast worlds built by fellow creators in the Krayon community.",
    bg: "#1a9faa",
    accent: "#f8f4e8",
  },
  {
    id: "guild",
    icon: Shield,
    title: "The Guild",
    desc: "Climb the ranks and earn your place among the greatest storytellers.",
    bg: "#c0392b",
    accent: "#f5c518",
  },
  {
    id: "vault",
    icon: Star,
    title: "The Vault",
    desc: "Archive your comics and manage your body of work in the secure vault.",
    bg: "#6c3fc5",
    accent: "#f5c518",
  },
];

export default function AboutUs() {
  return (
    <div
      className="h-full w-full overflow-y-auto custom-scrollbar relative"
      style={{ color: "#f8f4e8" }}
    >
      {/* ── decorative corner elements ── */}
      <div
        className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(244,124,32,0.3) 0%, transparent 60%)",
          borderBottom: "3px solid rgba(244,124,32,0.2)",
          borderRight: "3px solid rgba(244,124,32,0.2)",
        }}
      />
      <div
        className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(225deg, rgba(26,159,170,0.3) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10 pt-8 pb-32 px-6 flex flex-col gap-16">

        {/* ── HERO HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="text-center flex flex-col items-center gap-6"
        >
          {/* Main title splash */}
          <div className="relative inline-block">
            {/* Background starburst */}
            <div
              className="absolute -inset-6"
              style={{
                background: "radial-gradient(ellipse at center, rgba(245,197,24,0.35) 0%, rgba(244,124,32,0.2) 40%, transparent 70%)",
              }}
            />
            <div
              className="relative px-10 py-5 -rotate-1"
              style={{
                background: "linear-gradient(135deg, #c0392b 0%, #f47c20 100%)",
                border: "5px solid #111",
                boxShadow: "10px 10px 0 #111",
              }}
            >
              <h1
                style={{
                  fontFamily: "'Bangers', cursive",
                  fontSize: "clamp(3rem, 8vw, 5.5rem)",
                  letterSpacing: "0.12em",
                  color: "#f8f4e8",
                  textShadow: "4px 4px 0 #111, 0 0 30px rgba(245,197,24,0.4)",
                  lineHeight: 1.05,
                  margin: 0,
                }}
              >
                WELCOME TO<br />
                <span style={{ color: "#f5c518" }}>Krayon</span>
              </h1>
            </div>
          </div>

          {/* Sub-tagline box */}
          <div
            className="rotate-1 max-w-xl"
            style={{
              background: "#f8f4e8",
              border: "4px solid #111",
              boxShadow: "6px 6px 0 #111",
              padding: "14px 24px",
            }}
          >
            <p
              className="font-black text-lg"
              style={{ color: "#111", letterSpacing: "0.03em", lineHeight: 1.4 }}
            >
              Where epic fantasy narratives meet the limitless power of
              AI-driven comic creation.
            </p>
          </div>

          {/* Action word decorations */}
          <div className="flex gap-4 flex-wrap justify-center">
            {[
              { text: "CREATE!", color: "#f47c20" },
              { text: "EXPLORE!", color: "#1a9faa" },
              { text: "CONQUER!", color: "#f5c518" },
            ].map(({ text, color }) => (
              <span
                key={text}
                style={{
                  fontFamily: "'Bangers', cursive",
                  fontSize: "1.5rem",
                  letterSpacing: "0.1em",
                  color,
                  WebkitTextStroke: "2px #111",
                  textShadow: "3px 3px 0 #111",
                }}
              >
                {text}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── FEATURE CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {CARDS.map(({ id, icon: Icon, title, desc, bg, accent }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 200, damping: 20 }}
              className="group cursor-pointer"
            >
              <div
                style={{
                  background: "rgba(10,10,12,0.8)",
                  border: "4px solid #111",
                  boxShadow: `6px 6px 0 #111`,
                  overflow: "hidden",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translate(-3px,-3px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "9px 9px 0 #111";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "6px 6px 0 #111";
                }}
              >
                {/* Coloured header strip */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${bg} 0%, ${accent}44 100%)`,
                    borderBottom: "4px solid #111",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {/* Icon box */}
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      background: "#111",
                      border: "3px solid #f8f4e8",
                      boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transform: "rotate(-6deg)",
                    }}
                  >
                    <Icon size={30} style={{ color: bg }} strokeWidth={2.5} />
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Bangers', cursive",
                      fontSize: "2rem",
                      letterSpacing: "0.1em",
                      color: "#f8f4e8",
                      textShadow: "2px 2px 0 #111",
                      margin: 0,
                    }}
                  >
                    {title.toUpperCase()}
                  </h3>
                </div>

                {/* Body */}
                <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ color: "#f8f4e8", fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                    {desc}
                  </p>

                  {/* Halftone separator */}
                  <div
                    style={{
                      height: 6,
                      background: `repeating-linear-gradient(90deg, ${bg} 0px, ${bg} 8px, transparent 8px, transparent 12px)`,
                      border: "2px solid #111",
                    }}
                  />

                  {/* CTA */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Zap size={16} style={{ color: bg }} />
                    <span
                      style={{
                        fontFamily: "'Bangers', cursive",
                        fontSize: "1rem",
                        letterSpacing: "0.08em",
                        color: bg,
                        textShadow: "1px 1px 0 #111",
                      }}
                    >
                      ENTER {id.toUpperCase()} →
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── STATS ROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { val: "10K+", label: "COMICS FORGED" },
            { val: "4.2K", label: "ACTIVE CREATORS" },
            { val: "∞",    label: "POSSIBILITIES"  },
          ].map(({ val, label }, i) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                background: i === 0 ? "#f47c20" : i === 1 ? "#1a9faa" : "#c0392b",
                border: "4px solid #111",
                boxShadow: "5px 5px 0 #111",
                padding: "16px 8px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bangers', cursive",
                  fontSize: "2.5rem",
                  color: "#f8f4e8",
                  textShadow: "2px 2px 0 #111",
                  letterSpacing: "0.05em",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "'Bangers', cursive",
                  fontSize: "0.85rem",
                  letterSpacing: "0.12em",
                  color: "#111",
                  fontWeight: 900,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
