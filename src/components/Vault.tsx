import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Loader2, LogIn, User, Trash2 } from "lucide-react";
import { getDrafts, deleteDraft, type KrayonDraft } from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

type TabFilter = "All" | "Completed" | "Drafts";

function timeAgo(val: any): string {
  const date = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
  const diff  = Date.now() - date.getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hrs   = Math.floor(diff / 3_600_000);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  return "just now";
}

function DraftCard({ draft, index, onDelete, onResume }: { draft: KrayonDraft; index: number; onDelete: (id: string) => void; onResume: () => void }) {
  const isComplete = draft.progress >= 100;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.06, type: "spring", stiffness: 220, damping: 20 }} className="flex flex-col overflow-hidden" style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.25)", borderRadius: "0.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
      <div className="relative w-full overflow-hidden" style={{ height: 140, background: "#0c0e12" }}>
        {draft.cover_url
          ? <img src={draft.cover_url} alt={draft.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(195,245,255,0.05) 0%, rgba(255,75,137,0.05) 100%)" }}><span className="material-symbols-outlined" style={{ fontSize: 40, color: "#3b494c" }}>image</span></div>
        }
        <div className="absolute top-3 left-3">
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, background: isComplete ? "rgba(0,218,243,0.2)" : "rgba(40,42,46,0.85)", color: isComplete ? "#00daf3" : "#bac9cc", border: `1px solid ${isComplete ? "rgba(0,218,243,0.4)" : "rgba(59,73,76,0.5)"}` }}>{isComplete ? "Completed" : "Draft"}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, background: "rgba(40,42,46,0.85)", color: "#bac9cc", border: "1px solid rgba(59,73,76,0.5)" }}>{draft.genre}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="truncate" style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 15, color: "#e2e2e8", textTransform: "uppercase" }}>{draft.title}</h3>
            <p style={{ fontSize: 11, color: "#849396", marginTop: 2 }}>{draft.pages_count} pages · {timeAgo(draft.created_at)}</p>
          </div>
          <button onClick={() => onDelete(draft.id!)} className="flex-shrink-0 ml-2 rounded-lg transition-all cursor-pointer" style={{ padding: "6px", background: "none", border: "none", color: "#849396" }}>
            <Trash2 size={15} />
          </button>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 10, color: "#849396", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progress</span>
            <span style={{ fontSize: 10, color: "#bac9cc", fontFamily: "'Space Mono', monospace" }}>{draft.progress}%</span>
          </div>
          <div className="w-full overflow-hidden" style={{ height: 4, borderRadius: 2, background: "#282a2e" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${draft.progress}%` }} transition={{ duration: 1, delay: 0.2 }} style={{ height: "100%", borderRadius: 2, background: isComplete ? "linear-gradient(90deg, #00daf3, #c3f5ff)" : "linear-gradient(90deg, #ff4b89, #ffb1c3)" }} />
          </div>
        </div>

        {!isComplete && (
          <button onClick={onResume} className="krayon-btn-primary w-full mt-1" style={{ padding: "8px 16px", fontSize: 12, fontFamily: "'Anybody', sans-serif", fontWeight: 700 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>bolt</span> Resume
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Vault() {
  const { user: authUser, signInWithGoogle, signInAnonymously } = useAuth();
  const navigate = useNavigate();
  const [drafts,  setDrafts]  = useState<KrayonDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<TabFilter>("All");

  const load = useCallback(async () => {
    if (!authUser) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { setDrafts(await getDrafts(authUser.uid)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try { await deleteDraft(id); setDrafts((prev) => prev.filter((d) => d.id !== id)); } catch {}
  };

  if (!authUser) return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: "#111317" }}>
      <div className="max-w-sm w-full p-8 flex flex-col gap-5 text-center" style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.4)", borderRadius: "1rem", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
        <span className="material-symbols-outlined mx-auto" style={{ fontSize: 48, color: "#c3f5ff" }}>lock</span>
        <div>
          <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 22, color: "#e2e2e8", textTransform: "uppercase" }}>Vault Encrypted</h2>
          <p style={{ fontSize: 13, color: "#bac9cc", marginTop: 8 }}>Sign in to access your personal comic collection.</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={signInWithGoogle} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase cursor-pointer" style={{ background: "#EA4335", color: "#fff", border: "none", boxShadow: "0 4px 12px rgba(234,67,53,0.3)" }}><LogIn size={15} /> Decrypt with Google</button>
          <button onClick={signInAnonymously} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase cursor-pointer" style={{ background: "#c3f5ff", color: "#00363d", border: "none" }}><User size={15} /> Enter as Guest</button>
        </div>
      </div>
    </div>
  );

  const visible = drafts.filter((d) => {
    if (tab === "Completed") return d.progress >= 100;
    if (tab === "Drafts")    return d.progress < 100;
    return true;
  });

  return (
    <div style={{ background: "#111317", minHeight: "100%" }}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-32">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <h1 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: "clamp(36px, 6vw, 56px)", color: "#e2e2e8", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase" }}>VAULT</h1>
            <p style={{ color: "#bac9cc", marginTop: 8, fontSize: 14 }}>Your Personal Comic Collection.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["All", "Completed", "Drafts"] as TabFilter[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? "filter-pill-active" : "filter-pill"}>{t}</button>
            ))}
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-32 gap-3"><Loader2 size={28} className="animate-spin" style={{ color: "#c3f5ff" }} /><span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, color: "#e2e2e8", fontSize: 18, textTransform: "uppercase" }}>Unlocking Vault…</span></div>}
        {error   && <div className="max-w-md mx-auto p-6 text-center rounded-xl" style={{ background: "#1e2024", border: "1px solid rgba(255,180,171,0.2)" }}><p style={{ color: "#ffb4ab", fontWeight: 700 }}>⚡ Firestore Error</p><p style={{ fontSize: 13, color: "#bac9cc" }}>{error}</p><button onClick={load} className="krayon-btn-primary mt-4 mx-auto" style={{ width: "fit-content" }}>Retry</button></div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map((draft, i) => <DraftCard key={draft.id} draft={draft} index={i} onDelete={handleDelete} onResume={() => navigate("/studio")} />)}
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: visible.length * 0.06 }} onClick={() => navigate("/studio")} className="flex flex-col items-center justify-center gap-4 cursor-pointer" style={{ minHeight: 220, border: "2px dashed rgba(59,73,76,0.5)", borderRadius: "0.75rem", padding: "2rem" }}>
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, background: "#282a2e", border: "1px solid rgba(59,73,76,0.5)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#bac9cc" }}>add</span>
              </div>
              <div className="text-center">
                <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 14, color: "#bac9cc", textTransform: "uppercase", letterSpacing: "0.04em" }}>START NEW</p>
                <p style={{ fontSize: 12, color: "#849396", marginTop: 4 }}>Ignite a new project in the Studio.</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
