import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Loader2, Heart, Share2, Filter } from "lucide-react";
import { getComics, getMana, toggleMana, seedDemoComicsIfEmpty, type KrayonComic } from "../services/firestore";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["All", "Cyberpunk", "Fantasy", "Sci-Fi", "Horror", "Noir"];

function FeedCard({ comic, index, userId }: { comic: KrayonComic; index: number; userId: string }) {
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(comic.mana_count ?? 0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getMana(comic.id!, userId).then((d) => { setLiked(d.liked); setCount(d.count); }).catch(() => {});
  }, [comic.id, userId]);

  const handleMana = async () => {
    if (pending || !userId) return;
    setPending(true);
    try {
      const res = await toggleMana(comic.id!, userId);
      setLiked(res.liked);
      setCount((c) => (res.liked ? c + 1 : c - 1));
    } finally { setPending(false); }
  };

  const imgHeights = [450, 320, 280, 380];
  const imgH = imgHeights[index % imgHeights.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 240, damping: 22 }}
      className="break-inside-avoid krayon-card-feed"
    >
      <div className="relative w-full overflow-hidden group/img" style={{ height: imgH, background: "#000" }}>
        {comic.cover_url ? (
          <img src={comic.cover_url} alt={comic.title} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#1e2024" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#3b494c" }}>image</span>
          </div>
        )}
        {comic.badge && (
          <div className="absolute top-4 left-4">
            <span style={{ background: "rgba(17,19,23,0.8)", backdropFilter: "blur(8px)", color: "#c3f5ff", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 9999, border: "1px solid rgba(195,245,255,0.3)" }}>
              {comic.badge}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #c3f5ff, #ff4b89)" }} />
            <div>
              <h3 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 17, color: "#e2e2e8", lineHeight: 1.2 }}>{comic.title}</h3>
              <p style={{ fontSize: 12, color: "#bac9cc" }}>@{comic.author_name?.replace(/\s+/g, "_").toLowerCase() || "creator"}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={handleMana} disabled={pending} className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 32, height: 32, background: "rgba(40,42,46,1)", border: "none", color: liked ? "#ff4b89" : "#bac9cc" }}>
              <Heart size={15} fill={liked ? "#ff4b89" : "none"} />
            </button>
            <button className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 32, height: 32, background: "rgba(40,42,46,1)", border: "none", color: "#bac9cc" }}>
              <Share2 size={15} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: "1px solid rgba(59,73,76,0.3)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(186,201,204,0.7)", textTransform: "uppercase", letterSpacing: "0.05em", background: "#282a2e", padding: "3px 8px", borderRadius: 4 }}>{comic.genre}</span>
          <span style={{ fontSize: 12, color: "#bac9cc", fontFamily: "'Space Mono', monospace" }}>{count.toLocaleString()} ⚡</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function Stream() {
  const { user: authUser } = useAuth();
  const [comics,       setComics]  = useState<KrayonComic[]>([]);
  const [loading,      setLoading] = useState(true);
  const [error,        setError]   = useState<string | null>(null);
  const [activeFilter, setFilter]  = useState("All");
  const [search,       setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      await seedDemoComicsIfEmpty();
      const params: any = {};
      if (activeFilter !== "All") params.genre = activeFilter;
      if (search.trim())          params.search = search.trim();
      setComics(await getComics(params));
    } catch (e: any) {
      setError(e.message ?? "Could not connect to Firestore.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: "#0c0e12", minHeight: "100%" }}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-32">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: "clamp(32px, 5vw, 48px)", color: "#e2e2e8", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase" }}>STREAM</h1>
            <p style={{ color: "#bac9cc", marginTop: 10, maxWidth: 520, fontSize: 15, lineHeight: 1.6 }}>Discover the latest AI-generated comics from the KRAYON network.</p>
          </div>
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: 18, color: "#bac9cc" }}>search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search artifacts…" className="krayon-input" style={{ paddingLeft: "2.5rem", fontFamily: "'Hanken Grotesk', sans-serif" }} />
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={activeFilter === f ? "filter-pill-active" : "filter-pill"}>{f}</button>
          ))}
          <button onClick={load} className="filter-pill flex items-center gap-1"><Filter size={14} /> Refresh</button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#c3f5ff" }} />
            <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, color: "#e2e2e8", fontSize: 18, textTransform: "uppercase" }}>Loading Stream…</span>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto p-6 text-center rounded-xl" style={{ background: "#1e2024", border: "1px solid rgba(255,180,171,0.2)" }}>
            <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 20, color: "#ffb4ab", marginBottom: 8 }}>⚡ Firestore Offline</p>
            <p style={{ fontSize: 13, color: "#bac9cc" }}>{error}</p>
            <button onClick={load} className="krayon-btn-primary mt-4 mx-auto" style={{ width: "fit-content" }}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {comics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <span className="material-symbols-outlined" style={{ fontSize: 56, color: "#3b494c" }}>search_off</span>
                <p style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 20, color: "#bac9cc", textTransform: "uppercase" }}>No Artifacts Found</p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                {comics.map((comic, i) => <FeedCard key={comic.id} comic={comic} index={i} userId={authUser?.uid ?? ""} />)}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4" style={{ borderTop: "1px solid rgba(59,73,76,0.3)", background: "#0c0e12", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 900, fontSize: 16, color: "#e2e2e8", letterSpacing: "-0.05em" }}>KRAYON</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <p style={{ color: "rgba(255,177,195,0.6)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>© 2024 KRAYON STUDIOS</p>
        </div>
        <div className="flex gap-6" style={{ letterSpacing: "0.08em" }}>
          {["Terms", "Privacy", "Support"].map((l) => <a key={l} href="#" style={{ color: "rgba(186,201,204,0.7)", textDecoration: "none", textTransform: "uppercase" }}>{l}</a>)}
        </div>
      </footer>
    </div>
  );
}
