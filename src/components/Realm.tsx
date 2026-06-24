import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Zap, Share2, Search, TrendingUp, Star, Filter, Loader2 } from "lucide-react";
import { getComics, toggleMana, getMana, type ApiComic } from "../services/api";

const FILTERS = ["All", "Trending", "Final", "WIP"];

const BADGE_STYLES: Record<string, string> = {
  "EPIC FINALE":       "bg-comic-yellow text-black",
  "WORK IN PROGRESS":  "bg-comic-blue text-black",
  "TRENDING":          "bg-comic-pink text-white",
  "NEW DROP":          "bg-comic-green text-black",
};

function ComicCard({ comic, index }: { comic: ApiComic; index: number }) {
  const [liked, setLiked]       = useState(false);
  const [count, setCount]       = useState(comic.mana_count);
  const [pending, setPending]   = useState(false);

  // load liked state for current user
  useEffect(() => {
    getMana(comic.id).then(d => { setLiked(d.liked); setCount(d.count); }).catch(() => {});
  }, [comic.id]);

  const handleMana = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await toggleMana(comic.id);
      setLiked(res.liked);
      setCount(c => res.liked ? c + 1 : c - 1);
    } finally {
      setPending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 240, damping: 22 }}
      className="break-inside-avoid"
    >
      <div className="comic-panel group overflow-hidden relative cursor-pointer flex flex-col bg-comic-white">
        {/* Cover */}
        <div
          className="overflow-hidden border-b-4 border-ink bg-ink relative"
          style={{ aspectRatio: index % 3 === 0 ? "3/4" : index % 3 === 1 ? "1/1" : "3/5" }}
        >
          {comic.cover_url ? (
            <img
              src={comic.cover_url}
              alt={comic.title}
              className="w-full h-full object-cover grayscale contrast-150 saturate-200 group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-ink flex items-center justify-center">
              <span className="font-comic text-comic-white/30 text-2xl uppercase">{comic.genre}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-halftone opacity-20 mix-blend-overlay pointer-events-none" />
          {/* Badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 border-4 border-ink font-comic text-sm uppercase shadow-comic transform -rotate-2 inline-block ${BADGE_STYLES[comic.badge] ?? "bg-comic-white text-ink"}`}>
              {comic.badge}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-comic-white flex flex-col gap-2">
          <h3 className="text-2xl font-comic tracking-widest text-ink group-hover:text-comic-orange transition-colors leading-tight uppercase line-clamp-2">
            {comic.title}
          </h3>
          <p className="text-ink font-bold text-xs uppercase tracking-widest border-b-4 border-ink pb-2">
            By {comic.author_name}
          </p>

          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-4">
              {/* Mana button */}
              <button
                onClick={handleMana}
                disabled={pending}
                className={`flex items-center gap-1 transition-colors group/btn disabled:opacity-60 ${liked ? "text-comic-orange" : "text-ink hover:text-comic-orange"}`}
              >
                <Zap size={20} className={`stroke-ink stroke-2 group-hover/btn:scale-125 transition-transform ${liked ? "fill-comic-yellow" : ""}`} />
                <span className="text-lg font-comic">{count.toLocaleString()}</span>
              </button>
              {/* Remix */}
              <button className="flex items-center gap-1 text-ink hover:text-comic-teal transition-colors group/btn">
                <Share2 size={20} className="stroke-ink stroke-2 group-hover/btn:scale-125 transition-transform" />
                <span className="text-lg font-comic">{comic.remix_count}</span>
              </button>
            </div>
            <span className="font-comic text-xs uppercase tracking-widest text-ink/50 border-l-4 border-ink pl-2">
              {comic.genre}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Realm() {
  const [comics, setComics]       = useState<ApiComic[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeFilter, setFilter] = useState("All");
  const [search, setSearch]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (activeFilter === "Final")    params.status = "final";
      if (activeFilter === "WIP")      params.status = "draft";
      if (search.trim())               params.search = search.trim();
      const data = await getComics(params);
      // client-side Trending filter
      const filtered = activeFilter === "Trending" ? data.filter(c => c.mana_count > 1000) : data;
      setComics(filtered);
    } catch (e: any) {
      setError(e.message ?? "Could not reach API server. Is it running?");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-full flex flex-col bg-obsidian overflow-hidden">
      {/* Header */}
      <div className="relative shrink-0 border-b-4 border-ink bg-obsidian">
        <div className="absolute inset-0 bg-halftone-white opacity-[0.05] pointer-events-none" />

        <div className="relative z-10 px-8 pt-20 pb-5 flex flex-col md:flex-row items-start md:items-end gap-6">
          <div className="border-4 border-ink bg-comic-green p-4 shadow-comic-pink transform -rotate-1 shrink-0">
            <h1 className="text-5xl md:text-7xl font-comic leading-none tracking-widest text-ink text-shadow-comic">
              THE REALM
            </h1>
            <p className="text-ink font-bold text-xs tracking-[0.1em] uppercase border-t-4 border-ink pt-2 mt-2 max-w-xs">
              Witness the artifacts published by the high chroniclers of AINIME
            </p>
          </div>

          {/* Stats — hidden on mobile */}
          <div className="hidden md:flex gap-4 flex-wrap">
            {[
              { label: "Artifacts", val: comics.length.toString(), icon: Star },
              { label: "Live Mana",  val: comics.reduce((a, c) => a + c.mana_count, 0).toLocaleString(), icon: TrendingUp },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="border-4 border-ink bg-obsidian px-5 py-3 shadow-comic flex items-center gap-3 rotate-1">
                <Icon size={18} className="text-comic-yellow" strokeWidth={3} />
                <div>
                  <div className="font-mono text-xl text-comic-white font-bold">{val}</div>
                  <div className="text-[10px] uppercase tracking-widest text-comic-white/50 font-bold">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div className="relative z-10 px-8 pb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink" strokeWidth={3} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="Search artifacts, chroniclers…"
              className="w-full bg-comic-white border-4 border-ink pl-10 pr-4 py-2 font-comic text-ink placeholder:text-ink/40 focus:outline-none focus:bg-comic-blue/10 shadow-comic text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Filter size={14} className="text-comic-white/50 shrink-0" strokeWidth={3} />
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 border-4 border-ink font-comic uppercase text-xs shadow-[2px_2px_0_#111] transition-all hover:translate-y-px hover:shadow-none ${activeFilter === f ? "bg-comic-pink text-comic-white" : "bg-comic-white text-ink"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {loading && (
          <div className="flex items-center justify-center py-32 gap-3">
            <Loader2 size={32} className="text-comic-yellow animate-spin" />
            <span className="font-comic text-2xl text-comic-white uppercase tracking-widest">Loading Realm…</span>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-20 border-4 border-ink bg-comic-yellow p-6 shadow-comic rotate-1 text-center">
            <p className="font-comic text-2xl text-ink uppercase mb-2">⚡ API Offline</p>
            <p className="text-sm font-bold text-ink">{error}</p>
            <p className="text-xs text-ink/70 mt-2">Run: <code className="bg-ink text-comic-white px-2 py-0.5">npx tsx server/index.ts</code></p>
            <button onClick={load} className="mt-4 comic-button-pink px-4 py-2 text-sm">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {comics.map((comic, i) => (
              <ComicCard key={comic.id} comic={comic} index={i} />
            ))}
            {comics.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32">
                <div className="border-4 border-ink bg-comic-yellow p-8 shadow-comic rotate-2 text-center">
                  <p className="text-4xl font-comic text-ink uppercase">No Artifacts Found</p>
                  <p className="text-ink font-bold text-sm mt-2 uppercase tracking-widest">Adjust your filters or search</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
