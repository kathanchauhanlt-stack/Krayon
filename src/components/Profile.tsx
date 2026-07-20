import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, LogIn, User, Pencil, Check, Crown, Sparkles } from "lucide-react";
import { getUser, updateUser, type KrayonUser, type KrayonComic } from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user: authUser, signInWithGoogle, signInAnonymously } = useAuth();
  const navigate = useNavigate();
  const [userData,  setUserData]  = useState<(KrayonUser & { artifacts: number; mana: number; published: KrayonComic[] }) | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [isEditing, setEditing]   = useState(false);
  const [editName,  setEditName]  = useState("");
  const [editBio,   setEditBio]   = useState("");
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    if (!authUser) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const data = await getUser(authUser.uid);
      setUserData(data); setEditName(data.username); setEditBio(data.bio);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!userData || saving || !authUser) return;
    setSaving(true);
    try {
      await updateUser(authUser.uid, { username: editName, bio: editBio });
      setUserData((u) => u ? { ...u, username: editName, bio: editBio } : u);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (!authUser) return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: "#111317" }}>
      <div className="max-w-sm w-full p-8 flex flex-col gap-5 text-center" style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.4)", borderRadius: "1rem" }}>
        <span className="material-symbols-outlined mx-auto" style={{ fontSize: 48, color: "#c3f5ff" }}>person</span>
        <div>
          <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 22, color: "#e2e2e8", textTransform: "uppercase" }}>Profile Locked</h2>
          <p style={{ fontSize: 13, color: "#bac9cc", marginTop: 8 }}>Sign in to initialize your creator profile.</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={signInWithGoogle} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase cursor-pointer" style={{ background: "#EA4335", color: "#fff", border: "none" }}><LogIn size={15} /> Sign In with Google</button>
          <button onClick={signInAnonymously} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase cursor-pointer" style={{ background: "#c3f5ff", color: "#00363d", border: "none" }}><User size={15} /> Enter as Guest</button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="h-full flex items-center justify-center gap-3" style={{ background: "#111317" }}><Loader2 size={28} className="animate-spin" style={{ color: "#c3f5ff" }} /><span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, color: "#e2e2e8", fontSize: 18, textTransform: "uppercase" }}>Loading Profile…</span></div>;
  if (error)   return <div className="h-full flex items-center justify-center p-6" style={{ background: "#111317" }}><div className="p-6 text-center rounded-xl" style={{ background: "#1e2024" }}><p style={{ color: "#ffb4ab", fontWeight: 700 }}>⚡ Firestore Error</p><p style={{ fontSize: 13, color: "#bac9cc" }}>{error}</p><button onClick={load} className="krayon-btn-primary mt-4 mx-auto" style={{ width: "fit-content" }}>Retry</button></div></div>;
  if (!userData) return null;

  const manaDisplay = userData.mana >= 1000 ? `${(userData.mana / 1000).toFixed(1)}K` : String(userData.mana);

  return (
    <div style={{ background: "#111317", minHeight: "100%" }}>
      <div className="relative w-full overflow-hidden" style={{ height: 180, background: "linear-gradient(135deg, #0c0e12 0%, #1e2024 50%, #282a2e 100%)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(195,245,255,0.05) 0%, transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, #111317 100%)" }} />
      </div>

      <div className="max-w-screen-xl mx-auto px-4 md:px-6 pb-32">
        <div className="-mt-12 relative z-10 p-6 mb-8" style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.3)", borderRadius: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center" style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #c3f5ff, #ff4b89)", border: "3px solid #1e2024", boxShadow: "0 0 0 2px #3b494c" }}>
                <User size={36} style={{ color: "#00363d" }} />
              </div>
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: "#f5cd00", border: "2px solid #1e2024" }}>
                <Crown size={13} fill="currentColor" style={{ color: "#3a3000" }} />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center sm:items-start gap-2">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-3 w-full max-w-sm">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="krayon-input" placeholder="Username" style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }} />
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="krayon-input resize-none" rows={2} placeholder="Bio…" />
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving} className="krayon-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
                      <button onClick={() => setEditing(false)} className="filter-pill" style={{ border: "1px solid rgba(59,73,76,0.5)" }}>Cancel</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="view" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex flex-col items-center sm:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 26, color: "#e2e2e8", textTransform: "uppercase" }}>{userData.username}</h2>
                      <button onClick={() => setEditing(true)} className="flex items-center justify-center rounded-lg cursor-pointer" style={{ padding: 6, background: "#282a2e", border: "none", color: "#bac9cc" }}><Pencil size={13} /></button>
                    </div>
                    <div className="flex items-center gap-2"><Crown size={12} style={{ color: "#f5cd00" }} /><span style={{ fontSize: 12, color: "#bac9cc" }}>{userData.rank}</span></div>
                    {userData.bio && <p style={{ fontSize: 13, color: "#849396", fontStyle: "italic" }}>"{userData.bio}"</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 pt-5" style={{ borderTop: "1px solid rgba(59,73,76,0.3)" }}>
            {[
              { label: "Artifacts",  val: userData.artifacts, color: "#ffb1c3", icon: <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span> },
              { label: "Mana Pulse", val: manaDisplay,        color: "#c3f5ff", icon: <Sparkles size={16} /> },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center px-5 py-3" style={{ background: "#282a2e", border: "1px solid rgba(59,73,76,0.4)", borderRadius: "0.5rem", minWidth: 90 }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: stat.color }}>
                  {stat.icon}
                  <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, color: "#e2e2e8" }}>{stat.val}</span>
                </div>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#849396" }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 22, color: "#e2e2e8", textTransform: "uppercase" }}>Published Artifacts</h2>
            <div className="flex gap-2">
              <button onClick={() => navigate("/stream")} className="filter-pill" style={{ fontSize: 12 }}>Stream</button>
              <button onClick={() => navigate("/vault")}  className="filter-pill" style={{ fontSize: 12 }}>Vault</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {userData.published.map((art, i) => (
              <motion.div key={art.id} initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="overflow-hidden group cursor-pointer" style={{ background: "#1e2024", border: "1px solid rgba(59,73,76,0.25)", borderRadius: "0.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
                <div className="aspect-video overflow-hidden relative" style={{ background: "#0c0e12" }}>
                  {art.cover_url
                    ? <img src={art.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" alt={art.title} />
                    : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined" style={{ fontSize: 36, color: "#3b494c" }}>image</span></div>
                  }
                </div>
                <div className="p-4">
                  <h3 className="truncate mb-2" style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 15, color: "#e2e2e8", textTransform: "uppercase" }}>{art.title}</h3>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 11, color: "#849396" }}>{art.genre}</span>
                    <span style={{ fontSize: 11, color: "#bac9cc", fontFamily: "'Space Mono', monospace" }}>{art.mana_count} ⚡</span>
                  </div>
                </div>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => navigate("/studio")} className="flex flex-col items-center justify-center gap-4 cursor-pointer" style={{ minHeight: 180, border: "2px dashed rgba(59,73,76,0.5)", borderRadius: "0.75rem", padding: "2rem" }}>
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 48, height: 48, background: "#282a2e", border: "1px solid rgba(59,73,76,0.5)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#bac9cc" }}>add</span>
              </div>
              <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 13, color: "#849396", textTransform: "uppercase" }}>Forge New Masterpiece</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
