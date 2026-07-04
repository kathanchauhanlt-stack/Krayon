import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Lock, Unlock, Zap, Trash2, ShieldAlert, Plus, Eye, Loader2, LogIn, User } from "lucide-react";
import { Pillar } from "../types";
import { getDrafts, deleteDraft, type ApiDraft } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface VaultProps { setActivePillar?: (p: Pillar) => void; }

export default function Vault({ setActivePillar }: VaultProps) {
  const { user: authUser, signInWithGoogle, signInAnonymously } = useAuth();
  const [drafts, setDrafts]   = useState<ApiDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDrafts(await getDrafts(authUser.uid));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDraft(id);
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch { /* silent */ }
  };

  if (!authUser) return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md border-4 border-ink bg-comic-white p-8 shadow-comic rotate-1 text-center flex flex-col gap-5">
        <h2 className="text-3xl font-comic text-ink uppercase leading-none">Vault Encrypted</h2>
        <p className="text-sm font-bold text-ink/75">Your draft archives are securely stored in the cloud. Please sign in to decrypt and resume your comic creations.</p>
        <div className="flex flex-col gap-3">
          <button onClick={signInWithGoogle} className="comic-button-pink py-3 text-sm flex items-center justify-center gap-2">
            <LogIn size={16} /> Decrypt with Google
          </button>
          <button onClick={signInAnonymously} className="comic-button-cyan py-3 text-sm flex items-center justify-center gap-2">
            <User size={16} /> Enter as Guest
          </button>
        </div>
      </div>
    </div>
  );


  const totalPages = drafts.reduce((a, d) => a + d.pages_count, 0);
  const locked     = drafts.filter(d => d.locked).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent relative">
      <div className="absolute inset-0 bg-halftone-white opacity-[0.04] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">

        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="border-4 border-ink bg-comic-white inline-block p-4 md:p-6 shadow-comic transform rotate-1">
            <div className="flex items-center gap-3 text-ink mb-2 border-b-4 border-ink pb-2">
              <ShieldAlert size={24} strokeWidth={3} className="shrink-0" />
              <span className="text-sm font-comic tracking-wider uppercase">High-Security Archive</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-comic tracking-widest text-shadow-comic text-comic-yellow leading-none">
              THE VAULT
            </h1>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-comic-pink border-4 border-ink px-6 py-4 flex flex-col items-center shadow-comic transform -rotate-2 shrink-0">
                <span className="text-[10px] font-comic tracking-widest text-ink mb-1 uppercase">Encrypted Slots</span>
                <span className="text-3xl font-comic text-comic-white font-mono">{locked} / {drafts.length}</span>
              </div>
              <div className="bg-comic-blue border-4 border-ink px-6 py-4 flex flex-col items-center shadow-comic transform rotate-1 shrink-0">
                <span className="text-[10px] font-comic tracking-widest text-ink mb-1 uppercase">Total Pages</span>
                <span className="text-3xl font-comic text-ink font-mono">{totalPages}</span>
              </div>
            </div>
          )}
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32 gap-3">
            <Loader2 size={32} className="text-comic-yellow animate-spin" />
            <span className="font-comic text-2xl text-comic-white uppercase">Unlocking Vault…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto border-4 border-ink bg-comic-yellow p-6 shadow-comic rotate-1 text-center">
            <p className="font-comic text-2xl text-ink uppercase mb-2">⚡ API Offline</p>
            <p className="text-sm font-bold text-ink">{error}</p>
            <p className="text-xs text-ink/70 mt-2">Run: <code className="bg-ink text-comic-white px-2 py-0.5">npx tsx server/index.ts</code></p>
            <button onClick={load} className="mt-4 comic-button-pink px-4 py-2 text-sm">Retry</button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {drafts.map((draft, i) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.07, type: "spring", stiffness: 220, damping: 20 }}
                className={`comic-panel relative overflow-hidden flex flex-col min-h-[280px] md:min-h-[320px] ${draft.locked ? "bg-gray-200" : "bg-comic-white"}`}
              >
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] ${draft.locked ? "bg-gray-500/40" : "bg-comic-blue/30"}`} />
                  <div className="w-full h-full bg-halftone opacity-20" />
                </div>

                <div className="p-6 flex flex-col flex-1 relative z-10">
                  {/* Icon row */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b-4 border-ink">
                    <div className={`p-3 border-4 border-ink shadow-[3px_3px_0_#111] ${draft.locked ? "bg-comic-yellow text-ink" : "bg-comic-green text-ink"}`}>
                      {draft.locked
                        ? <Lock size={22} strokeWidth={3} />
                        : <Unlock size={22} strokeWidth={3} className="animate-pulse" />
                      }
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-ink text-comic-white border-2 border-ink font-comic text-xs uppercase">
                        {draft.genre}
                      </span>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="text-ink hover:bg-comic-pink hover:text-comic-white border-4 border-transparent hover:border-ink p-1.5 transition-all"
                      >
                        <Trash2 size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-2xl font-comic tracking-wider mb-1 text-ink line-clamp-2 leading-tight uppercase flex-1">
                    {draft.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs uppercase font-bold tracking-widest text-ink bg-comic-white inline-block px-1 border-2 border-ink">
                      {draft.pages_count} Pages
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-xs font-comic uppercase tracking-wider text-ink">
                      <span>Continuity Pulse</span>
                      <span className="font-mono font-bold">{draft.progress}%</span>
                    </div>
                    <div className="h-4 bg-comic-white border-4 border-ink overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${draft.progress}%` }}
                        transition={{ duration: 1.2, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                        className={`h-full border-r-4 border-ink ${draft.locked ? "bg-gray-500" : "bg-comic-blue"}`}
                      />
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(0,0,0,0.12)_8px,rgba(0,0,0,0.12)_16px)]" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      {draft.locked ? (
                        <button className="flex-1 comic-button-yellow py-2.5 text-sm flex items-center justify-center gap-2">
                          <Lock size={14} strokeWidth={3} /> DECRYPT ARCHIVE
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setActivePillar?.("forge")}
                            className="flex-1 comic-button-pink py-2.5 text-sm flex items-center justify-center gap-2"
                          >
                            <Zap size={14} strokeWidth={3} /> RESUME FORGING
                          </button>
                          <button
                            onClick={() => setActivePillar?.("visions")}
                            className="comic-button-cyan px-3 py-2.5 flex items-center justify-center"
                          >
                            <Eye size={16} strokeWidth={3} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* New draft slot */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: drafts.length * 0.07, type: "spring" }}
              onClick={() => setActivePillar?.("forge")}
              className="border-8 border-dashed border-comic-white/20 p-8 flex flex-col items-center justify-center gap-4
                opacity-60 hover:opacity-100 hover:border-comic-yellow transition-all group cursor-pointer min-h-[280px] md:min-h-[320px]"
            >
              <div className="w-20 h-20 rounded-full border-4 border-comic-white/30 group-hover:border-ink bg-obsidian
                group-hover:bg-comic-yellow flex items-center justify-center group-hover:scale-110 transition-all shadow-[4px_4px_0_rgba(255,255,255,0.1)] group-hover:shadow-comic">
                <Plus size={32} className="text-comic-white/50 group-hover:text-ink transition-colors" strokeWidth={3} />
              </div>
              <span className="text-lg font-comic uppercase tracking-wider text-comic-white/50 group-hover:text-comic-white text-center transition-colors">
                Begin New Forge
              </span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
