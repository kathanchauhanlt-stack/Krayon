import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { readComic, type ReaderPage, type ReaderPanel, type Bubble } from "../services/api";

// ── Speech Bubble Components ──────────────────────────────────────────────────

function SpeechBubble({ bubble, align = "left" }: { bubble: Bubble; align?: "left" | "right" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: align === "right" ? "flex-end" : "flex-start",
      maxWidth: "70%",
    }}>
      <span style={{
        fontSize: 9, fontWeight: 800, color: "#444",
        fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.06em",
        paddingLeft: align === "right" ? 0 : 10,
        paddingRight: align === "right" ? 10 : 0,
        marginBottom: 2,
      }}>
        {bubble.character}
      </span>
      <div style={{
        background: "#fff",
        border: "2.5px solid #111",
        borderRadius: align === "right" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        padding: "6px 14px",
        fontFamily: "'Anybody', sans-serif",
        fontWeight: 700, fontSize: 12, color: "#111",
        lineHeight: 1.4, wordBreak: "break-word",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.6)",
        maxWidth: "100%",
      }}>
        {bubble.text}
      </div>
    </div>
  );
}

function ThoughtBubble({ bubble }: { bubble: Bubble }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "65%" }}>
      <span style={{
        fontSize: 9, fontWeight: 700, color: "#555", fontStyle: "italic",
        fontFamily: "'Space Mono', monospace", textTransform: "uppercase",
        paddingLeft: 12, marginBottom: 1, letterSpacing: "0.05em",
      }}>
        {bubble.character}…
      </span>
      <div style={{ display: "flex", gap: 3, paddingLeft: 14, marginBottom: 3 }}>
        {[5, 7, 9].map((s, i) => (
          <div key={i} style={{ width: s, height: s, background: "#fff", border: "2px solid #333", borderRadius: "50%" }} />
        ))}
      </div>
      <div style={{
        background: "rgba(240,248,255,0.97)",
        border: "2.5px solid #333",
        borderRadius: "50% / 60% 60% 40% 40%",
        padding: "7px 16px",
        fontFamily: "'Anybody', sans-serif", fontWeight: 600,
        fontSize: 11, color: "#222", lineHeight: 1.4,
        fontStyle: "italic", wordBreak: "break-word",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
      }}>
        {bubble.text}
      </div>
    </div>
  );
}

function ShoutBubble({ bubble, align = "left" }: { bubble: Bubble; align?: "left" | "right" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: align === "right" ? "flex-end" : "flex-start",
      maxWidth: "75%",
    }}>
      <span style={{
        fontSize: 9, fontWeight: 800, color: "#c00",
        fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.05em",
        paddingLeft: align === "right" ? 0 : 6, marginBottom: 2,
      }}>
        {bubble.character} !!
      </span>
      <div style={{
        background: "#fff700",
        border: "3px solid #111",
        borderRadius: 6,
        padding: "5px 16px",
        fontFamily: "'Anybody', sans-serif",
        fontWeight: 900, fontSize: 13, color: "#111",
        textTransform: "uppercase", letterSpacing: "0.02em",
        boxShadow: "3px 3px 0 #111, -1px -1px 0 #555",
        wordBreak: "break-word",
        clipPath: "polygon(2% 8%, 8% 2%, 50% 0%, 92% 2%, 98% 8%, 100% 50%, 98% 92%, 92% 98%, 50% 100%, 8% 98%, 2% 92%, 0% 50%)",
        minWidth: 70, textAlign: "center",
      }}>
        {bubble.text}
      </div>
    </div>
  );
}

function SfxText({ sfx }: { sfx: string }) {
  return (
    <div style={{
      position: "absolute", top: "28%", left: "50%",
      transform: "translate(-50%, -50%) rotate(-7deg)",
      pointerEvents: "none", zIndex: 20,
    }}>
      <span style={{
        fontFamily: "'Anybody', sans-serif",
        fontWeight: 900,
        fontSize: "clamp(22px, 6vw, 44px)",
        color: "#ff2200",
        textTransform: "uppercase",
        letterSpacing: "-0.02em",
        WebkitTextStroke: "2px #111",
        textShadow: "4px 4px 0 #111, -1px -1px 0 #111, 2px -1px 0 #111",
        whiteSpace: "nowrap",
        display: "block",
      }}>
        {sfx}
      </span>
    </div>
  );
}

// ── Panel with auto-retry image loading ───────────────────────────────────────
function PanelCell({ panel, index }: { panel: ReaderPanel; index: number }) {
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [imgError,  setImgError]    = useState(false);
  const [retrySrc,  setRetrySrc]    = useState(panel.image_url ?? "");
  const retryCount                  = useRef(0);
  const retryTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-retry every 8 seconds if image not yet loaded (Pollinations can be slow)
  useEffect(() => {
    if (imgLoaded || imgError || !panel.image_url) return;
    retryTimer.current = setTimeout(() => {
      if (!imgLoaded && retryCount.current < 6) {
        retryCount.current++;
        // Add cache-busting param to force re-fetch
        const sep = panel.image_url!.includes("?") ? "&" : "?";
        setRetrySrc(`${panel.image_url}${sep}_r=${retryCount.current}`);
      }
    }, 8000);
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [imgLoaded, imgError, retrySrc, panel.image_url]);

  // Normalise bubbles
  const bubbles: Bubble[] = Array.isArray(panel.bubbles) && panel.bubbles.length > 0
    ? panel.bubbles
    : (() => {
        try {
          if (panel.bubbles_json) return JSON.parse(panel.bubbles_json);
        } catch {}
        // Legacy single dialogue fallback
        if (panel.dialogue) return [{ character: "—", type: "speech" as const, text: panel.dialogue }];
        return [];
      })();

  const sfx     = panel.sfx ?? null;
  const caption = panel.caption ?? null;

  const PANEL_H = 340;

  return (
    <div style={{
      position: "relative",
      background: "#1a1c22",
      overflow: "hidden",
      minHeight: PANEL_H,
      border: "none",
    }}>
      {/* Shimmer while loading */}
      {!imgLoaded && !imgError && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(110deg, #1a1c22 30%, #252830 50%, #1a1c22 70%)",
          backgroundSize: "200% 100%",
          animation: "panelShimmer 1.8s ease-in-out infinite",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #2a2d38",
            borderTop: "3px solid #4a5068", borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9,
            color: "#3a3d4a", textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Generating image…
          </span>
        </div>
      )}

      {/* The actual panel image */}
      {retrySrc && !imgError && (
        <img
          key={retrySrc}
          src={retrySrc}
          alt={caption ?? `Panel ${index + 1}`}
          style={{
            width: "100%",
            height: PANEL_H,
            objectFit: "cover",
            display: "block",
            filter: "saturate(1.1) contrast(1.06)",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
          onLoad={() => { setImgLoaded(true); if (retryTimer.current) clearTimeout(retryTimer.current); }}
          onError={() => {
            if (retryCount.current >= 6) setImgError(true);
          }}
        />
      )}

      {/* Error fallback — show scene description as artistic text */}
      {imgError && (
        <div style={{
          height: PANEL_H, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #1a2030 50%, #0d1117 100%)",
          padding: "24px 20px", textAlign: "center", gap: 12,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#2a3050" }}>broken_image</span>
          <p style={{
            fontFamily: "'Anybody', sans-serif", fontWeight: 700,
            fontSize: 11, color: "#3a4560", lineHeight: 1.5,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {panel.scene_description?.slice(0, 80) || `Panel ${index + 1}`}
          </p>
        </div>
      )}

      {/* Caption narration strip at TOP of panel */}
      {caption && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 15,
          background: "rgba(255,255,255,0.97)",
          borderBottom: "2.5px solid #111",
          padding: "5px 12px",
          fontFamily: "'Anybody', sans-serif",
          fontWeight: 700, fontSize: 10.5, color: "#111",
          lineHeight: 1.4, letterSpacing: "0.01em",
        }}>
          {caption}
        </div>
      )}

      {/* Sound effects overlaid */}
      {sfx && <SfxText sfx={sfx} />}

      {/* Speech / thought / shout bubbles — bottom of panel */}
      {bubbles.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 5,
          zIndex: 16,
        }}>
          {bubbles.map((b, i) => {
            const align = i % 2 === 0 ? "left" : "right";
            return (
              <div key={i} style={{
                display: "flex",
                justifyContent: align === "right" ? "flex-end" : "flex-start",
              }}>
                {b.type === "thought"
                  ? <ThoughtBubble bubble={b} />
                  : b.type === "shout"
                  ? <ShoutBubble bubble={b} align={align} />
                  : <SpeechBubble bubble={b} align={align} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Comic page layout ─────────────────────────────────────────────────────────
function ComicPage({ page, pageNum, totalPages, direction }: {
  page: ReaderPage; pageNum: number; totalPages: number; direction: number;
}) {
  const panels = page.panels;
  const isSingle = panels.length === 1;

  return (
    <motion.div
      key={page.id}
      custom={direction}
      initial={{ x: direction * 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -80, opacity: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%" }}
    >
      {/* Comic book wrapper — white with thick black border like real comics */}
      <div style={{
        background: "#fff",
        border: "4px solid #111",
        borderRadius: "0.375rem",
        boxShadow: "8px 8px 0 rgba(0,0,0,0.9)",
        overflow: "hidden",
        maxWidth: 880,
        margin: "0 auto",
      }}>
        {/* Top bar — comic title banner */}
        <div style={{
          background: "#111", padding: "10px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "2px solid #333",
        }}>
          <span style={{
            fontFamily: "'Anybody', sans-serif", fontWeight: 900,
            fontSize: 15, color: "#fff", textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}>
            KRAYON
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            color: "rgba(255,255,255,0.5)",
          }}>
            PAGE {pageNum} OF {totalPages}
          </span>
        </div>

        {/* Panel grid — 2 columns or single column */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isSingle ? "1fr" : "1fr 1fr",
          gap: "4px",
          background: "#333",
          padding: "4px",
        }}>
          {panels.map((panel, i) => (
            <PanelCell key={panel.id} panel={panel} index={i} />
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          background: "#111", padding: "5px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9,
            color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Krayon Studios
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9,
            color: "rgba(255,255,255,0.3)",
          }}>
            {pageNum} / {totalPages}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Reader ───────────────────────────────────────────────────────────────
export default function Reader() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const [pages,       setPages]   = useState<ReaderPage[]>([]);
  const [comicTitle,  setTitle]   = useState("READER");
  const [loading,     setLoading] = useState(false);
  const [error,       setError]   = useState<string | null>(null);
  const [currentPage, setPage]    = useState(0);
  const [direction,   setDir]     = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    readComic(id)
      .then(({ comic, pages }) => {
        setTitle(comic.title ?? "READER");
        setPages(pages);
        setPage(0);
      })
      .catch((err) => setError(err.message ?? "Failed to load comic"))
      .finally(() => setLoading(false));
  }, [id]);

  const total = pages.length;
  const page  = pages[currentPage] ?? null;

  const goTo = (next: number, dir: number) => {
    if (next < 0 || next >= total) return;
    setDir(dir);
    setPage(next);
  };

  if (!id) return (
    <div className="flex flex-col items-center justify-center gap-6 p-8" style={{ background: "#0c0e12", minHeight: "100%" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#3b494c" }}>auto_stories</span>
      <div className="text-center">
        <h1 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 28, color: "#e2e2e8", textTransform: "uppercase" }}>No Comic Selected</h1>
        <p style={{ fontSize: 14, color: "#849396", marginTop: 8 }}>Create one in the Studio first.</p>
      </div>
      <button onClick={() => navigate("/studio")} style={{ padding: "12px 28px", background: "#f5cd00", border: "2px solid #000", borderRadius: "0.75rem", boxShadow: "3px 3px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 14, textTransform: "uppercase", cursor: "pointer" }}>
        Go to Studio
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center gap-4" style={{ background: "#0c0e12", minHeight: "100%" }}>
      <Loader2 size={32} className="animate-spin" style={{ color: "#c3f5ff" }} />
      <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, color: "#e2e2e8", fontSize: 18, textTransform: "uppercase" }}>Loading…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-5 p-8" style={{ background: "#0c0e12", minHeight: "100%" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#ffb4ab" }}>error</span>
      <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 20, color: "#ffb4ab", textTransform: "uppercase" }}>Load Error</p>
      <p style={{ fontSize: 13, color: "#bac9cc" }}>{error}</p>
      <button onClick={() => navigate("/studio")} style={{ padding: "10px 24px", background: "#f5cd00", border: "2px solid #000", borderRadius: "0.5rem", boxShadow: "2px 2px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}>
        Back to Studio
      </button>
    </div>
  );

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center gap-4 p-8" style={{ background: "#0c0e12", minHeight: "100%" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 56, color: "#3b494c" }}>hide_image</span>
      <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 18, color: "#bac9cc", textTransform: "uppercase" }}>No Pages Found</p>
      <button onClick={() => navigate("/studio")} style={{ padding: "10px 24px", background: "#f5cd00", border: "2px solid #000", borderRadius: "0.5rem", boxShadow: "2px 2px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}>
        Back to Studio
      </button>
    </div>
  );

  return (
    <div style={{ background: "#0c0e12", minHeight: "100%" }}>

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4"
        style={{ borderBottom: "1px solid rgba(59,73,76,0.3)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-xl cursor-pointer"
            style={{ padding: 8, background: "#1e2024", border: "none", color: "#bac9cc" }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{
              fontFamily: "'Anybody', sans-serif", fontWeight: 900,
              fontSize: "clamp(14px, 2.5vw, 22px)", color: "#e2e2e8",
              textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              {comicTitle}
            </h1>
            <p style={{ fontSize: 11, color: "#849396", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Page {currentPage + 1} of {total}
            </p>
          </div>
        </div>

        {/* Page indicator dots */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.4)" }}>
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > currentPage ? 1 : -1)}
              className="rounded-full transition-all cursor-pointer"
              style={{
                width: i === currentPage ? 22 : 6,
                height: 6,
                background: i === currentPage ? "#c3f5ff" : "#282a2e",
                border: "none", padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Comic page area ── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-32">
        <div style={{ position: "relative" }}>
          {/* Left arrow */}
          <button onClick={() => goTo(currentPage - 1, -1)} disabled={currentPage === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 flex items-center justify-center rounded-full cursor-pointer transition-all z-10"
            style={{
              width: 44, height: 44,
              background: currentPage === 0 ? "#1a1c20" : "#1e2024",
              border: `1px solid ${currentPage === 0 ? "rgba(59,73,76,0.2)" : "rgba(59,73,76,0.5)"}`,
              color: currentPage === 0 ? "#3b494c" : "#e2e2e8",
              opacity: currentPage === 0 ? 0.4 : 1,
            }}>
            <ChevronLeft size={22} />
          </button>

          {/* Right arrow */}
          <button onClick={() => goTo(currentPage + 1, 1)} disabled={currentPage === total - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 flex items-center justify-center rounded-full cursor-pointer transition-all z-10"
            style={{
              width: 44, height: 44,
              background: currentPage === total - 1 ? "#1a1c20" : "#1e2024",
              border: `1px solid ${currentPage === total - 1 ? "rgba(59,73,76,0.2)" : "rgba(59,73,76,0.5)"}`,
              color: currentPage === total - 1 ? "#3b494c" : "#e2e2e8",
              opacity: currentPage === total - 1 ? 0.4 : 1,
            }}>
            <ChevronRight size={22} />
          </button>

          {/* Comic page with animation */}
          <AnimatePresence mode="wait" custom={direction}>
            {page && (
              <ComicPage
                key={page.id}
                page={page}
                pageNum={currentPage + 1}
                totalPages={total}
                direction={direction}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={() => goTo(currentPage - 1, -1)} disabled={currentPage === 0}
            className="flex items-center gap-2 cursor-pointer transition-all"
            style={{
              padding: "10px 20px",
              background: "#1e2024",
              border: "1px solid rgba(59,73,76,0.4)", borderRadius: "0.5rem",
              color: currentPage === 0 ? "#849396" : "#e2e2e8",
              fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase",
              opacity: currentPage === 0 ? 0.5 : 1,
            }}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button onClick={() => goTo(currentPage + 1, 1)} disabled={currentPage === total - 1}
            className="flex items-center gap-2 cursor-pointer transition-all"
            style={{
              padding: "10px 22px",
              background: currentPage === total - 1 ? "#1e2024" : "#c3f5ff",
              border: `2px solid ${currentPage === total - 1 ? "rgba(59,73,76,0.4)" : "#000"}`,
              borderRadius: "0.5rem",
              boxShadow: currentPage === total - 1 ? "none" : "2px 2px 0 #000",
              color: currentPage === total - 1 ? "#849396" : "#00363d",
              fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase",
              opacity: currentPage === total - 1 ? 0.5 : 1,
              cursor: currentPage === total - 1 ? "not-allowed" : "pointer",
            }}>
            Next <ChevronRight size={16} />
          </button>
        </div>

        {/* End of comic */}
        {currentPage === total - 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col items-center gap-4">
            <div className="px-6 py-4 rounded-2xl text-center"
              style={{ background: "#1e2024", border: "1px solid rgba(195,245,255,0.2)", maxWidth: 380 }}>
              <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 18, color: "#c3f5ff", textTransform: "uppercase" }}>
                🎉 End of Comic!
              </p>
              <p style={{ fontSize: 13, color: "#849396", marginTop: 6 }}>
                Forge another story or browse the stream.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate("/studio")}
                style={{ padding: "10px 20px", background: "#f5cd00", border: "2px solid #000", borderRadius: "0.75rem", boxShadow: "2px 2px 0 #000", color: "#3a3000", fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase", cursor: "pointer" }}>
                New Comic
              </button>
              <button onClick={() => navigate("/stream")}
                style={{ padding: "10px 20px", background: "#282a2e", border: "1px solid rgba(59,73,76,0.5)", borderRadius: "0.75rem", color: "#bac9cc", fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 13, textTransform: "uppercase", cursor: "pointer" }}>
                Browse Stream
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes panelShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
