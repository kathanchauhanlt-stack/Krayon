import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { generateAndSaveComic, enhanceScene, type GeneratedComic, type Bubble } from "../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const GENRES   = ["Fantasy", "Shonen", "Shojo", "Sci-Fi", "Horror", "Romance", "Action", "Slice of Life", "Mystery", "Cyberpunk", "Noir"];
const STYLES   = ["Manga", "American Comic", "Manhwa", "European Comic", "Chibi", "Noir", "Painted"];
const TONES    = ["Epic & Dramatic", "Dark & Gritty", "Light-hearted", "Emotional & Deep", "Action-packed", "Mysterious", "Romantic", "Comedic"];
const SETTINGS = ["Urban City", "Fantasy World", "Space / Sci-Fi", "Feudal Japan", "Post-Apocalyptic", "School Life", "Underwater", "Ancient Mythology", "Cyberpunk City", "Countryside"];

const PAGE_OPTIONS = [
  { panels: 4,  pages: 1, label: "1 Page",  desc: "4 panels · Quick story",  time: 16 },
  { panels: 8,  pages: 2, label: "2 Pages", desc: "8 panels · Short chapter", time: 32 },
  { panels: 12, pages: 3, label: "3 Pages", desc: "12 panels · Full chapter", time: 48 },
  { panels: 16, pages: 4, label: "4 Pages", desc: "16 panels · Epic chapter", time: 64 },
];

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const labels = ["Story", "Characters & World", "Style & Scale"];
  return (
    <div className="flex flex-col gap-3 mb-8">
      <div style={{ height: 3, background: "rgba(59,73,76,0.4)", borderRadius: 9999, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: "linear-gradient(90deg,#c3f5ff,#f5cd00)", borderRadius: 9999 }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="flex items-center">
        {labels.map((label, i) => {
          const done    = i + 1 < step;
          const current = i + 1 === step;
          const c       = done ? "#4ade80" : current ? "#f5cd00" : "#282a2e";
          return (
            <div key={label} className="flex items-center" style={{ flex: i < labels.length - 1 ? 1 : "none" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${c}`, background: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                {done
                  ? <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#000", fontVariationSettings: "'FILL' 1" }}>check</span>
                  : <span style={{ fontSize: 11, fontWeight: 800, color: current ? "#000" : "#849396", fontFamily: "'Space Mono', monospace" }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 11, fontWeight: current ? 700 : 400, color: done ? "#4ade80" : current ? "#e2e2e8" : "#849396", fontFamily: "'Anybody', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", marginLeft: 6, whiteSpace: "nowrap" }}>
                {label}
              </span>
              {i < labels.length - 1 && (
                <div style={{ flex: 1, height: 1, background: done ? "#4ade80" : "rgba(59,73,76,0.4)", margin: "0 10px", minWidth: 16, transition: "background 0.3s" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chip selector ─────────────────────────────────────────────────────────────
function ChipGroup({ options, value, onChange, accent = "#c3f5ff" }: { options: string[]; value: string; onChange: (v: string) => void; accent?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <motion.button key={opt} onClick={() => onChange(opt)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            style={{ padding: "5px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600, fontFamily: "'Anybody', sans-serif", cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${sel ? accent : "rgba(59,73,76,0.5)"}`, background: sel ? `${accent}18` : "#1e2024", color: sel ? accent : "#849396", boxShadow: sel ? `0 0 12px ${accent}30` : "none" }}>
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Shared card + section header ──────────────────────────────────────────────
function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.4)", borderRadius: "0.875rem", padding: "28px 30px", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, color, title, sub }: { icon: string; color: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 19, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 20, color: "#e2e2e8", textTransform: "uppercase" }}>{title}</h2>
        <p style={{ fontSize: 12, color: "#849396" }}>{sub}</p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: "#bac9cc", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Anybody', sans-serif", marginBottom: 8 }}>{children}</p>;
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function GeneratingOverlay({ stage, panels }: { stage: string; panels: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8 py-24">
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: 100 - i * 24, height: 100 - i * 24, border: `2px solid ${i === 0 ? "#c3f5ff" : i === 1 ? "#ff4b89" : "#f5cd00"}`, opacity: 0.7 - i * 0.15 }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 2.5 + i * 0.7, repeat: Infinity, ease: "linear" }}
          />
        ))}
        <span className="material-symbols-outlined" style={{ fontSize: 34, color: "#c3f5ff", fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
      </div>
      <div className="text-center flex flex-col gap-2">
        <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 22, color: "#e2e2e8", textTransform: "uppercase", letterSpacing: "0.05em" }}>FORGING YOUR COMIC</p>
        <motion.p key={stage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 14, color: "#bac9cc", fontFamily: "'Hanken Grotesk', sans-serif" }}>{stage}</motion.p>
        <p style={{ fontSize: 11, color: "#849396", fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
          {panels} panels · NVIDIA FLUX.2-Klein-4B · ~{panels * 4}s estimated
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: Math.min(panels, 16) }).map((_, i) => (
          <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c3f5ff" }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.3, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: (i * 0.1) % 1.4 }}
          />
        ))}
      </div>
    </motion.div>
  );
}



// ── Bubble preview ────────────────────────────────────────────────────────────
function BubblePreview({ bubble }: { bubble: Bubble }) {
  const cfg: Record<string, { bg: string; border: string; text: string; dashed?: boolean; bold?: boolean }> = {
    speech:  { bg: "#fff",    border: "#111", text: "#111" },
    thought: { bg: "#e8f4ff", border: "#6699cc", text: "#1a3355" },
    shout:   { bg: "#fff700", border: "#111", text: "#111", bold: true },
    whisper: { bg: "#f5f5f5", border: "#aaa",  text: "#555", dashed: true },
    caption: { bg: "#fffbe6", border: "#c8a000", text: "#3a3000" },
  };
  const c = cfg[bubble.type] ?? cfg.speech;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 1, maxWidth: "100%" }}>
      <span style={{ fontSize: 8, fontWeight: 700, color: "#777", fontFamily: "'Space Mono', monospace", textTransform: "uppercase" }}>
        {bubble.character}{bubble.type === "thought" && " 💭"}{bubble.type === "shout" && " ‼"}
      </span>
      <div style={{ background: c.bg, border: `${c.bold ? "2px" : "1.5px"} ${c.dashed ? "dashed" : "solid"} ${c.border}`, borderRadius: bubble.type === "shout" ? 3 : 10, padding: "3px 10px", fontFamily: "'Anybody', sans-serif", fontWeight: c.bold ? 900 : 700, fontSize: c.bold ? 11 : 10, color: c.text, textTransform: c.bold ? "uppercase" : "none", boxShadow: "1px 1px 0 #111" }}>
        {bubble.text}
      </div>
    </div>
  );
}

// ── Panel cell ────────────────────────────────────────────────────────────────
function PanelCell({ panel, idx }: { panel: any; idx: number }) {
  const bubbles: Bubble[] = Array.isArray(panel.bubbles) ? panel.bubbles : [];
  return (
    <div style={{ position: "relative", background: "#111", minHeight: 220, overflow: "hidden", borderRadius: 2 }}>
      <img src={panel.image_url} alt={panel.scene_description ?? `Panel ${idx + 1}`}
        style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      {panel.caption && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(255,255,255,0.97)", borderBottom: "2px solid #000", padding: "3px 8px", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 9, color: "#111" }}>{panel.caption}</div>
      )}
      {panel.sfx && (
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%) rotate(-5deg)", pointerEvents: "none" }}>
          <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 24, color: "#ff2200", WebkitTextStroke: "1.5px #111", textShadow: "2px 2px 0 #111", textTransform: "uppercase" }}>{panel.sfx}</span>
        </div>
      )}
      {bubbles.length > 0 && (
        <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, display: "flex", flexDirection: "column", gap: 3, zIndex: 10 }}>
          {bubbles.slice(0, 2).map((b, bi) => <BubblePreview key={bi} bubble={b} />)}
        </div>
      )}
      {bubbles.length === 0 && panel.dialogue && (
        <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", background: "#fff", border: "2px solid #000", borderRadius: 20, padding: "3px 10px", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 9, color: "#000", whiteSpace: "nowrap", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "2px 2px 0 #000" }}>
          "{panel.dialogue}"
        </div>
      )}
    </div>
  );
}

// ── Multi-page Comic Preview ──────────────────────────────────────────────────
function ComicPreview({ comic, onRead, onNew }: { comic: GeneratedComic; onRead: () => void; onNew: () => void }) {
  const [activePage, setActivePage] = useState(0);
  const totalPages  = comic.pages.length;
  const totalPanels = comic.pages.reduce((a, p) => a + p.panels.length, 0);
  const page        = comic.pages[activePage];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: "clamp(22px,3vw,36px)", color: "#e2e2e8", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1 }}>{comic.title}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {[comic.genre, comic.style].map((tag) => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: "#bac9cc", background: "#282a2e", border: "1px solid rgba(59,73,76,0.5)", padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase" }}>{tag}</span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#f5cd00", background: "rgba(245,205,0,0.08)", border: "1px solid rgba(245,205,0,0.3)", padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase" }}>{totalPanels} Panels · {totalPages} Page{totalPages > 1 ? "s" : ""}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase" }}>✓ Saved</span>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={onNew} className="flex items-center gap-2 cursor-pointer" style={{ padding: "10px 18px", background: "#282a2e", border: "1px solid rgba(59,73,76,0.5)", borderRadius: "0.5rem", color: "#bac9cc", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>New
          </button>
          <button onClick={onRead} className="flex items-center gap-2 cursor-pointer" style={{ padding: "10px 22px", background: "#c3f5ff", border: "2px solid #000", borderRadius: "0.5rem", boxShadow: "3px 3px 0 #000", color: "#00363d", fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>menu_book</span>Read Full
          </button>
        </div>
      </div>

      {/* Comic book */}
      <div style={{ background: "#fff", border: "3px solid #000", borderRadius: "0.5rem", boxShadow: "6px 6px 0 #000", overflow: "hidden", maxWidth: 960, margin: "0 auto" }}>
        {/* Title bar */}
        <div style={{ background: "#111", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 16, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }}>{comic.title}</span>
          <div className="flex items-center gap-3">
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setActivePage(p => Math.max(0, p - 1))} disabled={activePage === 0}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, color: activePage === 0 ? "rgba(255,255,255,0.2)" : "#fff", cursor: activePage === 0 ? "not-allowed" : "pointer", padding: "1px 8px", fontSize: 16, lineHeight: 1.6 }}>‹</button>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>PAGE {activePage + 1} / {totalPages}</span>
                <button onClick={() => setActivePage(p => Math.min(totalPages - 1, p + 1))} disabled={activePage === totalPages - 1}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, color: activePage === totalPages - 1 ? "rgba(255,255,255,0.2)" : "#fff", cursor: activePage === totalPages - 1 ? "not-allowed" : "pointer", padding: "1px 8px", fontSize: 16, lineHeight: 1.6 }}>›</button>
              </div>
            ) : (
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>PAGE 1 / 1</span>
            )}
          </div>
        </div>

        {/* Panel grid with slide transition */}
        {page && (
          <AnimatePresence mode="wait">
            <motion.div key={activePage}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, background: "#333", padding: 3 }}>
              {page.panels.map((panel, i) => <PanelCell key={i} panel={panel} idx={i} />)}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Page thumbnails */}
        {totalPages > 1 && (
          <div style={{ background: "#0c0e12", padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", overflowX: "auto" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", flexShrink: 0, textTransform: "uppercase" }}>Pages:</span>
            {comic.pages.map((_, pi) => (
              <button key={pi} onClick={() => setActivePage(pi)}
                style={{ flexShrink: 0, width: 44, height: 32, borderRadius: 4, border: `2px solid ${pi === activePage ? "#f5cd00" : "rgba(59,73,76,0.5)"}`, background: pi === activePage ? "rgba(245,205,0,0.1)" : "#1e2024", color: pi === activePage ? "#f5cd00" : "#849396", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                {pi + 1}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ background: "#111", padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Krayon Studios · NVIDIA FLUX.2-Klein-4B</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{comic.genre} · {comic.style}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center mt-8">
        <button onClick={onRead} className="flex items-center gap-3 cursor-pointer"
          style={{ padding: "16px 44px", background: "#f5cd00", border: "3px solid #000", borderRadius: "1rem", boxShadow: "4px 4px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          Read Full Comic Book
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Studio — 3-step wizard ───────────────────────────────────────────────
type StudioView = "wizard" | "generating" | "result";
const STYLE_ICONS: Record<string, string> = { "Manga": "🇯🇵", "American Comic": "🦸", "Manhwa": "🇰🇷", "European Comic": "🎨", "Chibi": "🌸", "Noir": "🎬", "Painted": "🖌️" };

export default function Studio() {
  const [step,       setStep]       = useState(1);
  // Step 1
  const [title,      setTitle]      = useState("");
  const [genre,      setGenre]      = useState("Fantasy");
  const [prompt,     setPrompt]     = useState("");
  const [enhancing,  setEnhancing]  = useState(false);
  // Step 2
  const [characters, setCharacters] = useState("");
  const [setting,    setSetting]    = useState("Urban City");
  const [tone,       setTone]       = useState("Epic & Dramatic");
  const [worldNotes, setWorldNotes] = useState("");
  // Step 3
  const [style,      setStyle]      = useState("Manga");
  const [pageOpt,    setPageOpt]    = useState(PAGE_OPTIONS[1]);

  const navigate                    = useNavigate();
  const [view,       setView]       = useState<StudioView>("wizard");
  const [genStage,   setGenStage]   = useState("Initialising...");
  const [error,      setError]      = useState<string | null>(null);
  const [comic,      setComic]      = useState<GeneratedComic | null>(null);

  const handleEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try { const { enhancedText } = await enhanceScene(prompt.trim()); setPrompt(enhancedText); }
    catch { /* silent */ } finally { setEnhancing(false); }
  };

  const handleGenerate = async () => {
    setError(null);
    setView("generating");

    const enrichedPrompt = [
      prompt.trim(),
      characters.trim() ? `\n\nMain characters: ${characters.trim()}` : "",
      worldNotes.trim()  ? `\n\nWorld notes: ${worldNotes.trim()}` : "",
      `\n\nSetting: ${setting}. Tone: ${tone}.`,
    ].join("");

    const stages = [
      "Analysing your story concept…",
      "Building characters and world…",
      "Writing panel script with KRAYON-SENSEI…",
      "Crafting dialogue & speech bubbles…",
      `Generating ${pageOpt.panels} panels via NVIDIA FLUX.2-Klein-4B…`,
      "Composing pages…",
      "Saving your comic book…",
    ];
    let si = 0;
    setGenStage(stages[0]);
    const interval = Math.max(2000, Math.floor((pageOpt.time * 1000) / stages.length));
    const timer = setInterval(() => { si = Math.min(si + 1, stages.length - 1); setGenStage(stages[si]); }, interval);

    try {
      const result = await generateAndSaveComic({ title: title.trim() || "Untitled Comic", genre, style, prompt: enrichedPrompt, panelCount: pageOpt.panels });
      clearInterval(timer);
      setComic(result);
      setView("result");
    } catch (err: any) {
      clearInterval(timer);
      setError(err.message ?? "Generation failed. Is the backend running?");
      setView("wizard");
    }
  };

  const handleReset = () => { setView("wizard"); setComic(null); setError(null); setStep(1); };

  const btnBack = (to: number) => (
    <button onClick={() => setStep(to)} className="flex items-center gap-2 cursor-pointer"
      style={{ padding: "12px 20px", background: "#1e2024", border: "1px solid rgba(59,73,76,0.5)", borderRadius: "0.75rem", color: "#bac9cc", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>Back
    </button>
  );

  return (
    <div className="min-h-full pb-32" style={{ background: "#111317" }}>
      <div className="max-w-screen-lg mx-auto px-4 md:px-6 py-8 md:py-12">

        <div className="mb-6">
          <h1 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: "clamp(30px,5vw,46px)", color: "#e2e2e8", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase" }}>STUDIO</h1>
          <p style={{ color: "#bac9cc", marginTop: 6, fontSize: 14 }}>Build your manga step by step — story, characters, world, and style.</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 rounded-xl flex items-start gap-3"
              style={{ background: "rgba(255,75,75,0.08)", border: "1px solid rgba(255,75,75,0.25)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ffb4ab", flexShrink: 0 }}>error</span>
              <div className="flex-1">
                <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 14, color: "#ffb4ab" }}>Generation Failed</p>
                <p style={{ fontSize: 12, color: "#bac9cc", marginTop: 2 }}>{error}</p>
              </div>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#849396", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {view === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <StepBar step={step} />
              <AnimatePresence mode="wait">

                {/* ━━ STEP 1: Story ━━ */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
                    <Card>
                      <SectionHeader icon="edit_note" color="#c3f5ff" title="Story Concept" sub="What's your story about? The AI writes the complete manga script from this." />
                      <div className="mb-5">
                        <FieldLabel>Comic Title</FieldLabel>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Neon Ronin: Tokyo Drift" className="krayon-input" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }} />
                      </div>
                      <div className="mb-5">
                        <FieldLabel>Genre</FieldLabel>
                        <ChipGroup options={GENRES} value={genre} onChange={setGenre} accent="#c3f5ff" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <FieldLabel>Story Concept <span style={{ color: "#ff4b89" }}>*</span></FieldLabel>
                          <button onClick={handleEnhance} disabled={enhancing || !prompt.trim()}
                            className="flex items-center gap-1.5 cursor-pointer"
                            style={{ padding: "6px 12px", background: "rgba(195,245,255,0.08)", border: "1px solid rgba(195,245,255,0.25)", borderRadius: "0.5rem", color: "#c3f5ff", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 11, textTransform: "uppercase", opacity: !prompt.trim() ? 0.4 : 1 }}>
                            {enhancing ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 13 }}>refresh</span> : <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                            {enhancing ? "Enhancing…" : "AI Enhance"}
                          </button>
                        </div>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                          placeholder={`Describe your ${genre} story — protagonist, setting, conflict, stakes, and tone. The more detail you give, the better the AI writes your manga.\n\ne.g. In Neo-Tokyo 2147, Ryuu is the last samurai protecting the city's data core from UNIT-7's drone army. As the city burns, he faces an impossible choice between honour and survival...`}
                          rows={9} className="krayon-input resize-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: 1.7, fontSize: 14 }} />
                        <p style={{ fontSize: 11, color: "#849396", marginTop: 6, fontFamily: "'Space Mono', monospace" }}>{prompt.length} chars · {genre}</p>
                      </div>
                    </Card>
                    <div className="flex justify-end">
                      <motion.button onClick={() => setStep(2)} disabled={prompt.trim().length < 10} whileHover={prompt.trim().length >= 10 ? { scale: 1.02 } : {}} whileTap={prompt.trim().length >= 10 ? { scale: 0.97 } : {}}
                        className="flex items-center gap-2 cursor-pointer"
                        style={{ padding: "13px 28px", background: prompt.trim().length >= 10 ? "#c3f5ff" : "#282a2e", border: `2px solid ${prompt.trim().length >= 10 ? "#000" : "rgba(59,73,76,0.4)"}`, borderRadius: "0.75rem", boxShadow: prompt.trim().length >= 10 ? "3px 3px 0 #000" : "none", color: prompt.trim().length >= 10 ? "#00363d" : "#849396", fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 14, textTransform: "uppercase", opacity: prompt.trim().length < 10 ? 0.5 : 1, cursor: prompt.trim().length < 10 ? "not-allowed" : "pointer" }}>
                        Next: Characters & World <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ━━ STEP 2: Characters & World ━━ */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
                    <Card>
                      <SectionHeader icon="group" color="#f5cd00" title="Characters & World" sub="Define your cast and setting — all optional but dramatically improves the result." />
                      <div className="mb-5">
                        <FieldLabel>Named Characters <span style={{ fontSize: 10, color: "#849396", fontWeight: 400 }}>(optional)</span></FieldLabel>
                        <input value={characters} onChange={(e) => setCharacters(e.target.value)}
                          placeholder="e.g. Ryuu (silver-haired samurai, stoic and honourable), UNIT-7 (robot villain, cold logic), Kira (hacker ally, witty)"
                          className="krayon-input" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13 }} />
                        <p style={{ fontSize: 11, color: "#849396", marginTop: 5 }}>Format: Name (appearance, personality), Name (description)…</p>
                      </div>
                      <div className="mb-5">
                        <FieldLabel>Setting / Environment</FieldLabel>
                        <ChipGroup options={SETTINGS} value={setting} onChange={setSetting} accent="#f5cd00" />
                      </div>
                      <div className="mb-5">
                        <FieldLabel>Story Tone</FieldLabel>
                        <ChipGroup options={TONES} value={tone} onChange={setTone} accent="#ff4b89" />
                      </div>
                      <div>
                        <FieldLabel>World Notes <span style={{ fontSize: 10, color: "#849396", fontWeight: 400 }}>(optional)</span></FieldLabel>
                        <textarea value={worldNotes} onChange={(e) => setWorldNotes(e.target.value)}
                          placeholder="Recurring locations, cultural details, specific scenes to include, visual references, magic system, tech level, etc."
                          rows={4} className="krayon-input resize-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: 1.6, fontSize: 13 }} />
                      </div>
                    </Card>
                    <div className="flex justify-between">
                      {btnBack(1)}
                      <motion.button onClick={() => setStep(3)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 cursor-pointer"
                        style={{ padding: "13px 28px", background: "#f5cd00", border: "2px solid #000", borderRadius: "0.75rem", boxShadow: "3px 3px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>
                        Next: Style & Scale <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ━━ STEP 3: Style & Scale ━━ */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
                    <Card>
                      <SectionHeader icon="palette" color="#ff4b89" title="Style & Scale" sub="Pick the art style and how many pages to generate." />

                      <div className="mb-7">
                        <FieldLabel>Art Style</FieldLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {STYLES.map((s) => {
                            const sel = style === s;
                            return (
                              <motion.button key={s} onClick={() => setStyle(s)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                style={{ padding: "12px 8px", borderRadius: "0.5rem", border: `2px solid ${sel ? "#ff4b89" : "rgba(59,73,76,0.4)"}`, background: sel ? "rgba(255,75,137,0.1)" : "#282a2e", color: sel ? "#ff4b89" : "#bac9cc", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: sel ? "0 0 16px rgba(255,75,137,0.2)" : "none", textTransform: "uppercase", transition: "all 0.2s" }}>
                                <span style={{ fontSize: 22 }}>{STYLE_ICONS[s] ?? "🎭"}</span>{s}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-6">
                        <FieldLabel>Comic Length</FieldLabel>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {PAGE_OPTIONS.map((opt) => {
                            const sel = pageOpt.panels === opt.panels;
                            return (
                              <motion.button key={opt.panels} onClick={() => setPageOpt(opt)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                style={{ padding: "14px 8px", borderRadius: "0.625rem", border: `2px solid ${sel ? "#c3f5ff" : "rgba(59,73,76,0.4)"}`, background: sel ? "rgba(195,245,255,0.1)" : "#282a2e", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxShadow: sel ? "0 0 20px rgba(195,245,255,0.15),3px 3px 0 #000" : "none", transition: "all 0.2s" }}>
                                <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 22, color: sel ? "#c3f5ff" : "#e2e2e8" }}>{opt.label}</span>
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: sel ? "#a0d8e8" : "#849396" }}>{opt.desc}</span>
                                <span style={{ fontSize: 10, color: "#f5cd00", fontFamily: "'Space Mono', monospace", marginTop: 2, opacity: sel ? 1 : 0.5 }}>~{opt.time}s</span>
                              </motion.button>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: 11, color: "#849396", marginTop: 8, fontFamily: "'Space Mono', monospace" }}>4 panels per page · {pageOpt.panels} panels total · NVIDIA FLUX.2-Klein-4B</p>
                      </div>

                      {/* Summary */}
                      <div className="p-4 rounded-xl" style={{ background: "rgba(195,245,255,0.04)", border: "1px solid rgba(195,245,255,0.1)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#c3f5ff", fontFamily: "'Anybody', sans-serif", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>📋 Comic Summary</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[["Title", title || "(untitled)"], ["Genre", genre], ["Tone", tone], ["Setting", setting], ["Style", style], ["Length", pageOpt.label], ["Panels", String(pageOpt.panels)], ["Characters", characters.trim() ? characters.slice(0, 28) + (characters.length > 28 ? "…" : "") : "AI-generated"]].map(([k, v]) => (
                            <div key={k} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px" }}>
                              <p style={{ fontSize: 9, color: "#849396", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>{k}</p>
                              <p style={{ fontSize: 12, color: "#e2e2e8", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, lineHeight: 1.3 }}>{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <div className="flex justify-between items-center">
                      {btnBack(2)}
                      <motion.button onClick={handleGenerate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 cursor-pointer"
                        style={{ padding: "15px 36px", background: "#f5cd00", border: "3px solid #000", borderRadius: "0.875rem", boxShadow: "4px 4px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 16, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                        Forge Comic · {pageOpt.panels} Panels
                      </motion.button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

          {view === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GeneratingOverlay stage={genStage} panels={pageOpt.panels} />
            </motion.div>
          )}

          {view === "result" && comic && (
            <ComicPreview comic={comic} onRead={() => navigate(`/reader/${comic.comicId}`)} onNew={handleReset} />
          )}

        </AnimatePresence>
      </div>

      <footer className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 mt-8"
        style={{ borderTop: "1px solid rgba(59,73,76,0.3)", background: "#0c0e12", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 16, color: "#e2e2e8", letterSpacing: "-0.05em" }}>KRAYON</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <p style={{ color: "rgba(255,177,195,0.6)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>© 2024 KRAYON STUDIOS</p>
        </div>
        <div className="flex gap-6" style={{ letterSpacing: "0.08em" }}>
          {["Terms", "Privacy", "Support"].map((l) => (
            <a key={l} href="#" style={{ color: "rgba(186,201,204,0.7)", textDecoration: "none", textTransform: "uppercase" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

