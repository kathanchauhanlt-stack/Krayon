/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Lab Reader (Pipeline Real-Time UI)
 * ───────────────────────────────────────────────────────────────────────────────
 *  Interactive reader that displays pipeline-generated comic panels with
 *  real-time Firebase RTDB syncing. Extends the Reader experience with:
 *    - Real-time panel updates via Firebase onValue listener
 *    - Clickable panels → edit pane for prompt/bubble modification
 *    - Single-panel regeneration via Renderer Service
 *    - Pipeline controls (Generate Novel → Panels → Render)
 *
 *  Mounted at /lab/:projectId in App.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, Loader2, RefreshCw, BookOpen, Layers, Zap,
  Edit3, X, Plus, Trash2, Image, type LucideIcon,
} from "lucide-react";
import {
  pipelineCreateProject,
  pipelineGenerateNovel,
  pipelineGeneratePanels,
  pipelineRenderPanel,
  pipelineRenderAll,
} from "../services/api";
import { subscribeToPanels, subscribeToProject } from "../services/pipelineDb";
import type {
  PipelineProject, ComicPanelMap, ComicPanel, ComicBubble,
  PipelineStatus, BubbleType,
} from "../types/pipeline.types";
import {
  updatePanelPrompt,
  updatePanelBubbles,
  setCharacters,
} from "../services/pipelineDb";

// ── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";
interface Toast { message: string; type: ToastType; id: number; }

// ── Constants ───────────────────────────────────────────────────────────────

const GENRES  = ["Fantasy", "Shonen", "Sci-Fi", "Horror", "Romance", "Action", "Slice of Life", "Shojo"];
const STYLES  = ["Manga", "American Comic", "Manhwa", "European Comic", "Chibi", "Noir"];
const BUBBLE_TYPES: BubbleType[] = ["speech", "thought", "shout", "whisper", "caption"];

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: "Ready",
  generating_novel: "Writing Novel…",
  generating_panels: "Building Panels…",
  rendering: "Rendering Images…",
  complete: "Complete",
  error: "Error",
};

const STATUS_COLORS: Record<PipelineStatus, string> = {
  idle: "#555570",
  generating_novel: "#ff9900",
  generating_panels: "#ff9900",
  rendering: "#aa66ff",
  complete: "#00cc88",
  error: "#ff3344",
};

// ── Styles (inline, "Warehouse Studio" aesthetic) ───────────────────────────

const S = {
  root: { background: "#08080b", minHeight: "100vh", color: "#d4d4e8", fontFamily: "'Inter', system-ui, sans-serif", position: "relative" as const },
  grid: { position: "fixed" as const, inset: 0, backgroundImage: "linear-gradient(rgba(0,102,204,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,204,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" as const, zIndex: 0 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #252540", background: "rgba(12,12,18,0.92)", backdropFilter: "blur(12px)", position: "sticky" as const, top: 0, zIndex: 50 },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#3399ff", display: "flex", alignItems: "center", gap: 6 },
  divider: { width: 1, height: 18, background: "#30305a" },
  title: { fontSize: 14, fontWeight: 500, color: "#d4d4e8", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  content: { display: "flex", height: "calc(100vh - 53px)", overflow: "hidden", position: "relative" as const, zIndex: 1 },
  main: { flex: 1, overflowY: "auto" as const, padding: "20px 24px" },
  mono: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
  btn: (primary = false, disabled = false) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 14px", border: `1px solid ${primary ? "#0066cc" : "#252540"}`,
    borderRadius: 6, background: primary ? "#0066cc" : "#131320",
    color: primary ? "#fff" : "#d4d4e8",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    transition: "all 180ms ease", letterSpacing: "0.02em",
  }),
  input: { width: "100%", padding: "8px 11px", border: "1px solid #252540", borderRadius: 6, background: "#131320", color: "#d4d4e8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none" },
  textarea: { width: "100%", padding: "8px 11px", border: "1px solid #252540", borderRadius: 6, background: "#131320", color: "#d4d4e8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", resize: "vertical" as const, minHeight: 80, lineHeight: 1.6 },
  select: { width: "100%", padding: "8px 11px", border: "1px solid #252540", borderRadius: 6, background: "#131320", color: "#d4d4e8", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", cursor: "pointer" },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#555570" },
  sectionTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#555570", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
};

// ── Toast Component ─────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            onClick={() => onRemove(t.id)}
            style={{
              padding: "10px 16px", borderRadius: 6, cursor: "pointer", maxWidth: 360,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              background: t.type === "success" ? "#0a2a1e" : t.type === "error" ? "#2a0a10" : "#1a3a66",
              border: `1px solid ${t.type === "success" ? "#00cc88" : t.type === "error" ? "#ff3344" : "#0066cc"}`,
              color: t.type === "success" ? "#00cc88" : t.type === "error" ? "#ff3344" : "#3399ff",
            }}>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PipelineStatus }) {
  const isAnimating = ["generating_novel", "generating_panels", "rendering"].includes(status);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, padding: "4px 11px",
      borderRadius: 16, border: "1px solid #252540", background: "#131320",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.04em", textTransform: "uppercase", color: STATUS_COLORS[status],
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[status],
        animation: isAnimating ? "labPulse 1.4s ease-in-out infinite" : "none",
      }} />
      {STATUS_LABELS[status]}
    </div>
  );
}

// ── Pipeline Control Bar ────────────────────────────────────────────────────

function PipelineControls({ project, projectId, onToast, busy, setBusy }: {
  project: PipelineProject; projectId: string;
  onToast: (msg: string, type: ToastType) => void;
  busy: string | null; setBusy: (b: string | null) => void;
}) {
  const hasNovel = project.light_novel?.scenes && Object.keys(project.light_novel.scenes).length > 0;
  const hasPanels = project.comic_panels && Object.keys(project.comic_panels).length > 0;
  const status = project.metadata?.status ?? "idle";
  const isWorking = ["generating_novel", "generating_panels", "rendering"].includes(status);

  const runStep = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      await fn();
      onToast(`${label} complete`, "success");
    } catch (e: any) {
      onToast(e.message || `${label} failed`, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, padding: "12px 14px", background: "#131320", border: "1px solid #252540", borderRadius: 8 }}>
      <span style={{ ...S.label, width: "100%", marginBottom: 2 }}>Pipeline Controls</span>
      <button style={S.btn(false, isWorking || busy !== null)} disabled={isWorking || busy !== null}
        onClick={() => runStep("Generate Novel", () => pipelineGenerateNovel(projectId))}>
        <BookOpen size={13} /> Generate Novel
      </button>
      <button style={S.btn(false, !hasNovel || isWorking || busy !== null)} disabled={!hasNovel || isWorking || busy !== null}
        onClick={() => runStep("Generate Panels", () => pipelineGeneratePanels(projectId))}>
        <Layers size={13} /> Generate Panels
      </button>
      <button style={S.btn(true, !hasPanels || isWorking || busy !== null)} disabled={!hasPanels || isWorking || busy !== null}
        onClick={() => runStep("Render All", () => pipelineRenderAll(projectId))}>
        <Zap size={13} /> Render All
      </button>
      {busy && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, fontSize: 11, color: "#ff9900", fontFamily: "'JetBrains Mono', monospace" }}>
          <Loader2 size={13} className="animate-spin" /> {busy}…
        </span>
      )}
    </div>
  );
}

// ── Panel Card ──────────────────────────────────────────────────────────────

function LabPanelCard({ panelId, panel, isActive, onClick }: {
  key?: string; panelId: string; panel: ComicPanel; isActive: boolean; onClick: () => void;
}) {
  const statusColor = panel.status === "complete" ? "#00cc88" : panel.status === "rendering" ? "#aa66ff" : panel.status === "error" ? "#ff3344" : "#555570";
  const isRendering = panel.status === "rendering";

  return (
    <div onClick={onClick} style={{
      position: "relative", border: `1px solid ${isActive ? "#0066cc" : "#252540"}`,
      borderRadius: 8, overflow: "hidden", background: "#131320", cursor: "pointer",
      transition: "all 180ms ease",
      boxShadow: isActive ? "0 0 0 1px #0066cc, 0 8px 20px rgba(0,102,204,0.12)" : "none",
    }}>
      <div style={{ aspectRatio: "1", background: "#08080b", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {panel.image_url ? (
          <img src={panel.image_url} alt={`Panel ${panel.panel_order}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#3a3a52", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <Image size={24} style={{ opacity: 0.4 }} />
            {isRendering ? "Rendering…" : "Pending"}
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #252540" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "#8888a8" }}>
          #{String(panel.panel_order + 1).padStart(2, "0")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", color: statusColor }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%", background: statusColor,
            animation: isRendering ? "labPulse 1.4s ease-in-out infinite" : "none",
          }} />
          {panel.status}
        </div>
      </div>
    </div>
  );
}

// ── Edit Pane (Right Sidebar) ───────────────────────────────────────────────

function EditPane({ panelId, panel, projectId, onClose, onToast }: {
  panelId: string; panel: ComicPanel; projectId: string;
  onClose: () => void; onToast: (msg: string, type: ToastType) => void;
}) {
  const [editPrompt, setEditPrompt] = useState(panel.image_prompt);
  const [editBubbles, setEditBubbles] = useState<Array<{ id: string; bubble: ComicBubble }>>(
    Object.entries(panel.bubbles || {}).map(([id, b]) => ({ id, bubble: { ...b } }))
  );
  const [regenerating, setRegenerating] = useState(false);
  const [savingBubbles, setSavingBubbles] = useState(false);

  // Sync when panel changes externally (real-time update)
  useEffect(() => {
    setEditPrompt(panel.image_prompt);
    setEditBubbles(Object.entries(panel.bubbles || {}).map(([id, b]) => ({ id, bubble: { ...b } })));
  }, [panelId, panel.image_prompt]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      // Update prompt in Firebase first
      if (editPrompt !== panel.image_prompt) {
        await updatePanelPrompt(projectId, panelId, editPrompt);
      }
      // Then call renderer
      await pipelineRenderPanel(projectId, panelId);
      onToast("Panel regenerated", "success");
    } catch (e: any) {
      onToast(e.message || "Regeneration failed", "error");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveBubbles = async () => {
    setSavingBubbles(true);
    try {
      const bubblesMap: Record<string, ComicBubble> = {};
      editBubbles.forEach((b, i) => {
        bubblesMap[`bubble_${String(i).padStart(2, "0")}`] = b.bubble;
      });
      await updatePanelBubbles(projectId, panelId, bubblesMap);
      onToast("Bubbles saved", "success");
    } catch (e: any) {
      onToast(e.message || "Save failed", "error");
    } finally {
      setSavingBubbles(false);
    }
  };

  const addBubble = () => {
    setEditBubbles(prev => [...prev, {
      id: `new_${Date.now()}`,
      bubble: { character: "", type: "speech", text: "" },
    }]);
  };

  const removeBubble = (index: number) => {
    setEditBubbles(prev => prev.filter((_, i) => i !== index));
  };

  const updateBubble = (index: number, field: keyof ComicBubble, value: string) => {
    setEditBubbles(prev => prev.map((b, i) =>
      i === index ? { ...b, bubble: { ...b.bubble, [field]: value } } : b
    ));
  };

  return (
    <div style={{
      width: 380, minWidth: 380, borderLeft: "1px solid #252540",
      background: "#0c0c12", overflowY: "auto", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid #252540",
        position: "sticky", top: 0, background: "#0c0c12", zIndex: 10,
      }}>
        <span style={{ ...S.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#3399ff" }}>
          Panel #{panel.panel_order + 1} Controls
        </span>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: 5, border: "1px solid #252540",
          background: "none", color: "#555570", cursor: "pointer",
        }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Image Preview */}
        <div style={{ width: "100%", aspectRatio: "1", borderRadius: 6, overflow: "hidden", background: "#131320", border: "1px solid #252540" }}>
          {panel.image_url ? (
            <img src={panel.image_url} alt="Panel preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a3a52", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {panel.status === "rendering" ? "Rendering…" : "No image yet"}
            </div>
          )}
        </div>

        {/* Image Prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={S.label}>Image Prompt</label>
          <textarea
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            style={{ ...S.textarea, minHeight: 120 }}
          />
        </div>

        {/* Regenerate Button */}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{ ...S.btn(true, regenerating), width: "100%", justifyContent: "center", padding: "10px 16px" }}
        >
          {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {regenerating ? "Regenerating…" : "Regenerate Image"}
        </button>

        {/* Bubbles Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={S.label}>Dialogue Bubbles</label>
            <button onClick={addBubble} style={{ ...S.btn(false, false), padding: "3px 8px", fontSize: 10 }}>
              <Plus size={11} /> Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {editBubbles.map((b, i) => (
              <div key={b.id} style={{ padding: "8px 10px", border: "1px solid #252540", borderRadius: 6, background: "#131320", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    value={b.bubble.character}
                    onChange={e => updateBubble(i, "character", e.target.value)}
                    placeholder="Character"
                    style={{ ...S.input, flex: 1, fontSize: 11, padding: "5px 8px" }}
                  />
                  <select
                    value={b.bubble.type}
                    onChange={e => updateBubble(i, "type", e.target.value)}
                    style={{ ...S.select, width: 90, fontSize: 10, padding: "5px 6px" }}
                  >
                    {BUBBLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => removeBubble(i)} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, borderRadius: 4, border: "none",
                    background: "none", color: "#555570", cursor: "pointer",
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  value={b.bubble.text}
                  onChange={e => updateBubble(i, "text", e.target.value)}
                  placeholder="Dialogue text..."
                  style={{ ...S.textarea, minHeight: 40, fontSize: 11, padding: "5px 8px" }}
                />
              </div>
            ))}
          </div>

          {editBubbles.length > 0 && (
            <button
              onClick={handleSaveBubbles}
              disabled={savingBubbles}
              style={{ ...S.btn(false, savingBubbles), justifyContent: "center", marginTop: 4 }}
            >
              {savingBubbles ? <Loader2 size={12} className="animate-spin" /> : <Edit3 size={12} />}
              {savingBubbles ? "Saving…" : "Save Bubbles"}
            </button>
          )}
        </div>

        {/* Scene Reference */}
        {panel.scene_ref && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={S.label}>Scene Reference</label>
            <span style={{ ...S.mono, fontSize: 11, color: "#8888a8" }}>{panel.scene_ref}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Novel Preview ───────────────────────────────────────────────────────────

function NovelPreview({ project }: { project: PipelineProject }) {
  const scenes = project.light_novel?.scenes;
  if (!scenes || Object.keys(scenes).length === 0) return null;

  const sorted = Object.entries(scenes).sort(([, a], [, b]) => a.scene_number - b.scene_number);

  return (
    <div style={{ marginBottom: 20, padding: "14px 16px", background: "#131320", border: "1px solid #252540", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
      <div style={S.sectionTitle}>
        <BookOpen size={12} /> Light Novel — {sorted.length} Scenes
      </div>
      {sorted.map(([id, scene]) => (
        <div key={id} style={{ marginBottom: 14 }}>
          <div style={{ ...S.mono, fontSize: 11, fontWeight: 600, color: "#3399ff", marginBottom: 4 }}>
            Scene {scene.scene_number}: {scene.title}
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#8888a8", whiteSpace: "pre-wrap", margin: 0 }}>
            {scene.body.slice(0, 300)}{scene.body.length > 300 ? "…" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Creation Form ───────────────────────────────────────────────────────────

interface CharacterForm { name: string; lora_id: string; trigger_word: string; visual_description: string; }

function LabCreator({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Fantasy");
  const [style, setStyle] = useState("Manga");
  const [prompt, setPrompt] = useState("");
  const [chars, setChars] = useState<CharacterForm[]>([]);
  const [creating, setCreating] = useState(false);

  const addChar = () => setChars(p => [...p, { name: "", lora_id: "", trigger_word: "", visual_description: "" }]);
  const removeChar = (i: number) => setChars(p => p.filter((_, idx) => idx !== i));
  const updateChar = (i: number, field: keyof CharacterForm, value: string) =>
    setChars(p => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setCreating(true);
    try {
      const res = await pipelineCreateProject({
        title: title || "Untitled Project",
        genre, style, prompt,
        characters: chars.filter(c => c.name.trim()),
      });
      onCreated(res.projectId);
    } catch (e: any) {
      alert(e.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ ...S.mono, fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", color: "#3399ff", marginBottom: 6 }}>
          Initialize Pipeline
        </h1>
        <p style={{ fontSize: 13, color: "#8888a8" }}>Create a new Light Novel → Comic project</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label style={S.label}>Project Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Epic Manga" style={{ ...S.input, marginTop: 4 }} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={S.label}>Genre</label><select value={genre} onChange={e => setGenre(e.target.value)} style={{ ...S.select, marginTop: 4 }}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select></div>
          <div><label style={S.label}>Style</label><select value={style} onChange={e => setStyle(e.target.value)} style={{ ...S.select, marginTop: 4 }}>
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
        </div>

        <div><label style={S.label}>Story Prompt</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your story concept. Be specific about characters, setting, and plot. The AI will faithfully expand your narrative without adding unauthorized elements." style={{ ...S.textarea, marginTop: 4, minHeight: 140 }} /></div>

        {/* Characters */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={S.label}>Characters (Optional)</label>
            <button onClick={addChar} style={{ ...S.btn(false, false), padding: "3px 8px", fontSize: 10 }}><Plus size={10} /> Add</button>
          </div>
          {chars.map((c, i) => (
            <div key={i} style={{ padding: 10, border: "1px solid #252540", borderRadius: 6, background: "#131320", marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ ...S.mono, fontSize: 9, color: "#3399ff", textTransform: "uppercase" }}>Character {i + 1}</span>
                <button onClick={() => removeChar(i)} style={{ background: "none", border: "none", color: "#555570", cursor: "pointer" }}><Trash2 size={12} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <input value={c.name} onChange={e => updateChar(i, "name", e.target.value)} placeholder="Name" style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
                <input value={c.trigger_word} onChange={e => updateChar(i, "trigger_word", e.target.value)} placeholder="Trigger Word" style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
              </div>
              <input value={c.lora_id} onChange={e => updateChar(i, "lora_id", e.target.value)} placeholder="LoRA ID (optional)" style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
              <textarea value={c.visual_description} onChange={e => updateChar(i, "visual_description", e.target.value)} placeholder="Visual description (hair, outfit, features...)" style={{ ...S.textarea, fontSize: 11, padding: "5px 8px", minHeight: 40 }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={handleCreate} disabled={!prompt.trim() || creating} style={{ ...S.btn(true, !prompt.trim() || creating), padding: "10px 24px", fontSize: 12 }}>
            {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Zap size={13} /> Initialize Project</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN LAB READER
// ══════════════════════════════════════════════════════════════════════════════

export default function LabReader() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // If no projectId, show creation form
  if (!projectId) {
    return (
      <div style={S.root}>
        <div style={S.grid} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={S.header}>
            <div style={S.headerLeft}>
              <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 6, border: "1px solid #252540", background: "none", color: "#8888a8", cursor: "pointer" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={S.logo as any}>⚗ LAB</span>
            </div>
          </div>
          <LabCreator onCreated={(id) => navigate(`/lab/${id}`)} />
        </div>
        <style>{labKeyframes}</style>
      </div>
    );
  }

  return <LabReaderInner projectId={projectId} />;
}

function LabReaderInner({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [project, setProject] = useState<PipelineProject | null>(null);
  const [panels, setPanels] = useState<ComicPanelMap | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const toastIdRef = useRef(0);

  // ── Real-time subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    const unsubProject = subscribeToProject(projectId, setProject);
    const unsubPanels = subscribeToPanels(projectId, setPanels);
    return () => { unsubProject(); unsubPanels(); };
  }, [projectId]);

  // ── Toast helpers ───────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Loading state ───────────────────────────────────────────────────────
  if (!project) {
    return (
      <div style={S.root}>
        <div style={S.grid} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "#0066cc" }} />
          <span style={{ ...S.mono, fontSize: 11, color: "#555570" }}>Connecting to project…</span>
        </div>
        <style>{labKeyframes}</style>
      </div>
    );
  }

  const status: PipelineStatus = project.metadata?.status ?? "idle";
  const panelEntries: [string, ComicPanel][] = panels
    ? (Object.entries(panels) as [string, ComicPanel][]).sort(([, a], [, b]) => a.panel_order - b.panel_order)
    : [];
  const selectedPanelData: ComicPanel | null = selectedPanel && panels?.[selectedPanel] ? panels[selectedPanel] : null;

  return (
    <div style={S.root}>
      <div style={S.grid} />

      {/* ── Header ── */}
      <div style={{ ...S.header, position: "relative", zIndex: 50 }}>
        <div style={S.headerLeft}>
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 6, border: "1px solid #252540", background: "none", color: "#8888a8", cursor: "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={S.logo as any}>⚗ LAB</span>
          <div style={S.divider} />
          <span style={S.title as any}>{project.metadata?.title ?? "Untitled"}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* ── Content ── */}
      <div style={{ ...S.content, position: "relative", zIndex: 1 }}>
        {/* Main Panel Area */}
        <div style={S.main as any}>
          {/* Pipeline Controls */}
          <PipelineControls project={project} projectId={projectId} onToast={addToast} busy={busy} setBusy={setBusy} />

          {/* Novel Preview */}
          <NovelPreview project={project} />

          {/* Panel Grid */}
          {panelEntries.length > 0 ? (
            <>
              <div style={S.sectionTitle}>
                <Layers size={11} /> Panels — {panelEntries.length} total
                <div style={{ flex: 1, height: 1, background: "#252540" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {panelEntries.map(([id, panel]) => (
                  <LabPanelCard
                    key={id}
                    panelId={id}
                    panel={panel}
                    isActive={selectedPanel === id}
                    onClick={() => setSelectedPanel(selectedPanel === id ? null : id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 20px", gap: 10, color: "#3a3a52" }}>
              <Layers size={32} style={{ opacity: 0.3 }} />
              <span style={{ ...S.mono, fontSize: 11 }}>No panels yet — generate a novel first, then build panels</span>
            </div>
          )}
        </div>

        {/* Edit Pane (slides in when panel selected) */}
        <AnimatePresence>
          {selectedPanel && selectedPanelData && (
            <motion.div
              key="edit-pane"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden", flexShrink: 0 }}
            >
              <EditPane
                panelId={selectedPanel}
                panel={selectedPanelData}
                projectId={projectId}
                onClose={() => setSelectedPanel(null)}
                onToast={addToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <style>{labKeyframes}</style>
    </div>
  );
}

// ── Keyframe animations (injected once) ─────────────────────────────────────

const labKeyframes = `
@keyframes labPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
`;
