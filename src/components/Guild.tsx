import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Sparkles, Hexagon, User, Pencil, Check, Globe, Archive, Wand2, Clock, Loader2 } from "lucide-react";
import { Pillar } from "../types";
import { getUser, updateUser, type ApiUser, type ApiComic } from "../services/api";

interface GuildProps { setActivePillar?: (p: Pillar) => void; }

const RANK_COLORS: Record<string, string> = {
  "Novice Chronicler":   "bg-comic-teal",
  "Adept Weaver":        "bg-comic-orange",
  "Master Illusionist":  "bg-comic-red",
  "Grand Architect":     "bg-comic-yellow text-ink",
};

export default function Guild({ setActivePillar }: GuildProps) {
  const [user, setUser]         = useState<ApiUser | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio,  setEditBio]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUser("u1");
      setUser(data);
      setEditName(data.username);
      setEditBio(data.bio);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await updateUser("u1", { username: editName, bio: editBio });
      setUser(u => u ? { ...u, username: editName, bio: editBio } : u);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3">
      <Loader2 size={32} className="text-comic-yellow animate-spin" />
      <span className="font-comic text-2xl text-comic-white uppercase">Loading Guild…</span>
    </div>
  );

  if (error) return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-md border-4 border-ink bg-comic-yellow p-6 shadow-comic rotate-1 text-center">
        <p className="font-comic text-2xl text-ink uppercase mb-2">⚡ API Offline</p>
        <p className="text-sm font-bold text-ink">{error}</p>
        <p className="text-xs text-ink/70 mt-2">Run: <code className="bg-ink text-comic-white px-2 py-0.5">npx tsx server/index.ts</code></p>
        <button onClick={load} className="mt-4 comic-button-pink px-4 py-2 text-sm">Retry</button>
      </div>
    </div>
  );

  if (!user) return null;

  const manaDisplay = user.mana >= 1000 ? `${(user.mana / 1000).toFixed(1)}K` : String(user.mana);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent relative">
      <div className="absolute inset-0 bg-halftone-white opacity-[0.04] pointer-events-none" />

      {/* ── Banner ── */}
      <div className="relative border-b-8 border-ink">
        <div className="h-28 md:h-40 lg:h-52 w-full overflow-hidden relative border-b-4 border-ink">
          <img
            src="https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=1600&auto=format&fit=crop"
            alt="banner"
            className="w-full h-full object-cover grayscale contrast-150 saturate-200 opacity-50"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-halftone opacity-25 mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-obsidian/80 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-comic-orange" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 md:-mt-16">

            {/* Avatar */}
            <div className="relative group cursor-pointer shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 overflow-hidden border-4 border-ink bg-comic-white relative z-10 transform -rotate-2 transition-transform group-hover:rotate-0 shadow-[8px_8px_0_#111]">
                <div className="w-full h-full bg-comic-orange flex items-center justify-center">
                  <User size={48} className="text-ink" />
                </div>
                <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Pencil className="text-comic-white" size={24} strokeWidth={3} />
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 bg-comic-yellow border-4 border-ink text-ink p-2 rounded-full shadow-[3px_3px_0_#111] z-20 rotate-12">
                <Crown size={18} fill="currentColor" strokeWidth={2} />
              </div>
            </div>

            {/* Name / rank / bio */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-3">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center md:items-start gap-3 w-full max-w-md">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-comic-white border-4 border-ink px-4 py-2 text-xl font-comic tracking-widest text-ink shadow-[4px_4px_0_#111] focus:outline-none"
                    />
                    <textarea
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      className="w-full bg-comic-white/90 border-4 border-ink px-4 py-2 text-base text-ink font-bold focus:outline-none resize-none h-16"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving}
                        className="comic-button-cyan px-5 py-2 flex items-center gap-2 text-base disabled:opacity-60">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                        Save Sanctum
                      </button>
                      <button onClick={() => setEditing(false)} className="comic-button-yellow px-4 py-2 text-sm">Cancel</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="view" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-2 bg-comic-white border-4 border-ink px-4 py-2 shadow-[5px_5px_0_#111] rotate-1">
                      <h1 className="text-xl md:text-2xl lg:text-4xl font-comic tracking-widest text-ink uppercase break-all">
                        {user.username}
                      </h1>
                      <button onClick={() => setEditing(true)} className="p-1.5 bg-comic-yellow border-2 border-ink hover:bg-comic-blue transition-colors shrink-0">
                        <Pencil size={14} strokeWidth={3} className="text-ink" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-obsidian text-comic-white border-4 border-comic-white/20 px-4 py-2 -rotate-1">
                      <Crown size={14} className="text-comic-yellow" />
                      <span className="text-sm font-comic tracking-wider">{user.rank}</span>
                      <span className="text-comic-white/40 mx-1">·</span>
                      <p className="text-xs font-bold text-comic-white/70 italic">"{user.bio}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
            {[
              { label: "Artifacts",  val: user.artifacts,    icon: Hexagon,  color: "text-comic-pink"  },
              { label: "Mana Pulse", val: manaDisplay,       icon: Sparkles, color: "text-comic-yellow" },
              { label: "Followers",  val: user.followers,    icon: User,     color: "text-comic-blue"  },
            ].map((stat, i) => (
              <div key={i} className="bg-comic-white border-4 border-ink px-6 py-3 flex flex-col items-center shadow-comic">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={18} strokeWidth={3} className={stat.color} />
                  <span className="text-2xl font-comic text-ink font-mono">{stat.val}</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-ink border-t-2 border-ink pt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Published Artifacts ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 relative z-20">
        <div className="flex items-center justify-between mb-6 bg-comic-white border-4 border-ink p-4 shadow-comic">
          <h2 className="text-3xl md:text-4xl font-comic tracking-widest text-ink uppercase">Published Artifacts</h2>
          <div className="flex gap-2">
            <button onClick={() => setActivePillar?.("realm")}   className="comic-button-cyan px-3 py-2 text-xs flex items-center gap-2"><Globe size={12} /> Realm</button>
            <button onClick={() => setActivePillar?.("vault")}   className="comic-button-yellow px-3 py-2 text-xs flex items-center gap-2"><Archive size={12} /> Vault</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.published.map((art: ApiComic, i: number) => (
            <motion.div key={art.id} initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="comic-panel p-0 bg-comic-white flex flex-col group cursor-pointer overflow-hidden">
              <div className="aspect-video overflow-hidden border-b-4 border-ink relative">
                {art.cover_url ? (
                  <img src={art.cover_url} className="w-full h-full object-cover grayscale contrast-150 saturate-200 group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-ink flex items-center justify-center">
                    <span className="font-comic text-comic-white/30 text-xl uppercase">{art.genre}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-halftone opacity-20 mix-blend-overlay" />
                <div className="absolute top-3 left-3 px-3 py-1 border-4 border-ink text-xs font-comic tracking-wider uppercase shadow-[2px_2px_0_#111] transform -rotate-2 bg-comic-orange text-ink">
                  {art.genre}
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h3 className="text-xl font-comic tracking-wider text-ink line-clamp-1 uppercase group-hover:text-comic-orange transition-colors">{art.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-ink border-t-4 border-ink pt-2">
                    <Clock size={12} strokeWidth={3} />
                    <span>{new Date(art.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="font-comic text-xs text-ink/60 border-l-4 border-ink pl-2">{art.mana_count} ⚡</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Forge new */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: user.published.length * 0.07 }}
            onClick={() => setActivePillar?.("forge")}
            className="border-8 border-dashed border-comic-white/20 p-6 flex flex-col items-center justify-center gap-4 hover:border-comic-yellow transition-all cursor-pointer group min-h-[200px]">
            <div className="w-16 h-16 border-4 border-comic-white/20 group-hover:border-ink bg-obsidian group-hover:bg-comic-yellow flex items-center justify-center group-hover:rotate-12 transition-all">
              <Wand2 size={28} strokeWidth={3} className="text-comic-white/40 group-hover:text-ink transition-colors" />
            </div>
            <span className="text-lg font-comic tracking-wider uppercase text-comic-white/40 group-hover:text-comic-white text-center transition-colors">Forge New Masterpiece</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
